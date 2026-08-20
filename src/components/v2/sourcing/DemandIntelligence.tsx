// AGRI-GRID V2 — Phase 1D: internal Agri-Grid demand intelligence (admin only).
// Aggregated only: no processor is identifiable, no confidential per-company detail.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDemandIntelligence, fetchTaskFeed, type DemandRow, type TaskFeedRow } from "@/lib/v2/sourcing";

const DemandIntelligence = () => {
  const { t, i18n } = useTranslation();
  const fr = i18n.language.startsWith("fr");
  const [rows, setRows] = useState<DemandRow[]>([]);
  const [tasks, setTasks] = useState<TaskFeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDemandIntelligence().catch(() => []), fetchTaskFeed().catch(() => [])]).then(([d, tk]) => {
      setRows(d);
      setTasks(tk);
      setLoading(false);
    });
  }, []);

  const openTasks = tasks.filter((x) => ["open", "assigned", "in_progress"].includes(x.status));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          {t("v2.demand.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("v2.demand.empty")}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((r, i) => (
              <li key={`${r.crop_id}-${r.period_month}-${i}`} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {fr ? r.crop_name_fr : r.crop_name_en}
                    {r.department ? ` · ${r.department}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.period_month).toLocaleDateString(i18n.language, { month: "long", year: "numeric" })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("v2.demand.line", {
                    requests: Number(r.request_count ?? 0),
                    demand: Number(r.demand_tonnes ?? 0).toFixed(1),
                    supply: Number(r.identified_tonnes ?? 0).toFixed(1),
                    gap: Number(r.gap_tonnes ?? 0).toFixed(1),
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {t("v2.demand.tasks", { count: openTasks.length })}
        </p>
      </CardContent>
    </Card>
  );
};

export default DemandIntelligence;
