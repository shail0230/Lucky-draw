CREATE TABLE `otp_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`resend_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `otp_challenges_phone_unique` ON `otp_challenges` (`phone`);--> statement-breakpoint
CREATE TABLE `coupons` (
	`code` text PRIMARY KEY NOT NULL,
	`offer` text NOT NULL,
	`detail` text NOT NULL,
	`pool_order` integer NOT NULL,
	`phone` text,
	`assigned_at` integer,
	`revealed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_pool_order_unique` ON `coupons` (`pool_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_phone_unique` ON `coupons` (`phone`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);