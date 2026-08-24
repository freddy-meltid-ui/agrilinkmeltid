// AGRI-GRID V2 — Phase 3C.1: request an advisory analysis of ONE evidence item.
//
// * The user explicitly asks for the analysis — nothing is analysed on upload.
// * Photos support guided capture (retake before upload) and can be attached to
//   the same requirement several times.
// * Files are validated client-side (type + size) and again server-side.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, FileUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import CopilotDisclaimer from "@/components/v2/copilot/CopilotDisclaimer";
import {
  createEvidence,
  fetchEvidence,
  fetchOrgPrograms,
  fetchRequirements,
  requirementTitle,
  uploadEvidenceFile,
  type ComplianceEvidence,
  type ComplianceRequirement,
  type ComplianceProgram,
  type OrgComplianceProgram,
} from "@/lib/v2/compliance";
import {
  ACCEPTED_MIME,
  MAX_UPLOAD_BYTES,
  guidedStepsFor,
  runAnalysis,
  type AnalysisType,
} from "@/lib/v2/copilot";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  defaultType?: AnalysisType;
  fixedRequirementId?: string | null;
  fixedOrgProgramId?: string | null;
  onDone: (analysisId: string) => void;
};

const NewAnalysisDialog = ({
  open,
  onOpenChange,
  organizationId,
  defaultType = "document_requirement",
  fixedRequirementId = null,
  fixedOrgProgramId = null,
  onDone,
}: Props) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const [analysisType, setAnalysisType] = useState<AnalysisType>(defaultType);
  const [programs, setPrograms] = useState<(OrgComplianceProgram & { program: ComplianceProgram })[]>([]);
  const [orgProgramId, setOrgProgramId] = useState<string>(fixedOrgProgramId ?? "none");
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [requirementId, setRequirementId] = useState<string>(fixedRequirementId ?? "none");
  const [evidenceList, setEvidenceList] = useState<ComplianceEvidence[]>([]);
  const [mode, setMode] = useState<"existing" | "upload">("upload");
  const [evidenceId, setEvidenceId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setAnalysisType(defaultType), [defaultType]);

  const load = useCallback(async () => {
    try {
      const [progs, ev] = await Promise.all([fetchOrgPrograms(organizationId), fetchEvidence(organizationId)]);
      setPrograms(progs);
      setEvidenceList(ev.filter((e) => e.storage_path));
      if (fixedOrgProgramId) setOrgProgramId(fixedOrgProgramId);
      else if (progs.length === 1) setOrgProgramId(progs[0].id);
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    }
  }, [organizationId, fixedOrgProgramId, toast, t]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    const prog = programs.find((p) => p.id === orgProgramId);
    if (!prog) {
      setRequirements([]);
      return;
    }
    fetchRequirements(prog.program_id).then(setRequirements).catch(() => setRequirements([]));
  }, [orgProgramId, programs]);

  const requirement = useMemo(
    () => requirements.find((r) => r.id === requirementId) ?? null,
    [requirements, requirementId],
  );
  const guidedSteps = useMemo(() => guidedStepsFor(requirement?.category), [requirement]);

  const pickFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      toast({ title: t("v2.copilot.fileTooLarge"), variant: "destructive" });
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = async () => {
    setBusy(true);
    try {
      let targetEvidenceId = evidenceId;

      if (mode === "upload") {
        if (!file) throw new Error(t("v2.copilot.fileRequired"));
        const path = await uploadEvidenceFile(organizationId, file);
        const created = await createEvidence({
          organization_id: organizationId,
          org_program_id: orgProgramId === "none" ? null : orgProgramId,
          requirement_id: requirementId === "none" ? null : requirementId,
          evidence_type: analysisType === "facility_photo" ? "photo" : "document",
          title: title || file.name,
          storage_path: path,
        });
        targetEvidenceId = created.id;
      }
      if (!targetEvidenceId) throw new Error(t("v2.copilot.evidenceRequired"));

      const res = await runAnalysis({
        organization_id: organizationId,
        evidence_id: targetEvidenceId,
        analysis_type: analysisType,
        requirement_id: requirementId === "none" ? null : requirementId,
        org_program_id: orgProgramId === "none" ? null : orgProgramId,
        user_context: context || null,
        language: i18n.language,
      });

      toast({ title: t("v2.copilot.analysisComplete"), description: t("v2.copilot.reviewRequired") });
      onOpenChange(false);
      setFile(null);
      setTitle("");
      setContext("");
      onDone(res.analysis_id);
    } catch (e) {
      const msg = (e as Error).message;
      toast({
        title: t("v2.copilot.analysisFailed"),
        description: t(`v2.copilot.errors.${msg}`, { defaultValue: msg }),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("v2.copilot.newAnalysis")}
          </DialogTitle>
        </DialogHeader>

        <CopilotDisclaimer compact />

        <div className="space-y-4">
          <div>
            <Label>{t("v2.copilot.analysisType")}</Label>
            <Select value={analysisType} onValueChange={(v) => setAnalysisType(v as AnalysisType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document_requirement">{t("v2.copilot.types.document_requirement")}</SelectItem>
                <SelectItem value="product_label">{t("v2.copilot.types.product_label")}</SelectItem>
                <SelectItem value="facility_photo">{t("v2.copilot.types.facility_photo")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!fixedOrgProgramId && (
            <div>
              <Label>{t("v2.compliance.program")}</Label>
              <Select value={orgProgramId} onValueChange={setOrgProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("v2.compliance.selectProgram")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("v2.copilot.noProgram")}</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {i18n.language.startsWith("fr") ? p.program.name_fr : p.program.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!fixedRequirementId && (
            <div>
              <Label>{t("v2.copilot.requirement")}</Label>
              <Select value={requirementId} onValueChange={setRequirementId} disabled={!requirements.length}>
                <SelectTrigger>
                  <SelectValue placeholder={t("v2.copilot.selectRequirement")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("v2.copilot.noRequirement")}</SelectItem>
                  {requirements.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} — {requirementTitle(r, i18n.language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">{t("v2.copilot.requirementHint")}</p>
            </div>
          )}

          {analysisType === "facility_photo" && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                <Camera className="h-4 w-4" />
                {t("v2.copilot.guidedCapture")}
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                {guidedSteps.map((s) => (
                  <li key={s}>{t(`v2.copilot.steps.${s}`)}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "upload" ? "default" : "outline"}
              onClick={() => setMode("upload")}
            >
              <FileUp className="mr-1.5 h-4 w-4" />
              {t("v2.copilot.newEvidence")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "existing" ? "default" : "outline"}
              onClick={() => setMode("existing")}
              disabled={!evidenceList.length}
            >
              {t("v2.copilot.existingEvidence")}
            </Button>
          </div>

          {mode === "upload" ? (
            <div className="space-y-3">
              <div>
                <Label>{t("v2.compliance.file")}</Label>
                <Input
                  type="file"
                  accept={ACCEPTED_MIME[analysisType]}
                  capture={analysisType === "facility_photo" ? "environment" : undefined}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("v2.copilot.fileHint")}</p>
              </div>
              {file && (
                <div className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
                  <span className="truncate">{file.name}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setFile(null)}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    {t("v2.copilot.retake")}
                  </Button>
                </div>
              )}
              <div>
                <Label>{t("v2.compliance.evidenceTitle")}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <Label>{t("v2.copilot.existingEvidence")}</Label>
              <Select value={evidenceId} onValueChange={setEvidenceId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("v2.copilot.selectEvidence")} />
                </SelectTrigger>
                <SelectContent>
                  {evidenceList.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>{t("v2.copilot.contextLabel")}</Label>
            <Textarea
              rows={2}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={t("v2.copilot.contextPlaceholder")}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("v2.copilot.minimizationHint")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("v2.common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || (mode === "upload" ? !file : !evidenceId)}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {busy ? t("v2.copilot.analyzing") : t("v2.copilot.analyze")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewAnalysisDialog;
