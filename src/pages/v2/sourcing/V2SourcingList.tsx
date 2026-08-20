// AGRI-GRID V2 — Phase 1D: processor sourcing requests list.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { useProcessor } from "@/hooks/v2/useProcessor";
import { fetchReferenceData, refLabel, EMPTY_REFERENCE, type ReferenceData } from "@/lib/v2/reference";
import {
  fetchLatestRuns,
  fetchSourcingRequests,
  requestedTonnes,
  STATUS_TONE,
  type MatchRun,
  type SourcingRequest,
} from "@/lib/v2/sourcing";
import { localeTag } from "@/lib/v2/locale";

const V2SourcingList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeOrg, loading: orgLoading } = useProcessor();
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [runs, setRuns] = useState<Record<string, MatchRun>>({});
  const [reference, setReference] = useState<ReferenceData>(EMPTY_REFERENCE);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await fetchSourcingRequests(activeOrg.id);
    setRequests(rows);
    setRuns(await fetchLatestRuns(rows.map((r) => r.id)));
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    fetchReferenceData().then(setReference);
  }, []);

  useEffect(() => {
    if (orgLoading) return;
    load();
  }, [orgLoading, load]);

  const stats = useMemo(() => {
    const open = requests.filter((r) => ["open", "matching", "reviewing", "ready_for_confirmation"].includes(r.status));
    const covered = requests.filter((r) => r.status === "covered");
    const partial = requests.filter((r) => r.status === "partially_covered");
    const attention = requests.filter((r) => {
      const run = runs[r.id];
      return run && Number(run.coverage_ratio ?? 0) < 0.5 && r.status !== "cancelled";
    });
    return { open, covered, partial, attention };
  }, [requests, runs]);

  const cropName = (id: string) => refLabel(reference.crops.find((c) => c.id === id), i18n.language);
  const varietyName = (id: string | null) =>
    id ? refLabel(reference.varieties.find((v) => v.id === id), i18n.language) : null;

  if (loading || orgLoading) {
    return (
      <>
        <PageHeader title={t("v2.sourcing.title")} description={t("v2.sourcing.description")} />
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("v2.sourcing.title")}
        description={t("v2.sourcing.description")}
        actions={
          <Button onClick={() => navigate("/app/sourcing/new")} disabled={!activeOrg}>
            <Plus className="mr-2 h-4 w-4" />
            {t("v2.sourcing.newRequest")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("v2.sourcing.kpi.open")} value={stats.open.length} icon={ClipboardList} />
        <KpiCard label={t("v2.sourcing.kpi.covered")} value={stats.covered.length} />
        <KpiCard label={t("v2.sourcing.kpi.partial")} value={stats.partial.length} />
        <KpiCard label={t("v2.sourcing.kpi.attention")} value={stats.attention.length} />
      </div>

      <div className="mt-6 space-y-3">
        {requests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t("v2.sourcing.emptyTitle")}
            description={t("v2.sourcing.emptyDescription")}
            action={
              <Button onClick={() => navigate("/app/sourcing/new")} disabled={!activeOrg}>
                {t("v2.sourcing.newRequest")}
              </Button>
            }
          />
        ) : (
          requests.map((r) => {
            const run = runs[r.id];
            const pct = run ? Math.round(Number(run.coverage_ratio ?? 0) * 100) : null;
            return (
              <Link
                key={r.id}
                to={`/app/sourcing/${r.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {cropName(r.crop_id)}
                      {varietyName(r.variety_id) ? ` — ${varietyName(r.variety_id)}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.reference} · {requestedTonnes(r).toFixed(1)} t ·{" "}
                      {new Date(r.availability_start).toLocaleDateString(localeTag(i18n.language), { day: "2-digit", month: "short" })} →{" "}
                      {new Date(r.availability_end).toLocaleDateString(localeTag(i18n.language), { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <StatusBadge
                    label={t(`v2.sourcing.status.${r.status}`, { defaultValue: r.status })}
                    tone={STATUS_TONE[r.status] ?? "neutral"}
                  />
                </div>

                {pct != null && (
                  <div className="mt-3">
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${pct >= 100 ? "bg-primary" : pct >= 50 ? "bg-accent" : "bg-destructive"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("v2.sourcing.listCoverage", {
                        pct,
                        identified: Number(run?.identified_tonnes ?? 0).toFixed(1),
                        requested: Number(run?.requested_tonnes ?? 0).toFixed(1),
                      })}
                    </p>
                  </div>
                )}

                <p className="mt-3 text-sm font-medium text-primary">{t("v2.sourcing.viewMatches")} →</p>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
};

export default V2SourcingList;
