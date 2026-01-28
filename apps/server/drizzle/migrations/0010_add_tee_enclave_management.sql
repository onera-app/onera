-- TEE Enclave Management Schema
-- This migration adds tables for managing Trusted Execution Environment enclaves

CREATE TABLE IF NOT EXISTS "enclaves" (
  "id" text PRIMARY KEY NOT NULL,
  "model_id" text NOT NULL,
  "tier" text NOT NULL,
  "status" text NOT NULL,
  "host" text NOT NULL,
  "port" integer NOT NULL,
  "ws_endpoint" text NOT NULL,
  "attestation_endpoint" text NOT NULL,
  "public_key" text,
  "launch_digest" text,
  "last_attestation_at" timestamp,
  "current_connections" integer DEFAULT 0,
  "max_connections" integer DEFAULT 10,
  "dedicated_to_user_id" text,
  "azure_vm_id" text,
  "azure_resource_group" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "last_health_check_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "private_inference_models" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "display_name" text NOT NULL,
  "context_length" integer NOT NULL,
  "weights_path" text NOT NULL,
  "min_gpu_memory_gb" integer NOT NULL,
  "recommended_gpu_memory_gb" integer NOT NULL,
  "expected_launch_digest" text,
  "enabled" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enclave_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "enclave_id" text NOT NULL,
  "user_id" text NOT NULL,
  "session_id" text NOT NULL,
  "assigned_at" timestamp DEFAULT now() NOT NULL,
  "last_activity_at" timestamp DEFAULT now() NOT NULL,
  "released_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enclave_assignments" ADD CONSTRAINT "enclave_assignments_enclave_id_enclaves_id_fk" FOREIGN KEY ("enclave_id") REFERENCES "public"."enclaves"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
