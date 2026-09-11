import { allocateCoupon, AppError, database, serializeCoupon } from "@/lib/server/store";
import { body, cookie, json, safe, sameOrigin, setCookie } from "@/lib/server/http";
import { verifyOtp } from "@/lib/server/otp";
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const data = await body(request);
    if (typeof data.code !== "string") throw new AppError("Enter your verification code.");
    const db = await database();
    const verified = await verifyOtp(db, cookie(request, "benne_challenge"), data.code);
    const coupon = await allocateCoupon(db, verified.phone);
    const response = json({ phone: verified.phone, coupon: serializeCoupon(coupon) });
    setCookie(response, request, "benne_session", verified.sessionId, 86400);
    setCookie(response, request, "benne_challenge", "", 0);
    return response;
  });
}
