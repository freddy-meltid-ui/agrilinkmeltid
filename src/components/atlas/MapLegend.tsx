const items = [
  { color: "bg-emerald-500", label: "Potentiel élevé" },
  { color: "bg-amber-500", label: "Potentiel moyen" },
  { color: "bg-stone-400", label: "Potentiel faible" },
];

const MapLegend = () => (
  <div className="absolute bottom-3 right-3 z-[1000] rounded-md bg-white/95 backdrop-blur px-3 py-2 shadow-md border border-stone-200 text-xs space-y-1">
    <p className="font-semibold text-stone-700 mb-1">Légende</p>
    {items.map((i) => (
      <div key={i.label} className="flex items-center gap-2">
        <span className={`inline-block h-3 w-3 rounded-full ${i.color} ring-2 ring-white`} />
        <span className="text-stone-700">{i.label}</span>
      </div>
    ))}
  </div>
);

export default MapLegend;
