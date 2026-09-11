import { env } from "cloudflare:workers";
import pool from "../../data/coupons.json";
import { CAMPAIGN, isCampaignActive, type Coupon } from "../campaign";
import { SEED_SQL, ALLOCATE_SQL } from "./sql";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export type CouponRow = { code: string; offer: string; detail: string; phone: string | null; revealed: number };
// One atomic statement selects and assigns an available coupon. Phone's UNIQUE
// constraint and NOT EXISTS make retries and concurrent duplicate entries safe.

let initialized: Promise<void> | null = null;
export async function database(): Promise<D1Database> {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) throw new AppError("The draw is temporarily unavailable. Please try again shortly.", 503);
  if (!initialized) initialized = (async () => {
    // Data only: schema is created exclusively by Drizzle migrations.
    // Fixed, checked-in IDs ensure restarts never create a different coupon pool.
    await db.prepare(SEED_SQL).bind(JSON.stringify(pool)).run();
    const count = await db.prepare("SELECT COUNT(*) AS n FROM coupons").first<{ n: number }>();
    if (count?.n !== CAMPAIGN.size) throw new Error("Campaign pool must contain exactly 1000 coupons");
  })().catch(error => { initialized = null; throw error; });
  await initialized;
  return db;
}
export function serializeCoupon(row: CouponRow): Coupon {
  return { code: row.code, offer: row.offer, detail: row.detail, revealed: !!row.revealed,
    active: isCampaignActive(), validUntil: CAMPAIGN.validUntil };
}
export async function getCoupon(db: D1Database, phone: string) {
  return db.prepare("SELECT * FROM coupons WHERE phone = ?").bind(phone).first<CouponRow>();
}
export async function allocateCoupon(db: D1Database, phone: string) {
  const existing = await getCoupon(db, phone);
  if (existing) return existing;
  if (!isCampaignActive()) throw new AppError("This lucky draw has ended. Thank you for joining us.", 410);
  const allocated = await db.prepare(ALLOCATE_SQL).bind(phone, Date.now(), phone).first<CouponRow>();
  if (allocated) return allocated;
  const retried = await getCoupon(db, phone);
  if (retried) return retried;
  throw new AppError("All 1,000 coupons have found a home. Thank you for your interest!", 409);
}
