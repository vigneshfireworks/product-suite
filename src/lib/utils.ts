import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    dispatched: "bg-blue-100 text-blue-800",
    payment_partially:   "bg-orange-100 text-orange-800",
    payment_success:     "bg-green-100 text-green-800",
    delivered_completed: "bg-emerald-100 text-emerald-800",
    payment_failed:      "bg-red-100 text-red-800",
    cancelled:           "bg-gray-100 text-gray-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    closed: "bg-gray-100 text-gray-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}
