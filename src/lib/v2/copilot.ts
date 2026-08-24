// AGRI-GRID V2 — Phase 3C.1: Compliance Copilot client layer.
//
// RULES (enforced server-side, mirrored here for the UI)
// * The Copilot is ADVISORY. It never sets a compliance answer and never
//   changes the readiness score. Only the Phase 3A human assessment does.
// * Every analysis runs in the `v2-compliance-copilot` edge function: the
//   browser never sees an AI key and never sends evidence to a provider.
// * The original AI output is immutable. Human edits are stored in separate
//   `reviewed_*` columns, so both versions remain available forever.
// * Re-analysing evidence never overwrites a previous analysis (is_latest).
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { StatusTone } from "@/components/v2/ui-kit/StatusBadge";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type AiAnalysis = Tables["v2_ai_compliance_analyses"]["Row"];
export type AiObservation = Tables["v2_ai_compliance_observations"]["Row"];
export type AiConfig = Tables["v2_ai_analysis_config"]["Row"];
export type AiConsent = Tables["v2_ai_consents"]["Row"];
export type AiEvent = Tables["v2_ai_compliance_events"]["Row"];

export type AnalysisType = Enums["v2_ai_analysis_type"];
export type AnalysisStatus = Enums["v2_ai_analysis_status"];
export type ReviewStatus = Enums["v2_ai_review_status"];
export type Relevance = Enums["v2_ai_relevance"];
export type Severity = Enums["v2_compliance_severity"];

export const ANALYSIS_TYPES: AnalysisType[] = ["document_requirement", "product_label", "facility_photo"];

/** Guided capture steps per requirement family — no AI involved, pure UX. */
export const GUIDED_PHOTO_STEPS: Record<string, string[]> = {
  hygiene: ["wholeStation", "waterSource", "soap", "drying"],
  storage: ["wholeRoom", "shelving", "floorContact", "labeling"],
  waste: ["wholeArea", "containers", "lids", "surroundings"],
  cleaning: ["storageArea", "productLabels", "separation", "tools"],
  default: ["wholeArea", "closeUp", "context"],
};

export type CopilotResult = {
  summary?: string;
  requirement_relevance?: Relevance;
  observations?: Record<string, unknown>[];
  potential_gaps?: Record<string, unknown>[];
  missing_information?: Record<string, unknown>[];
  questions_for_operator?: string[];
  suggested_next_evidence?: string[];
  suggested_actions?: Record<string, unknown>[];
  extracted_dates?: { kind: string; value: string; confidence: string }[];
  confidence?: string;
  limitations?: string[];
};

/* -------------------------------------------------------------- consent */

