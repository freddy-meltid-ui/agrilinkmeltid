// AGRI-GRID V2 — Phase 3C.1: Compliance Copilot hub (evidence-driven, no free chat).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CopilotDisclaimer from "@/components/v2/copilot/CopilotDisclaimer";
import ConsentGate from "@/components/v2/copilot/ConsentGate";
import NewAnalysisDialog from "@/components/v2/copilot/NewAnalysisDialog";
import ObservationReview from "@/components/v2/copilot/ObservationReview";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { formatDate } from "@/lib/v2/finance";
import {
  analysisStatusTone,
  fetchAnalyses,
  fetchConfig,
  fetchConsents,
  fetchPendingObservations,
  fetchReviewedObservations,
  type AiAnalysis,
  type AiObservation,
  type AnalysisType,
} from "@/lib/v2/copilot";

const V2ComplianceCopilot = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]);
  const [pending, setPending] = useState<AiObservation[]>([]);
  const [accepted, setAccepted] = useState<AiObservation[]>([]);
  const [modified, setModified] = useState<AiObservation[]>([]);
  const [rejected, setRejected] = useState<AiObservation[]>([]);
  const [consentVersion, setConsentVersion] = useState<string>("AI_EVIDENCE_CONSENT_V1");
  const [hasConsent, setHasConsent] = useState(true);
  const [consentOpen, setConsentOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<AnalysisType>("document_requirement");

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [rows, pend, acc, mod, rej, cfg, consents] = await Promise.all([
        fetchAnalyses(activeOrg.id),
        fetchPendingObservations(activeOrg.id),
        fetchReviewedObservations(activeOrg.id, "accepted"),
        fetchReviewedObservations(activeOrg.id, "modified"),
        fetchReviewedObservations(activeOrg.id, "rejected"),
        fetchConfig(),
        fetchConsents(activeOrg.id),
      ]);
      setAnalyses(rows);
      setPending(pend);
      setAccepted(acc);
      setModified(mod);
      setRejected(rej);
      const version = cfg[0]?.consent_version ?? "AI_EVIDENCE_CONSENT_V1";
      setConsentVersion(version);
      setHasConsent(consents.some((c) => c.consent_version === version));
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const start = (type: AnalysisType) => {
    setDialogType(type);
    if (!hasConsent) {
      setConsentOpen(true);
      return;
    }
    setDialogOpen(true);
  };

  const reviewedWithHumanVersion = useMemo(() => [...accepted, ...modified], [accepted, modified]);

  if (loading || orgLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeOrg) return <EmptyState icon={Sparkles} title={t("v2.copilot.title")} />;

  return (
    <div>
      <PageHeader
        title={t("v2.copilot.title")}
        description={t("v2.copilot.description")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => start("document_requirement")}>
              <FileText className="mr-1.5 h-4 w-4" />
              {t("v2.copilot.analyzeDocument")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => start("facility_photo")}>
              <ImageIcon className="mr-1.5 h-4 w-4" />
              {t("v2.copilot.analyzePhoto")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => start("product_label")}>
              {t("v2.copilot.analyzeLabel")}
            </Button>
          </div>
        }
      />

      <CopilotDisclaimer className="mb-5" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("v2.copilot.kpi.analyses")} value={analyses.length} icon={Sparkles} />
        <KpiCard label={t("v2.copilot.kpi.pending")} value={pending.length} icon={FileText} />
        <KpiCard label={t("v2.copilot.kpi.accepted")} value={reviewedWithHumanVersion.length} />
        <KpiCard label={t("v2.copilot.kpi.rejected")} value={rejected.length} />
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="pending">{t("v2.copilot.tabs.pending")}</TabsTrigger>
          <TabsTrigger value="analyses">{t("v2.copilot.tabs.analyses")}</TabsTrigger>
          <TabsTrigger value="accepted">{t("v2.copilot.tabs.accepted")}</TabsTrigger>
          <TabsTrigger value="rejected">{t("v2.copilot.tabs.rejected")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pending.length === 0 ? (
            <EmptyState icon={Sparkles} title={t("v2.copilot.noPending")} description={t("v2.copilot.noPendingHint")} />
          ) : (
            pending.map((o) => <ObservationReview key={o.id} observation={o} onChanged={load} />)
          )}
        </TabsContent>

        <TabsContent value="analyses" className="space-y-3">
          {analyses.length === 0 ? (
            <EmptyState icon={Sparkles} title={t("v2.copilot.noAnalyses")} description={t("v2.copilot.noAnalysesHint")} />
          ) : (
            analyses.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t(`v2.copilot.types.${a.analysis_type}`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(a.requested_at, i18n.language)} · {a.prompt_version} · {a.model}
                    </p>
                    {a.error_code && (
                      <p className="mt-1 text-xs text-destructive">
                        {t(`v2.copilot.errors.${a.error_code}`, { defaultValue: a.error_code })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!a.is_latest && <StatusBadge label={t("v2.copilot.superseded")} tone="neutral" />}
                    <StatusBadge label={t(`v2.copilot.status.${a.status}`)} tone={analysisStatusTone(a.status)} />
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/app/compliance/copilot/${a.id}`}>{t("v2.copilot.open")}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-3">
          {reviewedWithHumanVersion.length === 0 ? (
            <EmptyState icon={Sparkles} title={t("v2.copilot.noAccepted")} />
          ) : (
            reviewedWithHumanVersion.map((o) => <ObservationReview key={o.id} observation={o} onChanged={load} />)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-3">
          {rejected.length === 0 ? (
            <EmptyState icon={Sparkles} title={t("v2.copilot.noRejected")} />
          ) : (
            rejected.map((o) => <ObservationReview key={o.id} observation={o} onChanged={load} />)
          )}
        </TabsContent>
      </Tabs>

      <ConsentGate
        open={consentOpen}
        onOpenChange={setConsentOpen}
        organizationId={activeOrg.id}
        consentVersion={consentVersion}
        onAccepted={() => {
          setHasConsent(true);
          setDialogOpen(true);
        }}
      />

      <NewAnalysisDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={activeOrg.id}
        defaultType={dialogType}
        onDone={load}
      />
    </div>
  );
};

export default V2ComplianceCopilot;
