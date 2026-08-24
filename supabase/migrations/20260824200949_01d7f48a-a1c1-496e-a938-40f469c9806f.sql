CREATE TABLE IF NOT EXISTS public.v2_finance_share_probes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash_prefix text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS v2_finance_share_probes_idx ON public.v2_finance_share_probes (hash_prefix, attempted_at DESC);
GRANT ALL ON public.v2_finance_share_probes TO service_role;
ALTER TABLE public.v2_finance_share_probes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read share probes" ON public.v2_finance_share_probes;
CREATE POLICY "Admins read share probes" ON public.v2_finance_share_probes
  FOR SELECT TO authenticated USING (public.v2_is_agrigrid_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.v2_finance_shared_dossier(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _sh record; _full jsonb; _out jsonb; _scopes text[]; _hash text; _prefix text; _recent int;
BEGIN
  -- Never log or return the raw token. Only a short fingerprint of its hash is retained
  -- so repeated invalid probing can be throttled.
  _hash := encode(extensions.digest(COALESCE(_token, ''), 'sha256'), 'hex');
  _prefix := left(_hash, 8);

  SELECT count(*) INTO _recent FROM public.v2_finance_share_probes
   WHERE hash_prefix = _prefix AND attempted_at > now() - interval '10 minutes';
  IF _recent > 25 THEN RAISE EXCEPTION 'TOO_MANY_ATTEMPTS'; END IF;

  SELECT * INTO _sh FROM public.v2_finance_shares WHERE token_hash = _hash;

  -- One single generic error for missing / revoked / expired links: an invalid token must
  -- never reveal whether a dossier exists behind it.
  IF _sh.id IS NULL OR _sh.revoked_at IS NOT NULL OR _sh.expires_at <= now() THEN
    INSERT INTO public.v2_finance_share_probes(hash_prefix) VALUES (_prefix);
    RAISE EXCEPTION 'SHARE_INVALID';
  END IF;

  _scopes := ARRAY(SELECT unnest(_sh.scopes)::text);
  PERFORM set_config('agrigrid.finance_share_org', _sh.organization_id::text, true);
  _full := public.v2_finance_dossier(_sh.organization_id);
  PERFORM set_config('agrigrid.finance_share_org', '', true);

  _out := jsonb_build_object(
    'shared_by', (SELECT name FROM public.v2_organizations WHERE id = _sh.organization_id),
    'recipient', _sh.recipient_name,
    'scopes', to_jsonb(_scopes),
    'expires_at', _sh.expires_at,
    'generated_at', now(),
    'disclaimer', 'dossier_not_audited_not_a_credit_rating');

  IF 'full_dossier' = ANY(_scopes) THEN
    _out := _out || jsonb_build_object('dossier', _full);
  ELSE
    IF 'business_profile' = ANY(_scopes) THEN
      _out := _out || jsonb_build_object('business', _full->'snapshot'->'business',
                                         'facilities', _full->'snapshot'->'facilities',
                                         'products', _full->'snapshot'->'products');
    END IF;
    IF 'operating_metrics' = ANY(_scopes) THEN
      _out := _out || jsonb_build_object('sourcing', _full->'snapshot'->'sourcing',
                                         'procurement', _full->'snapshot'->'procurement',
                                         'production', _full->'snapshot'->'production',
                                         'inventory', _full->'snapshot'->'inventory',
                                         'monthly', _full->'snapshot'->'monthly');
    END IF;
    IF 'sales_summary' = ANY(_scopes) THEN
      _out := _out || jsonb_build_object('sales', _full->'snapshot'->'sales',
                                         'collections', _full->'snapshot'->'collections');
    END IF;
    IF 'documents' = ANY(_scopes) THEN
      _out := _out || jsonb_build_object('documents', _full->'readiness'->'documents');
    END IF;
    IF 'compliance_summary' = ANY(_scopes) THEN
      _out := _out || jsonb_build_object('compliance', _full->'snapshot'->'compliance');
    END IF;
  END IF;

  UPDATE public.v2_finance_shares
     SET last_accessed_at = now(), access_count = access_count + 1 WHERE id = _sh.id;
  INSERT INTO public.v2_finance_events(organization_id, event_type, entity_type, entity_id, actor_id, payload)
  VALUES (_sh.organization_id, 'finance_share_accessed', 'finance_share', _sh.id, auth.uid(),
          jsonb_build_object('recipient', _sh.recipient_name));
  RETURN _out;
END $function$;

REVOKE ALL ON FUNCTION public.v2_finance_shared_dossier(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.v2_finance_shared_dossier(text) TO anon, authenticated, service_role;