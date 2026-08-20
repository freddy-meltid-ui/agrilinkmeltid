// AGRI-GRID V2 — Phase 3B: Finance Readiness, business record completeness,
// financing dossier and consent-based lender pack.
//
// ARCHITECTURE / BUSINESS RULES (enforced in the database, never in the browser)
// -----------------------------------------------------------------------------
// * Agri-Grid Finance Readiness measures how COMPLETE and STRUCTURED the business
//   record is. It is NOT a credit score, NOT a loan-approval probability and NOT a
//   default prediction. No AI is involved: every figure is deterministic SQL.
// * Readiness = SUM(weight_d x score_d) / SUM(weight_d) over nine dimensions.
//   Each dimension score is a 0-100 completeness ratio computed from real records.
//   Weights live in v2_finance_settings (defaults centralised in the SQL function).
// * COMPLETENESS and HISTORY LENGTH are separate concepts: a business with three
//   days of perfect records can never present as a business with twelve months.
//   Qualifiers (short history, missing required documents, no recorded payments,
//   incomplete cash data) cap the reported state.
// * Documents are reused from the Phase 3A versioned library — never re-uploaded.
//   A checklist line is satisfied ONCE; extra linked documents never raise the score.
// * Sharing is consent based: an org admin mints a share, the plain token is shown
//   exactly once (only its SHA-256 hash is stored), only the selected scopes are
//   returned, and revocation / expiry deny access immediately.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type FinanceProfile = Tables["v2_finance_profiles"]["Row"];
export type UseOfFundsLine = Tables["v2_finance_use_of_funds"]["Row"];
export type FinanceDocumentRequirement = Tables["v2_finance_document_requirements"]["Row"];
export type FinanceShare = Tables["v2_finance_shares"]["Row"];
export type FinanceEvent = Tables["v2_finance_events"]["Row"];

export type FinancingPurpose = Enums["v2_financing_purpose"];
export type FinancingType = Enums["v2_financing_type"];
export type FinanceRequestStatus = Enums["v2_finance_request_status"];
export type FinanceRecipientType = Enums["v2_finance_recipient_type"];
export type FinanceShareScope = Enums["v2_finance_share_scope"];

export const FINANCING_PURPOSES: FinancingPurpose[] = [
  "working_capital",
  "raw_material_purchase",
  "equipment",
  "facility_expansion",
  "packaging",
  "certification",
  "logistics",
  "export_development",
  "other",
];

export const FINANCING_TYPES: FinancingType[] = [
  "short_term_loan",
  "working_capital_facility",
  "equipment_loan",
  "invoice_financing",
  "leasing",
  "grant",
  "equity",
  "other",
];

export const RECIPIENT_TYPES: FinanceRecipientType[] = [
  "bank",
  "microfinance",
  "investor",
  "guarantee_fund",
  "development_partner",
  "advisor",
  "other",
];

export const SHARE_SCOPES: FinanceShareScope[] = [
  "business_profile",
  "operating_metrics",
  "sales_summary",
  "documents",
  "compliance_summary",
  "full_dossier",
];

/* ------------------------------------------------------------------ shapes */

export type FinanceHistory = {
  first_activity_date: string | null;
  as_of: string;
  months_of_history: number;
  maturity: "none" | "lt_1_month" | "m1_3" | "m3_6" | "m6_12" | "m12_plus";
  months_with_procurement: number;
  months_with_production: number;
  months_with_sales: number;
  months_with_payments: number;
  months_with_expenses: number;
  active_months: number;
};

export type FinanceDocumentStatus = {
  code: string;
  category: string;
  importance: "required" | "recommended" | "situational";
  name_fr: string;
  name_en: string;
  description_fr: string | null;
  description_en: string | null;
  suggested_document_category: string | null;
  sort_order: number;
  /** EXISTS over non-archived, non-expired linked documents — never a count. */
  available: boolean;
  /** True when the requirement is only covered by an expired document. */
  linked_but_expired?: boolean;
  linked_documents: {
    link_id: string;
    document_id: string | null;
    title: string | null;
    category: string | null;
    current_version: number | null;
    issue_date?: string | null;
    expiry_date?: string | null;
    expiry_status?: "no_expiry" | "valid" | "expiring_soon" | "expired";
    is_archived?: boolean;
    source: string;
  }[];
};

export type ReadinessDimensionKey =
  | "business_identity"
  | "legal_documents"
  | "operating_history"
  | "sales_records"
  | "payment_records"
  | "expense_records"
  | "inventory_records"
  | "compliance"
  | "financing_request";

