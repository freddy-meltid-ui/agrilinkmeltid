ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'processor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'wholesaler';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'semi_wholesaler';
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'processing';