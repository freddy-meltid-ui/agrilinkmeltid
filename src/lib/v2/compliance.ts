// AGRI-GRID V2 — Phase 3A: compliance foundation, self-assessment, evidence
// management, corrective actions and audit readiness.
//
// ARCHITECTURE / BUSINESS RULES (enforced in the database, never in the browser)
// -----------------------------------------------------------------------------
// * Agri-Grid NEVER certifies. Programs are preparation frameworks with an
//   explicit disclaimer; readiness is an internal indicator only.
// * Assessments are append-only. Recording a new answer supersedes the previous
//   one (is_current) but never deletes history.
// * A non-compliant / partially compliant answer automatically opens a finding.
//   Completing a corrective action NEVER makes a requirement compliant again —
//   a reassessment is always required (v2_complete_action returns
//   reassessment_required = true).
// * Readiness = 100 * SUM(weight x contribution) / SUM(weight), where
//   weight comes from severity (critical 5, high 3, medium 2, low 1) and
//   contribution is compliant 1, partially 0.5, non-compliant/not assessed 0.
//   not_applicable requirements are excluded from both sides of the ratio.
//   Any open critical gap caps the state at "progressing" whatever the score.
// * Some requirements are satisfied by SYSTEM EVIDENCE derived from real
//   operations (traceability, production records, goods receipts) instead of an
//   upload. That derivation is deterministic SQL — no AI, no image analysis.
// * Evidence files live in the private `compliance-evidence` bucket under
//   `<organization_id>/...` and are only ever read through short-lived signed URLs.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { StatusTone } from "@/components/v2/ui-kit/StatusBadge";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type ComplianceProgram = Tables["v2_compliance_programs"]["Row"];
export type ComplianceRequirement = Tables["v2_compliance_requirements"]["Row"];
export type OrgComplianceProgram = Tables["v2_org_compliance_programs"]["Row"];
export type ComplianceAssessment = Tables["v2_compliance_assessments"]["Row"];
export type ComplianceEvidence = Tables["v2_compliance_evidence"]["Row"];
export type ComplianceFinding = Tables["v2_compliance_findings"]["Row"];
export type ComplianceAction = Tables["v2_compliance_actions"]["Row"];
export type ComplianceDocument = Tables["v2_compliance_documents"]["Row"];
export type ComplianceDocumentVersion = Tables["v2_compliance_document_versions"]["Row"];

export type AssessmentResponse = Enums["v2_assessment_response"];
export type ComplianceSeverity = Enums["v2_compliance_severity"];
export type ComplianceCategory = Enums["v2_compliance_category"];
export type FindingStatus = Enums["v2_finding_status"];
export type ActionStatus = Enums["v2_action_status"];
export type DocumentCategory = Enums["v2_document_category"];
export type EvidenceType = Enums["v2_evidence_type"];

export const EVIDENCE_BUCKET = "compliance-evidence";

export const RESPONSES: AssessmentResponse[] = [
  "compliant",
  "partially_compliant",
  "non_compliant",
  "not_applicable",
];

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "legal",
  "business_registration",
  "tax",
  "food_safety",
  "lab_analysis",
  "certificate",
  "inspection",
  "procedure",
  "training",
  "facility",
  "product",
  "label",
  "other",
];

/* ------------------------------------------------------------------ shapes */

export type ReadinessCategory = {
  category: ComplianceCategory;
  total: number;
  assessed: number;
  compliant: number;
  partial: number;
  non_compliant: number;
  not_applicable: number;
};

export type Readiness = {
  org_program_id: string;
  program_id: string;
  readiness: number;
  weighted_points: number;
  weighted_total: number;
  state: "early_stage" | "needs_work" | "progressing" | "near_ready" | "ready_for_review";
  critical_gate: boolean;
  critical_requirement_gaps: number;
  critical_open_findings: number;
  weights: { critical: number; high: number; medium: number; low: number };
  contribution_model: Record<string, unknown>;
  requirements_total: number;
  requirements_assessed: number;
  open_findings: number;
  open_actions: number;
  categories: ReadinessCategory[];
};

