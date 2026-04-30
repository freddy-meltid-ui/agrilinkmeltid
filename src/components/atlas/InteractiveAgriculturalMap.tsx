import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { BeninRegion, Level } from "@/lib/beninRegions";
import { BENIN_CENTER } from "@/lib/beninRegions";
import MapLegend from "./MapLegend";

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

type Props = {
  regions: BeninRegion[];
  selected: BeninRegion | null;
  onSelect: (r: BeninRegion) => void;
};

const InteractiveAgriculturalMap = ({ regions, selected, onSelect }: Props) => {
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
        {regions.map((r) => {
          const isSelected = selected?.id === r.id;
          const color = colorFor(r.potential_level);
          return (
            <CircleMarker
              key={r.id}
              center={r.coordinates}
              radius={isSelected ? 16 : 11}
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
      </MapContainer>
      <MapLegend />
    </div>
  );
};

export default InteractiveAgriculturalMap;
