// AGRI-GRID V2 — Phase 2B: customer book. Customers belong exclusively to the
// processor organisation that created them (enforced by row-level security).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Users } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  CUSTOMER_TYPES,
  createCustomer,
  fetchCustomers,
  nextCustomerCode,
  type Customer,
  type CustomerType,
} from "@/lib/v2/sales";

const V2Customers = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    customer_type: "retailer" as CustomerType,
    contact_person: "",
    phone: "",
    email: "",
    department: "",
    commune: "",
    address: "",
    tax_reference: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setCustomers(await fetchCustomers(activeOrg.id));
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.display_name} ${c.customer_code} ${c.phone ?? ""} ${c.commune ?? ""}`.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const submit = async () => {
    if (!activeOrg || !form.display_name.trim()) return;
    setSaving(true);
    try {
      const code = await nextCustomerCode(activeOrg.id);
      await createCustomer({
        organization_id: activeOrg.id,
        customer_code: code,
        display_name: form.display_name.trim(),
        customer_type: form.customer_type,
        contact_person: form.contact_person || null,
        phone: form.phone || null,
        email: form.email || null,
        department: form.department || null,
        commune: form.commune || null,
        address: form.address || null,
        tax_reference: form.tax_reference || null,
        notes: form.notes || null,
      });
      toast({ title: t("v2.sales.customers.created") });
      setOpen(false);
      setForm({ ...form, display_name: "", contact_person: "", phone: "", email: "", address: "", tax_reference: "", notes: "" });
      load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || orgLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <>
      <PageHeader
        title={t("v2.sales.customers.title")}
        description={t("v2.sales.customers.description")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("v2.sales.customers.new")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("v2.sales.customers.new")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>{t("v2.sales.customers.name")}</Label>
                  <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                </div>
                <div>
                  <Label>{t("v2.sales.customers.type")}</Label>
                  <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v as CustomerType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {t(`v2.sales.customerType.${ct}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>{t("v2.sales.customers.contact")}</Label>
                    <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("v2.sales.customers.phone")}</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("v2.sales.customers.department")}</Label>
                    <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("v2.sales.customers.commune")}</Label>
                    <Input value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>{t("v2.sales.customers.notes")}</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={saving || !form.display_name.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("v2.common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Input
        className="mb-4 max-w-sm"
        placeholder={t("v2.sales.customers.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title={t("v2.sales.customers.emptyTitle")} description={t("v2.sales.customers.emptyDescription")} />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
              <div>
                <p className="font-medium">{c.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.customer_code}
                  {c.commune ? ` · ${c.commune}` : ""}
                  {c.phone ? ` · ${c.phone}` : ""}
                </p>
              </div>
              <StatusBadge label={t(`v2.sales.customerType.${c.customer_type}`)} tone={c.is_active ? "info" : "neutral"} />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default V2Customers;
