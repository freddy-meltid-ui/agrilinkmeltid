// AGRI-GRID V2 — Phase 1D: processor sourcing wizard ("De quoi avez-vous besoin ?").
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Loader2, Search } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProcessor } from "@/hooks/v2/useProcessor";
import {
  EMPTY_REFERENCE,
  fetchReferenceData,
  MASS_UNIT_CODES,
  refLabel,
  varietiesForCrop,
  type ReferenceData,
} from "@/lib/v2/reference";
import { createSourcingRequest } from "@/lib/v2/sourcing";

type Form = {
  facility_id: string;
  crop_id: string;
  variety_id: string;
  variety_flexible: boolean;
  requested_quantity: string;
  unit_code: string;
  availability_start: string;
  availability_end: string;
  max_distance_km: string;
  strict_radius: boolean;
  min_quantity_per_supplier: string;
  max_quantity_per_supplier: string;
  target_price: string;
  price_unit: string;
  quality_requirement: string;
  certification_requirement: string;
  certification_mandatory: boolean;
  packaging_requirement: string;
  notes: string;
};

const EMPTY_FORM: Form = {
  facility_id: "",
  crop_id: "",
  variety_id: "",
  variety_flexible: true,
  requested_quantity: "",
  unit_code: "t",
  availability_start: "",
  availability_end: "",
  max_distance_km: "60",
  strict_radius: false,
  min_quantity_per_supplier: "",
  max_quantity_per_supplier: "",
  target_price: "",
  price_unit: "",
  quality_requirement: "",
  certification_requirement: "",
  certification_mandatory: false,
  packaging_requirement: "",
  notes: "",
};

const STEPS = 4;

