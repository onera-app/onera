-- Trigger to keep public.users in sync with auth.users
-- Handles INSERT, UPDATE, DELETE automatically
-- Name/avatar derivation mirrors apps/server/src/auth/supabase.ts logic

CREATE OR REPLACE FUNCTION public.handle_auth_user_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _name text;
  _image_url text;
  _first text;
  _last text;
BEGIN
  -- DELETE: remove public.users row
  -- Note: child tables (key_shares, devices, chats, etc.) use soft references
  -- (FKs were intentionally dropped in migration 0002) so orphaned rows remain.
  -- This is by design -- user data cleanup is a separate concern.
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.users WHERE id = OLD.id::text;
    RETURN OLD;
  END IF;

  -- Derive name (same logic as auth/supabase.ts lines 62-72)
  _first := NEW.raw_user_meta_data->>'first_name';
  _last := NEW.raw_user_meta_data->>'last_name';
  _name := NULLIF(TRIM(COALESCE(_first, '') || ' ' || COALESCE(_last, '')), '');
  IF _name IS NULL THEN
    _name := COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'User'
    );
  END IF;

  -- Derive image_url
  _image_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.users (id, email, name, image_url, role, created_at, updated_at)
    VALUES (
      NEW.id::text,
      COALESCE(NEW.email, ''),
      _name,
      _image_url,
      'user',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      image_url = EXCLUDED.image_url,
      updated_at = NOW();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE public.users SET
      email = COALESCE(NEW.email, ''),
      name = _name,
      image_url = _image_url,
      updated_at = NOW()
    WHERE id = NEW.id::text;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;
--> statement-breakpoint

-- Idempotent: drop then create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_change();
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.handle_auth_user_change();
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_change();
--> statement-breakpoint

-- Backfill: sync existing auth.users missing from public.users
INSERT INTO public.users (id, email, name, image_url, role, created_at, updated_at)
SELECT
  au.id::text,
  COALESCE(au.email, ''),
  COALESCE(
    NULLIF(TRIM(
      COALESCE(au.raw_user_meta_data->>'first_name', '') || ' ' ||
      COALESCE(au.raw_user_meta_data->>'last_name', '')
    ), ''),
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    NULLIF(split_part(COALESCE(au.email, ''), '@', 1), ''),
    'User'
  ),
  COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  ),
  'user',
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id::text = pu.id
WHERE pu.id IS NULL;
