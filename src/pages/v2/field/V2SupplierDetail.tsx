// AGRI-GRID V2 — supplier record + fast field update actions
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ClipboardCheck,
  History,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Sprout,
  TrendingUp,
} from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import FreshnessBadge from "@/components/v2/field/FreshnessBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldNetwork } from "@/hooks/v2/useFieldNetwork";
import { refLabel } from "@/lib/v2/reference";
import { supplyReferenceDate } from "@/lib/v2/freshness";
import {
  addFieldVisit,
  addHarvestForecast,
  confirmSupply,
  EMPTY_BUNDLE,
  fetchSupplierBundle,
  updateSupplier,
  upsertSupplyAvailability,
  type SupplierBundle,
  type SupplyStatus,
} from "@/lib/v2/supply";
import { runFieldMutation } from "@/lib/v2/fieldSync";

const SUPPLY_STATUSES: SupplyStatus[] = ["forecast", "expected", "available"];

const V2SupplierDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { reference, thresholds, agent, reload } = useFieldNetwork();

  const [bundle, setBundle] = useState<SupplierBundle>(EMPTY_BUNDLE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [contactOpen, setContactOpen] = useState(false);
  const [contact, setContact] = useState({ phone: "", phone_secondary: "", village: "" });

  const [forecastOpen, setForecastOpen] = useState(false);
  const [forecast, setForecast] = useState({ cycleId: "", quantity: "", unit: "t", confidence: "medium", observation: "" });

  const [supplyOpen, setSupplyOpen] = useState(false);
  const [supplyForm, setSupplyForm] = useState({ cycleId: "", quantity: "", unit: "t", status: "expected" as SupplyStatus, price: "", grade: "" });

  const [observationOpen, setObservationOpen] = useState(false);
  const [observation, setObservation] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await fetchSupplierBundle(id);
    setBundle(data);
    setContact({
      phone: data.supplier?.phone ?? "",
      phone_secondary: data.supplier?.phone_secondary ?? "",
      village: data.supplier?.village ?? "",
    });
    setForecast((f) => ({ ...f, cycleId: data.cycles[0]?.id ?? "" }));
    setSupplyForm((s) => ({ ...s, cycleId: data.cycles[0]?.id ?? "" }));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const cropName = (cropId: string) => refLabel(reference.crops.find((c) => c.id === cropId), i18n.language);
  const varietyName = (varietyId: string | null) =>
    varietyId ? refLabel(reference.varieties.find((v) => v.id === varietyId), i18n.language) : "—";

  const supplier = bundle.supplier;

  const afterMutation = async () => {
    await load();
    await reload();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!supplier) {
    return <p className="text-sm text-muted-foreground">{t("v2.field.supplierDetail.notFound")}</p>;
  }

  const saveContact = async () => {
    setBusy(true);
    await runFieldMutation("supplier.update", () => updateSupplier(supplier.id, { ...contact, last_verified_at: new Date().toISOString(), status: "field_verified" }), {
      successMessage: t("v2.field.supplierDetail.contactSaved"),
    });
    setBusy(false);
    setContactOpen(false);
    afterMutation();
  };

  const saveForecast = async () => {
    if (!forecast.cycleId || !forecast.quantity) return;
    setBusy(true);
    await runFieldMutation(
      "harvestForecast.create",
      () =>
        addHarvestForecast({
          crop_cycle_id: forecast.cycleId,
          supplier_id: supplier.id,
          estimated_quantity: Number(forecast.quantity),
          unit_code: forecast.unit,
          confidence: forecast.confidence as "low" | "medium" | "high",
          observation: forecast.observation || null,
        }),
      { successMessage: t("v2.field.supplierDetail.forecastSaved") },
    );
    setBusy(false);
    setForecastOpen(false);
    setForecast((f) => ({ ...f, quantity: "", observation: "" }));
    afterMutation();
  };

  const saveSupply = async () => {
    const cycle = bundle.cycles.find((c) => c.id === supplyForm.cycleId);
    if (!cycle || !supplyForm.quantity) return;
    setBusy(true);
    await runFieldMutation(
      "supply.upsert",
      () =>
        upsertSupplyAvailability({
          supplier_id: supplier.id,
          crop_cycle_id: cycle.id,
          crop_id: cycle.crop_id,
          variety_id: cycle.variety_id,
          quantity_available: Number(supplyForm.quantity),
          unit_code: supplyForm.unit,
          availability_start: cycle.expected_harvest_start,
          availability_end: cycle.expected_harvest_end,
          asking_price: supplyForm.price ? Number(supplyForm.price) : null,
          price_unit: supplyForm.price ? "XOF/t" : null,
          quality_grade: supplyForm.grade || null,
          status: supplyForm.status,
        }),
      { successMessage: t("v2.field.supplierDetail.supplySaved") },
    );
    setBusy(false);
    setSupplyOpen(false);
    setSupplyForm((s) => ({ ...s, quantity: "", price: "", grade: "" }));
    afterMutation();
  };

  const saveObservation = async () => {
    if (!observation.trim()) return;
    setBusy(true);
    await runFieldMutation(
      "visit.create",
      () =>
        addFieldVisit({
          supplier_id: supplier.id,
          farm_id: bundle.farms[0]?.id ?? null,
          field_agent_id: agent?.id ?? null,
          visit_type: "crop_monitoring",
          notes: observation.trim(),
          actions_performed: ["field_observation"],
        }),
      { successMessage: t("v2.field.supplierDetail.observationSaved") },
    );
    setBusy(false);
    setObservationOpen(false);
    setObservation("");
    afterMutation();
  };

  return (
    <div className="pb-8">
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate("/app/field/suppliers")}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t("v2.common.back")}
      </Button>

      <PageHeader
        title={supplier.display_name}
        description={`${supplier.supplier_code} · ${[supplier.village, supplier.commune, supplier.department].filter(Boolean).join(", ")}`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge tone={supplier.status === "field_verified" ? "success" : "warning"} label={t(`v2.field.supplierStatus.${supplier.status}`)} />
        <FreshnessBadge date={supplier.last_verified_at ?? supplier.updated_at} thresholds={thresholds} />
        {supplier.phone && (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> {supplier.phone}
          </span>
        )}
        {supplier.latitude && (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {Number(supplier.latitude).toFixed(4)}, {Number(supplier.longitude).toFixed(4)}
          </span>
        )}
      </div>

      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Dialog open={contactOpen} onOpenChange={setContactOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-14 justify-start"><Phone className="mr-2 h-4 w-4" />{t("v2.field.quick.contact")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("v2.field.quick.contact")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>{t("v2.field.register.phone")}</Label><Input className="h-12" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("v2.field.register.phone2")}</Label><Input className="h-12" value={contact.phone_secondary} onChange={(e) => setContact({ ...contact, phone_secondary: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("v2.field.register.village")}</Label><Input className="h-12" value={contact.village} onChange={(e) => setContact({ ...contact, village: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button className="h-12 w-full" disabled={busy} onClick={saveContact}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("v2.common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={forecastOpen} onOpenChange={setForecastOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-14 justify-start"><TrendingUp className="mr-2 h-4 w-4" />{t("v2.field.quick.forecast")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("v2.field.quick.forecast")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("v2.field.supplierDetail.cycle")}</Label>
                <Select value={forecast.cycleId} onValueChange={(v) => setForecast({ ...forecast, cycleId: v })}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {bundle.cycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{cropName(c.crop_id)} · {varietyName(c.variety_id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{t("v2.field.register.estimatedQuantity")}</Label><Input className="h-12" inputMode="decimal" value={forecast.quantity} onChange={(e) => setForecast({ ...forecast, quantity: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>{t("v2.field.supplierDetail.confidence")}</Label>
                <Select value={forecast.confidence} onValueChange={(v) => setForecast({ ...forecast, confidence: v })}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high"].map((c) => (
                      <SelectItem key={c} value={c}>{t(`v2.field.confidence.${c}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{t("v2.field.supplierDetail.observation")}</Label><Textarea value={forecast.observation} onChange={(e) => setForecast({ ...forecast, observation: e.target.value })} /></div>
              <p className="text-xs text-muted-foreground">{t("v2.field.supplierDetail.forecastHistoryHint")}</p>
            </div>
            <DialogFooter>
              <Button className="h-12 w-full" disabled={busy} onClick={saveForecast}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("v2.common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-14 justify-start"><ClipboardCheck className="mr-2 h-4 w-4" />{t("v2.field.quick.supply")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("v2.field.quick.supply")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("v2.field.supplierDetail.cycle")}</Label>
                <Select value={supplyForm.cycleId} onValueChange={(v) => setSupplyForm({ ...supplyForm, cycleId: v })}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {bundle.cycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{cropName(c.crop_id)} · {varietyName(c.variety_id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{t("v2.field.supplierDetail.quantityAvailable")}</Label><Input className="h-12" inputMode="decimal" value={supplyForm.quantity} onChange={(e) => setSupplyForm({ ...supplyForm, quantity: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>{t("v2.field.supplierDetail.status")}</Label>
                <Select value={supplyForm.status} onValueChange={(v) => setSupplyForm({ ...supplyForm, status: v as SupplyStatus })}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPLY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`v2.field.supplyStatus.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("v2.field.supplierDetail.askingPrice")}</Label><Input className="h-12" inputMode="decimal" value={supplyForm.price} onChange={(e) => setSupplyForm({ ...supplyForm, price: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("v2.field.supplierDetail.grade")}</Label><Input className="h-12" value={supplyForm.grade} onChange={(e) => setSupplyForm({ ...supplyForm, grade: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button className="h-12 w-full" disabled={busy} onClick={saveSupply}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("v2.common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={observationOpen} onOpenChange={setObservationOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-14 justify-start"><Plus className="mr-2 h-4 w-4" />{t("v2.field.quick.observation")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("v2.field.quick.observation")}</DialogTitle></DialogHeader>
            <Textarea rows={4} value={observation} onChange={(e) => setObservation(e.target.value)} />
            <DialogFooter>
              <Button className="h-12 w-full" disabled={busy} onClick={saveObservation}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("v2.common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Sprout className="h-4 w-4 text-primary" />{t("v2.field.supplierDetail.farmsAndCycles")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {bundle.farms.map((f) => (
              <div key={f.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[f.village, f.commune].filter(Boolean).join(", ")} · {f.total_area ?? "—"} {f.area_unit}
                </p>
                <ul className="mt-2 space-y-1">
                  {bundle.parcels
                    .filter((p) => p.farm_id === f.id)
                    .map((p) => (
                      <li key={p.id} className="text-xs text-muted-foreground">
                        {p.reference} · {p.area ?? "—"} {p.area_unit}
                        {bundle.cycles
                          .filter((c) => c.parcel_id === p.id)
                          .map((c) => (
                            <span key={c.id} className="ml-1 text-foreground">
                              — {cropName(c.crop_id)} ({varietyName(c.variety_id)}) · {t(`v2.field.cycleStatus.${c.status}`)}
                            </span>
                          ))}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            {bundle.farms.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4 text-primary" />{t("v2.field.supplierDetail.availableSupply")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {bundle.supplies.map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{s.quantity_available} {s.unit_code} · {cropName(s.crop_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`v2.field.supplyStatus.${s.status}`)} · {s.availability_start ?? "—"} → {s.availability_end ?? "—"}
                    </p>
                  </div>
                  <FreshnessBadge date={supplyReferenceDate(s)} thresholds={thresholds} />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 h-10 w-full"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await runFieldMutation("supply.confirm", () => confirmSupply(s.id), {
                      successMessage: t("v2.field.supplierDetail.supplyConfirmed"),
                    });
                    setBusy(false);
                    afterMutation();
                  }}
                >
                  {t("v2.field.quick.confirmNow")}
                </Button>
              </div>
            ))}
            {bundle.supplies.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-primary" />{t("v2.field.supplierDetail.forecastHistory")}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {bundle.forecasts.map((f, idx) => (
                <li key={f.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {f.estimated_quantity} {f.unit_code}
                      {idx === 0 && <span className="ml-2 text-xs text-primary">{t("v2.field.supplierDetail.latest")}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{f.observation ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{f.forecast_date}</p>
                    <p className="text-xs text-muted-foreground">{t(`v2.field.confidence.${f.confidence}`)}</p>
                  </div>
                </li>
              ))}
              {bundle.forecasts.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default V2SupplierDetail;
