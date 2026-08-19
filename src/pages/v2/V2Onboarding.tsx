// AGRI-GRID V2 — processor onboarding wizard (5 steps)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { useProcessor } from "@/hooks/v2/useProcessor";
import {
  BENIN_DEPARTMENTS,
  CAPACITY_PERIODS,
  CHALLENGES,
  FREQUENCIES,
  LEGAL_FORMS,
  UNITS,
  VALUE_CHAINS,
} from "@/lib/v2/processor";
import { cn } from "@/lib/utils";

type NeedDraft = {
  crop: string;
  variety: string;
  quality_preference: string;
  quantity: string;
  unit: string;
  frequency: string;
  sourcing_season: string;
  sourcing_radius_km: string;
};

type ProductDraft = {
  product_name: string;
  value_chain: string;
  production_capacity_value: string;
  production_capacity_unit: string;
  production_capacity_period: string;
};

const emptyNeed = (): NeedDraft => ({
  crop: "",
  variety: "",
  quality_preference: "",
  quantity: "",
  unit: "tonnes",
  frequency: "monthly",
  sourcing_season: "",
  sourcing_radius_km: "",
});

const emptyProduct = (): ProductDraft => ({
  product_name: "",
  value_chain: "",
  production_capacity_value: "",
  production_capacity_unit: "tonnes",
  production_capacity_period: "month",
});

