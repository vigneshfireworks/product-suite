"use client";
import React, { useState } from "react";
import { X, Printer, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Order, OrderItem } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface InvoiceModalProps {
  order: Order;
  businessName: string;
  businessLogo?: string;
  customerName: string;
  customerPhone?: string;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 10;

const STATUS_LABEL: Record<string, string> = {
  pending:             "Pending",
  dispatched:          "Dispatched",
  payment_partially:   "Partially Paid",
  payment_success:     "Payment Success",
  delivered_completed: "Delivered & Completed",
  payment_failed:      "Payment Failed",
  cancelled:           "Cancelled",
};

/* ── Print HTML (all items, no pagination) ─────────────────────── */
function buildPrintHtml(
  order: Order,
  businessName: string,
  businessLogo: string | undefined,
  customerName: string,
  customerPhone: string | undefined
) {
  const logoHtml = businessLogo
    ? `<img src="${businessLogo}" style="width:60px;height:60px;border-radius:10px;object-fit:cover" />`
    : `<div style="width:60px;height:60px;border-radius:10px;background:#FFF3CC;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:#D4A017">${businessName.charAt(0).toUpperCase()}</div>`;

  const statusColor = ({
    payment_partially:   "#ea580c",
    payment_success:     "#059669",
    delivered_completed: "#047857",
    pending:             "#d97706",
    dispatched:          "#1d4ed8",
    payment_failed:      "#dc2626",
    cancelled:           "#64748b",
  } as Record<string, string>)[order.status] ?? "#6b7280";

  const rows = order.items.map((item, i) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:12px;text-align:center">${i + 1}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;font-size:13px">${item.productName}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:13px">${item.quantity}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px">${formatCurrency(item.price)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;font-size:13px">${formatCurrency(item.price * item.quantity)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${order.invoiceId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; padding: 36px; }
    @media print { body { padding: 20px; } @page { margin: 12mm; } }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f9fafb; padding: 10px 12px; font-weight: 600; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 2px solid #f0f0f0; }
  </style>
</head>
<body>
<div style="max-width:740px;margin:0 auto">

  <!-- Business Header -->
  <div style="display:flex;align-items:center;gap:16px;padding-bottom:24px;border-bottom:2px solid #f3f4f6;margin-bottom:24px">
    ${logoHtml}
    <div>
      <div style="font-size:20px;font-weight:700">${businessName}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:3px;text-transform:uppercase;letter-spacing:.05em">Official Invoice</div>
    </div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-family:monospace;font-size:14px;font-weight:700;color:#7c3aed">${order.invoiceId}</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:4px">${formatDateTime(order.createdAt)}</div>
      <div style="font-size:11px;color:#d1d5db;margin-top:2px">ref: #${order.id.slice(-8).toUpperCase()}</div>
    </div>
  </div>

  <!-- Bill To -->
  <div style="margin-bottom:24px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:8px">Bill To</div>
    <div style="background:#f9fafb;border-radius:10px;padding:14px 18px">
      <div style="font-weight:700;font-size:15px">${customerName}</div>
      ${customerPhone ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">📞 ${customerPhone}</div>` : ""}
      ${order.deliveryAddress ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">📍 ${order.deliveryAddress}</div>` : ""}
    </div>
  </div>

  <!-- Items Table -->
  <div style="margin-bottom:20px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:8px">Items</div>
    <div style="border:1px solid #f0f0f0;border-radius:10px;overflow:hidden">
      <table>
        <thead>
          <tr>
            <th style="text-align:center;width:36px">#</th>
            <th style="text-align:left">Product</th>
            <th style="text-align:center;width:60px">Qty</th>
            <th style="text-align:right;width:100px">Unit Price</th>
            <th style="text-align:right;width:100px">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#fafafa">
            <td colspan="4" style="padding:12px;text-align:right;font-weight:700;font-size:14px;color:#374151;border-top:2px solid #e5e7eb">Grand Total</td>
            <td style="padding:12px;text-align:right;font-weight:700;font-size:15px;color:#1a1a2e;border-top:2px solid #e5e7eb">${formatCurrency(order.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <!-- Payment Info -->
  <div style="display:grid;grid-template-columns:1fr 1fr${order.transactionId ? " 1fr" : ""};gap:12px;margin-bottom:28px">
    <div style="background:#eff6ff;border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:10px;font-weight:600;color:#3b82f6;margin-bottom:4px;text-transform:uppercase">Payment Mode</div>
      <div style="font-size:13px;font-weight:700;text-transform:capitalize">${(order.paymentMode || "cash").replace(/_/g, " ")}</div>
    </div>
    <div style="background:#f9fafb;border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:10px;font-weight:600;color:#6b7280;margin-bottom:4px;text-transform:uppercase">Status</div>
      <div style="font-size:13px;font-weight:700;color:${statusColor}">${STATUS_LABEL[order.status] ?? order.status.replace(/_/g, " ")}</div>
    </div>
    ${order.transactionId ? `
    <div style="background:#f5f3ff;border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:10px;font-weight:600;color:#7c3aed;margin-bottom:4px;text-transform:uppercase">Transaction ID</div>
      <div style="font-size:11px;font-weight:700;font-family:monospace;word-break:break-all;color:#7c3aed">${order.transactionId}</div>
    </div>` : ""}
  </div>

  <!-- Footer -->
  <div style="padding-top:18px;border-top:1px dashed #e5e7eb;text-align:center;color:#9ca3af;font-size:11px">
    <div>Thank you for shopping with <strong>${businessName}</strong>! 🎉</div>
    <div style="margin-top:3px;color:#d1d5db">Generated on ${new Date().toLocaleString("en-IN")}</div>
  </div>

</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close();},800);}<\/script>
</body>
</html>`;
}

/* ── InvoiceModal ───────────────────────────────────────────────── */
export function InvoiceModal({
  order,
  businessName,
  businessLogo,
  customerName,
  customerPhone,
  onClose,
}: InvoiceModalProps) {
  const [itemPage, setItemPage] = useState(1);

  const totalItemPages = Math.ceil(order.items.length / ITEMS_PER_PAGE);
  const pagedItems: OrderItem[] = order.items.slice(
    (itemPage - 1) * ITEMS_PER_PAGE,
    itemPage * ITEMS_PER_PAGE
  );
  const hasPagination = order.items.length > ITEMS_PER_PAGE;

  const handlePrint = () => {
    const html = buildPrintHtml(order, businessName, businessLogo, customerName, customerPhone);
    const w = window.open("", "_blank", "width=820,height=950");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const statusStyle: Record<string, { bg: string; color: string }> = {
    payment_partially:   { bg: "#ffedd5", color: "#ea580c" },
    payment_success:     { bg: "#d1fae5", color: "#059669" },
    delivered_completed: { bg: "#a7f3d0", color: "#047857" },
    pending:         { bg: "#fef3c7", color: "#d97706" },
    dispatched:      { bg: "#dbeafe", color: "#1d4ed8" },
    payment_failed:  { bg: "#fee2e2", color: "#dc2626" },
    cancelled:       { bg: "#f1f5f9", color: "#64748b" },
  };
  const ss = statusStyle[order.status] ?? { bg: "#f1f5f9", color: "#64748b" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={17} className="text-purple-600" />
            <span className="font-heading font-bold text-brand-dark">Invoice</span>
            <span className="font-mono text-sm font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">
              {order.invoiceId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: "#1a1a2e" }}>
              <Printer size={13} /> Print / PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Business + Invoice meta */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            {businessLogo ? (
              <img src={businessLogo} alt={businessName}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-xl font-bold text-accent flex-shrink-0">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-heading font-bold text-brand-dark truncate">{businessName}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">Official Invoice</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-mono text-xs font-bold text-purple-700">{order.invoiceId}</div>
              <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.createdAt)}</div>
              <div className="text-xs text-gray-300">ref #{order.id.slice(-8).toUpperCase()}</div>
            </div>
          </div>

          {/* Bill To */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Bill To</div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-0.5">
              <div className="font-bold text-brand-dark">{customerName}</div>
              {customerPhone && <div className="text-sm text-gray-500">📞 {customerPhone}</div>}
              {order.deliveryAddress && <div className="text-sm text-gray-500">📍 {order.deliveryAddress}</div>}
            </div>
          </div>

          {/* Items table with pagination */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Items ({order.items.length})
              </div>
              {hasPagination && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setItemPage(p => Math.max(1, p - 1))}
                    disabled={itemPage === 1}
                    className="p-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={13} />
                  </button>
                  <span className="text-xs text-gray-500 min-w-[56px] text-center">
                    {itemPage} / {totalItemPages}
                  </span>
                  <button onClick={() => setItemPage(p => Math.min(totalItemPages, p + 1))}
                    disabled={itemPage === totalItemPages}
                    className="p-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 w-9">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 w-14">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-24">Unit Price</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedItems.map((item, i) => {
                    const globalIdx = (itemPage - 1) * ITEMS_PER_PAGE + i;
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-center text-xs text-gray-400">{globalIdx + 1}</td>
                        <td className="px-4 py-2.5 font-semibold text-brand-dark text-sm">{item.productName}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600 text-sm">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500 text-sm">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-brand-dark text-sm">{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-gray-600">
                      Grand Total
                      {hasPagination && (
                        <span className="ml-2 text-xs font-normal text-gray-400">(all {order.items.length} items)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold text-brand-dark">
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-1">Payment Mode</div>
              <div className="text-sm font-bold text-brand-dark capitalize">
                {(order.paymentMode || "cash").replace(/_/g, " ")}
              </div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: ss.bg }}>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: ss.color }}>Status</div>
              <div className="text-sm font-bold" style={{ color: ss.color }}>
                {STATUS_LABEL[order.status] ?? order.status.replace(/_/g, " ")}
              </div>
            </div>
            {order.transactionId ? (
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-semibold text-purple-500 uppercase tracking-wide mb-1">Txn ID</div>
                <div className="font-mono text-xs font-bold text-purple-700 break-all">{order.transactionId}</div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Txn ID</div>
                <div className="text-sm text-gray-300">—</div>
              </div>
            )}
          </div>

          {/* Thank-you footer */}
          <div className="pt-3 border-t border-dashed border-gray-200 text-center pb-1">
            <div className="text-xs text-gray-400">
              Thank you for shopping with <span className="font-semibold">{businessName}</span>! 🎉
            </div>
            <div className="text-xs text-gray-300 mt-0.5">Placed on {formatDateTime(order.createdAt)}</div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
          <button onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: "#1a1a2e" }}>
            <Printer size={14} /> Print / Download PDF
          </button>
          <button onClick={onClose}
            className="py-2.5 px-5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
