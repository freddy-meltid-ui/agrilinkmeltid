DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname IN (
        'v2_committed_tonnes','v2_supply_remaining_tonnes','v2_propose_commitment',
        'v2_confirm_commitment','v2_release_commitment','v2_expire_commitments',
        'v2_supplier_commercial_contact','v2_create_procurement_order','v2_cancel_procurement_order',
        'v2_receive_goods','v2_sourcing_funnel','v2_inventory_balance','v2_request_commitments',
        'v2_commercial_confirmation_feed','v2_procurement_summary','v2_reconfirmation_task_feed')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;