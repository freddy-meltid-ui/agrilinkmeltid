// AGRI-GRID V2 — Phase 3A: audit readiness pack (structured, exportable, honest).
// Shows exactly what an inspector would ask for, what exists, and what is missing.
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  expiryTone,
  fetchAuditPack,
  localizedField,
  readinessTone,
  responseTone,
  severityTone,
  type AuditPack,
} from "@/lib/v2/compliance";

const V2ComplianceAuditPack = () => {
  const { orgProgramId } = useParams();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [pack, setPack] = useState<AuditPack | null>(null);
  const [loading, setLoading] = useState(true);
  const lang = i18n.language;

  const load = useCallback(async () => {
    if (!activeOrg || !orgProgramId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPack(await fetchAuditPack(activeOrg.id, orgProgramId));
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, orgProgramId, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const exportJson = () => {
    if (!pack) return;
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-pack-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || orgLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!pack) return <EmptyState title={t("v2.compliance.programNotFound")} />;

  const program = pack.program as unknown as Record<string, unknown> | null;

  return (
    <div>
      <Link
        to={`/app/compliance/programs/${orgProgramId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("v2.compliance.backToAssessment")}
      </Link>

      <PageHeader
        title={t("v2.compliance.auditPack")}
        description={t("v2.compliance.auditPackDescription")}
        actions={
          <Button size="sm" variant="outline" onClick={exportJson}>
            <Download className="mr-1.5 h-4 w-4" />
            {t("v2.compliance.export")}
          </Button>
        }
      />

      {program && (
        <p className="mb-4 text-sm text-muted-foreground">
          {localizedField(program, "name", lang)} · {t("v2.compliance.generatedAt")}{" "}
          {new Date(pack.generated_at).toLocaleString()}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("v2.compliance.readiness")} value={`${Number(pack.readiness.readiness).toFixed(0)}%`} />
        <KpiCard
          label={t("v2.compliance.kpi.assessed")}
          value={`${pack.readiness.requirements_assessed}/${pack.readiness.requirements_total}`}
        />
        <KpiCard label={t("v2.compliance.kpi.openFindings")} value={pack.open_findings.length} />
        <KpiCard label={t("v2.compliance.kpi.systemEvidenceShort")} value={pack.system_evidence.length} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge
          label={t(`v2.compliance.state.${pack.readiness.state}`)}
          tone={readinessTone(pack.readiness.state)}
        />
        {pack.readiness.critical_gate && (
          <span className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("v2.compliance.criticalGate")}
          </span>
        )}
      </div>

      {pack.missing_evidence.length > 0 && (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-foreground">{t("v2.compliance.missingEvidence")}</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {pack.missing_evidence.map((m) => (
              <li key={m.code}>
                {m.code} — {lang.startsWith("fr") ? m.title_fr : m.title_en}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mt-8 mb-3 font-serif text-xl text-foreground">{t("v2.compliance.requirementsSummary")}</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("v2.compliance.code")}</th>
              <th className="px-3 py-2">{t("v2.compliance.requirement")}</th>
              <th className="px-3 py-2">{t("v2.compliance.importance")}</th>
              <th className="px-3 py-2">{t("v2.compliance.answer")}</th>
              <th className="px-3 py-2">{t("v2.compliance.evidence")}</th>
            </tr>
          </thead>
          <tbody>
            {pack.requirements.map((r) => (
              <tr key={r.requirement_id} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{r.code}</td>
                <td className="px-3 py-2">{lang.startsWith("fr") ? r.title_fr : r.title_en}</td>
                <td className="px-3 py-2">
                  <StatusBadge label={t(`v2.compliance.severity.${r.severity}`)} tone={severityTone(r.severity)} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge label={t(`v2.compliance.response.${r.response}`)} tone={responseTone(r.response)} />
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.system_evidence_rule
                    ? t("v2.compliance.systemDerived")
                    : t("v2.compliance.filesCount", { count: r.evidence_count })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 mb-3 font-serif text-xl text-foreground">{t("v2.compliance.evidenceIndex")}</h2>
      {!pack.evidence_index.length ? (
        <EmptyState icon={FileText} title={t("v2.compliance.noEvidence")} />
      ) : (
        <div className="space-y-2">
          {pack.evidence_index.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-sm text-foreground">
                {e.title}
                {e.requirement_code ? <span className="ml-2 text-xs text-muted-foreground">{e.requirement_code}</span> : null}
              </span>
              <StatusBadge label={t(`v2.compliance.expiry.${e.expiry_status}`)} tone={expiryTone(e.expiry_status)} />
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 mb-3 font-serif text-xl text-foreground">{t("v2.compliance.systemEvidenceTitle")}</h2>
      <div className="space-y-2">
        {pack.system_evidence.slice(0, 25).map((s) => (
          <div key={`${s.rule_code}-${s.entity_id}`} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="text-foreground">{s.entity_reference ?? s.entity_id}</span>
            <span className="ml-2 text-xs text-muted-foreground">{s.rule_code}</span>
          </div>
        ))}
        {!pack.system_evidence.length && <EmptyState title={t("v2.compliance.systemEvidenceMissing")} />}
      </div>

      <p className="mt-8 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        {t("v2.compliance.disclaimer")}
      </p>
    </div>
  );
};

export default V2ComplianceAuditPack;
