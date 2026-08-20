// AGRI-GRID V2 — Phase 2A: production wizard. The browser only collects the
// declaration; v2_post_production validates stock and posts both ledgers atomically.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { useProcessor } from "@/hooks/v2/useProcessor";
import {
  fetchAvailableRawBatches,
  fetchRecipes,
  parseProductionError,
  postProduction,
  type AvailableRawBatch,
  type PostProductionOutput,
  type RecipeWithLines,
} from "@/lib/v2/production";
import { localeTag } from "@/lib/v2/locale";

type InputLine = { rawBatchId: string; quantityKg: string };
type OutputLine = {
  type: "finished_product" | "by_product" | "waste";
  label: string;
  quantity: string;
  unit: string;
  lossCategory: string;
};

const LOSS_CATEGORIES = ["process_loss", "peel_or_husk", "rejected_raw_material", "damaged_output", "quality_rejection", "other"];
const UNITS = ["l", "kg", "t", "piece"];

const V2ProductionNew = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const { bundle, loading: procLoading } = useProcessor();

  const [rawBatches, setRawBatches] = useState<AvailableRawBatch[]>([]);
  const [recipes, setRecipes] = useState<RecipeWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [facilityId, setFacilityId] = useState("");
  const [productId, setProductId] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [storage, setStorage] = useState("");
  const [inputs, setInputs] = useState<InputLine[]>([{ rawBatchId: "", quantityKg: "" }]);
  const [outputs, setOutputs] = useState<OutputLine[]>([
    { type: "finished_product", label: "", quantity: "", unit: "l", lossCategory: "" },
  ]);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [b, r] = await Promise.all([fetchAvailableRawBatches(activeOrg.id), fetchRecipes(activeOrg.id)]);
    setRawBatches(b);
    setRecipes(r);
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  useEffect(() => {
    if (!facilityId && bundle.facilities.length) setFacilityId(bundle.facilities[0].id);
  }, [bundle.facilities, facilityId]);

  const fr = i18n.language.startsWith("fr");
  const batchLabel = (b: AvailableRawBatch) =>
    `${b.batch_reference} — ${(fr ? b.crop?.name_fr : b.crop?.name_en) ?? "—"}${
      b.variety ? ` / ${(fr ? b.variety.name_fr : b.variety.name_en) ?? ""}` : ""
    } · ${Number(b.current_tonnes).toFixed(3)} t`;

  const totalInputTonnes = useMemo(
    () => inputs.reduce((s, l) => s + (Number(l.quantityKg) || 0) / 1000, 0),
    [inputs],
  );

  const finishedQty = useMemo(
    () => outputs.filter((o) => o.type === "finished_product").reduce((s, o) => s + (Number(o.quantity) || 0), 0),
    [outputs],
  );

  const yieldRatio = totalInputTonnes > 0 ? finishedQty / (totalInputTonnes * 1000) : 0;
  const finishedOutputs = outputs.filter((o) => o.type === "finished_product");
  const finishedUnit = finishedOutputs[0]?.unit ?? "kg";
  // Percentage yield is only meaningful when output and input share a mass basis.
  const yieldIsMass =
    ["kg", "g", "t"].includes(finishedUnit) && finishedOutputs.every((o) => o.unit === finishedUnit);

  const overdrawn = inputs.some((l) => {
    const b = rawBatches.find((x) => x.id === l.rawBatchId);
    return b ? (Number(l.quantityKg) || 0) / 1000 > Number(b.current_tonnes) + 1e-9 : false;
  });

  const applyRecipe = (id: string) => {
    setRecipeId(id);
    const r = recipes.find((x) => x.id === id);
    if (!r) return;
    if (r.product_id) setProductId(r.product_id);
    const out = r.outputs.map<OutputLine>((o) => ({
      type: (o.output_type as OutputLine["type"]) ?? "finished_product",
      label: o.label ?? "",
      quantity: String(o.quantity ?? ""),
      unit: o.unit_code ?? "l",
      lossCategory: o.output_type === "waste" ? "process_loss" : "",
    }));
    if (out.length) setOutputs(out);
  };

  const submit = async () => {
    if (!activeOrg || !facilityId || !productId) return;
    const cleanInputs = inputs
      .filter((l) => l.rawBatchId && Number(l.quantityKg) > 0)
      .map((l) => ({ raw_material_batch_id: l.rawBatchId, quantity_tonnes: Number(l.quantityKg) / 1000 }));
    const cleanOutputs = outputs
      .filter((o) => Number(o.quantity) > 0)
      .map<PostProductionOutput>((o) => ({
        output_type: o.type,
        product_id: o.type === "finished_product" ? productId : null,
        label: o.label || null,
        quantity: Number(o.quantity),
        unit_code: o.unit,
        storage_location: o.type === "finished_product" ? storage || null : null,
        quality_status: o.type === "finished_product" ? "accepted" : null,
        loss_category: o.type === "waste" ? o.lossCategory || "other" : null,
      }));
    if (!cleanInputs.length || !cleanOutputs.length) {
      toast.error(t("v2.production.form.incomplete"));
      return;
    }
    setSaving(true);
    try {
      const res = await postProduction({
        organizationId: activeOrg.id,
        facilityId,
        productId,
        inputs: cleanInputs,
        outputs: cleanOutputs,
        recipeId: recipeId || null,
        productionDate,
        notes: notes || null,
      });
      toast.success(t("v2.production.form.posted", { reference: res.batch_reference }));
      navigate(`/app/operations/production/${res.production_batch_id}`);
    } catch (e) {
      const failure = parseProductionError((e as Error).message ?? "");
      toast.error(
        t(`v2.production.error.${failure.code}`, {
          defaultValue: t("v2.production.error.UNKNOWN"),
          value: failure.value ?? "",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || orgLoading || procLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <>
      <PageHeader title={t("v2.production.form.title")} description={t("v2.production.form.description")} />

      {rawBatches.length === 0 ? (
        <EmptyState title={t("v2.production.form.noStockTitle")} description={t("v2.production.form.noStockDescription")} />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
            <div>
              <Label>{t("v2.production.form.facility")}</Label>
              <Select value={facilityId} onValueChange={setFacilityId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("v2.production.form.facility")} />
                </SelectTrigger>
                <SelectContent>
                  {bundle.facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("v2.production.form.product")}</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("v2.production.form.product")} />
                </SelectTrigger>
                <SelectContent>
                  {bundle.products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("v2.production.form.recipe")}</Label>
              <Select value={recipeId} onValueChange={applyRecipe}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("v2.production.form.recipeNone")} />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pdate">{t("v2.production.form.date")}</Label>
              <Input id="pdate" type="date" className="mt-1" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">{t("v2.production.form.inputs")}</h2>
              <Button variant="outline" size="sm" onClick={() => setInputs([...inputs, { rawBatchId: "", quantityKg: "" }])}>
                <Plus className="mr-1 h-4 w-4" />
                {t("v2.production.form.addInput")}
              </Button>
            </div>
            <div className="space-y-3">
              {inputs.map((line, idx) => {
                const b = rawBatches.find((x) => x.id === line.rawBatchId);
                const over = b ? (Number(line.quantityKg) || 0) / 1000 > Number(b.current_tonnes) + 1e-9 : false;
                return (
                  <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_150px_40px] sm:items-end">
                    <div>
                      <Select
                        value={line.rawBatchId}
                        onValueChange={(v) => setInputs(inputs.map((l, i) => (i === idx ? { ...l, rawBatchId: v } : l)))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("v2.production.form.selectBatch")} />
                        </SelectTrigger>
                        <SelectContent>
                          {rawBatches.map((rb) => (
                            <SelectItem key={rb.id} value={rb.id}>
                              {batchLabel(rb)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {b && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("v2.production.form.batchSource", {
                            supplier: b.supplier?.display_name ?? b.supplier?.supplier_code ?? "—",
                            date: new Date(b.receipt_date).toLocaleDateString(localeTag(i18n.language)),
                          })}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        type="number"
                        min={0}
                        step="0.001"
                        placeholder={t("v2.production.form.kg")}
                        value={line.quantityKg}
                        onChange={(e) => setInputs(inputs.map((l, i) => (i === idx ? { ...l, quantityKg: e.target.value } : l)))}
                        className={over ? "border-destructive" : undefined}
                      />
                      {over && b && (
                        <p className="mt-1 text-xs text-destructive">
                          {t("v2.production.form.overStock", { tonnes: Number(b.current_tonnes).toFixed(3) })}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setInputs(inputs.filter((_, i) => i !== idx))}
                      disabled={inputs.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("v2.production.form.totalInput", { tonnes: totalInputTonnes.toFixed(3) })}
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">{t("v2.production.form.outputs")}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOutputs([...outputs, { type: "waste", label: "", quantity: "", unit: "kg", lossCategory: "process_loss" }])}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t("v2.production.form.addOutput")}
              </Button>
            </div>
            <div className="space-y-3">
              {outputs.map((o, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[160px_1fr_120px_110px_40px] sm:items-center">
                  <Select
                    value={o.type}
                    onValueChange={(v) => setOutputs(outputs.map((x, i) => (i === idx ? { ...x, type: v as OutputLine["type"] } : x)))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finished_product">{t("v2.production.outputType.finished_product")}</SelectItem>
                      <SelectItem value="by_product">{t("v2.production.outputType.by_product")}</SelectItem>
                      <SelectItem value="waste">{t("v2.production.outputType.waste")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {o.type === "waste" ? (
                    <Select
                      value={o.lossCategory || "process_loss"}
                      onValueChange={(v) => setOutputs(outputs.map((x, i) => (i === idx ? { ...x, lossCategory: v } : x)))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOSS_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {t(`v2.production.loss.${c}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={t("v2.production.form.outputLabel")}
                      value={o.label}
                      onChange={(e) => setOutputs(outputs.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                    />
                  )}
                  <Input
                    type="number"
                    min={0}
                    step="0.001"
                    placeholder={t("v2.production.form.quantity")}
                    value={o.quantity}
                    onChange={(e) => setOutputs(outputs.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))}
                  />
                  <Select value={o.unit} onValueChange={(v) => setOutputs(outputs.map((x, i) => (i === idx ? { ...x, unit: v } : x)))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setOutputs(outputs.filter((_, i) => i !== idx))} disabled={outputs.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="storage">{t("v2.production.form.storage")}</Label>
                <Input id="storage" className="mt-1" value={storage} onChange={(e) => setStorage(e.target.value)} />
              </div>
              <div className="self-end text-sm text-muted-foreground">
                {yieldIsMass
                  ? t("v2.production.form.yield", { value: (yieldRatio * 100).toFixed(1) })
                  : t("v2.production.form.yieldRatio", { value: yieldRatio.toFixed(3), unit: finishedUnit })}
              </div>
            </div>
          </section>

          <div>
            <Label htmlFor="notes">{t("v2.production.form.notes")}</Label>
            <Textarea id="notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button onClick={submit} disabled={saving || overdrawn || !facilityId || !productId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("v2.production.form.submit")}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/app/operations/production")}>
              {t("v2.common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default V2ProductionNew;
