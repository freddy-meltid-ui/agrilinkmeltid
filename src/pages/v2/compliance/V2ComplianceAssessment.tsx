// AGRI-GRID V2 — Phase 3A: guided self-assessment for one activated program.
// Recording an answer is append-only; a non-compliant answer opens a finding
// automatically (server-side). System-evidence requirements are pre-satisfied
// from real operations data instead of asking for an upload.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  FileText,
  Info,
  Loader2,
  Paperclip,
  Upload,
} from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import {
  RESPONSES,
  createEvidence,
  fetchCurrentAssessments,
  fetchEvidence,
  fetchReadiness,
  fetchRequirements,
  fetchSystemEvidence,
  localizedField,
  readinessTone,
  recordAssessment,
  responseTone,
  severityTone,
  signedEvidenceUrl,
  uploadEvidenceFile,
  type AssessmentResponse,
  type ComplianceAssessment,
  type ComplianceEvidence,
  type ComplianceProgram,
  type ComplianceRequirement,
  type OrgComplianceProgram,
  type Readiness,
  type SystemEvidenceRow,
} from "@/lib/v2/compliance";

const V2ComplianceAssessment = () => {
  const { orgProgramId } = useParams();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const lang = i18n.language;

  const [loading, setLoading] = useState(true);
  const [orgProgram, setOrgProgram] = useState<(OrgComplianceProgram & { program: ComplianceProgram }) | null>(null);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [assessments, setAssessments] = useState<Record<string, ComplianceAssessment>>({});
  const [evidence, setEvidence] = useState<ComplianceEvidence[]>([]);
  const [systemEvidence, setSystemEvidence] = useState<SystemEvidenceRow[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [evidenceFor, setEvidenceFor] = useState<ComplianceRequirement | null>(null);
  const [evForm, setEvForm] = useState({ title: "", issue_date: "", expiry_date: "", file: null as File | null });
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!activeOrg || !orgProgramId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: op, error } = await supabase
        .from("v2_org_compliance_programs")
        .select("*, program:v2_compliance_programs(*)")
        .eq("id", orgProgramId)
        .single();
      if (error) throw error;
      const typed = op as OrgComplianceProgram & { program: ComplianceProgram };
      setOrgProgram(typed);

      const [reqs, current, ev, sys, ready] = await Promise.all([
        fetchRequirements(typed.program_id),
        fetchCurrentAssessments(orgProgramId),
        fetchEvidence(activeOrg.id),
        fetchSystemEvidence(activeOrg.id),
        fetchReadiness(activeOrg.id, orgProgramId),
      ]);
      setRequirements(reqs);
      setAssessments(Object.fromEntries(current.map((a) => [a.requirement_id, a])));
      setComments(Object.fromEntries(current.map((a) => [a.requirement_id, a.comment ?? ""])));
      setEvidence(ev);
      setSystemEvidence(sys);
      setReadiness(ready);
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, orgProgramId, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const systemByRule = useMemo(() => {
    const map: Record<string, SystemEvidenceRow[]> = {};
    systemEvidence.filter((s) => s.qualifies).forEach((s) => {
      (map[s.rule_code] ||= []).push(s);
    });
    return map;
  }, [systemEvidence]);

  const grouped = useMemo(() => {
    const map: Record<string, ComplianceRequirement[]> = {};
    requirements.forEach((r) => {
      (map[r.category] ||= []).push(r);
    });
    return map;
  }, [requirements]);

  const answer = async (req: ComplianceRequirement, response: AssessmentResponse) => {
    if (!orgProgramId) return;
    setSavingId(req.id);
    try {
      const res = await recordAssessment({
        org_program_id: orgProgramId,
        requirement_id: req.id,
        response,
        comment: comments[req.id] || null,
        facility_id: orgProgram?.facility_id ?? null,
      });
      toast({
        title: t("v2.compliance.answerSaved"),
        description: res.finding_id ? t("v2.compliance.findingOpened") : undefined,
      });
      await load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const submitEvidence = async () => {
    if (!activeOrg || !evidenceFor || !evForm.file || !evForm.title.trim()) return;
    setUploading(true);
    try {
      const path = await uploadEvidenceFile(activeOrg.id, evForm.file);
      await createEvidence({
        organization_id: activeOrg.id,
        org_program_id: orgProgramId,
        requirement_id: evidenceFor.id,
        facility_id: orgProgram?.facility_id ?? null,
        evidence_type: evidenceFor.requirement_type === "photo_required" ? "photo" : "document",
        title: evForm.title.trim(),
        storage_path: path,
        issue_date: evForm.issue_date || null,
        expiry_date: evForm.expiry_date || null,
      });
      toast({ title: t("v2.compliance.evidenceAdded") });
      setEvidenceFor(null);
      setEvForm({ title: "", issue_date: "", expiry_date: "", file: null });
      setEvidence(await fetchEvidence(activeOrg.id));
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const openFile = async (path: string | null) => {
    if (!path) return;
    const url = await signedEvidenceUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast({ title: t("v2.common.error"), variant: "destructive" });
  };

  if (loading || orgLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!orgProgram) return <EmptyState title={t("v2.compliance.programNotFound")} />;

  return (
    <div>
      <Link
        to="/app/compliance"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("v2.compliance.title")}
      </Link>

      <PageHeader
        title={localizedField(orgProgram.program as unknown as Record<string, unknown>, "name", lang)}
        description={localizedField(orgProgram.program as unknown as Record<string, unknown>, "description", lang)}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={`/app/compliance/programs/${orgProgramId}/audit-pack`}>
              <FileText className="mr-1.5 h-4 w-4" />
              {t("v2.compliance.auditPack")}
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("v2.compliance.readiness")}
            </p>
            <p className="mt-1 text-3xl font-semibold text-foreground">
              {Number(readiness?.readiness ?? 0).toFixed(0)}%
            </p>
          </div>
          <StatusBadge
            label={t(`v2.compliance.state.${readiness?.state ?? "early_stage"}`)}
            tone={readinessTone(readiness?.state ?? "early_stage")}
          />
        </div>
        <Progress value={Number(readiness?.readiness ?? 0)} className="mt-3 h-2" />
        <p className="mt-3 text-xs text-muted-foreground">
          {t("v2.compliance.formulaExplanation", {
            points: readiness?.weighted_points ?? 0,
            total: readiness?.weighted_total ?? 0,
            critical: readiness?.weights?.critical ?? 5,
            high: readiness?.weights?.high ?? 3,
            medium: readiness?.weights?.medium ?? 2,
            low: readiness?.weights?.low ?? 1,
          })}
        </p>
        {readiness?.critical_gate && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("v2.compliance.criticalGateDetail", {
              requirements: readiness.critical_requirement_gaps,
              findings: readiness.critical_open_findings,
            })}
          </p>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <KpiCard
          label={t("v2.compliance.kpi.assessed")}
          value={`${readiness?.requirements_assessed ?? 0}/${readiness?.requirements_total ?? 0}`}
        />
        <KpiCard label={t("v2.compliance.kpi.openFindings")} value={readiness?.open_findings ?? 0} />
        <KpiCard label={t("v2.compliance.kpi.openActions")} value={readiness?.open_actions ?? 0} />
      </div>

      <Accordion type="multiple" className="mt-6" defaultValue={Object.keys(grouped).slice(0, 1)}>
        {Object.entries(grouped).map(([category, reqs]) => {
          const done = reqs.filter((r) => assessments[r.id] && assessments[r.id].response !== "not_assessed").length;
          return (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger>
                <span className="flex flex-1 items-center justify-between gap-3 pr-3 text-left">
                  <span className="font-medium">{t(`v2.compliance.category.${category}`)}</span>
                  <span className="text-xs text-muted-foreground">
                    {done}/{reqs.length}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {reqs.map((req) => {
                    const current = assessments[req.id];
                    const sys = req.system_evidence_rule ? systemByRule[req.system_evidence_rule] ?? [] : [];
                    const attached = evidence.filter((e) => e.requirement_id === req.id);
                    return (
                      <div key={req.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">
                              {localizedField(req as unknown as Record<string, unknown>, "title", lang)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{req.code}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <StatusBadge
                              label={t(`v2.compliance.severity.${req.severity}`)}
                              tone={severityTone(req.severity)}
                            />
                            {current && (
                              <StatusBadge
                                label={t(`v2.compliance.response.${current.response}`)}
                                tone={responseTone(current.response)}
                              />
                            )}
                          </div>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {localizedField(req as unknown as Record<string, unknown>, "description", lang)}
                        </p>
                        {localizedField(req as unknown as Record<string, unknown>, "guidance", lang) && (
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {localizedField(req as unknown as Record<string, unknown>, "guidance", lang)}
                          </p>
                        )}

                        {req.system_evidence_rule && (
                          <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
                            <p className="flex items-center gap-1.5 font-medium text-primary">
                              <Database className="h-3.5 w-3.5" />
                              {t("v2.compliance.systemEvidenceTitle")}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {sys.length
                                ? t("v2.compliance.systemEvidenceFound", { count: sys.length })
                                : t("v2.compliance.systemEvidenceMissing")}
                            </p>
                            {sys.slice(0, 4).map((s) => (
                              <p key={`${s.rule_code}-${s.entity_id}`} className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 text-primary" />
                                {s.entity_reference ?? s.entity_id}
                              </p>
                            ))}
                          </div>
                        )}

                        {attached.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {attached.map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => openFile(e.storage_path)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Paperclip className="h-3 w-3" />
                                {e.title}
                              </button>
                            ))}
                          </div>
                        )}

                        <Textarea
                          className="mt-3"
                          rows={2}
                          placeholder={t("v2.compliance.commentPlaceholder")}
                          value={comments[req.id] ?? ""}
                          onChange={(ev) => setComments({ ...comments, [req.id]: ev.target.value })}
                        />

                        <div className="mt-3 flex flex-wrap gap-2">
                          {RESPONSES.map((r) => (
                            <Button
                              key={r}
                              size="sm"
                              variant={current?.response === r ? "default" : "outline"}
                              disabled={savingId === req.id}
                              onClick={() => answer(req, r)}
                            >
                              {savingId === req.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                              {t(`v2.compliance.response.${r}`)}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEvidenceFor(req);
                              setEvForm({ title: "", issue_date: "", expiry_date: "", file: null });
                            }}
                          >
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            {t("v2.compliance.addEvidence")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Dialog open={!!evidenceFor} onOpenChange={(o) => !o && setEvidenceFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.compliance.addEvidence")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("v2.compliance.evidenceTitle")}</Label>
              <Input value={evForm.title} onChange={(e) => setEvForm({ ...evForm, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("v2.compliance.file")}</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setEvForm({ ...evForm, file: e.target.files?.[0] ?? null })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("v2.compliance.issueDate")}</Label>
                <Input
                  type="date"
                  value={evForm.issue_date}
                  onChange={(e) => setEvForm({ ...evForm, issue_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("v2.compliance.expiryDate")}</Label>
                <Input
                  type="date"
                  value={evForm.expiry_date}
                  onChange={(e) => setEvForm({ ...evForm, expiry_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitEvidence} disabled={uploading || !evForm.file || !evForm.title.trim()}>
              {uploading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("v2.compliance.upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default V2ComplianceAssessment;
