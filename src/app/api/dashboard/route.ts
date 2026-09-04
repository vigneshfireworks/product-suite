import { NextRequest, NextResponse } from "next/server";
import { redis, keys } from "@/lib/redis";
import { requireAuth } from "@/lib/apiAuth";
import { Business, Order, Expense, Loan, User } from "@/types";

// ── Date range helpers ────────────────────────────────────────────────────────
function inRange(ts: string | null | undefined, from?: string | null, to?: string | null): boolean {
  if (!ts) return false;
  if (!from && !to) return true;
  const t = new Date(ts).getTime();
  // Use local midnight for boundaries so IST (UTC+5:30) doesn't shift dates by ±1 day.
  // "2026-09-01" without a timezone = UTC midnight, which is Aug 31 18:30 IST.
  // Appending "T00:00:00" (no Z) forces local-midnight interpretation on the server.
  if (from && t < new Date(from + "T00:00:00").getTime()) return false;
  if (to   && t > new Date(to   + "T23:59:59.999").getTime()) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["admin", "partner"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const from       = searchParams.get("from");   // yyyy-mm-dd
  const to         = searchParams.get("to");     // yyyy-mm-dd

  // ── Helper: load and split orders for one business ────────────────────────
  // Returns:
  //   ordersInRange      - orders placed (createdAt) within the date window  → counts
  //   completedInRange   - orders completed (completedAt) within the window  → revenue/profit
  //   expensesInRange    - expenses within the window
  async function aggregateBusiness(bid: string) {
    const orderIds   = (await redis.smembers<string[]>(keys.ordersByBusiness(bid)))  || [];
    const allOrders  = (await Promise.all(orderIds.map(id => redis.get<Order>(keys.order(id))))).filter(Boolean) as Order[];

    const expenseIds = (await redis.smembers<string[]>(keys.expensesByBusiness(bid))) || [];
    const allExp     = (await Promise.all(expenseIds.map(id => redis.get<Expense>(keys.expense(id))))).filter(Boolean) as Expense[];

    // Order COUNTS are by placement date (createdAt)
    const ordersInRange = allOrders.filter(o => inRange(o.createdAt, from, to));

    // Revenue / Profit / "Delivered & Done" count is by COMPLETION date (completedAt)
    // Falls back to updatedAt for legacy orders completed before completedAt field was added
    const completedInRange = allOrders.filter(o =>
      o.status === "delivered_completed" &&
      inRange(o.completedAt || o.updatedAt, from, to)
    );

    // Expenses are attributed by when they occurred
    const expensesInRange = allExp.filter(e => inRange(e.date || e.createdAt, from, to));

    return { ordersInRange, completedInRange, expensesInRange };
  }

  // ── Fetch registered users for analytics ─────────────────────────────────
  const allUserIds = (await redis.smembers<string[]>(keys.users())) || [];
  const allUsers   = (await Promise.all(allUserIds.map(id => redis.get<User>(keys.user(id))))).filter(Boolean) as User[];
  const registeredUserIdSet = new Set(allUsers.map(u => u.id));

  function userOrderStats(orders: Order[]) {
    const regOrders = orders.filter(o => o.userId && registeredUserIdSet.has(o.userId));
    const anonOrders = orders.filter(o => !o.userId || !registeredUserIdSet.has(o.userId));
    const usersWithOrders = new Set(regOrders.map(o => o.userId));
    const anonUserIds = new Set(anonOrders.filter(o => o.userId).map(o => o.userId));
    const anonNoIdCount = anonOrders.filter(o => !o.userId).length;
    return {
      registeredWithOrders: usersWithOrders.size,
      registeredNoOrders:   allUsers.length - usersWithOrders.size,
      anonymousUsers:       anonUserIds.size + anonNoIdCount,
      totalRegistered:      allUsers.length,
    };
  }

  // ── Single-business mode ──────────────────────────────────────────────────
  if (businessId) {
    const { ordersInRange, completedInRange, expensesInRange } = await aggregateBusiness(businessId);

    const sales = completedInRange.reduce((s, o) => s + o.totalAmount, 0);
    const exp   = expensesInRange.reduce((s, e) => s + e.amount, 0);

    return NextResponse.json({
      // Order counts — by placement date
      totalOrders:             ordersInRange.length,
      totalPending:            ordersInRange.filter(o => o.status === "pending").length,
      totalDispatched:         ordersInRange.filter(o => o.status === "dispatched").length,
      totalPaymentPartially:   ordersInRange.filter(o => o.status === "payment_partially").length,
      totalPaymentSuccess:     ordersInRange.filter(o => o.status === "payment_success").length,
      totalPaymentFailed:      ordersInRange.filter(o => o.status === "payment_failed").length,
      totalCancelled:          ordersInRange.filter(o => o.status === "cancelled").length,
      totalCash:               ordersInRange.filter(o => o.paymentMode === "cash").length,
      totalOnline:             ordersInRange.filter(o => o.paymentMode !== "cash").length,
      // Revenue — by completion date
      totalDeliveredCompleted: completedInRange.length,
      totalSales:              sales,
      totalExpenses:           exp,
      totalProfit:             sales - exp,
      ...userOrderStats(ordersInRange),
    });
  }

  // ── All-businesses (admin) mode ───────────────────────────────────────────
  const bizIds     = (await redis.smembers<string[]>(keys.businesses())) || [];
  const businesses = (await Promise.all(bizIds.map(id => redis.get<Business>(keys.business(id))))).filter(Boolean) as Business[];

  let totalOrders = 0, totalPending = 0, totalDispatched = 0;
  let totalPaymentPartially = 0, totalPaymentSuccess = 0, totalDeliveredCompleted = 0;
  let totalPaymentFailed = 0, totalCancelled = 0;
  let totalCash = 0, totalOnline = 0;
  let totalSales = 0, totalExpenses = 0;
  let totalLoans = 0, totalLoanAmount = 0;
  const allPlacedOrders: Order[] = [];

  for (const b of businesses) {
    const { ordersInRange, completedInRange, expensesInRange } = await aggregateBusiness(b.id);

    // Order counts (placement date)
    totalOrders           += ordersInRange.length;
    totalPending          += ordersInRange.filter(o => o.status === "pending").length;
    totalDispatched       += ordersInRange.filter(o => o.status === "dispatched").length;
    totalPaymentPartially += ordersInRange.filter(o => o.status === "payment_partially").length;
    totalPaymentSuccess   += ordersInRange.filter(o => o.status === "payment_success").length;
    totalPaymentFailed    += ordersInRange.filter(o => o.status === "payment_failed").length;
    totalCancelled        += ordersInRange.filter(o => o.status === "cancelled").length;
    totalCash             += ordersInRange.filter(o => o.paymentMode === "cash").length;
    totalOnline           += ordersInRange.filter(o => o.paymentMode !== "cash").length;

    // Revenue (completion date)
    totalDeliveredCompleted += completedInRange.length;
    totalSales              += completedInRange.reduce((s, o) => s + o.totalAmount, 0);
    totalExpenses           += expensesInRange.reduce((s, e) => s + e.amount, 0);

    allPlacedOrders.push(...ordersInRange);

    // Loans (not date-filtered)
    const loanIds = (await redis.smembers<string[]>(keys.loansByBusiness(b.id))) || [];
    const loans   = (await Promise.all(loanIds.map(id => redis.get<Loan>(keys.loan(id))))).filter(Boolean) as Loan[];
    totalLoans      += loans.length;
    totalLoanAmount += loans.reduce((s, l) => s + l.amount, 0);
  }

  return NextResponse.json({
    totalBusinesses: businesses.length,
    // Order counts (placement date)
    totalOrders, totalPending, totalDispatched,
    totalPaymentPartially, totalPaymentSuccess,
    totalPaymentFailed, totalCancelled,
    totalCash, totalOnline,
    // Revenue (completion date)
    totalDeliveredCompleted, totalSales, totalExpenses,
    totalProfit: totalSales - totalExpenses,
    totalLoans, totalLoanAmount,
    ...userOrderStats(allPlacedOrders),
  });
}
