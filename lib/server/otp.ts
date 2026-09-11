import { CAMPAIGN } from "../campaign";
import { AppError } from "./store";
export function randomInt(max: number) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % max;
}
export async function hashCode(id: string, code: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id + ":" + code));
  return Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, "0")).join("");
}
// Explicit simulation adapter. Replace with an SMS gateway, then remove
// demoCode from the response and the corresponding demo panel in the UI.
export const demoSms = {
  async send(_phone: string, code: string) { return { demoCode: code }; },
};
export async function issueOtp(db: D1Database, phone: string) {
  const now = Date.now(), id = crypto.randomUUID();
  const code = String(randomInt(1_000_000)).padStart(6, "0");
  const codeHash = await hashCode(id, code);
  const expiresAt = now + CAMPAIGN.otpLifetime * 1000;
  const resendAt = now + CAMPAIGN.resendDelay * 1000;
  // Atomic cooldown and replacement: sending again invalidates the old code.
  const issued = await db.prepare(`INSERT INTO otp_challenges (id, phone, code_hash, expires_at, resend_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(phone) DO UPDATE SET id=excluded.id, code_hash=excluded.code_hash,
    expires_at=excluded.expires_at, resend_at=excluded.resend_at
    WHERE otp_challenges.resend_at <= ? RETURNING id`).bind(id, phone, codeHash, expiresAt, resendAt, now).first();
  if (!issued) {
    const old = await db.prepare("SELECT resend_at FROM otp_challenges WHERE phone = ?").bind(phone).first<{ resend_at: number }>();
    throw new AppError(`Please wait ${Math.max(1, Math.ceil(((old?.resend_at ?? now + 30000) - now) / 1000))} seconds before requesting another code.`, 429);
  }
  const delivery = await demoSms.send(phone, code);
  return { id, phone, expiresAt, resendAt, ...delivery };
}
export async function verifyOtp(db: D1Database, id: string, code: string) {
  if (!/^\d{6}$/.test(code)) throw new AppError("Enter the 6-digit verification code.");
  const record = await db.prepare("SELECT * FROM otp_challenges WHERE id = ?").bind(id).first<{ phone: string; code_hash: string; expires_at: number }>();
  if (!record) throw new AppError("Request a new code to continue. Your previous code is no longer valid.");
  const now = Date.now();
  if (record.expires_at <= now) throw new AppError("Your code has expired. Tap Resend OTP to get a new one.");
  const codeHash = await hashCode(id, code);
  if (codeHash !== record.code_hash) throw new AppError("That code isn’t quite right. Please try again.");
  const sessionId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(`INSERT INTO sessions (id, phone, expires_at) SELECT ?, phone, ? FROM otp_challenges
      WHERE id = ? AND code_hash = ? AND expires_at > ? RETURNING phone`).bind(sessionId, now + 86400000, id, codeHash, now),
    db.prepare("DELETE FROM otp_challenges WHERE id = ? AND code_hash = ?").bind(id, codeHash),
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
  ]);
  if (!results[0].results.length) throw new AppError("This code was already used. Request a new one to continue.");
  return { phone: record.phone, sessionId };
}
