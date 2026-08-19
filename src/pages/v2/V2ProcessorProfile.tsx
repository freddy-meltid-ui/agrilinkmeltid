// AGRI-GRID V2 — processor profile: review & edit the onboarding information
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Building2, Factory, Loader2, Package, Sprout } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useProcessor } from "@/hooks/v2/useProcessor";
import { completeness } from "@/lib/v2/processor";

const V2ProcessorProfile = () => {
  const { t } = useTranslation();
  const { bundle, loading, reload, activeOrg } = useProcessor();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trade_name: "",
    legal_form: "",
    rccm: "",
    ifu: "",
    year_established: "",
    business_phone: "",
    business_email: "",
    employees_count: "",
  });

  useEffect(() => {
    const p = bundle.profile;
    if (!p) return;
    setForm({
      trade_name: p.trade_name ?? "",
      legal_form: p.legal_form ?? "",
      rccm: p.rccm ?? "",
      ifu: p.ifu ?? "",
      year_established: p.year_established ? String(p.year_established) : "",
      business_phone: p.business_phone ?? "",
      business_email: p.business_email ?? "",
      employees_count: p.employees_count ? String(p.employees_count) : "",
    });
  }, [bundle.profile]);

  const save = async () => {
    if (!bundle.profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("v2_processor_profiles")
      .update({
        trade_name: form.trade_name.trim() || null,
        legal_form: form.legal_form.trim() || null,
        rccm: form.rccm.trim() || null,
        ifu: form.ifu.trim() || null,
        year_established: form.year_established ? Number(form.year_established) : null,
        business_phone: form.business_phone.trim() || null,
        business_email: form.business_email.trim() || null,
        employees_count: form.employees_count ? Number(form.employees_count) : null,
      })
      .eq("id", bundle.profile.id);
    setSaving(false);
    if (error) {
      toast.error(t("v2.processor.saveError"));
      return;
    }
    toast.success(t("v2.processor.saved"));
    reload();
  };

  if (loading) {
    return (
      <>
        <PageHeader title={t("v2.processor.title")} />
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </>
    );
  }

  if (!bundle.profile) {
    return (
      <>
        <PageHeader title={t("v2.processor.title")} description={t("v2.processor.description")} />
        <EmptyState
          icon={Building2}
          title={t("v2.processor.emptyTitle")}
          description={t("v2.processor.emptyDescription")}
          action={
            <Link to="/app/onboarding">
              <Button>{t("v2.dashboard.ctaOnboarding")}</Button>
            </Link>
          }
        />
      </>
    );
  }

  const field = (key: keyof typeof form, labelKey: string) => (
    <div>
      <Label htmlFor={key}>{t(labelKey)}</Label>
      <Input id={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <>
      <PageHeader
        title={activeOrg?.name ?? t("v2.processor.title")}
        description={t("v2.processor.description")}
        actions={
          <Link to="/app/onboarding">
            <Button variant="outline">{t("v2.processor.editOnboarding")}</Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge label={`${t("v2.dashboard.completeness")}: ${completeness(bundle)}%`} tone="success" />
        {bundle.profile.value_chains.map((c) => (
          <StatusBadge key={c} label={t(`v2.valueChains.${c}`, { defaultValue: c })} tone="info" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 font-medium">{t("v2.onboarding.step1.title")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("trade_name", "v2.onboarding.fields.tradeName")}
            {field("legal_form", "v2.onboarding.fields.legalForm")}
            {field("rccm", "v2.onboarding.fields.rccm")}
            {field("ifu", "v2.onboarding.fields.ifu")}
            {field("year_established", "v2.onboarding.fields.year")}
            {field("employees_count", "v2.onboarding.fields.employees")}
            {field("business_phone", "v2.onboarding.fields.phone")}
            {field("business_email", "v2.onboarding.fields.email")}
          </div>
          <Button className="mt-4" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("v2.common.save")}
          </Button>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-medium">
            <Factory className="h-4 w-4" /> {t("v2.processor.facilities")}
          </h2>
          {bundle.facilities.length ? (
            <ul className="space-y-3 text-sm">
              {bundle.facilities.map((f) => (
                <li key={f.id} className="rounded-md border border-border p-3">
                  <p className="font-medium">
                    {f.name} {f.is_main && <StatusBadge className="ml-2" label={t("v2.processor.mainFacility")} tone="success" />}
                  </p>
                  <p className="text-muted-foreground">
                    {[f.arrondissement, f.commune, f.department].filter(Boolean).join(" · ")}
                  </p>
                  {f.processing_capacity_value && (
                    <p className="text-muted-foreground">
                      {t("v2.onboarding.fields.capacity")}: {f.processing_capacity_value}{" "}
                      {t(`v2.units.${f.processing_capacity_unit}`, { defaultValue: f.processing_capacity_unit ?? "" })} /{" "}
                      {t(`v2.periods.${f.processing_capacity_period}`, { defaultValue: f.processing_capacity_period ?? "" })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("v2.processor.noFacilities")}</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-medium">
            <Package className="h-4 w-4" /> {t("v2.processor.products")}
          </h2>
          {bundle.products.length ? (
            <ul className="space-y-2 text-sm">
              {bundle.products.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <span>{p.product_name}</span>
                  <span className="text-muted-foreground">
                    {p.production_capacity_value
                      ? `${p.production_capacity_value} ${t(`v2.units.${p.production_capacity_unit}`, { defaultValue: p.production_capacity_unit ?? "" })} / ${t(`v2.periods.${p.production_capacity_period}`, { defaultValue: p.production_capacity_period ?? "" })}`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("v2.processor.noProducts")}</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-medium">
            <Sprout className="h-4 w-4" /> {t("v2.processor.rawMaterials")}
          </h2>
          {bundle.needs.length ? (
            <ul className="space-y-2 text-sm">
              {bundle.needs.map((n) => (
                <li key={n.id} className="rounded-md border border-border p-3">
                  <p className="font-medium">
                    {n.crop}
                    {n.variety ? ` — ${n.variety}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {n.quantity ?? "—"} {t(`v2.units.${n.unit}`, { defaultValue: n.unit })} ·{" "}
                    {t(`v2.frequencies.${n.frequency}`, { defaultValue: n.frequency })}
                    {n.sourcing_radius_km ? ` · ${n.sourcing_radius_km} km` : ""}
                  </p>
                  {n.sourcing_season && <p className="text-muted-foreground">{n.sourcing_season}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("v2.processor.noRawMaterials")}</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 font-medium">{t("v2.onboarding.step5.title")}</h2>
          {bundle.profile.challenges.length ? (
            <div className="flex flex-wrap gap-2">
              {bundle.profile.challenges.map((c) => (
                <StatusBadge key={c} label={t(`v2.challenges.${c}`, { defaultValue: c })} tone="warning" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("v2.processor.noChallenges")}</p>
          )}
        </section>
      </div>
    </>
  );
};

export default V2ProcessorProfile;
