// AGRI-GRID V2 — Phase 3C.1: one advisory analysis, its provenance and its
// human review. Nothing here can change a compliance answer or the readiness
// score: the Phase 3A assessment workflow remains the only authority.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, RefreshCw, Sparkles } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CopilotDisclaimer from "@/components/v2/copilot/CopilotDisclaimer";
import ObservationReview from "@/components/v2/copilot/ObservationReview";
import NewAnalysisDialog from "@/components/v2/copilot/NewAnalysisDialog";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { formatDate } from "@/lib/v2/finance";
import { requirementTitle, type ComplianceRequirement } from "@/lib/v2/compliance";
import { supabase } from "@/integrations/supabase/client";
import {
  analysisStatusTone,
  cancelAnalysis,
  fetchAnalysis,
  fetchObservations,
  relevanceTone,
  type AiAnalysis,
  type AiObservation,
  type CopilotResult,
} from "@/lib/v2/copilot";


const List = ({ title, items }: { title: string; items: string[] }) =>
  items.length === 0 ? null : (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((s, i) => (
          <li key={`${i}-${s.slice(0, 12)}`}>{s}</li>
        ))}
      </ul>
    </div>
  );

const V2CopilotAnalysis = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg } = useOrganization();

  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [observations, setObservations] = useState<AiObservation[]>([]);
  const [requirement, setRequirement] = useState<ComplianceRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryOpen, setRetryOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);


  const load = useCallback(async () => {
    if (!analysisId) return;
    setLoading(true);
    try {
      const a = await fetchAnalysis(analysisId);
      setAnalysis(a);
      if (a) {
        setObservations(await fetchObservations(a.id));
        if (a.requirement_id) {
          const { data } = await supabase
            .from("v2_compliance_requirements")
            .select("*")
            .eq("id", a.requirement_id)
            .maybeSingle();
          setRequirement(data ?? null);
        }
      }
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [analysisId, toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analysis) {
    return <EmptyState icon={Sparkles} title={t("v2.copilot.notFound")} />;
  }

  const result = (analysis.result ?? {}) as CopilotResult;
  const questions = (result.questions_for_operator ?? []).filter(Boolean);
  const nextEvidence = (result.suggested_next_evidence ?? []).filter(Boolean);
  const limitations = (result.limitations ?? []).filter(Boolean);
  const dates = result.extracted_dates ?? [];

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate("/app/compliance/copilot")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {t("v2.copilot.backToCopilot")}
      </Button>

      <PageHeader
        title={t(`v2.copilot.types.${analysis.analysis_type}`)}
        description={t("v2.copilot.analysisSubtitle", {
          date: formatDate(analysis.requested_at, i18n.language),
        })}
        actions={
          analysis.status === "failed" ? (
            <Button size="sm" onClick={() => setRetryOpen(true)}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {t("v2.copilot.retry")}
            </Button>
          ) : ["draft", "queued", "processing"].includes(analysis.status) ? (
            // An unfinished analysis is cancellable and never shown as successful.
            <Button
              size="sm"
              variant="outline"
              disabled={cancelling}
              onClick={async () => {
                setCancelling(true);
                try {
                  await cancelAnalysis(analysis.id);
                  toast({ title: t("v2.copilot.cancelled") });
                  await load();
                } catch (e) {
                  toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
                } finally {
                  setCancelling(false);
                }
              }}
            >
              {cancelling && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("v2.copilot.cancel")}
            </Button>
          ) : undefined
        }
      />


      <CopilotDisclaimer className="mb-5" />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge label={t(`v2.copilot.status.${analysis.status}`)} tone={analysisStatusTone(analysis.status)} />
        {!analysis.is_latest && <StatusBadge label={t("v2.copilot.superseded")} tone="neutral" />}
        {analysis.relevance && (
          <StatusBadge
            label={t(`v2.copilot.relevance.${analysis.relevance}`)}
            tone={relevanceTone(analysis.relevance)}
          />
        )}
        {analysis.confidence && (
          <StatusBadge
            label={t("v2.copilot.confidenceLabel", {
              value: t(`v2.copilot.confidence.${analysis.confidence}`, { defaultValue: analysis.confidence }),
            })}
            tone="neutral"
          />
        )}
      </div>

      {/* PROGRAM REQUIREMENT (authoritative) is kept visually separate from AI text. */}
      {requirement && (
        <Card className="mb-5 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("v2.copilot.programRequirement")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">
              {requirement.code} — {requirementTitle(requirement, i18n.language)}
            </p>
            <p className="text-muted-foreground">
              {i18n.language.startsWith("fr") ? requirement.description_fr : requirement.description_en}
            </p>
            <p className="text-xs text-muted-foreground">{t("v2.copilot.authoritativeNote")}</p>
          </CardContent>
        </Card>
      )}

      {analysis.status === "failed" && (
        <Card className="mb-5 border-destructive/40">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-destructive">{t("v2.copilot.analysisFailed")}</p>
            <p className="mt-1 text-muted-foreground">
              {t(`v2.copilot.errors.${analysis.error_code}`, { defaultValue: analysis.error_message ?? "" })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("v2.copilot.evidenceKept")}</p>
          </CardContent>
        </Card>
      )}

      {result.summary && (
        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("v2.copilot.aiSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{result.summary}</p>
            <List title={t("v2.copilot.questions")} items={questions} />
            <List title={t("v2.copilot.nextEvidence")} items={nextEvidence} />
            {dates.length > 0 && (
              <div>
                <p className="text-sm font-medium">{t("v2.copilot.extractedDates")}</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {dates.map((d, i) => (
                    <li key={`${d.kind}-${i}`}>
                      {t(`v2.copilot.dateKinds.${d.kind}`, { defaultValue: d.kind })}: {d.value}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">{t("v2.copilot.datesNeedConfirmation")}</p>
              </div>
            )}
            <List title={t("v2.copilot.limitations")} items={limitations} />
          </CardContent>
        </Card>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("v2.copilot.proposedObservations")}</h2>
        <p className="text-xs text-muted-foreground">{t("v2.copilot.humanReviewRequired")}</p>
      </div>

      <div className="space-y-3">
        {observations.length === 0 ? (
          <EmptyState icon={Sparkles} title={t("v2.copilot.noObservations")} />
        ) : (
          observations.map((o) => <ObservationReview key={o.id} observation={o} onChanged={load} />)
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {t("v2.copilot.provenance", {
          provider: analysis.provider,
          model: analysis.model,
          prompt: analysis.prompt_version,
        })}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("v2.copilot.assessmentUnchanged")}{" "}
        {analysis.org_program_id && (
          <Link className="underline" to={`/app/compliance/programs/${analysis.org_program_id}`}>
            {t("v2.copilot.goToAssessment")}
          </Link>
        )}
      </p>

      {activeOrg && (
        <NewAnalysisDialog
          open={retryOpen}
          onOpenChange={setRetryOpen}
          organizationId={activeOrg.id}
          defaultType={analysis.analysis_type}
          fixedRequirementId={analysis.requirement_id}
          fixedOrgProgramId={analysis.org_program_id}
          onDone={(id) => navigate(`/app/compliance/copilot/${id}`)}
        />
      )}
    </div>
  );
};

export default V2CopilotAnalysis;
