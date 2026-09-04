export type UserRole = "admin" | "partner" | "customer";
export type BusinessCategory = "retail" | "finance" | "market_analysis" | "other";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  sex: "male" | "female" | "other";
  address: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  lastIp?: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  category: BusinessCategory;
  description: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PartnerBusinessMapping {
  businessId: string;
  investedAmount: number;
  profitRatio: number; // percentage 0-100
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  businesses: PartnerBusinessMapping[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  originalPrice: number;
  sellingPrice: number;
  discount: number;
  quantity: number;
  stock: number;
  category: string;
  subCategory?: string;
  images: string[];
  videoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type OrderStatus =
  | "pending"
  | "dispatched"
  | "payment_partially"
  | "payment_success"
  | "delivered_completed"
  | "payment_failed"
  | "cancelled";

/** Statuses that represent an active (non-terminal-failure) order */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "pending", "dispatched", "payment_partially", "payment_success", "delivered_completed",
];

export type PaymentMode = "cash" | "gpay" | "phonepay" | "other_online";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  invoiceId: string;      // shared across all orders from the same checkout session
  businessId: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMode: PaymentMode;
  transactionId?: string;
  deliveryAddress: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  completedAt?: string;   // set when status reaches payment_success (used for revenue attribution)
}

export interface CartItem {
  productId: string;
  businessId: string;
  name: string;
  price: number;
  quantity: number;
  addedAt: string;
}

export interface WatchlistItem {
  productId: string;
  businessId: string;
  addedAt: string;
}

export interface Expense {
  id: string;
  businessId: string;
  title: string;
  amount: number;
  description?: string;
  date: string;
  paymentMode?: "cash" | "gpay" | "phonepay" | "bank_transfer" | "other";
  transactionId?: string;
  paymentStatus?: "paid" | "pending" | "failed";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type LoanStatus = "pending" | "approved" | "rejected" | "closed";

export interface LoanRepayment {
  id: string;
  amount: number;
  date: string;
  updatedBy: string;
}

export interface Loan {
  id: string;
  businessId: string;
  userId: string;
  amount: number;
  duration: number; // months
  interest: number; // percentage
  status: LoanStatus;
  repayments: LoanRepayment[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface HistoryRecord {
  id: string;
  entity: string;
  entityId: string;
  action: "create" | "update" | "delete";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes: any;
  performedBy: string;
  performedAt: string;
}