const V2Onboarding = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeOrg, refresh: refreshOrgs } = useOrganization();
  const { bundle, loading } = useProcessor();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [rccm, setRccm] = useState("");
  const [ifu, setIfu] = useState("");
  const [year, setYear] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 2
  const [facilityName, setFacilityName] = useState("");
  const [department, setDepartment] = useState("");
  const [commune, setCommune] = useState("");
  const [arrondissement, setArrondissement] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [capacity, setCapacity] = useState("");
  const [capacityUnit, setCapacityUnit] = useState("tonnes");
  const [capacityPeriod, setCapacityPeriod] = useState("month");

  // Step 3
  const [valueChains, setValueChains] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductDraft[]>([emptyProduct()]);
  const [employees, setEmployees] = useState("");

  // Step 4
  const [needs, setNeeds] = useState<NeedDraft[]>([emptyNeed()]);

  // Step 5
  const [challenges, setChallenges] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;
    if (activeOrg) {
      setLegalName((v) => v || activeOrg.legal_name || activeOrg.name);
      setTradeName((v) => v || bundle.profile?.trade_name || activeOrg.name);
    }
    const p = bundle.profile;
    if (p) {
      setLegalForm((v) => v || p.legal_form || "");
      setRccm((v) => v || p.rccm || "");
      setIfu((v) => v || p.ifu || "");
      setYear((v) => v || (p.year_established ? String(p.year_established) : ""));
      setPhone((v) => v || p.business_phone || "");
      setEmail((v) => v || p.business_email || "");
      setValueChains((v) => (v.length ? v : p.value_chains || []));
      setChallenges((v) => (v.length ? v : p.challenges || []));
      setEmployees((v) => v || (p.employees_count ? String(p.employees_count) : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeOrg?.id, bundle.profile?.id]);

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) =>
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // 1. Organization
      let orgId = activeOrg?.id ?? null;
      if (!orgId) {
        const { data: org, error } = await supabase
          .from("v2_organizations")
          .insert({
            name: tradeName.trim() || legalName.trim(),
            legal_name: legalName.trim() || null,
            org_type: "processor",
            country: "BJ",
            region: department || null,
            city: commune || null,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error || !org) throw error;
        orgId = org.id;
        const { error: memberError } = await supabase
          .from("v2_organization_members")
          .insert({ organization_id: orgId, user_id: user.id, role: "processor_admin" });
        if (memberError) throw memberError;
      } else {
        await supabase
          .from("v2_organizations")
          .update({
            name: tradeName.trim() || legalName.trim(),
            legal_name: legalName.trim() || null,
            region: department || null,
            city: commune || null,
          })
          .eq("id", orgId);
      }

      // 2. Processor profile
      const profilePayload = {
        organization_id: orgId,
        trade_name: tradeName.trim() || null,
        legal_form: legalForm || null,
        rccm: rccm.trim() || null,
        ifu: ifu.trim() || null,
        year_established: num(year),
        business_phone: phone.trim() || null,
        business_email: email.trim() || null,
        value_chains: valueChains,
        employees_count: num(employees),
        challenges,
        onboarding_step: 5,
        onboarding_completed: true,
      };
      const { error: profileError } = bundle.profile
        ? await supabase.from("v2_processor_profiles").update(profilePayload).eq("organization_id", orgId)
        : await supabase.from("v2_processor_profiles").insert(profilePayload);
      if (profileError) throw profileError;

      // 3. Main facility
      const facilityPayload = {
        organization_id: orgId,
        name: facilityName.trim() || tradeName.trim(),
        department: department || null,
        commune: commune.trim() || null,
        arrondissement: arrondissement.trim() || null,
        address: address.trim() || null,
        latitude: num(lat),
        longitude: num(lng),
        processing_capacity_value: num(capacity),
        processing_capacity_unit: capacityUnit,
        processing_capacity_period: capacityPeriod,
        is_main: true,
      };
      let facilityId = bundle.facilities.find((f) => f.is_main)?.id ?? null;
      if (facilityId) {
        await supabase.from("v2_processing_facilities").update(facilityPayload).eq("id", facilityId);
      } else {
        const { data: fac, error: facError } = await supabase
          .from("v2_processing_facilities")
          .insert(facilityPayload)
          .select("id")
          .single();
        if (facError) throw facError;
        facilityId = fac?.id ?? null;
      }

      // 4. Processed products (finished goods) — distinct from raw materials
      const productRows = products
        .filter((p) => p.product_name.trim())
        .map((p) => ({
          organization_id: orgId!,
          facility_id: facilityId,
          product_name: p.product_name.trim(),
          value_chain: p.value_chain || null,
          production_capacity_value: num(p.production_capacity_value),
          production_capacity_unit: p.production_capacity_unit,
          production_capacity_period: p.production_capacity_period,
        }));
      if (productRows.length) {
        const { error } = await supabase.from("v2_processed_products").insert(productRows);
        if (error) throw error;
      }

      // 5. Raw material needs
      const needRows = needs
        .filter((n) => n.crop.trim())
        .map((n) => ({
          organization_id: orgId!,
          facility_id: facilityId,
          crop: n.crop.trim(),
          variety: n.variety.trim() || null,
          quality_preference: n.quality_preference.trim() || null,
          quantity: num(n.quantity),
          unit: n.unit,
          frequency: n.frequency,
          sourcing_season: n.sourcing_season.trim() || null,
          sourcing_radius_km: num(n.sourcing_radius_km),
        }));
      if (needRows.length) {
        const { error } = await supabase.from("v2_raw_material_needs").insert(needRows);
        if (error) throw error;
      }

      await refreshOrgs();
      toast.success(t("v2.onboarding.saved"));
      navigate("/app/dashboard");
    } catch (e: any) {
      toast.error(t("v2.onboarding.error"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <PageHeader title={t("v2.onboarding.title")} description={t("v2.settings.signInRequired")} />;
  }

  const steps = [1, 2, 3, 4, 5];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("v2.onboarding.title")} description={t("v2.onboarding.description")} />

      <ol className="mb-6 flex flex-wrap gap-2">
        {steps.map((s) => (
          <li
            key={s}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              s === step
                ? "border-primary bg-primary/10 text-primary"
                : s < step
                  ? "border-primary/30 text-primary"
                  : "border-border text-muted-foreground"
            )}
          >
            {s < step ? <Check className="h-3 w-3" /> : <span>{s}</span>}
            {t(`v2.onboarding.step${s}.label`)}
          </li>
        ))}
      </ol>

      <div className="space-y-5 rounded-lg border border-border bg-card p-5">
        {step === 1 && (
          <>
            <h2 className="font-medium">{t("v2.onboarding.step1.title")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="legalName">{t("v2.onboarding.fields.legalName")}</Label>
                <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tradeName">{t("v2.onboarding.fields.tradeName")}</Label>
                <Input id="tradeName" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
              </div>
              <div>
                <Label>{t("v2.onboarding.fields.legalForm")}</Label>
                <Select value={legalForm} onValueChange={setLegalForm}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("v2.onboarding.fields.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_FORMS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year">{t("v2.onboarding.fields.year")}</Label>
                <Input id="year" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rccm">{t("v2.onboarding.fields.rccm")}</Label>
                <Input id="rccm" value={rccm} onChange={(e) => setRccm(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ifu">{t("v2.onboarding.fields.ifu")}</Label>
                <Input id="ifu" value={ifu} onChange={(e) => setIfu(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">{t("v2.onboarding.fields.phone")}</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">{t("v2.onboarding.fields.email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-medium">{t("v2.onboarding.step2.title")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="facilityName">{t("v2.onboarding.fields.facilityName")}</Label>
                <Input id="facilityName" value={facilityName} onChange={(e) => setFacilityName(e.target.value)} />
              </div>
              <div>
                <Label>{t("v2.onboarding.fields.department")}</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("v2.onboarding.fields.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BENIN_DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="commune">{t("v2.onboarding.fields.commune")}</Label>
                <Input id="commune" value={commune} onChange={(e) => setCommune(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="arrondissement">{t("v2.onboarding.fields.arrondissement")}</Label>
                <Input
                  id="arrondissement"
                  value={arrondissement}
                  onChange={(e) => setArrondissement(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="address">{t("v2.onboarding.fields.address")}</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lat">{t("v2.onboarding.fields.latitude")}</Label>
                <Input id="lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lng">{t("v2.onboarding.fields.longitude")}</Label>
                <Input id="lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="capacity">{t("v2.onboarding.fields.capacity")}</Label>
                <Input id="capacity" inputMode="decimal" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{t("v2.onboarding.fields.unit")}</Label>
                  <Select value={capacityUnit} onValueChange={setCapacityUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {t(`v2.units.${u}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("v2.onboarding.fields.period")}</Label>
                  <Select value={capacityPeriod} onValueChange={setCapacityPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAPACITY_PERIODS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {t(`v2.periods.${p}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-medium">{t("v2.onboarding.step3.title")}</h2>
            <div>
              <Label>{t("v2.onboarding.fields.valueChains")}</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {VALUE_CHAINS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={valueChains.includes(c)}
                      onCheckedChange={() => toggle(valueChains, c, setValueChains)}
                    />
                    {t(`v2.valueChains.${c}`)}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t("v2.onboarding.fields.processedProducts")}</Label>
              {products.map((p, i) => (
                <div key={i} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">{t("v2.onboarding.fields.productName")}</Label>
                    <Input
                      value={p.product_name}
                      onChange={(e) =>
                        setProducts(products.map((x, j) => (j === i ? { ...x, product_name: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("v2.onboarding.fields.valueChain")}</Label>
                    <Select
                      value={p.value_chain}
                      onValueChange={(v) =>
                        setProducts(products.map((x, j) => (j === i ? { ...x, value_chain: v } : x)))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("v2.onboarding.fields.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {VALUE_CHAINS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {t(`v2.valueChains.${c}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("v2.onboarding.fields.productionCapacity")}</Label>
                    <Input
                      inputMode="decimal"
                      value={p.production_capacity_value}
                      onChange={(e) =>
                        setProducts(
                          products.map((x, j) => (j === i ? { ...x, production_capacity_value: e.target.value } : x))
                        )
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={p.production_capacity_unit}
                      onValueChange={(v) =>
                        setProducts(products.map((x, j) => (j === i ? { ...x, production_capacity_unit: v } : x)))
                      }
                    >
                      <SelectTrigger className="mt-6">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {t(`v2.units.${u}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={p.production_capacity_period}
                      onValueChange={(v) =>
                        setProducts(products.map((x, j) => (j === i ? { ...x, production_capacity_period: v } : x)))
                      }
                    >
                      <SelectTrigger className="mt-6">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAPACITY_PERIODS.map((per) => (
                          <SelectItem key={per} value={per}>
                            {t(`v2.periods.${per}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {products.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-self-start text-destructive"
                      onClick={() => setProducts(products.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("v2.common.remove")}
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setProducts([...products, emptyProduct()])}>
                <Plus className="mr-2 h-4 w-4" />
                {t("v2.onboarding.fields.addProduct")}
              </Button>
            </div>

            <div className="sm:max-w-xs">
              <Label htmlFor="employees">{t("v2.onboarding.fields.employees")}</Label>
              <Input
                id="employees"
                inputMode="numeric"
                value={employees}
                onChange={(e) => setEmployees(e.target.value)}
              />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-medium">{t("v2.onboarding.step4.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("v2.onboarding.step4.hint")}</p>
            {needs.map((n, i) => (
              <div key={i} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">{t("v2.onboarding.fields.crop")}</Label>
                  <Input
                    value={n.crop}
                    onChange={(e) => setNeeds(needs.map((x, j) => (j === i ? { ...x, crop: e.target.value } : x)))}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("v2.onboarding.fields.variety")}</Label>
                  <Input
                    value={n.variety}
                    onChange={(e) => setNeeds(needs.map((x, j) => (j === i ? { ...x, variety: e.target.value } : x)))}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("v2.onboarding.fields.quality")}</Label>
                  <Input
                    value={n.quality_preference}
                    onChange={(e) =>
                      setNeeds(needs.map((x, j) => (j === i ? { ...x, quality_preference: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("v2.onboarding.fields.quantity")}</Label>
                    <Input
                      inputMode="decimal"
                      value={n.quantity}
                      onChange={(e) =>
                        setNeeds(needs.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("v2.onboarding.fields.unit")}</Label>
                    <Select
                      value={n.unit}
                      onValueChange={(v) => setNeeds(needs.map((x, j) => (j === i ? { ...x, unit: v } : x)))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {t(`v2.units.${u}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t("v2.onboarding.fields.frequency")}</Label>
                  <Select
                    value={n.frequency}
                    onValueChange={(v) => setNeeds(needs.map((x, j) => (j === i ? { ...x, frequency: v } : x)))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {t(`v2.frequencies.${f}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("v2.onboarding.fields.season")}</Label>
                  <Input
                    value={n.sourcing_season}
                    onChange={(e) =>
                      setNeeds(needs.map((x, j) => (j === i ? { ...x, sourcing_season: e.target.value } : x)))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("v2.onboarding.fields.radius")}</Label>
                  <Input
                    inputMode="decimal"
                    value={n.sourcing_radius_km}
                    onChange={(e) =>
                      setNeeds(needs.map((x, j) => (j === i ? { ...x, sourcing_radius_km: e.target.value } : x)))
                    }
                  />
                </div>
                {needs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-self-start text-destructive"
                    onClick={() => setNeeds(needs.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("v2.common.remove")}
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setNeeds([...needs, emptyNeed()])}>
              <Plus className="mr-2 h-4 w-4" />
              {t("v2.onboarding.fields.addNeed")}
            </Button>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="font-medium">{t("v2.onboarding.step5.title")}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHALLENGES.map((c) => (
                <label key={c} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                  <Checkbox checked={challenges.includes(c)} onCheckedChange={() => toggle(challenges, c, setChallenges)} />
                  {t(`v2.challenges.${c}`)}
                </label>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="ghost" disabled={step === 1 || saving} onClick={() => setStep(step - 1)}>
            {t("v2.common.back")}
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !legalName.trim() && !tradeName.trim()}>
              {t("v2.common.next")}
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("v2.onboarding.finish")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default V2Onboarding;
