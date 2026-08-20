// AGRI-GRID V2 — Phase 2B: operating expenses. Raw-material purchases captured by
// procurement are NOT re-entered here; business performance counts them separately
// as procurement cost so nothing is double counted.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Receipt } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  EXPENSE_CATEGORIES,
  createExpense,
  fetchExpenses,
  formatMoney,
  updateExpense,
  type Expense,
  type ExpenseCategory,
  type PaymentMethod,
  PAYMENT_METHODS,
} from "@/lib/v2/sales";
import { localeTag } from "@/lib/v2/locale";

const V2Expenses = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: "packaging" as ExpenseCategory,
    description: "",
    amount: "",
    payee: "",
    paid: true,
    payment_method: "cash" as PaymentMethod,
    notes: "",
  });

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setExpenses(await fetchExpenses(activeOrg.id));
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const submit = async () => {
    if (!activeOrg || !form.description.trim() || !(Number(form.amount) > 0)) return;
    setSaving(true);
    try {
      await createExpense({
        organization_id: activeOrg.id,
        expense_date: form.expense_date,
        category: form.category,
        description: form.description.trim(),
        payee: form.payee || null,
        amount: Number(form.amount),
        payment_status: form.paid ? "paid" : "unpaid",
        payment_date: form.paid ? form.expense_date : null,
        payment_method: form.paid ? form.payment_method : null,
        notes: form.notes || null,
      });
      toast({ title: t("v2.expenses.created") });
      setOpen(false);
      setForm({ ...form, description: "", amount: "", payee: "", notes: "" });
      load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (x: Expense) => {
    await updateExpense(x.id, { payment_status: "paid", payment_date: new Date().toISOString().slice(0, 10) });
    load();
  };

  if (loading || orgLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalPaid = expenses.filter((e) => e.payment_status === "paid").reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <PageHeader
        title={t("v2.expenses.title")}
        description={t("v2.expenses.description")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("v2.expenses.new")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("v2.expenses.new")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>{t("v2.expenses.date")}</Label>
                    <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("v2.expenses.category")}</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {t(`v2.expenses.categories.${c}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{t("v2.expenses.descriptionField")}</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>{t("v2.expenses.amount")}</Label>
                    <Input type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("v2.expenses.paymentStatus")}</Label>
                    <Select value={form.paid ? "paid" : "unpaid"} onValueChange={(v) => setForm({ ...form, paid: v === "paid" })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">{t("v2.expenses.paid")}</SelectItem>
                        <SelectItem value="unpaid">{t("v2.expenses.unpaid")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.paid && (
                    <div>
                      <Label>{t("v2.expenses.method")}</Label>
                      <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v as PaymentMethod })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {t(`v2.sales.methods.${m}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>{t("v2.expenses.payee")}</Label>
                    <Input value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>{t("v2.expenses.notes")}</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
                <p className="text-xs text-muted-foreground">{t("v2.expenses.procurementHint")}</p>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={saving || !form.description.trim() || !(Number(form.amount) > 0)}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("v2.common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <KpiCard label={t("v2.expenses.kpi.recorded")} value={formatMoney(totalAll, "XOF", localeTag(i18n.language))} icon={Receipt} />
        <KpiCard
          label={t("v2.expenses.kpi.paid")}
          value={formatMoney(totalPaid, "XOF", localeTag(i18n.language))}
          hint={t("v2.expenses.kpi.unpaid", { amount: formatMoney(totalAll - totalPaid, "XOF", localeTag(i18n.language)) })}
          icon={Receipt}
        />
      </div>

      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title={t("v2.expenses.emptyTitle")} description={t("v2.expenses.emptyDescription")} />
      ) : (
        <div className="space-y-3">
          {expenses.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
              <div>
                <p className="font-medium">{x.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(x.expense_date).toLocaleDateString(localeTag(i18n.language))} ·{" "}
                  {t(`v2.expenses.categories.${x.category}`)}
                  {x.payee ? ` · ${x.payee}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatMoney(Number(x.amount), x.currency, localeTag(i18n.language))}</span>
                {x.payment_status === "paid" ? (
                  <StatusBadge label={t("v2.expenses.paid")} tone="success" />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => markPaid(x)}>
                    {t("v2.expenses.markPaid")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default V2Expenses;
