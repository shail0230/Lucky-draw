import type { Coupon } from "./campaign";
// Swap this boundary for a different backend without changing the components.
async function request<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: data === undefined ? "GET" : "POST", credentials: "same-origin",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}
export type Challenge = { phone: string; demoCode: string; resendAt: number; expiresAt: number };
export const campaignApi = {
  session: () => request<{ phone?: string; coupon?: Coupon }>("session"),
  sendOtp: (phone: string) => request<Challenge>("otp/send", { phone }),
  verifyOtp: (code: string) => request<{ coupon: Coupon; phone: string }>("otp/verify", { code }),
  reveal: () => request<{ coupon: Coupon }>("coupon/reveal", {}),
  logout: () => request<{ ok: boolean }>("session", {}),
};
