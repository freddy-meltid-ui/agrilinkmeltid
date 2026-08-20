// AGRI-GRID V2 — Phase 3B: consent-based lender pack (public, token-only view).
// The recipient is NOT signed in. The hashed token alone authorises a read-only,
// scope-limited projection of a single business record, produced by the database.
// Nothing here is a credit score, a rating or a lending recommendation.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSharedFinanceDossier, formatAmount, type SharedFinanceDossier, formatDate} from "@/lib/v2/finance";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6 rounded-lg border border-border bg-card p-4">
    <h2 className="mb-3 font-serif text-lg text-foreground">{title}</h2>
    {children}
  </section>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border/60 py-1.5 text-sm last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-foreground">
      {value === null || value === undefined || value === "" ? "—" : value}
    </span>
  </div>
);

const V2FinanceSharedDossier = () => {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [pack, setPack] = useState<SharedFinanceDossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await fetchSharedFinanceDossier(token ?? "");
        if (!cancelled) setPack(d);
      } catch (e) {
        const msg = (e as Error).message || "";
        const code = msg.includes("SHARE_REVOKED")
          ? "revoked"
          : msg.includes("SHARE_EXPIRED")
            ? "expired"
            : "notFound";
        if (!cancelled) setError(code);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <AlertTriangle className="mb-3 h-8 w-8 text-muted-foreground" />
        <h1 className="font-serif text-xl text-foreground">{t(`v2.finance.shared.${error ?? "notFound"}Title`)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(`v2.finance.shared.${error ?? "notFound"}Body`)}
        </p>
      </div>
    );
  }

  const scopes: string[] = pack.scopes ?? [];
  const full = pack.dossier;
  const snap = full?.snapshot as Record<string, any> | undefined;
  const business = (snap?.business ?? pack.business) as Record<string, any> | undefined;
  const facilities = (snap?.facilities ?? pack.facilities ?? []) as Record<string, any>[];
  const products = (snap?.products ?? pack.products ?? []) as Record<string, any>[];
  const procurement = (snap?.procurement ?? pack.procurement) as Record<string, any> | undefined;
  const production = (snap?.production ?? pack.production) as Record<string, any> | undefined;
  const inventory = (snap?.inventory ?? pack.inventory) as Record<string, any> | undefined;
  const sales = (snap?.sales ?? pack.sales) as Record<string, any> | undefined;
  const collections = (snap?.collections ?? pack.collections) as Record<string, any> | undefined;
  const documents = ((full?.readiness as any)?.documents ?? pack.documents ?? []) as Record<string, any>[];
  const compliance = (snap?.compliance ?? pack.compliance) as Record<string, any> | undefined;
  const cur = (snap?.currency ?? sales?.currency ?? null) as string | null;
  const multi = Boolean(snap?.multi_currency ?? sales?.multi_currency);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:py-0">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("v2.finance.shared.kicker")}</p>
        <h1 className="font-serif text-2xl text-foreground">{pack.shared_by ?? "—"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("v2.finance.shared.sharedWith", { name: pack.recipient ?? "—" })} ·{" "}
          {t("v2.finance.shared.validUntil", {
            date: formatDate(pack.expires_at, lang),
          })}
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("v2.finance.shared.disclaimer")}</span>
        </div>
        {multi && (
          <p className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {t("v2.finance.multiCurrencyNotice")}
          </p>
        )}
        <Button variant="outline" size="sm" className="mt-3 print:hidden" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          {t("v2.finance.print")}
        </Button>
      </header>

      <Section title={t("v2.finance.shared.scopesShared")}>
        <p className="text-sm text-muted-foreground">
          {scopes.map((s) => t(`v2.finance.scopes.${s}`)).join(" · ")}
        </p>
      </Section>

      {business && (
        <Section title={t("v2.finance.sections.identity")}>
          <Row label={t("v2.finance.fields.legalName")} value={business.legal_name ?? business.name} />
          <Row label={t("v2.finance.fields.legalForm")} value={business.legal_form} />
          <Row label={t("v2.finance.fields.rccm")} value={business.rccm} />
          <Row label={t("v2.finance.fields.ifu")} value={business.ifu} />
          <Row label={t("v2.finance.fields.country")} value={business.country} />
          <Row label={t("v2.finance.fields.city")} value={business.city} />
          <Row label={t("v2.finance.fields.employees")} value={business.employees_count} />
          <Row label={t("v2.finance.fields.facilities")} value={facilities.length} />
          <Row label={t("v2.finance.fields.products")} value={products.length} />
        </Section>
      )}

      {(procurement || production || inventory) && (
        <Section title={t("v2.finance.sections.operations")}>
          <Row label={t("v2.finance.facts.suppliers")} value={procurement?.active_suppliers} />
          <Row label={t("v2.finance.facts.accepted_tonnes")} value={procurement?.accepted_tonnes} />
          <Row
            label={t("v2.finance.facts.procurement_value")}
            value={formatAmount(procurement?.procurement_value, cur, lang)}
          />
          <Row label={t("v2.finance.facts.production_batches")} value={production?.batches} />
          <Row label={t("v2.finance.facts.raw_material_stock")} value={inventory?.raw_material_tonnes} />
        </Section>
      )}

      {(sales || collections) && (
        <Section title={t("v2.finance.sections.commercial")}>
          <Row label={t("v2.finance.facts.orders")} value={sales?.orders} />
          <Row label={t("v2.finance.facts.customers")} value={sales?.customers} />
          <Row label={t("v2.finance.facts.sales_value")} value={formatAmount(sales?.value, cur, lang)} />
          <Row
            label={t("v2.finance.facts.cash_collected")}
            value={formatAmount(collections?.cash_collected, cur, lang)}
          />
          <Row
            label={t("v2.finance.facts.outstanding")}
            value={formatAmount(collections?.outstanding_receivables, cur, lang)}
          />
        </Section>
      )}

      {documents.length > 0 && (
        <Section title={t("v2.finance.sections.documents")}>
          {documents.map((d) => (
            <Row
              key={d.code}
              label={lang.startsWith("fr") ? d.name_fr : d.name_en}
              value={d.available ? t("v2.finance.availableBadge") : t("v2.finance.missingBadge")}
            />
          ))}
          <p className="mt-2 text-xs text-muted-foreground">{t("v2.finance.shared.documentsNotice")}</p>
        </Section>
      )}

      {compliance && (
        <Section title={t("v2.finance.sections.compliance")}>
          <Row label={t("v2.finance.facts.active_programs")} value={compliance.active_programs} />
        </Section>
      )}

      <p className="mt-6 text-xs text-muted-foreground">{t("v2.finance.shared.footer")}</p>
    </div>
  );
};

export default V2FinanceSharedDossier;
