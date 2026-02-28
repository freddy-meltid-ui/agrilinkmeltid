
-- Add country and city columns to profiles
ALTER TABLE public.profiles ADD COLUMN country text;
ALTER TABLE public.profiles ADD COLUMN city text;
ALTER TABLE public.profiles ADD COLUMN currency text DEFAULT 'USD';
