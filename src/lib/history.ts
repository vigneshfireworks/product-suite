import { redis, keys } from "./redis";
import { HistoryRecord } from "@/types";
import { generateId } from "./utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordHistory(
  entity: string,
  entityId: string,
  action: "create" | "update" | "delete",
  changes: any,
  performedBy: string,
  businessId?: string   // optional — when provided, also writes to business audit log
): Promise<void> {
  const record: HistoryRecord = {
    id: generateId(),
    entity,
    entityId,
    action,
    changes,
    performedBy,
    performedAt: new Date().toISOString(),
  };
  // Per-entity history
  const key = keys.history(entity, entityId);
  await redis.lpush(key, record);
  await redis.ltrim(key, 0, 99);

  // Business-level audit log
  if (businessId) {
    const auditKey = keys.auditByBusiness(businessId);
    await redis.lpush(auditKey, record);
    await redis.ltrim(auditKey, 0, 499); // keep last 500 per business
  }
}

export async function getHistory(entity: string, entityId: string): Promise<HistoryRecord[]> {
  const key = keys.history(entity, entityId);
  return (await redis.lrange<HistoryRecord>(key, 0, -1)) || [];
}

export async function getBusinessAudit(businessId: string): Promise<HistoryRecord[]> {
  const key = keys.auditByBusiness(businessId);
  return (await redis.lrange<HistoryRecord>(key, 0, -1)) || [];
}
