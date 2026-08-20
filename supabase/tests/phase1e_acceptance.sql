-- AGRI-GRID V2 — Phase 1E acceptance suite (executed 2026-08-20)
-- Run statement by statement with the SQL runner. Every block impersonates a real
-- authenticated identity via request.jwt.claims; the RPCs are SECURITY DEFINER and
-- enforce the same rules they enforce for the browser.
--
-- Identities used:
--   PA  = a2000000-0000-4000-8000-0000000000a2  processor_admin of Tropic Foods Benin
--   PB  = b2000000-0000-4000-8000-0000000000b2  processor_admin of Delta Agro Test
--   PC  = c3000000-0000-4000-8000-0000000000c3  processor_admin of Gamma Foods Test (unrelated)
--   FA  = 66f64756-6253-4ba3-914f-04653fce5b8a  field agent + agrigrid admin (confirms on behalf of suppliers)
--
-- Fixtures are tagged P1E-ACC and can be removed with the cleanup block at the end.

/* ============ 2. ATOMIC COMMITMENT / CONCURRENCY ============
   Supply c0000000-…-0002 holds exactly 2.000 t.
   Two commitments of 1.500 t (one per processor) are proposed, then both are
   confirmed through two genuinely parallel HTTPS calls to
   POST /rest/v1/rpc/v2_confirm_commitment.
   RESULT: B → 200 confirmed 1.500 t; A → 400 INSUFFICIENT_AVAILABILITY:0.500.
   v2_confirm_commitment takes `SELECT … FROM v2_supply_availability … FOR UPDATE`
   before computing the remainder, so the second transaction serialises behind the
   first. Never 3.0 t confirmed on a 2.0 t supply. */
select set_config('role','authenticated',true),
       set_config('request.jwt.claims','{"sub":"a2000000-0000-4000-8000-0000000000a2","role":"authenticated"}',true);
select v2_propose_commitment(:'request_a', :'supply', 1.5, 't', null, null, null, 'concurrency A');

/* ============ 3. SUPPLIER PRIVACY ============
   Under PA before any confirmed commitment:
     select count(*) from v2_suppliers where id = :supplier      -> 0
     select count(*) from v2_field_visits where supplier_id = …  -> 0
     select count(*) from v2_farms where supplier_id = …         -> 0
     v2_supplier_commercial_contact(supplier, own_org)           -> released=false, all contact fields NULL
     v2_commercial_supply(...)                                   -> pseudonym + approx_latitude/longitude only
   After the field agent confirms for PA's organisation:
     v2_supplier_commercial_contact                              -> released=true, display_name, phone, commune, department
     (phone_secondary, village, arrondissement, exact GPS, internal agent notes stay hidden)
   Unrelated processor PC: released=false, everything NULL; passing another org id
   raises NOT_AUTHORIZED. */

/* ============ 4. INVENTORY INTEGRITY ============
   propose 2000 kg -> 0 t   confirm 2000 kg -> 0 t   order -> 0 t   delivery -> 0 t
   receipt 1950 delivered / 1850 accepted / 100 rejected -> 1.850 t
   Only v2_receive_goods writes v2_inventory_movements and v2_raw_material_batches. */

/* ============ 5-7. PARTIAL / UNDER / OVER DELIVERY ============
   Partial : 1200 kg -> partially_delivered, outstanding 0.800 t; 800 kg -> delivered, commitment fulfilled.
   Under   : 1850 of 2000 -> variance -0.150 t, residual released with v2_release_commitment.
   Over    : accepting 2200 on a 2000 order raises OVER_DELIVERY_REQUIRES_CONFIRMATION:0.200;
             the same receipt succeeds with _accept_over_delivery := true. */

/* ============ 8-9. CANCELLATION / EXPIRY ============
   3.0 t supply, 2.0 t confirmed -> remaining 1.0 t; v2_cancel_procurement_order
   -> order cancelled, commitment released, remaining back to 3.0 t, no row deleted.
   Expiry TTL lives in v2_settings.commercial_commitment ->
   {"confirmation_ttl_days": 5, "order_creation_days": 7, "over_delivery_tolerance_pct": 0}.
   v2_expire_commitments() flips due rows to 'expired', clears contact_released and
   frees availability, keeping the historical row. */

/* ============ 12. LEDGER CONSISTENCY ============
   sum(v2_inventory_movements.quantity_tonnes)
     = sum(v2_raw_material_batches.current_tonnes)
     = sum(v2_goods_receipts.accepted_tonnes)
   v2_harvest_forecasts / v2_crop_cycles / v2_field_visits / v2_supply_availability
   quantities are never written by any procurement RPC. */

/* ============ CLEANUP (optional) ============
delete from v2_inventory_movements where organization_id in ('b2000000-0000-4000-8000-00000000b201','c3000000-0000-4000-8000-00000000c301');
delete from v2_supply_availability where notes like 'P1E-ACC%';
delete from v2_sourcing_requests where reference like 'SR-P1EACC%';
delete from v2_suppliers where display_name like '%(P1E-ACC)';
delete from v2_organizations where name like '%(P1E-ACC)';
*/
