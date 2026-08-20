// AGRI-GRID V2 — Field agent mobile-first dashboard
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, Users, RefreshCw, Sprout, ClipboardCheck, UserPlus, Activity } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import FreshnessBadge from "@/components/v2/field/FreshnessBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFieldNetwork } from "@/hooks/v2/useFieldNetwork";
import { computeFreshness, supplyReferenceDate } from "@/lib/v2/freshness";
import { daysUntil } from "@/lib/v2/supply";
import { refLabel } from "@/lib/v2/reference";

const V2FieldDashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { workspace, reference, thresholds, agent } = useFieldNetwork();

  const cropName = (id: string) => refLabel(reference.crops.find((c) => c.id === id), i18n.language);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayVisits = workspace.visits.filter((v) => v.visit_date === today);
    const staleSuppliers = workspace.suppliers.filter((s) => {
      const { status } = computeFreshness(s.last_verified_at ?? s.updated_at, thresholds);
      return status !== "fresh";
    });
    const upcomingHarvests = workspace.cycles.filter((c) => {
      const d = daysUntil(c.expected_harvest_start);
      return d !== null && d >= 0 && d <= 45 && c.status !== "completed" && c.status !== "cancelled";
    });
    const needsConfirmation = workspace.supplies.filter((s) => {
      const { status } = computeFreshness(supplyReferenceDate(s), thresholds);
      return status !== "fresh";
    });
    return { todayVisits, staleSuppliers, upcomingHarvests, needsConfirmation };
  }, [workspace, thresholds]);

  return (
    <div className="pb-6">
      <PageHeader
        title={t("v2.field.dashboard.title")}
        description={agent ? t("v2.field.dashboard.agentGreeting", { name: agent.full_name }) : t("v2.field.dashboard.adminGreeting")}
        actions={
          <Button size="lg" onClick={() => navigate("/app/field/register")} className="h-12">
            <UserPlus className="mr-2 h-5 w-5" />
            {t("v2.field.actions.register")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={CalendarCheck} label={t("v2.field.kpi.todayVisits")} value={stats.todayVisits.length} />
        <KpiCard icon={Users} label={t("v2.field.kpi.assignedSuppliers")} value={workspace.suppliers.length} />
        <KpiCard icon={RefreshCw} label={t("v2.field.kpi.needUpdate")} value={stats.staleSuppliers.length} />
        <KpiCard icon={Sprout} label={t("v2.field.kpi.upcomingHarvests")} value={stats.upcomingHarvests.length} />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Link to="/app/field/tasks">
          <Button variant="outline" className="h-12 w-full sm:w-auto">
            <ClipboardCheck className="mr-2 h-5 w-5" />
            {t("v2.tasks.navCta")}
          </Button>
        </Link>
        <Link to="/app/field/confirmations">
          <Button variant="outline" className="h-12 w-full sm:w-auto">
            <ClipboardCheck className="mr-2 h-5 w-5" />
            {t("v2.procurement.confirm.navCta")}
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              {t("v2.field.sections.needConfirmation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.needsConfirmation.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("v2.field.sections.allFresh")}</p>
            )}
            {stats.needsConfirmation.slice(0, 6).map((s) => {
              const supplier = workspace.suppliers.find((x) => x.id === s.supplier_id);
              return (
                <Link
                  key={s.id}
                  to={`/app/field/suppliers/${s.supplier_id}`}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 active:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{supplier?.display_name ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {cropName(s.crop_id)} · {s.quantity_available} {s.unit_code}
                    </p>
                  </div>
                  <FreshnessBadge date={supplyReferenceDate(s)} thresholds={thresholds} />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sprout className="h-4 w-4 text-primary" />
              {t("v2.field.sections.upcomingHarvests")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.upcomingHarvests.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("v2.field.sections.noUpcoming")}</p>
            )}
            {stats.upcomingHarvests
              .sort((a, b) => (a.expected_harvest_start ?? "").localeCompare(b.expected_harvest_start ?? ""))
              .slice(0, 6)
              .map((c) => {
                const supplier = workspace.suppliers.find((x) => x.id === c.supplier_id);
                return (
                  <Link
                    key={c.id}
                    to={`/app/field/suppliers/${c.supplier_id}`}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 active:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{supplier?.display_name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{cropName(c.crop_id)}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {t("v2.field.inDays", { count: daysUntil(c.expected_harvest_start) ?? 0 })}
                    </span>
                  </Link>
                );
              })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              {t("v2.field.sections.recentActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspace.visits.slice(0, 8).map((v) => {
              const supplier = workspace.suppliers.find((x) => x.id === v.supplier_id);
              return (
                <div key={v.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{supplier?.display_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{t(`v2.field.visitTypes.${v.visit_type}`)}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">{v.visit_date}</span>
                </div>
              );
            })}
            {workspace.visits.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline" size="lg" className="h-12">
          <Link to="/app/field/suppliers">{t("v2.field.actions.viewSuppliers")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default V2FieldDashboard;
