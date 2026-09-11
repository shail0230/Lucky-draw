import { AppError, database, getCoupon, serializeCoupon } from "@/lib/server/store";
import { authenticated, cookie, json, safe, sameOrigin, setCookie } from "@/lib/server/http";
export async function GET(request: Request) {
  return safe(async () => {
    if (!cookie(request, "benne_session")) return json({});
    try {
      const { db, phone } = await authenticated(request);
      const coupon = await getCoupon(db, phone);
      return json({ phone, coupon: coupon ? serializeCoupon(coupon) : undefined });
    } catch (e) { if (e instanceof AppError && e.status === 401) return json({}); throw e; }
  });
}
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const db = await database();
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(cookie(request, "benne_session")).run();
    const response = json({ ok: true });
    setCookie(response, request, "benne_session", "", 0);
    setCookie(response, request, "benne_challenge", "", 0);
    return response;
  });
}
