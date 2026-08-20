-- AGRI-GRID V2 — Phase 2A (1/2): enums + processed product master data
ALTER TYPE public.v2_inventory_movement_type ADD VALUE IF NOT EXISTS 'production_consumption';

DO $$ BEGIN
  CREATE TYPE public.v2_production_status AS ENUM ('draft','ready','completed','voided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v2_production_output_type AS ENUM ('finished_product','by_product','waste','rejected_output');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v2_production_loss_category AS ENUM ('process_loss','rejected_raw_material','peel_or_husk','damaged_output','quality_rejection','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v2_fg_movement_type AS ENUM ('production_output','adjustment_in','adjustment_out','production_void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.v2_processed_products
  ADD COLUMN IF NOT EXISTS product_code text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS default_production_unit text NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS default_inventory_unit text NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS shelf_life_days integer,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS v2_processed_products_org_code_uidx
  ON public.v2_processed_products (organization_id, product_code) WHERE product_code IS NOT NULL;