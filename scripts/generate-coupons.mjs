import { randomInt, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const output = fileURLToPath(new URL("../data/coupons.json", import.meta.url));
if (existsSync(output)) throw new Error("A pool already exists. Never regenerate IDs for a running campaign.");
// Example prize mix. Confirm restaurant prizes and terms before a public launch.
const prizes = [
  { count: 1, offer: "One year of bene dosa", detail: "Your year just got a little more delicious." },
  { count: 49, offer: "A bene dosa, on us", detail: "Enjoy one complimentary bene dosa." },
  { count: 150, offer: "20% off your bill", detail: "A little extra joy at your next meal." },
  { count: 300, offer: "15% off your bill", detail: "Your favourite flavours, with a little treat." },
  { count: 500, offer: "10% off your bill", detail: "Something delicious to look forward to." },
];
const pool = prizes.flatMap(prize => Array.from({ length: prize.count }, () => ({ offer: prize.offer, detail: prize.detail })));
if (pool.length !== 1000) throw new Error("Expected exactly 1000 coupons");
// Layer one: Fisher–Yates shuffle using cryptographic rejection-sampled RNG.
for (let i = pool.length - 1; i > 0; i--) { const j = randomInt(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
// Layer two: sequential campaign identifier guarantees uniqueness independently
// of randomness; random suffix makes codes less predictable.
const coupons = pool.map((prize, i) => ({ code: `BEN26-${String(i + 1).padStart(4, "0")}-${randomBytes(3).toString("hex").toUpperCase()}`, ...prize, poolOrder: i }));
mkdirSync(new URL("../data", import.meta.url), { recursive: true });
writeFileSync(output, JSON.stringify(coupons, null, 2) + "\n");
console.log(`Generated ${coupons.length} unique campaign coupons.`);
