## Atlas Agricole — Real Interactive Map (Bénin)

Replace the current `MapPlaceholder` with a real Leaflet + OpenStreetMap map at `/atlas`. The map becomes the centerpiece: clicking a region highlights it, opens a popup, and updates a side panel with full agronomic details. All 12 Bénin departments are seeded as mock data, structured to be swappable with Supabase + GeoJSON later.

### 1. Dependencies

Install:
- `leaflet`
- `react-leaflet`
- `@types/leaflet` (dev)

Import Leaflet's CSS once globally in `src/main.tsx`:
```ts
import "leaflet/dist/leaflet.css";
```

### 2. Mock data — 12 Bénin departments

New file `src/lib/beninRegions.ts` exporting a typed `BeninRegion[]` matching the spec exactly:

```ts
export type Suitability = "élevée" | "moyenne" | "faible";
export type BeninRegion = {
  id: string;
  name: string;
  country: "Bénin";
  coordinates: [number, number];      // [lat, lng]
  agroecological_zone: string;
  rainfall_mm: string;
  dominant_soil: string;
  fertility_level: "faible" | "moyenne" | "élevée";
  irrigation_potential: "faible" | "moyen" | "élevé";
  potential_level: "faible" | "moyenne" | "élevée"; // for legend/filter
  recommended_crops: {
    crop_name: string;
    suitability: Suitability;
    expected_yield_range: string;
    key_constraints: string;
    recommendation: string;
  }[];
};
```

Seed all 12 departments with realistic centroids and 3–5 recommended crops each:
Alibori, Borgou, Atacora, Donga, Collines, Zou, Atlantique, Ouémé, Mono, Couffo, Plateau, Littoral.

Crops vary by zone (cotton/maize/sorghum north; cassava/maize/yam centre; pineapple/oil-palm/vegetables south).

### 3. New components (`src/components/atlas/`)

- **InteractiveAgriculturalMap.tsx** — `react-leaflet` `<MapContainer>` centered on Bénin (`[9.3, 2.3]`, zoom 7), `<TileLayer>` using OSM tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution required). Renders a `<CircleMarker>` per region, color-coded by `potential_level` (emerald = élevée, amber = moyenne, stone = faible), radius enlarged + ring when selected. `<Popup>` shows region name and top 3 crops. `onClick` calls `onSelect(region)`. Uses `useMap()` helper to `flyTo` selected region.
- **RegionDetailsPanel.tsx** — shows everything for the selected region: name, agroecological zone, rainfall, soil, fertility, irrigation, top crops list, expected yield ranges, main constraints, recommendation summary. Empty state: "Cliquez sur une région de la carte pour afficher ses détails."
- **RegionFilterBar.tsx** — filters: crop type (select from union of all crops), potential level (élevée/moyenne/faible/all), rainfall range (slider or select buckets), soil fertility (select). Returns filter state to parent.
- **CropRecommendationCard.tsx** — one crop entry with suitability badge.
- **YieldPotentialCard.tsx** — yield range + constraints highlight.
- **MapLegend.tsx** — overlay (bottom-right of map) with three color dots: potentiel élevé / moyen / faible.
- Reuse existing **DisclaimerBanner.tsx** (text already matches the required disclaimer).

### 4. New page

`src/pages/AgriculturalAtlasPage.tsx` mounted at `/atlas` (replaces current `AtlasDashboard` route). Layout:

```text
+--------------------------------------------------+
| Header: "Atlas Agricole"  + DisclaimerBanner     |
+----------------+---------------------------------+
| RegionFilter   |                                 |
| Bar            |   InteractiveAgriculturalMap    |
| RegionDetails  |   (with MapLegend overlay)      |
| Panel          |                                 |
+----------------+---------------------------------+
```

- Desktop (`lg:`): two columns — left panel `lg:col-span-4`, map `lg:col-span-8`, map height `h-[70vh]`.
- Mobile: filters first, then map (`h-[50vh]`), then details panel below.
- The old `AtlasDashboard` is kept accessible at `/atlas/explorer` (optional) so the Supabase-backed multi-country dashboard isn't lost; or simply removed from routing. **Decision:** keep old dashboard at `/atlas/explorer`, make `/atlas` the new map-first page.

### 5. Routing & navigation

- `src/App.tsx`: change `/atlas` → `AgriculturalAtlasPage`; add `/atlas/explorer` → existing `AtlasDashboard`.
- `src/components/Navbar.tsx`: existing "Atlas" link continues to point to `/atlas` (now the map page).

### 6. Leaflet marker icon fix

Default Leaflet marker icons break under Vite bundling. Since we use `CircleMarker` (no image asset), this is avoided. If we later switch to `<Marker>`, configure `L.Icon.Default` with `import iconUrl from "leaflet/dist/images/marker-icon.png?url"` etc.

### 7. Filter logic

Filters narrow the markers shown on the map and the list in the side panel:
- crop type → keep regions whose `recommended_crops` includes that crop with suitability ≥ filter.
- potential level → equality on `potential_level`.
- rainfall bucket (`<800`, `800–1100`, `1100–1400`, `>1400` mm) → parse `rainfall_mm`.
- soil fertility → equality.

### 8. Out of scope

- No real GeoJSON polygons (CircleMarkers only; structure ready for `<GeoJSON>` later).
- No Supabase changes — `beninRegions.ts` is pure mock.
- No legal/cadastral data.
- No weather/satellite API.

### Files

**Create**
- `src/lib/beninRegions.ts`
- `src/pages/AgriculturalAtlasPage.tsx`
- `src/components/atlas/InteractiveAgriculturalMap.tsx`
- `src/components/atlas/RegionDetailsPanel.tsx`
- `src/components/atlas/RegionFilterBar.tsx`
- `src/components/atlas/CropRecommendationCard.tsx`
- `src/components/atlas/YieldPotentialCard.tsx`
- `src/components/atlas/MapLegend.tsx`

**Modify**
- `src/App.tsx` (route swap)
- `src/main.tsx` (Leaflet CSS import)
- `package.json` (add leaflet, react-leaflet, @types/leaflet)

Approve to implement.