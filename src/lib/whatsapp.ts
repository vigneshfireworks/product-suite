import { NextResponse } from "next/server";

async function sendWhatsAppMessage(to: string, message: string) {
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!TOKEN || !PHONE_NUMBER_ID) {
    console.error("WhatsApp credentials missing in environment variables");
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""), // Ensure only digits
        type: "text",
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("WhatsApp API error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("WhatsApp request failed:", error);
    return false;
  }
}

export async function notifyOrderConfirmation(customerPhone: string, order: any) {
  const message = `📦 Order Confirmed!\n\nInvoice: ${order.invoiceId}\nTotal: ₹${order.totalAmount}\nAddress: ${order.deliveryAddress}\n\nThank you for shopping!`;
  return sendWhatsAppMessage(customerPhone, message);
}

export async function notifyAdminNewOrder(adminPhone: string, order: any) {
  const message = `🚀 New Order Received!\n\nInvoice: ${order.invoiceId}\nBusiness: ${order.businessId}\nTotal: ₹${order.totalAmount}\nCustomer: ${order.customerName || 'Guest'}\nPhone: ${order.customerPhone || 'N/A'}`;
  return sendWhatsAppMessage(adminPhone, message);
}
