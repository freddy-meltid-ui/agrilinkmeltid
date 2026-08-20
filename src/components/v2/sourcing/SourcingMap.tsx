// AGRI-GRID V2 — Phase 1D: sourcing match map.
// Coordinates are the privacy-preserving approximations produced in Phase 1C.
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useTranslation } from "react-i18next";
import type { MatchRow } from "@/lib/v2/sourcing";

const BENIN_CENTER: [number, number] = [9.3, 2.31];

const FitToPoints = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize();
      const size = map.getSize();
      if (size.x <= 0 || size.y <= 0) return;
      if (!points.length) return map.setView(BENIN_CENTER, 7);
      if (points.length === 1) return map.setView(points[0], 10);
      const bounds = L.latLngBounds(points);
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }, 150);
    return () => window.clearTimeout(id);
  }, [points, map]);
  return null;
};

type Props = {
  rows: MatchRow[];
  recommendedIds: string[];
  facility?: { name: string; latitude: number | null; longitude: number | null } | null;
};

const SourcingMap = ({ rows, recommendedIds, facility }: Props) => {
  const { t } = useTranslation();
  const valid = rows.filter((r) => r.approx_latitude != null && r.approx_longitude != null);
  const points: [number, number][] = valid.map((r) => [Number(r.approx_latitude), Number(r.approx_longitude)]);
  if (facility?.latitude != null && facility?.longitude != null) {
    points.push([Number(facility.latitude), Number(facility.longitude)]);
  }

  const colorFor = (r: MatchRow) => {
    if (recommendedIds.includes(r.supply_id)) return "#15803d";
    if (r.match_class === "near_match") return "#a8a29e";
    return "#f59e0b";
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <MapContainer center={BENIN_CENTER} zoom={7} scrollWheelZoom style={{ height: 420, width: "100%" }}>
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
            pathOptions={{ color: colorFor(r), fillColor: colorFor(r), fillOpacity: 0.6 }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{r.supplier_ref}</p>
                <p>
                  {Number(r.quantity_tonnes ?? 0).toFixed(2)} t ·{" "}
                  {r.distance_km != null ? `~${Number(r.distance_km).toFixed(0)} km` : "—"}
                </p>
                <p className="text-muted-foreground">
                  {t("v2.sourcing.matchScore")}: {Number(r.score ?? 0).toFixed(0)}%
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="border-t border-border p-2 text-xs text-muted-foreground">{t("v2.sourcing.mapLegend")}</p>
    </div>
  );
};

export default SourcingMap;