export async function fetchConfig(): Promise<AiConfig[]> {
  const { data, error } = await supabase.from("v2_ai_analysis_config").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function fetchConsents(orgId: string): Promise<AiConsent[]> {
  const { data, error } = await supabase.from("v2_ai_consents").select("*").eq("organization_id", orgId);
  if (error) throw error;
  return data ?? [];
}

export async function acceptConsent(orgId: string, version: string) {
  const { error } = await supabase.rpc("v2_ai_accept_consent", {
    _organization_id: orgId,
    _consent_version: version,
  });
  if (error) throw error;
}

/* -------------------------------------------------------------- reads */

export async function fetchAnalyses(
  orgId: string,
  opts: { evidenceId?: string; requirementId?: string; latestOnly?: boolean } = {},
): Promise<AiAnalysis[]> {
  let q = supabase
    .from("v2_ai_compliance_analyses")
    .select("*")
    .eq("organization_id", orgId)
    .order("requested_at", { ascending: false });
  if (opts.evidenceId) q = q.eq("evidence_id", opts.evidenceId);
  if (opts.requirementId) q = q.eq("requirement_id", opts.requirementId);
  if (opts.latestOnly) q = q.eq("is_latest", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchAnalysis(id: string): Promise<AiAnalysis | null> {
  const { data, error } = await supabase.from("v2_ai_compliance_analyses").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchObservations(analysisId: string): Promise<AiObservation[]> {
  const { data, error } = await supabase
    .from("v2_ai_compliance_observations")
    .select("*")
    .eq("analysis_id", analysisId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchPendingObservations(orgId: string): Promise<AiObservation[]> {
  const { data, error } = await supabase
    .from("v2_ai_compliance_observations")
    .select("*")
    .eq("organization_id", orgId)
    .eq("review_status", "pending_review")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchReviewedObservations(orgId: string, status: ReviewStatus): Promise<AiObservation[]> {
  const { data, error } = await supabase
    .from("v2_ai_compliance_observations")
    .select("*")
    .eq("organization_id", orgId)
    .eq("review_status", status)
    .order("reviewed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCopilotEvents(orgId: string, limit = 50): Promise<AiEvent[]> {
  const { data, error } = await supabase
    .from("v2_ai_compliance_events")
    .select("*")
    .eq("organization_id", orgId)
    .like("event_type", "ai_%")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/* -------------------------------------------------------------- analysis */

export type RunAnalysisInput = {
  organization_id: string;
  evidence_id: string;
  analysis_type: AnalysisType;
  requirement_id?: string | null;
  org_program_id?: string | null;
  document_version_id?: string | null;
  user_context?: string | null;
  language?: string;
};

export type RunAnalysisOutput = {
  analysis_id: string;
  items: number;
  prompt_version: string;
  model: string;
  result: CopilotResult;
};

/** Server-side only: the edge function validates access before any AI call. */
export async function runAnalysis(input: RunAnalysisInput): Promise<RunAnalysisOutput> {
  const { data, error } = await supabase.functions.invoke("v2-compliance-copilot", {
    body: { ...input, language: (input.language ?? "fr").startsWith("fr") ? "fr" : "en" },
  });
  if (error) {
    let detail = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.text === "function") {
      try {
        const body = await ctx.text();
        const parsed = JSON.parse(body) as { error?: string; message?: string };
        detail = parsed.error ?? parsed.message ?? body;
      } catch {
        /* keep error.message */
      }
    }
    throw new Error(detail);
  }
  return data as RunAnalysisOutput;
}

/* -------------------------------------------------------------- review */

export async function reviewObservation(input: {
  observation_id: string;
  decision: Exclude<ReviewStatus, "pending_review">;
  title?: string | null;
  description?: string | null;
  severity?: Severity | null;
  requirement_id?: string | null;
  comment?: string | null;
}) {
  const { data, error } = await supabase.rpc("v2_ai_review_observation", {
    _observation_id: input.observation_id,
    _decision: input.decision,
    _title: input.title ?? null,
    _description: input.description ?? null,
    _severity: input.severity ?? null,
    _requirement_id: input.requirement_id ?? null,
    _comment: input.comment ?? null,
  });
  if (error) throw error;
  return data as unknown as { observation_id: string; review_status: ReviewStatus; reassessment_required: boolean };
}

/** Explicit human confirmation only — nothing is created automatically. */
export async function createFindingFromObservation(observationId: string) {
  const { data, error } = await supabase.rpc("v2_ai_finding_from_observation", { _observation_id: observationId });
  if (error) throw error;
  return data as unknown as { finding_id: string; created: boolean; reassessment_required?: boolean };
}

export async function createActionFromObservation(input: {
  observation_id: string;
  title?: string | null;
  description?: string | null;
  due_date?: string | null;
  priority?: Severity | null;
  responsible_name?: string | null;
}) {
  const { data, error } = await supabase.rpc("v2_ai_action_from_observation", {
    _observation_id: input.observation_id,
    _title: input.title ?? null,
    _description: input.description ?? null,
    _due_date: input.due_date ?? null,
    _priority: input.priority ?? null,
    _responsible_name: input.responsible_name ?? null,
  });
  if (error) throw error;
  return data as unknown as { action_id: string; finding_id: string; reassessment_required: boolean };
}

/* -------------------------------------------------------------- helpers */

export function analysisStatusTone(s: AnalysisStatus): StatusTone {
  switch (s) {
    case "completed":
      return "info";
    case "reviewed":
      return "success";
    case "failed":
      return "danger";
    case "processing":
    case "queued":
      return "warning";
    default:
      return "neutral";
  }
}

export function reviewTone(s: ReviewStatus): StatusTone {
  switch (s) {
    case "accepted":
    case "modified":
      return "success";
    case "rejected":
      return "neutral";
    default:
      return "warning";
  }
}

export function relevanceTone(r: Relevance | null): StatusTone {
  switch (r) {
    case "relevant_evidence_detected":
      return "success";
    case "potentially_relevant":
      return "info";
    case "insufficient_evidence":
      return "warning";
    default:
      return "neutral";
  }
}

export function observationKindTone(kind: string): StatusTone {
  switch (kind) {
    case "potential_gap":
      return "warning";
    case "missing_information":
      return "info";
    case "suggested_action":
      return "success";
    default:
      return "neutral";
  }
}

/** Human-validated wording takes precedence everywhere it exists. */
export function effectiveTitle(o: AiObservation): string {
  return o.reviewed_title ?? o.ai_title;
}

export function effectiveDescription(o: AiObservation): string | null {
  return o.reviewed_description ?? o.ai_description;
}

export function effectiveSeverity(o: AiObservation): Severity | null {
  return o.reviewed_severity ?? o.ai_severity;
}

export function wasModifiedByHuman(o: AiObservation): boolean {
  return (
    (o.reviewed_title !== null && o.reviewed_title !== o.ai_title) ||
    (o.reviewed_description !== null && o.reviewed_description !== o.ai_description) ||
    (o.reviewed_severity !== null && o.reviewed_severity !== o.ai_severity) ||
    (o.reviewed_requirement_id !== null && o.reviewed_requirement_id !== o.ai_requirement_id)
  );
}

export function guidedStepsFor(category: string | null | undefined): string[] {
  if (!category) return GUIDED_PHOTO_STEPS.default;
  return GUIDED_PHOTO_STEPS[category] ?? GUIDED_PHOTO_STEPS.default;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_MIME: Record<AnalysisType, string> = {
  document_requirement: "application/pdf,image/jpeg,image/png,image/webp",
  product_label: "application/pdf,image/jpeg,image/png,image/webp",
  facility_photo: "image/jpeg,image/png,image/webp",
};
