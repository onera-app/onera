-- Enable RLS on all public tables as defense-in-depth
-- No policies = deny all access via PostgREST (anon/authenticated keys)
-- service_role key bypasses RLS, so server-side tRPC is unaffected

ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "credentials" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "devices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "enclave_assignments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "enclaves" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "folders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "key_shares" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "model_servers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "prompts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "server_models" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "usage_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "webauthn_credentials" ENABLE ROW LEVEL SECURITY;
