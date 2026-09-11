export const CAMPAIGN = {
  name: "The Benne Lucky Draw", size: 1000,
  validUntil: "October 5, 2026", expiresAt: "2026-10-05T23:59:59.999+05:30",
  otpLifetime: 300, resendDelay: 30,
} as const;
export type Coupon = {
  code: string; offer: string; detail: string;
  revealed: boolean; active: boolean; validUntil: string;
};
export function normalizePhone(value: string) {
  let digits = value.replace(/[\s()-]/g, "");
  if (digits.startsWith("+91")) digits = digits.slice(3);
  if (!/^[6-9]\d{9}$/.test(digits)) throw new Error("Enter a valid 10-digit Indian mobile number.");
  return "+91" + digits;
}
export function isCampaignActive(now = Date.now()) {
  return now <= Date.parse(CAMPAIGN.expiresAt);
}
