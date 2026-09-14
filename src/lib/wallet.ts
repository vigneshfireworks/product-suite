import { redis, keys } from "./redis";
import { WalletTransaction } from "@/types";
import { generateId } from "./utils";

/**
 * Wallet cashback rules
 * ─────────────────────
 * Customers earn WALLET_CREDIT_PERCENT of every completed order placed with a
 * wallet-enabled business (e.g. Vinks Crackers). Example: a ₹100 order credits ₹2.
 *
 * Credits accumulate into a single running balance per customer, but the money can
 * only be REDEEMED within one fixed window — after Diwali 2026 and before Diwali 2027 —
 * regardless of when it was earned.
 */
export const WALLET_CREDIT_PERCENT = 2;

// Redeemable window: the day after Diwali 2026 through Diwali 2027.
// Assumption: "before Diwali 2027 (Oct 30 2027)" is treated as inclusive of Oct 30, 2027.
export const WALLET_VALID_FROM = "2026-11-10T00:00:00+05:30";
export const WALLET_VALID_TO = "2027-10-30T23:59:59+05:30";

export function roundRupees(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isWalletRedeemableNow(now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= new Date(WALLET_VALID_FROM).getTime() && t <= new Date(WALLET_VALID_TO).getTime();
}

export async function getWalletBalance(userId: string): Promise<number> {
  const bal = await redis.get<number>(keys.walletBalance(userId));
  return roundRupees(bal || 0);
}

export async function getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
  return (await redis.lrange<WalletTransaction>(keys.walletTxsByUser(userId), 0, -1)) || [];
}

async function recordWalletTx(tx: Omit<WalletTransaction, "id" | "createdAt">): Promise<WalletTransaction> {
  const record: WalletTransaction = { ...tx, id: generateId(), createdAt: new Date().toISOString() };
  await redis.set(keys.walletTx(record.id), record);
  await redis.lpush(keys.walletTxsByUser(tx.userId), record);
  await redis.ltrim(keys.walletTxsByUser(tx.userId), 0, 499); // keep last 500 entries
  return record;
}

/** Credit cashback for a completed, wallet-eligible purchase. Always allowed (earning has no window). */
export async function creditWalletForPurchase(opts: {
  userId: string;
  businessId: string;
  orderId: string;
  invoiceId: string;
  purchaseAmount: number;
  createdBy: string;
}): Promise<WalletTransaction> {
  const amount = roundRupees(opts.purchaseAmount * (WALLET_CREDIT_PERCENT / 100));
  const balance = await getWalletBalance(opts.userId);
  const balanceAfter = roundRupees(balance + amount);
  await redis.set(keys.walletBalance(opts.userId), balanceAfter);
  return recordWalletTx({
    userId: opts.userId,
    businessId: opts.businessId,
    orderId: opts.orderId,
    invoiceId: opts.invoiceId,
    type: "credit",
    amount,
    purchaseAmount: opts.purchaseAmount,
    balanceAfter,
    validFrom: WALLET_VALID_FROM,
    validTo: WALLET_VALID_TO,
    createdBy: opts.createdBy,
  });
}

/**
 * Redeem wallet balance against a new order. Only succeeds within the redeemable
 * window, and never redeems more than the current balance. Returns null if nothing
 * could be redeemed (outside window, zero balance, or zero amount requested).
 */
export async function redeemWalletForOrder(opts: {
  userId: string;
  businessId: string;
  orderId: string;
  invoiceId: string;
  amount: number;
  createdBy: string;
}): Promise<WalletTransaction | null> {
  if (opts.amount <= 0 || !isWalletRedeemableNow()) return null;
  const balance = await getWalletBalance(opts.userId);
  const amount = roundRupees(Math.min(opts.amount, balance));
  if (amount <= 0) return null;
  const balanceAfter = roundRupees(balance - amount);
  await redis.set(keys.walletBalance(opts.userId), balanceAfter);
  return recordWalletTx({
    userId: opts.userId,
    businessId: opts.businessId,
    orderId: opts.orderId,
    invoiceId: opts.invoiceId,
    type: "debit",
    amount: -amount,
    balanceAfter,
    createdBy: opts.createdBy,
  });
}

/** Restore a previously redeemed amount back to the wallet (e.g. the order was cancelled). */
export async function refundWalletRedemption(opts: {
  userId: string;
  businessId: string;
  orderId: string;
  invoiceId: string;
  amount: number;
  createdBy: string;
}): Promise<WalletTransaction | null> {
  if (opts.amount <= 0) return null;
  const balance = await getWalletBalance(opts.userId);
  const balanceAfter = roundRupees(balance + opts.amount);
  await redis.set(keys.walletBalance(opts.userId), balanceAfter);
  return recordWalletTx({
    userId: opts.userId,
    businessId: opts.businessId,
    orderId: opts.orderId,
    invoiceId: opts.invoiceId,
    type: "refund",
    amount: opts.amount,
    balanceAfter,
    createdBy: opts.createdBy,
  });
}

/** Manual balance adjustment by an admin or partner (positive to add, negative to deduct). */
export async function adjustWalletBalance(opts: {
  userId: string;
  amount: number;
  note?: string;
  createdBy: string;
}): Promise<WalletTransaction> {
  const balance = await getWalletBalance(opts.userId);
  const balanceAfter = Math.max(0, roundRupees(balance + opts.amount));
  await redis.set(keys.walletBalance(opts.userId), balanceAfter);
  return recordWalletTx({
    userId: opts.userId,
    type: "adjustment",
    amount: opts.amount,
    balanceAfter,
    note: opts.note,
    createdBy: opts.createdBy,
  });
}
