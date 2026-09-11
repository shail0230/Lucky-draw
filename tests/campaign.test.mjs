import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { SEED_SQL, ALLOCATE_SQL } from "../lib/server/sql.ts";
import { normalizePhone, isCampaignActive, CAMPAIGN } from "../lib/campaign.ts";

const pool = JSON.parse(readFileSync(new URL("../data/coupons.json", import.meta.url), "utf8"));
function database() {
  const db = new DatabaseSync(":memory:");
  const directory = new URL("../drizzle/", import.meta.url);
  for (const file of readdirSync(directory).filter(x => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(file, directory), "utf8"));
  db.prepare(SEED_SQL).run(JSON.stringify(pool));
  return db;
}
test("pool contains exactly 1,000 unique identifiers and one grand prize", () => {
  assert.equal(pool.length, CAMPAIGN.size);
  assert.equal(new Set(pool.map(x => x.code)).size, 1000);
  assert.equal(new Set(pool.map(x => x.poolOrder)).size, 1000);
  assert.equal(pool.filter(x => x.offer === "One year of bene dosa").length, 1);
});
test("normalization prevents different formats of the same number receiving extra coupons", () => {
  assert.equal(normalizePhone("9876543210"), normalizePhone("+91 98765 43210"));
  for (const value of ["1234567890", "987654321", "98765432100", "abcdefghi", "+44 9876543210"]) assert.throws(() => normalizePhone(value));
});
test("validity includes the full October 5 day in India and ends at midnight", () => {
  assert.equal(isCampaignActive(Date.parse("2026-10-05T23:59:59.999+05:30")), true);
  assert.equal(isCampaignActive(Date.parse("2026-10-06T00:00:00+05:30")), false);
});
test("seeding can repeat without replacing already assigned or revealed coupons", () => {
  const db = database();
  const phone = "+919876543210";
  const coupon = db.prepare(ALLOCATE_SQL).get(phone, Date.now(), phone);
  db.prepare("UPDATE coupons SET revealed=1 WHERE phone=?").run(phone);
  db.prepare(SEED_SQL).run(JSON.stringify(pool));
  assert.equal(db.prepare("SELECT COUNT(*) n FROM coupons").get().n, 1000);
  assert.equal(db.prepare("SELECT code FROM coupons WHERE phone=?").get(phone).code, coupon.code);
  assert.equal(db.prepare("SELECT revealed FROM coupons WHERE phone=?").get(phone).revealed, 1);
  db.close();
});
test("duplicate allocations consume nothing and exhaustion never issues coupon 1,001", () => {
  const db = database();
  const allocated = new Set();
  for (let i = 0; i < 1000; i++) {
    const phone = "+919" + String(i).padStart(9, "0");
    const first = db.prepare(ALLOCATE_SQL).get(phone, i, phone);
    assert.ok(first); assert.ok(!allocated.has(first.code)); allocated.add(first.code);
    assert.equal(db.prepare(ALLOCATE_SQL).get(phone, i, phone), undefined);
  }
  assert.equal(allocated.size, 1000);
  assert.equal(db.prepare(ALLOCATE_SQL).get("+918888888888", 1001, "+918888888888"), undefined);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM coupons WHERE phone IS NOT NULL").get().n, 1000);
  db.close();
});
