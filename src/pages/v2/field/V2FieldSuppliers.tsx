// AGRI-GRID V2 — assigned suppliers list (mobile-first, search-first)
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, UserPlus, MapPin } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import FreshnessBadge from "@/components/v2/field/FreshnessBadge";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFieldNetwork } from "@/hooks/v2/useFieldNetwork";
import type { SupplierStatus } from "@/lib/v2/supply";

const STATUS_TONE: Record<SupplierStatus, "success" | "warning" | "danger" | "neutral"> = {
  field_verified: "success",
  unverified: "neutral",
  update_required: "warning",
  inactive: "danger",
};

const V2FieldSuppliers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspace, thresholds } = useFieldNetwork();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return workspace.suppliers;
    return workspace.suppliers.filter((s) =>
      [s.display_name, s.phone, s.village, s.commune, s.supplier_code]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(term)),
    );
  }, [workspace.suppliers, search]);

  return (
    <div className="pb-6">
      <PageHeader
        title={t("v2.field.suppliers.title")}
        description={t("v2.field.suppliers.description")}
        actions={
          <Button size="lg" className="h-12" onClick={() => navigate("/app/field/register")}>
            <UserPlus className="mr-2 h-5 w-5" />
            {t("v2.field.actions.register")}
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("v2.field.suppliers.searchPlaceholder")}
          className="h-12 pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t("v2.field.suppliers.empty")} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                to={`/app/field/suppliers/${s.id}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 active:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.display_name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {[s.village, s.commune, s.department].filter(Boolean).join(", ") || "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.supplier_code}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge tone={STATUS_TONE[s.status]} label={t(`v2.field.supplierStatus.${s.status}`)} />
                  <FreshnessBadge date={s.last_verified_at ?? s.updated_at} thresholds={thresholds} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default V2FieldSuppliers;
