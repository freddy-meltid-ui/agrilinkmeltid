// AGRI-GRID V2 — Phase 1C: supply discovery map.
// Coordinates come from the RPC already rounded (~2 km) — exact farm GPS is never sent to processors.
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CommercialSupplyRow } from "@/lib/v2/commercialSupply";

const BENIN_CENTER: [number, number] = [9.3, 2.31];

const colorFor = (confidence: string | null) =>
  confidence === "high" ? "#10b981" : confidence === "medium" ? "#f59e0b" : "#a8a29e";

const FitToPoints = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize();
      const size = map.getSize();
      if (size.x <= 0 || size.y <= 0) return;
      if (points.length === 0) {
        map.setView(BENIN_CENTER, 7);
        return;
      }
      if (points.length === 1) {
        map.setView(points[0], 10);
        return;
      }
      const bounds = L.latLngBounds(points);
      if (!bounds.isValid()) return;
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11, animate: true });
    }, 150);
    return () => window.clearTimeout(id);
  }, [points, map]);
  return null;
};

type Props = {
  rows: CommercialSupplyRow[];
  facility?: { name: string; latitude: number | null; longitude: number | null } | null;
};

const SupplyMap = ({ rows, facility }: Props) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const valid = rows.filter(
    (r) => r.approx_latitude != null && r.approx_longitude != null && !Number.isNaN(Number(r.approx_latitude)),
  );
  const points: [number, number][] = valid.map((r) => [Number(r.approx_latitude), Number(r.approx_longitude)]);
  if (facility?.latitude != null && facility?.longitude != null) points.push([Number(facility.latitude), Number(facility.longitude)]);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <MapContainer center={BENIN_CENTER} zoom={7} scrollWheelZoom style={{ height: 460, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={points} />

        {facility?.latitude != null && facility?.longitude != null && (
          <CircleMarker
            center={[Number(facility.latitude), Number(facility.longitude)]}
            radius={9}
            pathOptions={{ color: "#1d4ed8", fillColor: "#1d4ed8", fillOpacity: 0.9 }}
          >
            <Popup>{facility.name}</Popup>
          </CircleMarker>
        )}

        {valid.map((r) => (
          <CircleMarker
            key={r.supply_id}
            center={[Number(r.approx_latitude), Number(r.approx_longitude)]}
            radius={6 + Math.min(8, Number(r.quantity_tonnes ?? 0))}
            pathOptions={{ color: colorFor(r.confidence), fillColor: colorFor(r.confidence), fillOpacity: 0.65 }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {lang.startsWith("fr") ? r.crop_name_fr : r.crop_name_en}
                  {r.variety_name_fr ? ` — ${lang.startsWith("fr") ? r.variety_name_fr : r.variety_name_en}` : ""}
                </p>
                <p>{Number(r.quantity_tonnes ?? 0).toFixed(2)} t</p>
                <p className="text-xs text-muted-foreground">{r.supplier_ref}</p>
                <p className="text-xs text-muted-foreground">{t("v2.supplyIntel.approxLocation")}</p>
                <Link to={`/app/supply/${r.supply_id}`} className="text-primary underline">
                  {t("v2.supplyIntel.viewDetail")}
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {t("v2.supplyIntel.mapPrivacyNote")}
      </p>
    </div>
  );
};

export default SupplyMap;
