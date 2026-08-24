-- PHASE 3C.1B — step 1: extend the analysis lifecycle with draft/cancelled.
ALTER TYPE public.v2_ai_analysis_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'queued';
ALTER TYPE public.v2_ai_analysis_status ADD VALUE IF NOT EXISTS 'cancelled';