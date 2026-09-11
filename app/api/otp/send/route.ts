import { normalizePhone } from "@/lib/campaign";
import { AppError, database } from "@/lib/server/store";
import { body, json, safe, sameOrigin, setCookie } from "@/lib/server/http";
import { issueOtp } from "@/lib/server/otp";
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const data = await body(request);
    if (typeof data.phone !== "string") throw new AppError("Enter your mobile number.");
    let phone: string;
    try { phone = normalizePhone(data.phone); } catch (e) { throw new AppError((e as Error).message); }
    const db = await database();
    const { id, ...challenge } = await issueOtp(db, phone);
    const response = json(challenge);
    setCookie(response, request, "benne_challenge", id, 600);
    setCookie(response, request, "benne_session", "", 0);
    return response;
  });
}
