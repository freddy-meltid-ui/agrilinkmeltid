// AGRI-GRID V2 — Phase 3B: printable financing dossier.
// Every figure is derived from AgriGrid operational records; nothing is projected.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Printer, Wallet } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { fetchFinanceDossier, formatAmount, readinessTone, type FinanceDossier } from "@/lib/v2/finance";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-6 break-inside-avoid rounded-lg border border-border bg-card p-4">
    <h2 className="mb-3 font-serif text-lg text-foreground">{title}</h2>
    {children}
  </section>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-4 border-b border-border/60 py-1.5 text-sm last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-foreground">{value ?? "—"}</span>
  </div>
);

const V2FinanceDossier = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [dossier, setDossier] = useState<FinanceDossier | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setDossier(await fetchFinanceDossier(activeOrg.id));
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  if (loading || orgLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeOrg || !dossier) return <EmptyState icon={Wallet} title={t("v2.finance.noData")} />;

  const lang = i18n.language;
  const cur = dossier.snapshot?.currency ?? "XOF";
  const org = dossier.organization ?? {};
  const req = dossier.financing_request;
  const s = dossier.snapshot ?? ({} as FinanceDossier["snapshot"]);

  return (
    <div>
      <PageHeader
        title={t("v2.finance.dossierTitle")}
        description={t("v2.finance.dossierDescription")}
        actions={
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" />
            {t("v2.finance.print")}
          </Button>
        }
      />

      <p className="text-xs text-muted-foreground">
        {t("v2.finance.generatedAt")}: {new Date(dossier.generated_at).toLocaleString(lang)}
      </p>

      <Section title={t("v2.finance.sections.identity")}>
        <Row label={t("v2.finance.fields.orgName")} value={org.name} />
        <Row label={t("v2.finance.fields.orgType")} value={org.org_type} />
        <Row label={t("v2.finance.fields.country")} value={org.country} />
        <Row label={t("v2.finance.fields.city")} value={org.city} />
        <Row label={t("v2.finance.fields.registration")} value={org.registration_number} />
        <Row label={t("v2.finance.fields.taxId")} value={org.tax_id} />
      </Section>

      <Section title={t("v2.finance.sections.request")}>
        {req ? (
          <>
            <Row
              label={t("v2.finance.fields.purpose")}
              value={req.financing_purpose ? t(`v2.finance.purposes.${req.financing_purpose}`) : "—"}
            />
            <Row
              label={t("v2.finance.fields.type")}
              value={req.financing_type ? t(`v2.finance.types.${req.financing_type}`) : "—"}
            />
            <Row
              label={t("v2.finance.fields.amount")}
              value={formatAmount(Number(req.requested_amount ?? 0), req.currency ?? cur, lang)}
            />
            <Row label={t("v2.finance.fields.tenor")} value={req.tenor_months} />
            <Row
              label={t("v2.finance.fields.ownContribution")}
              value={formatAmount(Number(req.own_contribution ?? 0), req.currency ?? cur, lang)}
            />
            {(dossier.use_of_funds ?? []).map((l, i) => (
              <Row
                key={i}
                label={`${t(`v2.finance.purposes.${l.category}`)}${l.label ? ` — ${l.label}` : ""}`}
                value={formatAmount(Number(l.amount ?? 0), req.currency ?? cur, lang)}
              />
            ))}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("v2.finance.noRequestYet")}</p>
        )}
      </Section>

      <Section title={t("v2.finance.sections.operations")}>
        <Row label={t("v2.finance.facts.months_of_history")} value={dossier.history?.months_of_history} />
        <Row
          label={t("v2.finance.facts.maturity")}
          value={dossier.history ? t(`v2.finance.maturity.${dossier.history.maturity}`) : "—"}
        />
        <Row label={t("v2.finance.facts.suppliers")} value={s.procurement?.active_suppliers} />
        <Row label={t("v2.finance.facts.accepted_tonnes")} value={s.procurement?.accepted_tonnes} />
        <Row
          label={t("v2.finance.facts.procurement_value")}
          value={formatAmount(s.procurement?.procurement_value, cur, lang)}
        />
        <Row label={t("v2.finance.facts.production_batches")} value={s.production?.batches} />
        <Row label={t("v2.finance.facts.yield_ratio")} value={s.production?.average_yield_ratio} />
      </Section>

      <Section title={t("v2.finance.sections.commercial")}>
        <Row label={t("v2.finance.facts.customers")} value={s.sales?.customers} />
        <Row label={t("v2.finance.facts.orders")} value={s.sales?.orders} />
        <Row label={t("v2.finance.facts.sales_value")} value={formatAmount(s.sales?.value, cur, lang)} />
        <Row
          label={t("v2.finance.facts.cash_collected")}
          value={formatAmount(s.collections?.cash_collected, cur, lang)}
        />
        <Row
          label={t("v2.finance.facts.outstanding")}
          value={formatAmount(s.collections?.outstanding_receivables, cur, lang)}
        />
        <Row label={t("v2.finance.facts.collection_ratio")} value={s.collections?.collection_ratio} />
        <Row label={t("v2.finance.facts.expenses")} value={formatAmount(s.expenses?.total, cur, lang)} />
        <Row
          label={t("v2.finance.facts.inventory_value")}
          value={formatAmount(s.inventory?.value, cur, lang)}
        />
      </Section>

      <Section title={t("v2.finance.sections.compliance")}>
        <Row label={t("v2.finance.facts.compliance_readiness")} value={`${s.compliance?.readiness ?? 0}%`} />
        <Row label={t("v2.finance.facts.critical_gaps")} value={s.compliance?.critical_gaps ?? 0} />
      </Section>

      <Section title={t("v2.finance.sections.documents")}>
        {(dossier.documents ?? []).map((d) => (
          <Row
            key={d.code}
            label={`${d.label_en}${d.importance === "required" ? " *" : ""}`}
            value={
              <StatusBadge
                label={d.available ? t("v2.finance.availableBadge") : t("v2.finance.missingBadge")}
                tone={d.available ? "success" : d.importance === "required" ? "danger" : "neutral"}
              />
            }
          />
        ))}
      </Section>

      <Section title={t("v2.finance.sections.readiness")}>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-semibold text-foreground">{dossier.readiness?.readiness ?? 0}%</span>
          {dossier.readiness?.state && (
            <StatusBadge
              label={t(`v2.finance.states.${dossier.readiness.state}`)}
              tone={readinessTone(dossier.readiness.state)}
            />
          )}
        </div>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {(dossier.readiness?.qualifiers ?? []).map((q) => (
            <li key={q}>• {t(`v2.finance.qualifiers.${q}`)}</li>
          ))}
        </ul>
      </Section>

      <p className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        {dossier.disclaimer ?? t("v2.finance.disclaimer")}
      </p>
    </div>
  );
};

export default V2FinanceDossier;
