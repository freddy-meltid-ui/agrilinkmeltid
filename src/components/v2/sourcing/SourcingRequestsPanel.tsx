// AGRI-GRID V2 — Phase 1D: sourcing requests summary on the processor dashboard.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { EMPTY_REFERENCE, fetchReferenceData, refLabel, type ReferenceData } from "@/lib/v2/reference";
import {
  fetchLatestRuns,
  fetchSourcingRequests,
  requestedTonnes,
  STATUS_TONE,
  type MatchRun,
  type SourcingRequest,
} from "@/lib/v2/sourcing";

const SourcingRequestsPanel = ({ organizationId }: { organizationId: string }) => {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [runs, setRuns] = useState<Record<string, MatchRun>>({});
  const [reference, setReference] = useState<ReferenceData>(EMPTY_REFERENCE);

  useEffect(() => {
    fetchReferenceData().then(setReference);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSourcingRequests(organizationId)
      .then(async (rows) => {
        if (cancelled) return;
        setRequests(rows.filter((r) => r.status !== "cancelled").slice(0, 5));
        setRuns(await fetchLatestRuns(rows.map((r) => r.id)));
      })
      .catch(() => setRequests([]));
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-medium">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          {t("v2.sourcing.dashboard.title")}
        </h2>
        <Link to="/app/sourcing">
          <Button variant="outline" size="sm">{t("v2.sourcing.dashboard.viewAll")}</Button>
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("v2.sourcing.dashboard.empty")}</p>
          <Link to="/app/sourcing/new">
            <Button size="sm">{t("v2.sourcing.newRequest")}</Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => {
            const run = runs[r.id];
            const pct = run ? Math.round(Number(run.coverage_ratio ?? 0) * 100) : null;
            return (
              <li key={r.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {refLabel(reference.crops.find((c) => c.id === r.crop_id), i18n.language)}
                    {r.variety_id ? ` — ${refLabel(reference.varieties.find((v) => v.id === r.variety_id), i18n.language)}` : ""}
                    {" · "}
                    {requestedTonnes(r).toFixed(1)} t
                  </span>
                  <StatusBadge
                    label={t(`v2.sourcing.status.${r.status}`, { defaultValue: r.status })}
                    tone={STATUS_TONE[r.status] ?? "neutral"}
                  />
                </div>
                {pct != null && (
                  <>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className={`h-1.5 rounded-full ${pct >= 100 ? "bg-primary" : pct >= 50 ? "bg-accent" : "bg-destructive"}`}
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
                  </>
                )}
                <Link to={`/app/sourcing/${r.id}`} className="mt-2 inline-block text-sm font-medium text-primary">
                  {t("v2.sourcing.viewMatches")} →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default SourcingRequestsPanel;