const V2SourcingNew = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bundle, activeOrg } = useProcessor();
  const [reference, setReference] = useState<ReferenceData>(EMPTY_REFERENCE);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchReferenceData().then(setReference);
  }, []);

  useEffect(() => {
    if (form.facility_id || !bundle.facilities.length) return;
    const main = bundle.facilities.find((f) => f.is_main) ?? bundle.facilities[0];
    setForm((f) => ({ ...f, facility_id: main.id }));
  }, [bundle.facilities, form.facility_id]);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const varieties = useMemo(() => varietiesForCrop(reference, form.crop_id), [reference, form.crop_id]);
  const massUnits = reference.units.filter((u) => MASS_UNIT_CODES.includes(u.code));

  const cropLabel = refLabel(reference.crops.find((c) => c.id === form.crop_id), i18n.language);
  const varietyLabel = form.variety_id ? refLabel(varieties.find((v) => v.id === form.variety_id), i18n.language) : null;
  const facility = bundle.facilities.find((f) => f.id === form.facility_id);

  const stepValid =
    step === 1
      ? Boolean(form.crop_id && form.requested_quantity && Number(form.requested_quantity) > 0)
      : step === 2
        ? Boolean(form.availability_start && form.availability_end && form.availability_end >= form.availability_start)
        : true;

  const submit = async (publish: boolean) => {
    if (!activeOrg || !user) return;
    setBusy(true);
    try {
      const request = await createSourcingRequest({
        organization_id: activeOrg.id,
        facility_id: form.facility_id || null,
        crop_id: form.crop_id,
        variety_id: form.variety_id || null,
        variety_flexible: form.variety_flexible,
        requested_quantity: Number(form.requested_quantity),
        unit_code: form.unit_code,
        min_quantity_per_supplier: form.min_quantity_per_supplier ? Number(form.min_quantity_per_supplier) : null,
        max_quantity_per_supplier: form.max_quantity_per_supplier ? Number(form.max_quantity_per_supplier) : null,
        availability_start: form.availability_start,
        availability_end: form.availability_end,
        max_distance_km: form.max_distance_km ? Number(form.max_distance_km) : null,
        strict_radius: form.strict_radius,
        target_price: form.target_price ? Number(form.target_price) : null,
        price_unit: form.price_unit || null,
        quality_requirement: form.quality_requirement || null,
        certification_requirement: form.certification_requirement || null,
        certification_mandatory: form.certification_mandatory,
        packaging_requirement: form.packaging_requirement || null,
        notes: form.notes || null,
        status: publish ? "open" : "draft",
        created_by: user.id,
      });
      toast({ title: t(publish ? "v2.sourcing.created" : "v2.sourcing.draftSaved") });
      navigate(`/app/sourcing/${request.id}${publish ? "?run=1" : ""}`);
    } catch (e) {
      toast({ title: t("v2.sourcing.createError"), description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={t("v2.sourcing.wizard.title")} description={t("v2.sourcing.wizard.description")} />

      <div className="mb-6 flex gap-2">
        {Array.from({ length: STEPS }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <div className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-5">
        {step === 1 && (
          <>
            <h2 className="font-medium">{t("v2.sourcing.wizard.step1")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("v2.sourcing.fields.crop")}</Label>
                <Select value={form.crop_id} onValueChange={(v) => set({ crop_id: v, variety_id: "" })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={t("v2.sourcing.fields.cropPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {reference.crops.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{refLabel(c, i18n.language)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.variety")}</Label>
                <Select value={form.variety_id} onValueChange={(v) => set({ variety_id: v })} disabled={!varieties.length}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={t("v2.sourcing.fields.varietyPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {varieties.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{refLabel(v, i18n.language)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.quantity")}</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.requested_quantity}
                  onChange={(e) => set({ requested_quantity: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.unit")}</Label>
                <Select value={form.unit_code} onValueChange={(v) => set({ unit_code: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {massUnits.map((u) => (
                      <SelectItem key={u.id} value={u.code}>{refLabel(u, i18n.language)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.variety_flexible} onCheckedChange={(v) => set({ variety_flexible: Boolean(v) })} />
              {t("v2.sourcing.fields.varietyFlexible")}
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-medium">{t("v2.sourcing.wizard.step2")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("v2.sourcing.fields.from")}</Label>
                <Input className="mt-1" type="date" value={form.availability_start} onChange={(e) => set({ availability_start: e.target.value })} />
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.to")}</Label>
                <Input className="mt-1" type="date" value={form.availability_end} onChange={(e) => set({ availability_end: e.target.value })} />
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.facility")}</Label>
                <Select value={form.facility_id} onValueChange={(v) => set({ facility_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={t("v2.sourcing.fields.facilityPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {bundle.facilities.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.radius")}</Label>
                <Input className="mt-1" type="number" min="0" value={form.max_distance_km} onChange={(e) => set({ max_distance_km: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.strict_radius} onCheckedChange={(v) => set({ strict_radius: Boolean(v) })} />
              {t("v2.sourcing.fields.strictRadius")}
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-medium">{t("v2.sourcing.wizard.step3")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("v2.sourcing.fields.minPerSupplier")}</Label>
                <Input className="mt-1" type="number" min="0" step="0.1" value={form.min_quantity_per_supplier} onChange={(e) => set({ min_quantity_per_supplier: e.target.value })} />
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.maxPerSupplier")}</Label>
                <Input className="mt-1" type="number" min="0" step="0.1" value={form.max_quantity_per_supplier} onChange={(e) => set({ max_quantity_per_supplier: e.target.value })} />
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.targetPrice")}</Label>
                <Input className="mt-1" type="number" min="0" value={form.target_price} onChange={(e) => set({ target_price: e.target.value })} />
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.priceUnit")}</Label>
                <Input className="mt-1" value={form.price_unit} onChange={(e) => set({ price_unit: e.target.value })} placeholder="FCFA/kg" />
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.quality")}</Label>
                <Input className="mt-1" value={form.quality_requirement} onChange={(e) => set({ quality_requirement: e.target.value })} placeholder="A" />
              </div>
              <div>
                <Label>{t("v2.sourcing.fields.certification")}</Label>
                <Input className="mt-1" value={form.certification_requirement} onChange={(e) => set({ certification_requirement: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("v2.sourcing.fields.packaging")}</Label>
                <Input className="mt-1" value={form.packaging_requirement} onChange={(e) => set({ packaging_requirement: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("v2.sourcing.fields.notes")}</Label>
                <Textarea className="mt-1" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.certification_mandatory} onCheckedChange={(v) => set({ certification_mandatory: Boolean(v) })} />
              {t("v2.sourcing.fields.certificationMandatory")}
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-medium">{t("v2.sourcing.wizard.review")}</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">{t("v2.sourcing.fields.crop")}</dt><dd className="font-medium">{cropLabel}</dd></div>
              <div><dt className="text-muted-foreground">{t("v2.sourcing.fields.variety")}</dt><dd className="font-medium">{varietyLabel ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("v2.sourcing.fields.quantity")}</dt><dd className="font-medium">{form.requested_quantity} {form.unit_code}</dd></div>
              <div><dt className="text-muted-foreground">{t("v2.sourcing.fields.window")}</dt><dd className="font-medium">{form.availability_start} → {form.availability_end}</dd></div>
              <div><dt className="text-muted-foreground">{t("v2.sourcing.fields.facility")}</dt><dd className="font-medium">{facility?.name ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("v2.sourcing.fields.radius")}</dt><dd className="font-medium">{form.max_distance_km || "—"} km {form.strict_radius ? `(${t("v2.sourcing.fields.strictShort")})` : ""}</dd></div>
              <div><dt className="text-muted-foreground">{t("v2.sourcing.fields.minPerSupplier")}</dt><dd className="font-medium">{form.min_quantity_per_supplier || "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("v2.sourcing.fields.quality")}</dt><dd className="font-medium">{form.quality_requirement || "—"}</dd></div>
            </dl>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => (step === 1 ? navigate("/app/sourcing") : setStep(step - 1))} disabled={busy}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step === 1 ? t("v2.sourcing.wizard.cancel") : t("v2.sourcing.wizard.back")}
          </Button>
          <div className="flex gap-2">
            {step === STEPS && (
              <Button variant="outline" onClick={() => submit(false)} disabled={busy}>
                {t("v2.sourcing.wizard.saveDraft")}
              </Button>
            )}
            {step < STEPS ? (
              <Button onClick={() => setStep(step + 1)} disabled={!stepValid}>
                {t("v2.sourcing.wizard.next")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => submit(true)} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {t("v2.sourcing.wizard.publish")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default V2SourcingNew;
