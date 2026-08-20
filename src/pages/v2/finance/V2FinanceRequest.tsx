// AGRI-GRID V2 — Phase 3B: financing preparation request + use-of-funds breakdown.
// Nothing here is sent to a financial institution: this is preparation only.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  FINANCING_PURPOSES,
  FINANCING_TYPES,
  fetchFinanceProfile,
  fetchUseOfFunds,
  formatAmount,
  replaceUseOfFunds,
  saveFinanceProfile,
  sumLines,
  type FinanceProfile,
  type FinancingPurpose,
} from "@/lib/v2/finance";

type Line = { category: FinancingPurpose; label: string; amount: string };

const V2FinanceRequest = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    financing_purpose: "",
    financing_type: "",
    requested_amount: "",
    currency: "XOF",
    tenor_months: "",
    own_contribution: "",
    target_date: "",
    intended_use: "",
    status: "draft",
  });

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const p = await fetchFinanceProfile(activeOrg.id);
      setProfile(p);
      if (p) {
        setForm({
          financing_purpose: p.financing_purpose ?? "",
          financing_type: p.financing_type ?? "",
          requested_amount: p.requested_amount != null ? String(p.requested_amount) : "",
          currency: p.currency ?? "XOF",
          tenor_months: p.tenor_months != null ? String(p.tenor_months) : "",
          own_contribution: p.own_contribution != null ? String(p.own_contribution) : "",
          target_date: p.target_date ?? "",
          intended_use: p.intended_use ?? "",
          status: p.status,
        });
        const uof = await fetchUseOfFunds(p.id);
        setLines(
          uof.map((l) => ({
            category: l.category,
            label: l.label ?? "",
            amount: String(l.amount ?? 0),
          }))
        );
      }
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const total = useMemo(() => sumLines(lines.map((l) => ({ amount: l.amount }))), [lines]);
  const requested = Number(form.requested_amount) || 0;
  const difference = requested - total;
  const reconciles = lines.length > 0 && Math.round(difference) === 0;

  const save = async () => {
    if (!activeOrg) return;
    setSaving(true);
    try {
      const saved = await saveFinanceProfile(activeOrg.id, {
        financing_purpose: (form.financing_purpose || null) as FinanceProfile["financing_purpose"],
        financing_type: (form.financing_type || null) as FinanceProfile["financing_type"],
        requested_amount: form.requested_amount ? Number(form.requested_amount) : null,
        currency: form.currency || "XOF",
        tenor_months: form.tenor_months ? Number(form.tenor_months) : null,
        own_contribution: form.own_contribution ? Number(form.own_contribution) : null,
        target_date: form.target_date || null,
        intended_use: form.intended_use || null,
        status: form.status as FinanceProfile["status"],
      });
      await replaceUseOfFunds(
        activeOrg.id,
        saved.id,
        lines
          .filter((l) => l.category)
          .map((l) => ({ category: l.category, label: l.label || null, amount: Number(l.amount) || 0 }))
      );
      setProfile(saved);
      toast({ title: t("v2.finance.requestSaved") });
      load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || orgLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeOrg) return <EmptyState icon={Wallet} title={t("v2.finance.noData")} />;

  return (
    <div>
      <PageHeader
        title={t("v2.finance.requestTitle")}
        description={t("v2.finance.requestDescription")}
        actions={
          <Button size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("v2.common.save")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>{t("v2.finance.fields.purpose")}</Label>
          <Select
            value={form.financing_purpose}
            onValueChange={(v) => setForm({ ...form, financing_purpose: v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t("v2.finance.fields.purposePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {FINANCING_PURPOSES.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`v2.finance.purposes.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("v2.finance.fields.type")}</Label>
          <Select value={form.financing_type} onValueChange={(v) => setForm({ ...form, financing_type: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t("v2.finance.fields.typePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {FINANCING_TYPES.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`v2.finance.types.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("v2.finance.fields.amount")}</Label>
          <Input
            className="mt-1"
            type="number"
            value={form.requested_amount}
            onChange={(e) => setForm({ ...form, requested_amount: e.target.value })}
          />
        </div>
        <div>
          <Label>{t("v2.finance.fields.currency")}</Label>
          <Input
            className="mt-1"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <Label>{t("v2.finance.fields.tenor")}</Label>
          <Input
            className="mt-1"
            type="number"
            value={form.tenor_months}
            onChange={(e) => setForm({ ...form, tenor_months: e.target.value })}
          />
        </div>
        <div>
          <Label>{t("v2.finance.fields.ownContribution")}</Label>
          <Input
            className="mt-1"
            type="number"
            value={form.own_contribution}
            onChange={(e) => setForm({ ...form, own_contribution: e.target.value })}
          />
        </div>
        <div>
          <Label>{t("v2.finance.fields.targetDate")}</Label>
          <Input
            className="mt-1"
            type="date"
            value={form.target_date}
            onChange={(e) => setForm({ ...form, target_date: e.target.value })}
          />
        </div>
        <div>
          <Label>{t("v2.finance.fields.status")}</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["draft", "in_preparation", "ready_for_review"].map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`v2.finance.requestStatus.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>{t("v2.finance.fields.description")}</Label>
          <Textarea
            className="mt-1"
            rows={3}
            value={form.intended_use}
            onChange={(e) => setForm({ ...form, intended_use: e.target.value })}
          />
        </div>
      </div>

      {/* use of funds */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl text-foreground">{t("v2.finance.useOfFunds")}</h2>
            <p className="text-sm text-muted-foreground">{t("v2.finance.useOfFundsHint")}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLines([...lines, { category: "working_capital", label: "", amount: "" }])}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t("v2.finance.addLine")}
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_1fr_160px_auto]">
              <Select
                value={line.category}
                onValueChange={(v) =>
                  setLines(lines.map((l, i) => (i === idx ? { ...l, category: v as FinancingPurpose } : l)))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCING_PURPOSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`v2.finance.purposes.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={t("v2.finance.fields.lineLabel")}
                value={line.label}
                onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, label: e.target.value } : l)))}
              />
              <Input
                type="number"
                placeholder="0"
                value={line.amount}
                onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, amount: e.target.value } : l)))}
              />
              <Button variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <span className="text-muted-foreground">{t("v2.finance.useOfFundsTotal")}:</span>
          <span className="font-medium text-foreground">{formatAmount(total, form.currency, i18n.language)}</span>
          <span className="text-muted-foreground">/ {formatAmount(requested, form.currency, i18n.language)}</span>
          <StatusBadge
            label={reconciles ? t("v2.finance.reconciles") : t("v2.finance.doesNotReconcile", {
              amount: formatAmount(Math.abs(difference), form.currency, i18n.language),
            })}
            tone={reconciles ? "success" : "warning"}
          />
        </div>
      </div>

      {profile?.is_demo && (
        <p className="mt-4 text-xs text-muted-foreground">{t("v2.finance.demoTag")}</p>
      )}
    </div>
  );
};

export default V2FinanceRequest;
