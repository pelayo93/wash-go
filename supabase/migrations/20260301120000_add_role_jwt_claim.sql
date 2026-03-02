-- Add trigger that copies the role into the JWT custom claims

-- the special `auth.set_config('jwt.claims.xxx', value, true)` call
-- writes a custom claim that will be present in any token issued after
-- the statement completes. by placing it in a trigger we ensure every
-- time a role row is created/updated/deleted the next time the user
-- obtains a refreshed token it contains up‑to‑date information.

CREATE OR REPLACE FUNCTION public.sync_role_claims()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- role removed
    PERFORM auth.set_config('jwt.claims.role', NULL, true);
  ELSE
    -- insert or update, copy the new value (text) into the claim
    PERFORM auth.set_config('jwt.claims.role', NEW.role::text, true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_sync_claims ON public.user_roles;
CREATE TRIGGER user_roles_sync_claims
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_claims();
