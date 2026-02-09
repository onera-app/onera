-- Add BYOK inference requests limit column to plans
-- Default -1 (unlimited) for backward compatibility with existing plans
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "byok_inference_requests_limit" integer NOT NULL DEFAULT -1;