export type ReadinessDimension = {
  key: ReadinessDimensionKey;
  weight: number;
  score: number;
  source: string;
  facts: Record<string, unknown>;
  missing: string[];
};

export type FinanceReadinessState =
  | "early"
  | "building_record"
  | "structured"
  | "dossier_ready"
  | "ready_for_review";

export type FinanceReadiness = {
  generated_at: string;
  organization_id: string;
  readiness: number;
  state: FinanceReadinessState;
  weights: Record<ReadinessDimensionKey, number>;
  formula: string;
  dimensions: ReadinessDimension[];
  qualifiers: string[];
  history: FinanceHistory;
  documents: FinanceDocumentStatus[];
  disclaimer: string;
};

export type FinanceSnapshot = {
  generated_at: string;
  period_from: string;
  period_to: string;
  /** NULL when several currencies are recorded: no FX rate is ever applied. */
  currency: string | null;
  currencies: string[];
  multi_currency: boolean;
  aggregation_note: string;
  history: FinanceHistory;
  business: Record<string, any> | null;
  facilities: Record<string, any>[];
  products: Record<string, any>[];
  raw_material_needs: Record<string, any>[];
  sourcing: Record<string, any>;
  procurement: Record<string, any>;
  supplier_concentration: { supplier: string; value: number; share: number }[];
  production: Record<string, any>;
  sales: Record<string, any>;
  customer_concentration: { customer: string; value: number; share: number }[];
  collections: Record<string, any>;
  expenses: Record<string, any>;
  inventory: Record<string, any>;
  cash: Record<string, any>;
  monthly: {
    month: string;
    procurement_value: number;
    received_tonnes: number;
    production_batches: number;
    sales_value: number;
    collections: number;
    expenses: number;
  }[];
  compliance: Record<string, any>;
  financing_request: Record<string, any> | null;
};

export type FinanceDossier = {
  generated_at: string;
  snapshot: FinanceSnapshot;
  readiness: FinanceReadiness;
  suppliers: Record<string, any>[];
  system_evidence: Record<string, { records: number; source: string }>;
  data_quality: { flags: string[]; history: FinanceHistory };
  disclaimer: string;
};

/* ------------------------------------------------------------------ reads */

