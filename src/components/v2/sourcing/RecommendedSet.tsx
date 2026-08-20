// AGRI-GRID V2 — Phase 1D: recommended multi-supplier coverage (greedy, deterministic).
import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import type { MatchRow } from "@/lib/v2/sourcing";

const RecommendedSet = ({
  allocations,
  requestedTonnes,
}: {
  allocations: { row: MatchRow; tonnes: number }[];
  requestedTonnes: number;
}) => {
  const { t } = useTranslation();
  const total = allocations.reduce((s, a) => s + a.tonnes, 0);

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-medium">{t("v2.sourcing.recommended.title")}</h2>
      </div>

      {allocations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("v2.sourcing.recommended.empty")}</p>
      ) : (
        <>
          <ul className="space-y-2 text-sm">
            {allocations.map((a) => (
              <li key={a.row.supply_id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.row.supplier_ref}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.row.distance_km != null ? `~${Number(a.row.distance_km).toFixed(0)} km · ` : ""}
                    {t("v2.sourcing.matchScore")} {Number(a.row.score ?? 0).toFixed(0)}%
                  </p>
                </div>
                <span className="shrink-0 font-semibold">{a.tonnes.toFixed(2)} t</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">
              {t("v2.sourcing.recommended.total", { requested: requestedTonnes.toFixed(1) })}
            </span>
            <span className="font-semibold">{total.toFixed(2)} t</span>
          </div>
        </>
      )}

      <p className="mt-3 text-xs text-muted-foreground">{t("v2.sourcing.recommended.algorithm")}</p>
    </section>
  );
};

export default RecommendedSet;
