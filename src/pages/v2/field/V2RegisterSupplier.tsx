// AGRI-GRID V2 — guided farmer registration (7 steps, field-optimised)
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Camera, Check, Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useFieldNetwork } from "@/hooks/v2/useFieldNetwork";
import { refLabel, varietiesForCrop, AREA_UNIT_CODES, MASS_UNIT_CODES } from "@/lib/v2/reference";
import { registerSupplier, type CropCycleStatus, type SupplierType } from "@/lib/v2/supply";
import { runFieldMutation } from "@/lib/v2/fieldSync";

const SUPPLIER_TYPES: SupplierType[] = ["individual_farmer", "cooperative", "producer_group", "aggregator"];
const CYCLE_STATUSES: CropCycleStatus[] = ["planned", "growing", "harvest_approaching", "harvesting"];
const TOTAL_STEPS = 7;

const V2RegisterSupplier = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { reference, agent, reload } = useFieldNetwork();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    supplier_type: "individual_farmer" as SupplierType,
    display_name: "",
    first_name: "",
    last_name: "",
    phone: "",
    phone_secondary: "",
    preferred_language: "fr",
    affiliation: "",
    department: "",
    commune: "",
    arrondissement: "",
    village: "",
    latitude: "" as string,
    longitude: "" as string,
    farm_name: "",
    farm_area: "",
    farm_area_unit: "ha",
    accessibility_notes: "",
    parcel_reference: "Parcelle A",
    parcel_area: "",
    parcel_area_unit: "ha",
    irrigation_status: "rainfed",
    crop_id: "",
    variety_id: "",
    cycle_status: "growing" as CropCycleStatus,
    harvest_start: "",
    harvest_end: "",
    estimated_quantity: "",
    quantity_unit: "t",
    notes: "",
  });

  const [photos, setPhotos] = useState<string[]>([]);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const varieties = useMemo(() => varietiesForCrop(reference, form.crop_id), [reference, form.crop_id]);

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error(t("v2.field.register.gpsUnavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
        toast.success(t("v2.field.register.gpsCaptured"));
      },
      () => toast.error(t("v2.field.register.gpsDenied")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    setUploading(true);
    const paths: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("field-evidence").upload(path, file);
      if (error) {
        toast.error(t("v2.field.register.photoError"));
      } else {
        paths.push(path);
      }
    }
    setPhotos((p) => [...p, ...paths]);
    setUploading(false);
  };

  const canContinue = () => {
    if (step === 1) return form.display_name.trim().length > 1;
    if (step === 4) return Boolean(form.crop_id);
    return true;
  };

  const submit = async () => {
    setSaving(true);
    const result = await runFieldMutation(
      "supplier.register",
      () =>
        registerSupplier({
          identity: {
            supplier_type: form.supplier_type,
            display_name: form.display_name.trim(),
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            phone_secondary: form.phone_secondary,
            preferred_language: form.preferred_language,
            affiliation: form.affiliation,
            department: form.department,
            commune: form.commune,
            arrondissement: form.arrondissement,
            village: form.village,
          },
          location: {
            latitude: form.latitude ? Number(form.latitude) : null,
            longitude: form.longitude ? Number(form.longitude) : null,
          },
          farm: {
            name: form.farm_name || `Ferme ${form.display_name}`,
            total_area: form.farm_area ? Number(form.farm_area) : null,
            area_unit: form.farm_area_unit,
            accessibility_notes: form.accessibility_notes,
          },
          parcel: {
            reference: form.parcel_reference,
            area: form.parcel_area ? Number(form.parcel_area) : null,
            area_unit: form.parcel_area_unit,
            irrigation_status: form.irrigation_status,
          },
          production: {
            crop_id: form.crop_id,
            variety_id: form.variety_id || null,
            status: form.cycle_status,
            expected_harvest_start: form.harvest_start || null,
            expected_harvest_end: form.harvest_end || null,
            estimated_quantity: form.estimated_quantity ? Number(form.estimated_quantity) : null,
            unit_code: form.quantity_unit,
          },
          evidence: { notes: form.notes, photos },
          agentId: agent?.id ?? null,
        }),
      { successMessage: t("v2.field.register.saved") },
    );
    setSaving(false);
    if (result) {
      await reload();
      navigate(`/app/field/suppliers/${result.supplierId}`);
    }
  };

  const field = (label: string, node: React.ReactNode) => (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {node}
    </div>
  );

  return (
    <div className="pb-24">
      <PageHeader title={t("v2.field.register.title")} description={t("v2.field.register.description")} />

      <div className="mb-4">
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {t("v2.field.register.stepOf", { current: step, total: TOTAL_STEPS })} — {t(`v2.field.register.steps.${step}`)}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          {step === 1 && (
            <>
              {field(
                t("v2.field.register.supplierType"),
                <Select value={form.supplier_type} onValueChange={(v) => set("supplier_type", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_TYPES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`v2.field.supplierTypes.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {field(t("v2.field.register.name"), <Input className="h-12" value={form.display_name} onChange={(e) => set("display_name", e.target.value)} />)}
              <div className="grid grid-cols-2 gap-3">
                {field(t("v2.field.register.firstName"), <Input className="h-12" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />)}
                {field(t("v2.field.register.lastName"), <Input className="h-12" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />)}
              </div>
              {field(t("v2.field.register.phone"), <Input className="h-12" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />)}
              {field(t("v2.field.register.phone2"), <Input className="h-12" type="tel" inputMode="tel" value={form.phone_secondary} onChange={(e) => set("phone_secondary", e.target.value)} />)}
              {field(
                t("v2.field.register.language"),
                <Select value={form.preferred_language} onValueChange={(v) => set("preferred_language", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="fon">Fon</SelectItem>
                    <SelectItem value="yor">Yoruba</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>,
              )}
              {field(t("v2.field.register.affiliation"), <Input className="h-12" value={form.affiliation} onChange={(e) => set("affiliation", e.target.value)} />)}
              {field(t("v2.field.register.village"), <Input className="h-12" value={form.village} onChange={(e) => set("village", e.target.value)} />)}
            </>
          )}

          {step === 2 && (
            <>
              <Button type="button" size="lg" variant="secondary" className="h-14 w-full" onClick={captureGps}>
                <Crosshair className="mr-2 h-5 w-5" />
                {t("v2.field.register.captureGps")}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                {field(t("v2.field.register.latitude"), <Input className="h-12" inputMode="decimal" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />)}
                {field(t("v2.field.register.longitude"), <Input className="h-12" inputMode="decimal" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field(t("v2.field.register.department"), <Input className="h-12" value={form.department} onChange={(e) => set("department", e.target.value)} />)}
                {field(t("v2.field.register.commune"), <Input className="h-12" value={form.commune} onChange={(e) => set("commune", e.target.value)} />)}
              </div>
              {field(t("v2.field.register.arrondissement"), <Input className="h-12" value={form.arrondissement} onChange={(e) => set("arrondissement", e.target.value)} />)}
              <p className="text-xs text-muted-foreground">{t("v2.field.register.gpsHint")}</p>
            </>
          )}

          {step === 3 && (
            <>
              {field(t("v2.field.register.farmName"), <Input className="h-12" value={form.farm_name} onChange={(e) => set("farm_name", e.target.value)} placeholder={`Ferme ${form.display_name}`} />)}
              <div className="grid grid-cols-2 gap-3">
                {field(t("v2.field.register.area"), <Input className="h-12" inputMode="decimal" value={form.farm_area} onChange={(e) => set("farm_area", e.target.value)} />)}
                {field(
                  t("v2.field.register.unit"),
                  <Select value={form.farm_area_unit} onValueChange={(v) => set("farm_area_unit", v)}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {reference.units.filter((u) => AREA_UNIT_CODES.includes(u.code)).map((u) => (
                        <SelectItem key={u.code} value={u.code}>{refLabel(u, i18n.language)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>,
                )}
              </div>
              {field(t("v2.field.register.accessibility"), <Textarea value={form.accessibility_notes} onChange={(e) => set("accessibility_notes", e.target.value)} />)}
            </>
          )}

          {step === 4 && (
            <>
              {field(t("v2.field.register.parcelReference"), <Input className="h-12" value={form.parcel_reference} onChange={(e) => set("parcel_reference", e.target.value)} />)}
              <div className="grid grid-cols-2 gap-3">
                {field(t("v2.field.register.area"), <Input className="h-12" inputMode="decimal" value={form.parcel_area} onChange={(e) => set("parcel_area", e.target.value)} />)}
                {field(
                  t("v2.field.register.unit"),
                  <Select value={form.parcel_area_unit} onValueChange={(v) => set("parcel_area_unit", v)}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {reference.units.filter((u) => AREA_UNIT_CODES.includes(u.code)).map((u) => (
                        <SelectItem key={u.code} value={u.code}>{refLabel(u, i18n.language)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>,
                )}
              </div>
              {field(
                t("v2.field.register.crop"),
                <Select value={form.crop_id} onValueChange={(v) => { set("crop_id", v); set("variety_id", ""); }}>
                  <SelectTrigger className="h-12"><SelectValue placeholder={t("v2.field.register.selectCrop")} /></SelectTrigger>
                  <SelectContent>
                    {reference.crops.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{refLabel(c, i18n.language)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {field(
                t("v2.field.register.variety"),
                <Select value={form.variety_id} onValueChange={(v) => set("variety_id", v)} disabled={!form.crop_id}>
                  <SelectTrigger className="h-12"><SelectValue placeholder={t("v2.field.register.selectVariety")} /></SelectTrigger>
                  <SelectContent>
                    {varieties.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{refLabel(v, i18n.language)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
            </>
          )}

          {step === 5 && (
            <>
              {field(
                t("v2.field.register.cycleStage"),
                <Select value={form.cycle_status} onValueChange={(v) => set("cycle_status", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CYCLE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`v2.field.cycleStatus.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              <div className="grid grid-cols-2 gap-3">
                {field(t("v2.field.register.harvestStart"), <Input className="h-12" type="date" value={form.harvest_start} onChange={(e) => set("harvest_start", e.target.value)} />)}
                {field(t("v2.field.register.harvestEnd"), <Input className="h-12" type="date" value={form.harvest_end} onChange={(e) => set("harvest_end", e.target.value)} />)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field(t("v2.field.register.estimatedQuantity"), <Input className="h-12" inputMode="decimal" value={form.estimated_quantity} onChange={(e) => set("estimated_quantity", e.target.value)} />)}
                {field(
                  t("v2.field.register.unit"),
                  <Select value={form.quantity_unit} onValueChange={(v) => set("quantity_unit", v)}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {reference.units.filter((u) => MASS_UNIT_CODES.includes(u.code)).map((u) => (
                        <SelectItem key={u.code} value={u.code}>{refLabel(u, i18n.language)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>,
                )}
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <Label className="text-sm">{t("v2.field.register.photos")}</Label>
              <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                {t("v2.field.register.addPhoto")}
                <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => uploadPhotos(e.target.files)} />
              </label>
              {photos.length > 0 && (
                <p className="text-xs text-muted-foreground">{t("v2.field.register.photosCount", { count: photos.length })}</p>
              )}
              {field(t("v2.field.register.notes"), <Textarea rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} />)}
            </>
          )}

          {step === 7 && (
            <dl className="space-y-2 text-sm">
              {[
                [t("v2.field.register.name"), form.display_name],
                [t("v2.field.register.phone"), form.phone || "—"],
                [t("v2.field.register.village"), form.village || "—"],
                [t("v2.field.register.location"), form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : "—"],
                [t("v2.field.register.farmName"), form.farm_name || `Ferme ${form.display_name}`],
                [t("v2.field.register.area"), form.farm_area ? `${form.farm_area} ${form.farm_area_unit}` : "—"],
                [t("v2.field.register.crop"), refLabel(reference.crops.find((c) => c.id === form.crop_id), i18n.language)],
                [t("v2.field.register.variety"), refLabel(reference.varieties.find((v) => v.id === form.variety_id), i18n.language)],
                [t("v2.field.register.cycleStage"), t(`v2.field.cycleStatus.${form.cycle_status}`)],
                [
                  t("v2.field.register.estimatedQuantity"),
                  form.estimated_quantity ? `${form.estimated_quantity} ${form.quantity_unit}` : "—",
                ],
                [t("v2.field.register.photos"), String(photos.length)],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-4 border-b border-border/60 pb-1">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-border bg-background p-3 lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-14 flex-1"
          onClick={() => (step === 1 ? navigate("/app/field") : setStep((s) => s - 1))}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          {t("v2.common.back")}
        </Button>
        {step < TOTAL_STEPS ? (
          <Button type="button" size="lg" className="h-14 flex-1" disabled={!canContinue()} onClick={() => setStep((s) => s + 1)}>
            {t("v2.common.next")}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button type="button" size="lg" className="h-14 flex-1" disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
            {t("v2.field.register.submit")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default V2RegisterSupplier;