export async function fetchFinanceProfile(orgId: string): Promise<FinanceProfile | null> {
  const { data, error } = await supabase
    .from("v2_finance_profiles")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchUseOfFunds(profileId: string): Promise<UseOfFundsLine[]> {
  const { data, error } = await supabase
    .from("v2_finance_use_of_funds")
    .select("*")
    .eq("finance_profile_id", profileId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchFinanceReadiness(orgId: string): Promise<FinanceReadiness> {
  const { data, error } = await supabase.rpc("v2_finance_readiness", { _organization_id: orgId });
  if (error) throw error;
  return data as unknown as FinanceReadiness;
}

export async function fetchFinanceSnapshot(orgId: string, months = 12): Promise<FinanceSnapshot> {
  const { data, error } = await supabase.rpc("v2_finance_snapshot", {
    _organization_id: orgId,
    _months: months,
  });
  if (error) throw error;
  return data as unknown as FinanceSnapshot;
}

export async function fetchFinanceDocuments(orgId: string): Promise<FinanceDocumentStatus[]> {
  const { data, error } = await supabase.rpc("v2_finance_documents_status", { _organization_id: orgId });
  if (error) throw error;
  return (data ?? []) as unknown as FinanceDocumentStatus[];
}

export async function fetchFinanceDossier(orgId: string): Promise<FinanceDossier> {
  const { data, error } = await supabase.rpc("v2_finance_dossier", { _organization_id: orgId });
  if (error) throw error;
  return data as unknown as FinanceDossier;
}

/**
 * Consent-based lender pack. Called WITHOUT a session: the hashed token alone
 * authorises a scoped, read-only projection of a single business record.
 */
export async function fetchSharedFinanceDossier(token: string): Promise<SharedFinanceDossier> {
  const { data, error } = await supabase.rpc("v2_finance_shared_dossier", { _token: token });
  if (error) throw error;
  return data as unknown as SharedFinanceDossier;
}

export type SharedFinanceDossier = {
  shared_at: string;
  scopes: FinanceShareScope[];
  recipient: string | null;
  expires_at: string | null;
  organization: string | null;
  dossier?: Partial<FinanceDossier> & Record<string, any>;
  disclaimer?: string;
} & Record<string, any>;

export async function fetchFinanceShares(orgId: string): Promise<FinanceShare[]> {
  const { data, error } = await supabase
    .from("v2_finance_shares")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFinanceEvents(orgId: string, limit = 25): Promise<FinanceEvent[]> {
  const { data, error } = await supabase
    .from("v2_finance_events")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Documents already stored in the Phase 3A library — reused, never re-uploaded. */
export async function fetchLibraryDocuments(orgId: string) {
  const { data, error } = await supabase
    .from("v2_compliance_documents")
    .select("id, title, category, current_version")
    .eq("organization_id", orgId)
    .eq("is_archived", false)
    .order("title");
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ writes */

export async function saveFinanceProfile(
  orgId: string,
  patch: Partial<FinanceProfile>
): Promise<FinanceProfile> {
  const { data, error } = await supabase
    .from("v2_finance_profiles")
    .upsert({ organization_id: orgId, ...patch }, { onConflict: "organization_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function replaceUseOfFunds(
  orgId: string,
  profileId: string,
  lines: { category: FinancingPurpose; label: string | null; amount: number }[]
) {
  const { error: delError } = await supabase
    .from("v2_finance_use_of_funds")
    .delete()
    .eq("finance_profile_id", profileId);
  if (delError) throw delError;
  if (!lines.length) return;
  const { error } = await supabase.from("v2_finance_use_of_funds").insert(
    lines.map((l, i) => ({
      organization_id: orgId,
      finance_profile_id: profileId,
      category: l.category,
      label: l.label,
      amount: l.amount,
      sort_order: i,
    }))
  );
  if (error) throw error;
}

export async function linkDocument(orgId: string, requirementCode: string, documentId: string) {
  const { error } = await supabase.from("v2_finance_document_links").insert({
    organization_id: orgId,
    requirement_code: requirementCode,
    document_id: documentId,
  });
  if (error) throw error;
}

export async function unlinkDocument(linkId: string) {
  const { error } = await supabase.from("v2_finance_document_links").delete().eq("id", linkId);
  if (error) throw error;
}

export async function createShare(input: {
  organization_id: string;
  recipient_type: FinanceRecipientType;
  recipient_name: string;
  recipient_email?: string | null;
  scopes: FinanceShareScope[];
  expires_in_days: number;
}): Promise<{ share_id: string; token: string; expires_at: string; scopes: FinanceShareScope[] }> {
  const { data, error } = await supabase.rpc("v2_create_finance_share", {
    _organization_id: input.organization_id,
    _recipient_type: input.recipient_type,
    _recipient_name: input.recipient_name,
    _scopes: input.scopes,
    _expires_in_days: input.expires_in_days,
    _recipient_email: input.recipient_email ?? null,
  });
  if (error) throw error;
  return data as unknown as { share_id: string; token: string; expires_at: string; scopes: FinanceShareScope[] };
}

export async function revokeShare(shareId: string) {
  const { error } = await supabase.rpc("v2_revoke_finance_share", { _share_id: shareId });
  if (error) throw error;
}

/* ------------------------------------------------------------------ helpers */

export function readinessTone(state: FinanceReadinessState): "neutral" | "warning" | "info" | "success" {
  switch (state) {
    case "early":
      return "neutral";
    case "building_record":
      return "warning";
    case "structured":
      return "info";
    default:
      return "success";
  }
}

export function docLabel(doc: FinanceDocumentStatus, lang: string) {
  return lang?.startsWith("fr") ? doc.name_fr : doc.name_en;
}

export function docDescription(doc: FinanceDocumentStatus, lang: string) {
  return lang?.startsWith("fr") ? doc.description_fr : doc.description_en;
}

export function formatAmount(
  value: number | null | undefined,
  currency: string | null | undefined = "XOF",
  lang = "fr",
) {
  // A null value means "not aggregatable" (several currencies) or "not recorded".
  if (value === null || value === undefined) return "—";
  const n = new Intl.NumberFormat(lang.startsWith("fr") ? "fr-FR" : "en-US").format(Math.round(value));
  return currency ? `${n} ${currency}` : n;
}

export function sumLines(lines: { amount: number | string }[]) {
  return lines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
}

/** Client-side mirror of the SQL readiness aggregation — used by unit tests. */
export function aggregateReadiness(dimensions: { weight: number; score: number }[]): number {
  const den = dimensions.reduce((a, d) => a + d.weight, 0);
  if (den === 0) return 0;
  const num = dimensions.reduce((a, d) => a + d.weight * d.score, 0);
  return Math.round((num / den) * 10) / 10;
}
