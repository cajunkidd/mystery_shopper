// SystemConfig-backed runtime config. Keys with hard defaults so the app
// runs even if the table is empty. Values cached per-process for one minute.

import { prisma } from "./db.js";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<unknown>>();
const TTL_MS = 60_000;

async function getValue<T>(key: string, fallback: T): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  const value = (row?.value as T | undefined) ?? fallback;
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

export function clearConfigCache(): void {
  cache.clear();
}

// §11: default 12 months from shop date.
export async function audioRetentionDays(): Promise<number> {
  const v = await getValue<number>("audio.retention_days", 365);
  return typeof v === "number" && v > 0 ? v : 365;
}

// §15: default escalation window for unresolved appeals.
export async function appealEscalationDays(): Promise<number> {
  const v = await getValue<number>("appeal.escalation_days", 7);
  return typeof v === "number" && v > 0 ? v : 7;
}

// §6.5 default toggle for the gamification module per location/global.
export async function gamificationEnabled(): Promise<boolean> {
  const v = await getValue<boolean>("gamification.enabled", true);
  return v !== false;
}
