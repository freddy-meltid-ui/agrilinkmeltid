REVOKE ALL ON FUNCTION public.v2_finance_uof_audit() FROM PUBLIC, anon, authenticated;

-- Token-gated lender pack: recipients are external and never signed in.
-- Access requires a valid, unexpired, unrevoked share token (stored hashed).
GRANT EXECUTE ON FUNCTION public.v2_finance_shared_dossier(text) TO anon;