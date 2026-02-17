BEGIN;
  -- Supabase Functions schema (required by GoTrue)
  CREATE SCHEMA IF NOT EXISTS supabase_functions;
  GRANT USAGE ON SCHEMA supabase_functions TO postgres, anon, authenticated, service_role;
COMMIT;
