-- Re-add model_servers and server_models tables for enclave mesh routing
CREATE TABLE IF NOT EXISTS "model_servers" (
	"id" text PRIMARY KEY NOT NULL,
	"host" text NOT NULL,
	"ws_endpoint" text NOT NULL,
	"attestation_endpoint" text NOT NULL,
	"server_type" text NOT NULL,
	"gpu_model" text,
	"cpu_cores" integer,
	"memory_gb" integer,
	"status" text NOT NULL,
	"launch_digest" text,
	"last_attestation_at" timestamp,
	"last_health_check_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "server_models" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"model_id" text NOT NULL,
	"model_name" text NOT NULL,
	"display_name" text NOT NULL,
	"context_length" integer DEFAULT 8192,
	"max_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_server_model" UNIQUE("server_id","model_id")
);

CREATE INDEX IF NOT EXISTS "idx_model_servers_status" ON "model_servers" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_server_models_server_id" ON "server_models" USING btree ("server_id");
CREATE INDEX IF NOT EXISTS "idx_server_models_model_id" ON "server_models" USING btree ("model_id");

ALTER TABLE "server_models" ADD CONSTRAINT "server_models_server_id_model_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."model_servers"("id") ON DELETE cascade ON UPDATE no action;