export type ComplianceDashboard = {
  expiring_soon_days: number;
  active_programs: number;
  programs: {
    org_program_id: string;
    program_id: string;
    code: string;
    name_fr: string;
    name_en: string;
    status: string;
    target_audit_date: string | null;
    readiness: number;
    state: Readiness["state"];
    critical_gate: boolean;
  }[];
  open_findings: number;
  critical_findings: number;
  open_actions: number;
  actions_due_soon: number;
  actions_overdue: number;
  evidence_total: number;
  system_evidence: number;
  evidence_expired: number;
  evidence_expiring_soon: number;
  documents_expired: number;
  documents_expiring_soon: number;
  recent_assessments: {
    id: string;
    requirement_code: string;
    title_fr: string;
    title_en: string;
    response: AssessmentResponse;
    assessed_at: string;
  }[];
};

export type SystemEvidenceRow = {
  rule_code: string;
  qualifies: boolean;
  entity_type: string;
  entity_id: string;
  entity_reference: string | null;
  detail: Record<string, unknown>;
};

export type AuditPack = {
  generated_at: string;
  company: Record<string, unknown> | null;
  facility: Record<string, unknown> | null;
  program: ComplianceProgram | null;
  activation: OrgComplianceProgram | null;
  readiness: Readiness;
  requirements: {
    requirement_id: string;
    code: string;
    category: ComplianceCategory;
    severity: ComplianceSeverity;
    title_fr: string;
    title_en: string;
    scope: string;
    response: AssessmentResponse;
    assessed_at: string | null;
    comment: string | null;
    system_evidence_rule: string | null;
    evidence_count: number;
  }[];
  evidence_index: {
    id: string;
    title: string;
    type: EvidenceType;
    source: string;
    requirement_code: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    expiry_status: ExpiryStatus;
    related_entity_type: string | null;
    related_entity_id: string | null;
    related_entity_reference: string | null;
  }[];
  open_findings: ComplianceFinding[];
  actions: ComplianceAction[];
  system_evidence: SystemEvidenceRow[];
  documents: {
    id: string;
    title: string;
    category: DocumentCategory;
    current_version: number;
    versions: number;
    expiry_date: string | null;
    expiry_status: ExpiryStatus;
  }[];
  missing_evidence: { code: string; title_fr: string; title_en: string }[];
};

export type ExpiryStatus = "valid" | "expiring_soon" | "expired" | "no_expiry";

/* ------------------------------------------------------------------ reads */

