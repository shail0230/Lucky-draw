import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const coupons = sqliteTable("coupons", {
 code: text("code").primaryKey(), offer: text("offer").notNull(), detail: text("detail").notNull(),
 poolOrder: integer("pool_order").notNull().unique(), phone: text("phone").unique(),
 assignedAt: integer("assigned_at"), revealed: integer("revealed").notNull().default(0),
});
export const challenges = sqliteTable("otp_challenges", {
 id: text("id").primaryKey(), phone: text("phone").notNull().unique(), codeHash: text("code_hash").notNull(),
 expiresAt: integer("expires_at").notNull(), resendAt: integer("resend_at").notNull(),
});
export const sessions = sqliteTable("sessions", {
 id: text("id").primaryKey(), phone: text("phone").notNull(), expiresAt: integer("expires_at").notNull(),
}, table => [index("sessions_expiry_idx").on(table.expiresAt)]);
