## Atlas Agricole Intelligent — Module Plan

A decision-support module inside AgriGrid that lets users explore agricultural potential by region: soils, climate, recommended crops, expected yields, constraints. UI in French, agritech green/earth palette, mobile-first.

**Positioning (strict):** indicative agronomic insights only — not a legal land registry. Wording: "Atlas Agricole Intelligent" / "Carte d'aide à la décision agricole".

---

### 1. Database (Supabase migrations)

Six new tables, all with RLS `SELECT = true` (public read), inserts/updates restricted to admins via `has_role(auth.uid(), 'admin')` (admin role already exists in `app_role` enum):

- `countries` — `id, code, name_fr, name_en`
- `regions` — `id, country_id (fk), name, agroecological_zone, rainfall_min_mm, rainfall_max_mm, dominant_soil_type, soil_fertility_level (low/medium/high), irrigation_potential (low/medium/high), main_constraints (text[]), centroid_lat, centroid_lng, geojson (jsonb, nullable for future)`
- `soil_profiles` — `id, soil_type, description, ph_range, texture, fertility_notes`
- `crop_profiles` — `id, crop_name, name_fr, water_need_mm_min, water_need_mm_max, preferred_soil (text[]), cycle_days, risk_factors (text[])`
- `crop_recommendations` — `id, region_id (fk), crop_id (fk), suitability ('high'|'medium'|'low'), recommendation_text, constraints (text[])`
- `yield_estimates` — `id, region_id, crop_id, yield_min_t_ha, yield_max_t_ha, confidence ('low'|'medium'|'high'), assumptions (text[])`

Seed mock data for ~3 countries (Côte d'Ivoire, Sénégal, Nigeria), ~6 regions, and the 10 crops listed (maize, rice, cassava, yam, soy, cotton, tomato, onion, cashew, pineapple) with realistic recommendations + yield ranges.

Optional: a `saved_recommendations` table (`user_id, region_id, crop_id, created_at`, RLS owner-only) for the "save recommendation" UX.

### 2. Data access layer

`src/lib/atlas.ts` — pure data functions, no UI:
- `listCountries()`, `listRegions(countryId?)`, `listCrops()`
- `getRegion(regionId)` — returns region + soil profile join
- `getCropRecommendations(regionId)` — returns the structured JSON shape from the spec (region_name, agroecological_zone, soil_type, rainfall_mm, recommended_crops[])
- `getYieldEstimate(regionId, cropId)`
- `saveRecommendation(regionId, cropId)` (auth-gated)

### 3. Routing

Add to `src/App.tsx`:
- `/atlas` → `AtlasDashboard`
- `/atlas/region/:regionId` → `RegionProfilePage`

Add a "Atlas Agricole" link to `Navbar` (desktop + mobile menu) and a card on the Dashboard.

### 4. Components (`src/components/atlas/`)

- **AtlasDashboard** (page) — header, search bar, country/region/crop selectors, summary KPI cards (regions count, crops referenced, avg rainfall), MapPlaceholder, grid of region cards, DisclaimerBanner, "Évolutions futures" section.
- **RegionSelector** — controlled country → region → crop cascading selects.
- **RegionProfileCard** — region name, country, agroecological zone, rainfall range, dominant soil, fertility, irrigation potential, constraints chips, recommended crops chips.
- **CropSuitabilityTable** — shadcn `Table` with columns: culture, score (colored badge High/Medium/Low), rendement attendu, pluviométrie requise, sol préféré, facteurs de risque, recommandation.
- **YieldEstimateCard** — appears when crop+region selected: yield range, confidence badge, assumptions list, warning disclaimer.
- **MapPlaceholder** — responsive card grid of regions positioned by lat/lng on an SVG of Africa OR a simple styled grid; clickable cards navigate to region profile. GeoJSON-ready: reads `region.geojson` if present, otherwise falls back to centroid pin. No Leaflet/Mapbox dependency added.
- **RecommendationCard** — shows one crop recommendation with "Sauvegarder" button.
- **DisclaimerBanner** — yellow/amber alert with the exact required French disclaimer text.
- **FutureRoadmap** — small section listing: données satellite, vraies couches géospatiales, météo historique, alertes climatiques, cadastre officiel, scoring d'investissement.

### 5. Pages

- **`src/pages/AtlasDashboard.tsx`** — composes selectors, map, summary, table, disclaimer, roadmap.
- **`src/pages/RegionProfile.tsx`** — full region detail using RegionProfileCard + CropSuitabilityTable + YieldEstimateCard (when crop chosen) + RecommendationCard list + DisclaimerBanner.

### 6. i18n

Add a new `atlas` namespace block to `src/i18n/fr.json` and `src/i18n/en.json` (UI default to French strings; English mirrors for completeness). Keys cover all labels, table headers, suitability levels, disclaimer, roadmap items.

### 7. Design

- Reuse existing shadcn primitives (Card, Table, Select, Badge, Button, Input, Alert).
- Palette: Tailwind `emerald`/`green` for primary actions, `amber` for disclaimers, `stone`/`neutral` for earth tones, white background, soft shadows, rounded-lg cards.
- Recharts bar chart on RegionProfile comparing expected yields across recommended crops.
- Mobile-first: stacked layout < md, 2-3 column grid ≥ md.

### 8. Out of scope (explicit)

- No real GIS / Leaflet / Mapbox integration.
- No legal cadastre / land ownership data or wording.
- No satellite or weather API calls — all data from Supabase mock seed.
- No admin UI for editing tables in this iteration.

---

### Files to create

```
supabase migration: atlas tables + seed
src/lib/atlas.ts
src/pages/AtlasDashboard.tsx
src/pages/RegionProfile.tsx
src/components/atlas/RegionSelector.tsx
src/components/atlas/RegionProfileCard.tsx
src/components/atlas/CropSuitabilityTable.tsx
src/components/atlas/YieldEstimateCard.tsx
src/components/atlas/MapPlaceholder.tsx
src/components/atlas/RecommendationCard.tsx
src/components/atlas/DisclaimerBanner.tsx
src/components/atlas/FutureRoadmap.tsx
```

### Files to edit

```
src/App.tsx           (2 new routes)
src/components/Navbar.tsx  (Atlas link)
src/pages/Dashboard.tsx    (entry card, optional)
src/i18n/fr.json + en.json (atlas keys)
```

Approve to implement.
