import { useEffect, useState } from "react";
import { MapContainer, TileLayer, WMSTileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { BeninRegion, Level } from "@/lib/beninRegions";
import { BENIN_CENTER } from "@/lib/beninRegions";
import MapLegend from "./MapLegend";
import CadastreLayerToggle from "./CadastreLayerToggle";

const CADASTRE_WMS_URL = "https://cadastre.bj/geoserver/wms";
const CADASTRE_LAYERS = "benin:cadastre";
const CADASTRE_MIN_ZOOM = 14;


const colorFor = (level: Level): string => {
  if (level === "élevée") return "#10b981"; // emerald-500
  if (level === "moyenne") return "#f59e0b"; // amber-500
  return "#a8a29e"; // stone-400
};

const FlyToSelected = ({ region }: { region: BeninRegion | null }) => {
  const map = useMap();
  useEffect(() => {
    if (region) {
      map.flyTo(region.coordinates, 9, { duration: 1.0 });
    }
  }, [region, map]);
  return null;
};

// Auto-fit bounds when filters change (only if no region is actively selected)
const FitToRegions = ({ regions, selected }: { regions: BeninRegion[]; selected: BeninRegion | null }) => {
  const map = useMap();
  useEffect(() => {
    if (selected) return;

    // Defer: the container can still have a 0x0 size on mount (hidden tab / layout),
    // which makes Leaflet compute NaN coordinates during flyTo animations.
    const run = () => {
      map.invalidateSize();
      const size = map.getSize();
      if (size.x <= 0 || size.y <= 0) return;

      if (regions.length === 0) {
        map.setView(BENIN_CENTER, 7);
        return;
      }
      if (regions.length === 1) {
        map.setView(regions[0].coordinates, 9);
        return;
      }
      const bounds = L.latLngBounds(regions.map((r) => r.coordinates));
      if (!bounds.isValid()) return;
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9, animate: true, duration: 0.8 });
    };

    const id = window.setTimeout(run, 120);
    return () => window.clearTimeout(id);
  }, [regions, selected, map]);
  return null;
};



type Props = {
  regions: BeninRegion[];
  selected: BeninRegion | null;
  onSelect: (r: BeninRegion) => void;
};

const ZoomWatcher = ({ onZoom }: { onZoom: (z: number) => void }) => {
  const map = useMap();
  useEffect(() => {
    onZoom(map.getZoom());
    const handler = () => onZoom(map.getZoom());
    map.on("zoomend", handler);
    return () => {
      map.off("zoomend", handler);
    };
  }, [map, onZoom]);
  return null;
};

const InteractiveAgriculturalMap = ({ regions, selected, onSelect }: Props) => {
  const [cadastreOn, setCadastreOn] = useState(false);
  const [cadastreOpacity, setCadastreOpacity] = useState(0.7);
  const [zoom, setZoom] = useState(7);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-stone-200 shadow-sm">
      <MapContainer
        center={BENIN_CENTER}
        zoom={7}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cadastreOn && (
          <WMSTileLayer
            url={CADASTRE_WMS_URL}
            layers={CADASTRE_LAYERS}
            format="image/png"
            transparent
            version="1.3.0"
            opacity={cadastreOpacity}
            minZoom={CADASTRE_MIN_ZOOM}
            attribution='Cadastre&nbsp;: <a href="https://cadastre.bj" target="_blank" rel="noopener noreferrer">ANDF</a>'
          />
        )}
        <ZoomWatcher onZoom={setZoom} />

        {regions.map((r) => {
          const isSelected = selected?.id === r.id;
          const color = colorFor(r.potential_level);
          return (
            <CircleMarker
              key={r.id}
              center={r.coordinates}
              radius={isSelected ? 20 : 14}
              pathOptions={{
                color: isSelected ? "#064e3b" : color,
                weight: isSelected ? 3 : 2,
                fillColor: color,
                fillOpacity: isSelected ? 0.85 : 0.7,
              }}
              eventHandlers={{ click: () => onSelect(r) }}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-900">{r.name}</p>
                  <p className="text-xs text-stone-600">{r.agroecological_zone}</p>
                  <p className="text-xs text-stone-700 mt-1 font-medium">Cultures recommandées :</p>
                  <ul className="text-xs list-disc pl-4">
                    {r.recommended_crops.slice(0, 3).map((c) => (
                      <li key={c.crop_name}>
                        {c.crop_name} <span className="text-stone-500">({c.suitability})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <FlyToSelected region={selected} />
        <FitToRegions regions={regions} selected={selected} />
      </MapContainer>
      <CadastreLayerToggle
        enabled={cadastreOn}
        onToggle={setCadastreOn}
        opacity={cadastreOpacity}
        onOpacityChange={setCadastreOpacity}
      />
      {cadastreOn && zoom < CADASTRE_MIN_ZOOM && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-md border border-amber-200 bg-amber-50/95 px-3 py-1.5 text-[11px] font-medium text-amber-800 shadow-sm backdrop-blur">
          Zoomez davantage pour afficher le parcellaire cadastral
        </div>
      )}
      <MapLegend />
    </div>
  );

};

export default InteractiveAgriculturalMap;
