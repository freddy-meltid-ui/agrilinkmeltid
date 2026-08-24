// AGRI-GRID V2 — Phase 3C.1: human review of ONE proposed AI observation.
//
// * The original AI wording is always displayed and never overwritten; edits
//   are stored separately and shown as "human-validated version".
// * Accepting an observation changes NO compliance answer and NO readiness
//   score. A finding and a corrective action are created only on explicit
//   confirmation, and a reassessment always stays required.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, History, Loader2, Pencil, Sparkles, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { severityTone } from "@/lib/v2/compliance";
import { formatDate } from "@/lib/v2/finance";
import {
  canBecomeFinding,
  confidenceBand,
  confidencePercent,
  createActionFromObservation,
  createFindingFromObservation,
  effectiveDescription,
  effectiveSeverity,
  effectiveTitle,
  fetchReviewHistory,
  observationTypeTone,
  reviewObservation,
  reviewTone,
  wasModifiedByHuman,
  type AiObservation,
  type AiReview,
  type Severity,
} from "@/lib/v2/copilot";

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];


const ObservationReview = ({ observation, onChanged }: { observation: AiObservation; onChanged: () => void }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const o = observation;
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: effectiveTitle(o),
    description: effectiveDescription(o) ?? "",
    severity: (effectiveSeverity(o) ?? "medium") as Severity,
    comment: o.reviewer_comment ?? "",
  });
  const [actionForm, setActionForm] = useState({ due_date: "", responsible_name: "" });
  const [showAction, setShowAction] = useState(false);
  const [history, setHistory] = useState<AiReview[] | null>(null);

  const loadHistory = async () => {
    try {
      setHistory(await fetchReviewHistory(o.id));
    } catch {
      setHistory([]);
    }
  };


  const guard = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      onChanged();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const decide = (decision: "accepted" | "rejected" | "modified") =>
    guard(decision, async () => {
      await reviewObservation({
        observation_id: o.id,
        decision,
        title: decision === "modified" ? form.title : null,
        description: decision === "modified" ? form.description : null,
        severity: decision === "modified" ? form.severity : null,
        comment: form.comment || null,
      });
      setEditing(false);
      toast({
        title: t(`v2.copilot.reviewed.${decision}`),
        description: decision === "rejected" ? t("v2.copilot.noFindingCreated") : t("v2.copilot.reassessmentReminder"),
      });
    });

  const makeFinding = () =>
    guard("finding", async () => {
      const res = await createFindingFromObservation(o.id);
      toast({
        title: res.created ? t("v2.copilot.findingCreated") : t("v2.copilot.findingExists"),
        description: t("v2.copilot.reassessmentReminder"),
      });
    });

  const makeAction = () =>
    guard("action", async () => {
      await createActionFromObservation({
        observation_id: o.id,
        due_date: actionForm.due_date || null,
        responsible_name: actionForm.responsible_name || null,
      });
      setShowAction(false);
      toast({ title: t("v2.copilot.actionCreated"), description: t("v2.copilot.reassessmentReminder") });
    });

  const pending = o.review_status === "pending_review";
  const severity = effectiveSeverity(o);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {o.observation_code && <span className="mr-1.5 text-muted-foreground">{o.observation_code}</span>}
              {effectiveTitle(o)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("v2.copilot.aiObservationLabel")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge
              label={t(`v2.copilot.obsTypes.${o.observation_type}`, { defaultValue: o.observation_type })}
              tone={observationTypeTone(o.observation_type)}
            />
            {severity && o.observation_type !== "positive_evidence" && (
              <StatusBadge
                label={t("v2.copilot.potentialSeverity", { value: t(`v2.compliance.severity.${severity}`) })}
                tone={severityTone(severity)}
              />
            )}
            <StatusBadge label={t(`v2.copilot.review.${o.review_status}`)} tone={reviewTone(o.review_status)} />
          </div>
        </div>

        {effectiveDescription(o) && <p className="text-sm text-muted-foreground">{effectiveDescription(o)}</p>}

        {o.evidence_reference && (
          <p className="text-xs text-muted-foreground">
            {t("v2.copilot.evidenceReference")}: {o.evidence_reference}
          </p>
        )}

        {/* Confidence in the OBSERVATION — explicitly not a compliance score. */}
        {confidencePercent(o) !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t("v2.copilot.observationConfidence")} · {t(`v2.copilot.confidence.${confidenceBand(o)}`)}
              </span>
              <span>{confidencePercent(o)}%</span>
            </div>
            <Progress value={confidencePercent(o) ?? 0} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">{t("v2.copilot.confidenceNotScore")}</p>
          </div>
        )}

        {o.ai_limitation && (
          <p className="text-xs text-muted-foreground">
            {t("v2.copilot.limitation")}: {o.ai_limitation}
          </p>
        )}

        {o.ai_suggested_next_action && (
          <p className="text-xs text-muted-foreground">
            {t("v2.copilot.suggestedNextAction")}: {o.ai_suggested_next_action}
          </p>
        )}

        {o.requires_human_verification && pending && (
          <StatusBadge label={t("v2.copilot.requiresHumanVerification")} tone="warning" />
        )}


        {/* The AI text always remains available, even after a human edit. */}
        {wasModifiedByHuman(o) && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {t("v2.copilot.showOriginal")}
              <ChevronDown className="h-3.5 w-3.5" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
              <p className="font-medium">{o.ai_title}</p>
              {o.ai_description && <p className="mt-1">{o.ai_description}</p>}
              {o.ai_severity && (
                <p className="mt-1">
                  {t("v2.copilot.potentialSeverity", { value: t(`v2.compliance.severity.${o.ai_severity}`) })}
                </p>
              )}
              {o.ai_rationale && <p className="mt-1 italic">{o.ai_rationale}</p>}
            </CollapsibleContent>
          </Collapsible>
        )}

        {o.reviewer_comment && (
          <p className="rounded-md bg-muted/40 p-2 text-xs">
            {t("v2.copilot.reviewerComment")}: {o.reviewer_comment}
          </p>
        )}

        {editing && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <div>
              <Label className="text-xs">{t("v2.copilot.editTitle")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{t("v2.copilot.editDescription")}</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">{t("v2.copilot.editSeverity")}</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as Severity })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`v2.compliance.severity.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("v2.copilot.reviewerComment")}</Label>
              <Textarea rows={2} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            </div>
            <Button size="sm" onClick={() => decide("modified")} disabled={busy !== null}>
              {busy === "modified" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("v2.copilot.saveHumanVersion")}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {pending && (
            <>
              <Button size="sm" onClick={() => decide("accepted")} disabled={busy !== null}>
                {busy === "accepted" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-4 w-4" />
                )}
                {t("v2.copilot.accept")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)} disabled={busy !== null}>
                <Pencil className="mr-1.5 h-4 w-4" />
                {t("v2.copilot.modify")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => decide("rejected")} disabled={busy !== null}>
                {busy === "rejected" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-1.5 h-4 w-4" />
                )}
                {t("v2.copilot.reject")}
              </Button>
            </>
          )}

          {!pending && o.review_status !== "rejected" && (
            <>
              {/* A positive observation is never a finding. */}
              {o.finding_id ? (
                <StatusBadge label={t("v2.copilot.findingLinked")} tone="danger" />
              ) : canBecomeFinding(o) ? (
                <Button size="sm" variant="outline" onClick={makeFinding} disabled={busy !== null}>
                  {busy === "finding" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {t("v2.copilot.createFinding")}
                </Button>
              ) : (
                <StatusBadge label={t("v2.copilot.positiveNoFinding")} tone="success" />
              )}
              {!o.action_id ? (
                <Button size="sm" variant="outline" onClick={() => setShowAction((v) => !v)} disabled={busy !== null}>
                  <Wrench className="mr-1.5 h-4 w-4" />
                  {t("v2.copilot.createAction")}
                </Button>
              ) : (
                <StatusBadge label={t("v2.copilot.actionLinked")} tone="warning" />
              )}
            </>
          )}

        </div>

        {showAction && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">{t("v2.copilot.actionExplicit")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">{t("v2.compliance.dueDate")}</Label>
                <Input
                  type="date"
                  value={actionForm.due_date}
                  onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">{t("v2.compliance.responsible")}</Label>
                <Input
                  value={actionForm.responsible_name}
                  onChange={(e) => setActionForm({ ...actionForm, responsible_name: e.target.value })}
                />
              </div>
            </div>
            <Button size="sm" onClick={makeAction} disabled={busy !== null}>
              {busy === "action" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("v2.copilot.confirmCreateAction")}
            </Button>
          </div>
        )}

        {/* Append-only audit trail: who decided what, when. */}
        {!pending && (
          <Collapsible onOpenChange={(open) => open && loadHistory()}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <History className="h-3.5 w-3.5" />
              {t("v2.copilot.reviewHistory")}
              <ChevronDown className="h-3.5 w-3.5" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5 rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
              {history === null ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : history.length === 0 ? (
                <p>{t("v2.copilot.noReviewHistory")}</p>
              ) : (
                history.map((h) => (
                  <div key={h.id}>
                    <span className="font-medium">{t(`v2.copilot.review.${h.decision}`)}</span> ·{" "}
                    {formatDate(h.reviewed_at, i18n.language)}
                    {h.review_comment && <span> · {h.review_comment}</span>}
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};


export default ObservationReview;
