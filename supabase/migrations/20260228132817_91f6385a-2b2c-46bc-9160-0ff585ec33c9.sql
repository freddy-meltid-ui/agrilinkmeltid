
-- Reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  reviewed_id uuid NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Transactions table to track completion/delivery metrics
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = buyer_id);
CREATE POLICY "Authenticated users can create transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update transactions" ON public.transactions FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- Trigger for updated_at on transactions
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent duplicate reviews per listing per reviewer
CREATE UNIQUE INDEX idx_reviews_unique ON public.reviews (reviewer_id, reviewed_id, listing_id);
