// AGRI-GRID V2 — Phase 1C: discovery filters (crop / variety / window / distance / confidence)
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ReferenceData } from "@/lib/v2/reference";
import { refLabel, varietiesForCrop } from "@/lib/v2/reference";
import type { SupplyFilters as Filters, Confidence, Freshness } from "@/lib/v2/commercialSupply";
import type { Facility } from "@/lib/v2/processor";

const ALL = "__all__";

type Props = {
  value: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  reference: ReferenceData;
  facilities: Facility[];
  departments: string[];
};

const SupplyFiltersPanel = ({ value, onChange, onReset, reference, facilities, departments }: Props) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const varieties = varietiesForCrop(reference, value.cropId ?? null);

  const toggle = <T extends string>(list: T[] | undefined, item: T): T[] => {
    const cur = list ?? [];
    return cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t("v2.supplyIntel.filters.searchPlaceholder")}
          value={value.search ?? ""}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {facilities.length > 0 && (
          <div>
            <Label className="text-xs">{t("v2.supplyIntel.filters.facility")}</Label>
            <Select value={value.facilityId ?? ALL} onValueChange={(v) => onChange({ facilityId: v === ALL ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("v2.supplyIntel.filters.allFacilities")}</SelectItem>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-xs">{t("v2.supplyIntel.filters.crop")}</Label>
          <Select value={value.cropId ?? ALL} onValueChange={(v) => onChange({ cropId: v === ALL ? null : v, varietyId: null })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("v2.supplyIntel.filters.allCrops")}</SelectItem>
              {reference.crops.map((c) => (
                <SelectItem key={c.id} value={c.id}>{refLabel(c, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t("v2.supplyIntel.filters.variety")}</Label>
          <Select
            value={value.varietyId ?? ALL}
            onValueChange={(v) => onChange({ varietyId: v === ALL ? null : v })}
            disabled={!value.cropId}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("v2.supplyIntel.filters.allVarieties")}</SelectItem>
              {varieties.map((v) => (
                <SelectItem key={v.id} value={v.id}>{refLabel(v, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t("v2.supplyIntel.filters.department")}</Label>
          <Select value={value.department ?? ALL} onValueChange={(v) => onChange({ department: v === ALL ? null : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("v2.supplyIntel.filters.allDepartments")}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t("v2.supplyIntel.filters.from")}</Label>
          <Input type="date" value={value.availableFrom ?? ""} onChange={(e) => onChange({ availableFrom: e.target.value || null })} />
        </div>
        <div>
          <Label className="text-xs">{t("v2.supplyIntel.filters.to")}</Label>
          <Input type="date" value={value.availableTo ?? ""} onChange={(e) => onChange({ availableTo: e.target.value || null })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">
            {t("v2.supplyIntel.filters.radius")}: {value.maxDistanceKm ?? t("v2.supplyIntel.filters.noLimit")}
            {value.maxDistanceKm ? " km" : ""}
          </Label>
          <Slider
            className="mt-3"
            min={0}
            max={200}
            step={10}
            value={[value.maxDistanceKm ?? 0]}
            onValueChange={([v]) => onChange({ maxDistanceKm: v === 0 ? null : v })}
          />
        </div>
        <div>
          <Label className="text-xs">
            {t("v2.supplyIntel.filters.minQuantity")}: {value.minQuantityT ?? 0} t
          </Label>
          <Slider
            className="mt-3"
            min={0}
            max={20}
            step={1}
            value={[value.minQuantityT ?? 0]}
            onValueChange={([v]) => onChange({ minQuantityT: v === 0 ? null : v })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("v2.supplyIntel.filters.confidence")}</span>
        {(["high", "medium", "low"] as Confidence[]).map((c) => (
          <Button
            key={c}
            type="button"
            size="sm"
            variant={value.confidence?.includes(c) ? "default" : "outline"}
            onClick={() => onChange({ confidence: toggle(value.confidence, c) })}
          >
            {t(`v2.supplyIntel.confidence.${c}`)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("v2.supplyIntel.filters.freshness")}</span>
        {(["fresh", "aging", "stale"] as Freshness[]).map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={value.freshness?.includes(f) ? "default" : "outline"}
            onClick={() => onChange({ freshness: toggle(value.freshness, f) })}
          >
            {t(`v2.supplyIntel.freshness.${f}`)}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch checked={!!value.verifiedOnly} onCheckedChange={(v) => onChange({ verifiedOnly: v })} id="verified-only" />
          <Label htmlFor="verified-only" className="text-xs">{t("v2.supplyIntel.filters.verifiedOnly")}</Label>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="mr-1 h-4 w-4" />
          {t("v2.supplyIntel.filters.reset")}
        </Button>
      </div>
    </div>
  );
};

export default SupplyFiltersPanel;
