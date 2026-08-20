// AGRI-GRID V2 — Phase 2B: new sale. Line totals are computed deterministically
// (quantity × unit price − discount) — never by AI. Confirming the sale reserves
// finished lots atomically in the database, it does not move physical stock.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { fetchProducts, type ProcessedProduct } from "@/lib/v2/production";
import {
  confirmSalesOrder,
  createSalesOrder,
  fetchCustomers,
  fetchFinishedAvailability,
  formatMoney,
  lineTotal,
  parseSalesError,
  type Customer,
  type FinishedAvailabilityRow,
} from "@/lib/v2/sales";
import { localeTag } from "@/lib/v2/locale";

type Draft = { product_id: string; quantity: string; unit_code: string; unit_price: string; discount_amount: string };

const emptyLine: Draft = { product_id: "", quantity: "", unit_code: "", unit_price: "", discount_amount: "" };

const V2SalesNew = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProcessedProduct[]>([]);
  const [availability, setAvailability] = useState<FinishedAvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmNow, setConfirmNow] = useState(true);
  const [lines, setLines] = useState<Draft[]>([{ ...emptyLine }]);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [c, p, a] = await Promise.all([
      fetchCustomers(activeOrg.id),
      fetchProducts(activeOrg.id),
      fetchFinishedAvailability(activeOrg.id),
    ]);
    setCustomers(c);
    setProducts(p);
    setAvailability(a);
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  /** Available-to-sell per product = physical − reserved, aggregated over lots. */
  const availableByProduct = useMemo(() => {
    const map = new Map<string, { quantity: number; unit_code: string }>();
    for (const row of availability) {
      if (!row.product_id) continue;
      const cur = map.get(row.product_id) ?? { quantity: 0, unit_code: row.unit_code };
      cur.quantity += Number(row.available_quantity ?? 0);
      map.set(row.product_id, cur);
    }
    return map;
  }, [availability]);

  const total = lines.reduce(
    (s, l) => s + lineTotal(Number(l.quantity || 0), Number(l.unit_price || 0), Number(l.discount_amount || 0)),
    0,
  );

  const setLine = (i: number, patch: Partial<Draft>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const valid =
    !!customerId &&
    lines.length > 0 &&
    lines.every((l) => l.product_id && Number(l.quantity) > 0 && l.unit_code && Number(l.unit_price) >= 0);

  const submit = async () => {
    if (!activeOrg || !valid) return;
    setSaving(true);
    try {
      const order = await createSalesOrder({
        organizationId: activeOrg.id,
        customerId,
        orderDate,
        requestedDeliveryDate: deliveryDate || null,
        notes: notes || null,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          quantity: Number(l.quantity),
          unit_code: l.unit_code,
          unit_price: Number(l.unit_price),
          discount_amount: Number(l.discount_amount || 0),
        })),
      });
      if (confirmNow) {
        await confirmSalesOrder(order.id);
      }
      toast({ title: t("v2.sales.new.created", { reference: order.sales_reference }) });
      navigate(`/app/operations/sales/${order.id}`);
    } catch (e) {
      const err = parseSalesError((e as Error).message);
      toast({
        title: t("v2.common.error"),
        description: t(`v2.sales.errors.${err.code}`, { defaultValue: err.raw, value: err.value ?? "" }),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || orgLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <>
      <PageHeader title={t("v2.sales.new.title")} description={t("v2.sales.new.description")} />

      <div className="space-y-6">
        <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <div>
            <Label>{t("v2.sales.new.customer")}</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder={t("v2.sales.new.selectCustomer")} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("v2.sales.new.date")}</Label>
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </div>
          <div>
            <Label>{t("v2.sales.new.deliveryDate")}</Label>
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>
          <div>
            <Label>{t("v2.sales.new.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} />
          </div>
        </div>

        <div className="space-y-3">
          {lines.map((l, i) => {
            const avail = availableByProduct.get(l.product_id);
            const over = avail ? Number(l.quantity || 0) > avail.quantity : false;
            return (
              <div key={i} className="space-y-3 rounded-lg border border-border bg-card p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>{t("v2.sales.new.product")}</Label>
                    <Select
                      value={l.product_id}
                      onValueChange={(v) => {
                        const p = products.find((x) => x.id === v);
                        setLine(i, { product_id: v, unit_code: availableByProduct.get(v)?.unit_code ?? p?.default_inventory_unit ?? "L" });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("v2.sales.new.selectProduct")} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {avail && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("v2.sales.new.availableToSell", { quantity: avail.quantity.toFixed(2), unit: avail.unit_code })}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>{t("v2.sales.new.quantity")}</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={l.quantity}
                      onChange={(e) => setLine(i, { quantity: e.target.value })}
                    />
                    {over && <p className="mt-1 text-xs text-destructive">{t("v2.sales.new.overStock")}</p>}
                  </div>
                  <div>
                    <Label>{t("v2.sales.new.unit")}</Label>
                    <Input value={l.unit_code} onChange={(e) => setLine(i, { unit_code: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("v2.sales.new.unitPrice")}</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={l.unit_price}
                      onChange={(e) => setLine(i, { unit_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("v2.sales.new.discount")}</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={l.discount_amount}
                      onChange={(e) => setLine(i, { discount_amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatMoney(
                      lineTotal(Number(l.quantity || 0), Number(l.unit_price || 0), Number(l.discount_amount || 0)),
                      "XOF",
                      localeTag(i18n.language),
                    )}
                  </span>
                  {lines.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          <Button variant="outline" onClick={() => setLines([...lines, { ...emptyLine }])}>
            <Plus className="mr-2 h-4 w-4" />
            {t("v2.sales.new.addLine")}
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("v2.sales.new.total")}</span>
            <span className="text-xl font-semibold text-primary">{formatMoney(total, "XOF", localeTag(i18n.language))}</span>
          </div>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <Checkbox checked={confirmNow} onCheckedChange={(v) => setConfirmNow(!!v)} />
            <span>
              {t("v2.sales.new.confirmNow")}
              <span className="block text-xs text-muted-foreground">{t("v2.sales.new.confirmNowHint")}</span>
            </span>
          </label>
        </div>

        <div className="flex gap-2">
          <Button onClick={submit} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("v2.sales.new.submit")}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/app/operations/sales")}>
            {t("v2.common.cancel")}
          </Button>
        </div>
      </div>
    </>
  );
};

export default V2SalesNew;
