import { AppError, type CouponRow, serializeCoupon } from "@/lib/server/store";
import { authenticated, json, safe, sameOrigin } from "@/lib/server/http";
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const { db, phone } = await authenticated(request);
    const coupon = await db.prepare("UPDATE coupons SET revealed = 1 WHERE phone = ? RETURNING *").bind(phone).first<CouponRow>();
    if (!coupon) throw new AppError("Please verify your number to receive your coupon.", 404);
    return json({ coupon: serializeCoupon(coupon) });
  });
}
