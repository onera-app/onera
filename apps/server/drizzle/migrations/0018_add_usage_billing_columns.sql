ALTER TABLE subscriptions ADD COLUMN usage_based_billing boolean NOT NULL DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN dodo_usage_subscription_id text;
ALTER TABLE usage_records ADD COLUMN is_overage boolean NOT NULL DEFAULT false;