export async function fetchPrograms(country?: string | null): Promise<ComplianceProgram[]> {
  let q = supabase.from("v2_compliance_programs").select("*").eq("is_active", true).order("sort_order");
  if (country) q = q.or(`country.eq.${country},country.is.null`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrgPrograms(orgId: string): Promise<(OrgComplianceProgram & { program: ComplianceProgram })[]> {
  const { data, error } = await supabase
    .from("v2_org_compliance_programs")
    .select("*, program:v2_compliance_programs(*)")
    .eq("organization_id", orgId)
    .neq("status", "archived")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as (OrgComplianceProgram & { program: ComplianceProgram })[];
}

export async function activateProgram(input: {
  organization_id: string;
  program_id: string;
  facility_id?: string | null;
  target_audit_date?: string | null;
}): Promise<OrgComplianceProgram> {
  const { data, error } = await supabase
    .from("v2_org_compliance_programs")
    .insert({
      organization_id: input.organization_id,
      program_id: input.program_id,
      facility_id: input.facility_id ?? null,
      target_audit_date: input.target_audit_date ?? null,
      status: "in_progress",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrgProgram(id: string, patch: Partial<OrgComplianceProgram>) {
  const { error } = await supabase.from("v2_org_compliance_programs").update(patch).eq("id", id);
  if (error) throw error;
}

export async function fetchRequirements(programId: string): Promise<ComplianceRequirement[]> {
  const { data, error } = await supabase
    .from("v2_compliance_requirements")
    .select("*")
    .eq("program_id", programId)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCurrentAssessments(orgProgramId: string): Promise<ComplianceAssessment[]> {
  const { data, error } = await supabase
    .from("v2_compliance_assessments")
    .select("*")
    .eq("org_program_id", orgProgramId)
    .eq("is_current", true);
  if (error) throw error;
  return data ?? [];
}

export async function fetchAssessmentHistory(orgProgramId: string, requirementId: string) {
  const { data, error } = await supabase
    .from("v2_compliance_assessments")
    .select("*")
    .eq("org_program_id", orgProgramId)
    .eq("requirement_id", requirementId)
    .order("assessed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchEvidence(orgId: string, requirementId?: string): Promise<ComplianceEvidence[]> {
  let q = supabase
    .from("v2_compliance_evidence")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_archived", false)
    .order("uploaded_at", { ascending: false });
  if (requirementId) q = q.eq("requirement_id", requirementId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchSystemEvidence(orgId: string): Promise<SystemEvidenceRow[]> {
  const { data, error } = await supabase.rpc("v2_compliance_system_evidence", { _organization_id: orgId });
  if (error) throw error;
  return (data ?? []) as unknown as SystemEvidenceRow[];
}

export async function fetchReadiness(orgId: string, orgProgramId: string): Promise<Readiness> {
  const { data, error } = await supabase.rpc("v2_compliance_readiness", {
    _organization_id: orgId,
    _org_program_id: orgProgramId,
  });
  if (error) throw error;
  return data as unknown as Readiness;
}

export async function fetchComplianceDashboard(orgId: string): Promise<ComplianceDashboard> {
  const { data, error } = await supabase.rpc("v2_compliance_dashboard", { _organization_id: orgId });
  if (error) throw error;
  return data as unknown as ComplianceDashboard;
}

export async function fetchAuditPack(orgId: string, orgProgramId: string): Promise<AuditPack> {
  const { data, error } = await supabase.rpc("v2_compliance_audit_pack", {
    _organization_id: orgId,
    _org_program_id: orgProgramId,
  });
  if (error) throw error;
  return data as unknown as AuditPack;
}

/* ------------------------------------------------------------------ writes */

export async function recordAssessment(input: {
  org_program_id: string;
  requirement_id: string;
  response: AssessmentResponse;
  comment?: string | null;
  facility_id?: string | null;
}) {
  const { data, error } = await supabase.rpc("v2_record_assessment", {
    _org_program_id: input.org_program_id,
    _requirement_id: input.requirement_id,
    _response: input.response,
    _comment: input.comment ?? null,
    _facility_id: input.facility_id ?? null,
  });
  if (error) throw error;
  return data as unknown as { assessment_id: string; finding_id: string | null; response: AssessmentResponse };
}

export async function uploadEvidenceFile(orgId: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${orgId}/evidence/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function uploadDocumentFile(orgId: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${orgId}/documents/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

/** Private bucket: files are only ever exposed through short-lived signed URLs. */
export async function signedEvidenceUrl(path: string, expiresIn = 300): Promise<string | null> {
  const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function createEvidence(input: {
  organization_id: string;
  org_program_id?: string | null;
  requirement_id?: string | null;
  facility_id?: string | null;
  evidence_type: EvidenceType;
  title: string;
  description?: string | null;
  storage_path?: string | null;
  external_reference?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
}): Promise<ComplianceEvidence> {
  const { data, error } = await supabase
    .from("v2_compliance_evidence")
    .insert({ ...input, source: "user_upload" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function archiveEvidence(id: string) {
  const { error } = await supabase.from("v2_compliance_evidence").update({ is_archived: true }).eq("id", id);
  if (error) throw error;
}

export async function fetchFindings(orgId: string, onlyOpen = false): Promise<ComplianceFinding[]> {
  let q = supabase
    .from("v2_compliance_findings")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (onlyOpen) q = q.in("status", ["open", "action_planned", "in_progress"]);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchActions(orgId: string): Promise<ComplianceAction[]> {
  const { data, error } = await supabase
    .from("v2_compliance_actions")
    .select("*")
    .eq("organization_id", orgId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAction(input: {
  organization_id: string;
  finding_id: string;
  title: string;
  description?: string | null;
  responsible_name?: string | null;
  due_date?: string | null;
  priority?: ComplianceSeverity;
}): Promise<ComplianceAction> {
  const { data, error } = await supabase
    .from("v2_compliance_actions")
    .insert({ ...input, priority: input.priority ?? "medium", status: "open" })
    .select("*")
    .single();
  if (error) throw error;
  await supabase
    .from("v2_compliance_findings")
    .update({ status: "action_planned" })
    .eq("id", input.finding_id)
    .eq("status", "open");
  return data;
}

export async function startAction(id: string) {
  const { error } = await supabase.from("v2_compliance_actions").update({ status: "in_progress" }).eq("id", id);
  if (error) throw error;
}

export async function completeAction(id: string, note?: string | null, evidenceId?: string | null) {
  const { data, error } = await supabase.rpc("v2_complete_action", {
    _action_id: id,
    _note: note ?? null,
    _evidence_id: evidenceId ?? null,
  });
  if (error) throw error;
  return data as unknown as { action_id: string; reassessment_required: boolean };
}

/* --------------------------------------------------------------- documents */

export async function fetchDocuments(orgId: string): Promise<(ComplianceDocument & { versions: ComplianceDocumentVersion[] })[]> {
  const { data, error } = await supabase
    .from("v2_compliance_documents")
    .select("*, versions:v2_compliance_document_versions(*)")
    .eq("organization_id", orgId)
    .eq("is_archived", false)
    .order("title");
  if (error) throw error;
  return (data ?? []) as (ComplianceDocument & { versions: ComplianceDocumentVersion[] })[];
}

export async function createDocument(input: {
  organization_id: string;
  title: string;
  category: DocumentCategory;
  description?: string | null;
  facility_id?: string | null;
}): Promise<ComplianceDocument> {
  const { data, error } = await supabase.from("v2_compliance_documents").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

/** Never overwrites: every upload creates a new version and keeps the old ones. */
export async function addDocumentVersion(input: {
  document_id: string;
  storage_path: string;
  file_name: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase.rpc("v2_add_document_version", {
    _document_id: input.document_id,
    _storage_path: input.storage_path,
    _file_name: input.file_name,
    _issue_date: input.issue_date ?? null,
    _expiry_date: input.expiry_date ?? null,
    _notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as unknown as { version_id: string; version_number: number };
}

/* ----------------------------------------------------------------- helpers */

export function expiryStatus(expiry: string | null | undefined, thresholdDays = 60): ExpiryStatus {
  if (!expiry) return "no_expiry";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${expiry}T00:00:00`);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + thresholdDays);
  if (d < today) return "expired";
  if (d <= limit) return "expiring_soon";
  return "valid";
}

export function expiryTone(status: ExpiryStatus): StatusTone {
  switch (status) {
    case "expired":
      return "danger";
    case "expiring_soon":
      return "warning";
    case "valid":
      return "success";
    default:
      return "neutral";
  }
}

export function responseTone(r: AssessmentResponse): StatusTone {
  switch (r) {
    case "compliant":
      return "success";
    case "partially_compliant":
      return "warning";
    case "non_compliant":
      return "danger";
    case "not_applicable":
      return "info";
    default:
      return "neutral";
  }
}

export function severityTone(s: ComplianceSeverity): StatusTone {
  switch (s) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "neutral";
  }
}

export function readinessTone(state: Readiness["state"]): StatusTone {
  switch (state) {
    case "ready_for_review":
      return "success";
    case "near_ready":
      return "info";
    case "progressing":
      return "warning";
    default:
      return "danger";
  }
}

export function findingTone(s: FindingStatus): StatusTone {
  switch (s) {
    case "resolved":
    case "verified":
      return "success";
    case "in_progress":
    case "action_planned":
      return "warning";
    case "dismissed":
      return "neutral";
    default:
      return "danger";
  }
}

export function actionTone(s: ActionStatus): StatusTone {
  switch (s) {
    case "completed":
    case "verified":
      return "success";
    case "in_progress":
      return "warning";
    case "cancelled":
      return "neutral";
    default:
      return "info";
  }
}

export function programName(p: { name_fr: string; name_en: string } | null | undefined, lang: string) {
  if (!p) return "—";
  return lang?.startsWith("fr") ? p.name_fr : p.name_en;
}

export function requirementTitle(r: { title_fr: string; title_en: string }, lang: string) {
  return lang?.startsWith("fr") ? r.title_fr : r.title_en;
}

export function localizedField<T extends Record<string, unknown>>(row: T, base: string, lang: string): string {
  const key = lang?.startsWith("fr") ? `${base}_fr` : `${base}_en`;
  return (row[key] as string) ?? (row[`${base}_fr`] as string) ?? "";
}
