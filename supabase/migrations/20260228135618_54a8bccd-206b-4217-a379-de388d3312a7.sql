
-- Create crop_prices table for price intelligence
CREATE TABLE public.crop_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  unit TEXT NOT NULL DEFAULT 'per kg',
  market_name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crop_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can read prices
CREATE POLICY "Crop prices are viewable by everyone"
ON public.crop_prices FOR SELECT
USING (true);

-- Only authenticated users can insert prices
CREATE POLICY "Authenticated users can add crop prices"
ON public.crop_prices FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for common queries
CREATE INDEX idx_crop_prices_crop_name ON public.crop_prices (crop_name);
CREATE INDEX idx_crop_prices_country ON public.crop_prices (country);
CREATE INDEX idx_crop_prices_recorded_at ON public.crop_prices (recorded_at DESC);

-- Create demand_signals table
CREATE TABLE public.demand_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  demand_level TEXT NOT NULL DEFAULT 'medium',
  buyer_count INTEGER NOT NULL DEFAULT 0,
  listing_count INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demand_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demand signals are viewable by everyone"
ON public.demand_signals FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can add demand signals"
ON public.demand_signals FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_demand_signals_crop ON public.demand_signals (crop_name);
CREATE INDEX idx_demand_signals_recorded_at ON public.demand_signals (recorded_at DESC);
