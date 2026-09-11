import assert from "node:assert/strict";
// Run against a LOCAL preview only; it deliberately allocates two test coupons.
const origin = process.argv[2];
if (!origin || !["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("Pass a local preview URL; do not run this against a real campaign.");
const jar = new Map();
async function call(path, data) {
  const response = await fetch(`${origin}/api/${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "Origin": origin, "Cookie": [...jar].map(([k, v]) => `${k}=${v}`).join("; ") },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";")[0], index = pair.indexOf("=");
    if (pair.slice(index + 1)) jar.set(pair.slice(0, index), pair.slice(index + 1)); else jar.delete(pair.slice(0, index));
  }
  return { status: response.status, data: await response.json() };
}
const phone = "9" + String(Date.now()).slice(-9);
assert.equal((await call("coupon/reveal", {})).status, 401);
assert.equal((await call("otp/send", { phone: "123" })).status, 400);
const first = await call("otp/send", { phone });
assert.equal(first.status, 200); assert.match(first.data.demoCode, /^\d{6}$/);
assert.equal((await call("otp/send", { phone })).status, 429);
const wrong = first.data.demoCode === "000000" ? "111111" : "000000";
assert.equal((await call("otp/verify", { code: wrong })).status, 400);
const verified = await call("otp/verify", { code: first.data.demoCode });
assert.equal(verified.status, 200); assert.equal(verified.data.coupon.revealed, false);
const code = verified.data.coupon.code;
assert.equal(verified.data.coupon.validUntil, "October 5, 2026");
assert.equal((await call("session")).data.coupon.code, code);
assert.equal((await call("coupon/reveal", {})).data.coupon.revealed, true);
assert.equal((await call("session")).data.coupon.revealed, true);
await call("session", {});
assert.deepEqual((await call("session")).data, {});
const again = await call("otp/send", { phone: "+91 " + phone });
const returning = await call("otp/verify", { code: again.data.demoCode });
assert.equal(returning.status, 200); assert.equal(returning.data.coupon.code, code); assert.equal(returning.data.coupon.revealed, true);
await call("session", {});
const phone2 = phone.slice(0, -1) + ((Number(phone.at(-1)) + 1) % 10);
const sent = await call("otp/send", { phone: phone2 });
assert.equal(sent.status, 200);
console.log("Validation, incorrect OTP retry, restore, reveal persistence and returning number checks passed. Checking resend cooldown…");
await new Promise(resolve => setTimeout(resolve, 31000));
const resent = await call("otp/send", { phone: phone2 });
assert.equal(resent.status, 200);
if (sent.data.demoCode !== resent.data.demoCode) assert.equal((await call("otp/verify", { code: sent.data.demoCode })).status, 400);
const second = await call("otp/verify", { code: resent.data.demoCode });
assert.equal(second.status, 200); assert.notEqual(second.data.coupon.code, code);
await call("session", {});
console.log("PASS: full API flow, resend invalidation, two unique allocations, one persistent coupon per normalized phone.");
