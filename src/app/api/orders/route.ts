import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { recordHistory } from "@/lib/history";
import { Order, Product, OrderItem, Business, User } from "@/types";
import { generateId } from "@/lib/utils";
import { redeemWalletForOrder } from "@/lib/wallet";
import { notifyOrderConfirmation, notifyAdminNewOrder } from "@/lib/whatsapp";
import { signToken } from "@/lib/auth";

// Adjust stock for each item: delta = -qty to reduce (on order), +qty to restore (on cancel)
async function adjustStock(items: OrderItem[], delta: number) {
  await Promise.all(items.map(async item => {
    const product = await redis.get<Product>(keys.product(item.productId));
    if (!product) return;
    const newStock = Math.max(0, (product.stock ?? 0) + delta * item.quantity);
    await redis.set(keys.product(item.productId), { ...product, stock: newStock, updatedAt: new Date().toISOString() });
  }));
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner", "customer"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const userId = searchParams.get("userId");

  let ids: string[] = [];
  if (businessId) {
    // Admin/partner fetching orders for a specific business
    ids = (await redis.smembers<string[]>(keys.ordersByBusiness(businessId))) || [];
  } else if (userId) {
    // Admin fetching orders for a specific user
    ids = (await redis.smembers<string[]>(keys.ordersByUser(userId))) || [];
  } else {
    // Customer (or admin/partner) viewing their own orders — always use caller's userId
    ids = (await redis.smembers<string[]>(keys.ordersByUser(auth.userId))) || [];
  }

  if (!ids.length) return NextResponse.json([]);
  const orders = await Promise.all(ids.map((id) => redis.get<Order>(keys.order(id))));
  return NextResponse.json(orders.filter(Boolean));
}

export async function POST(req: NextRequest) {
  // Guest checkout: Auth is optional for POST
  let auth = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      // Reuse existing logic from requireAuth but without the NextResponse return
      const { verifyToken } = await import("@/lib/auth");
      const payload = await verifyToken(token);
      if (payload && payload.userId && payload.role) {
        auth = { userId: payload.userId as string, role: payload.role as string };
      }
    } catch (e) {
      auth = null;
    }
  }

  const body = await req.json();
  const {
    businessId, items, totalAmount, paymentMode,
    deliveryAddress, invoiceId, transactionId,
    walletRedeemed, customerName, customerPhone
  } = body;

  if (!businessId || !items || !totalAmount || !deliveryAddress) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Handle Guest User Account Creation & Profile Updates
  let finalUserId = auth ? auth.userId : "guest";
  if (!auth) {
    if (!customerName || !customerPhone) {
      return NextResponse.json({ error: "Guest checkout requires name and phone number" }, { status: 400 });
    }

    // Check if user already exists by phone
    const existingUserId = await redis.get<string>(keys.userByPhone(customerPhone));
    if (existingUserId) {
      finalUserId = existingUserId;

      // UPDATE PROFILE: If name or address changed, update the existing user profile
      const existingUser = await redis.get<User>(keys.user(existingUserId));
      if (existingUser && (existingUser.name !== customerName || existingUser.address !== deliveryAddress)) {
        await redis.set(keys.user(existingUserId), {
          ...existingUser,
          name: customerName,
          address: deliveryAddress,
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      // Create new user account for this guest
      const newUserId = generateId();
      const newUser: User = {
        id: newUserId,
        name: customerName,
        email: "", // Guest signup doesn't provide email
        phone: customerPhone,
        age: 0,
        sex: "other",
        address: deliveryAddress,
        role: "customer",
        passwordHash: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await redis.set(keys.user(newUserId), newUser);
      await redis.set(keys.userByPhone(customerPhone), newUserId);
      await redis.sadd(keys.users(), newUserId);
      finalUserId = newUserId;
    }
  } else {
    // AUTHENTICATED USER: If they changed their name or address on the checkout page, update it in their profile
    const currentUser = await redis.get<User>(keys.user(auth.userId));
    if (currentUser && (currentUser.name !== customerName || currentUser.address !== deliveryAddress)) {
      await redis.set(keys.user(auth.userId), {
        ...currentUser,
        name: customerName || currentUser.name,
        address: deliveryAddress || currentUser.address,
        updatedAt: new Date().toISOString(),
      });
    }
  }


  const id = generateId();
  const resolvedInvoiceId = invoiceId || id;

  // Wallet redemption — only allowed for authenticated users
  let redeemedAmount = 0;
  if (auth && walletRedeemed && Number(walletRedeemed) > 0) {
    const business = await redis.get<Business>(keys.business(businessId));
    if (business?.walletEnabled) {
      const tx = await redeemWalletForOrder({
        userId: auth.userId,
        businessId,
        orderId: id,
        invoiceId: resolvedInvoiceId,
        amount: Number(walletRedeemed),
        createdBy: auth.userId,
      });
      redeemedAmount = tx ? Math.abs(tx.amount) : 0;
    }
  }

  const order: any = {
    id,
    invoiceId: resolvedInvoiceId,
    businessId,
    userId: finalUserId,
    customerName: auth ? (auth as any).name : customerName,
    customerPhone: auth ? (auth as any).phone : customerPhone,
    items,
    totalAmount: Number(totalAmount),
    status: "pending",
    paymentMode: paymentMode || "cash",
    transactionId: transactionId || undefined,
    deliveryAddress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    walletRedeemed: redeemedAmount || undefined,
  };

  await redis.set(keys.order(id), order);

  // Link order to user's order list
  await redis.sadd(keys.ordersByUser(finalUserId), id);
  await redis.sadd(keys.ordersByBusiness(businessId), id);

  // Reduce stock for each ordered item
  await adjustStock(items, -1);

  // Record history if user is authenticated
  if (auth) {
    await recordHistory("order", id, "create", order, auth.userId);
  }

  // --- WhatsApp Notifications (Async) ---
  const targetPhone = order.customerPhone;
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;

  if (targetPhone) {
    notifyOrderConfirmation(targetPhone, order).catch(console.error);
  }
  if (adminPhone) {
    notifyAdminNewOrder(adminPhone, order).catch(console.error);
  }

  // Return the order AND a token for the newly created/identified user
  // This allows the frontend to automatically log them in
  const userProfile = await redis.get<User>(keys.user(finalUserId));
  const token = userProfile ? await signToken({ userId: userProfile.id, role: userProfile.role }) : null;

  return NextResponse.json({ order, token }, { status: 201 });
}
