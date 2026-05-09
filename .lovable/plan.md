## Atlas-First Repositioning Plan

Reframe AgriGrid around the Atlas as the entry point, while preserving all marketplace functionality and existing routes.

### 1. Navigation (`src/components/Navbar.tsx`)
Replace the current 5 links with the new primary nav (desktop + mobile):
- **Atlas** → `/atlas`
- **Recommendations** → `/atlas` (anchors recommendation panel) — or `/listing-suggestions` if user prefers; default to `/atlas#recommendations`
- **Resources** → `/marketplace` (renamed label only)
- **Market Demand** → `/crop-prices`
- **Profile** → `/profile` (or `/dashboard` when logged in)

Keep "How it works" / "About" out of the primary nav to stay focused. Footer keeps full links.

### 2. Homepage (`src/pages/Index.tsx`, `HeroSection.tsx`, `CTASection.tsx`)
- Update hero copy and badge to: **"AgriGrid Atlas — Agricultural intelligence and resource coordination for Africa."**
- Primary CTA button: **"Open the Atlas"** → `/atlas` (replaces current `/auth` primary).
- Secondary CTA: **"Browse Resources"** → `/marketplace`.
- Update `CTASection` to mirror Atlas-first language with the same primary `/atlas` CTA.
- Update i18n keys in `src/i18n/en.json` and `src/i18n/fr.json` (hero, cta, nav, footer marketplace → "Resources" label).

### 3. Atlas page (`src/pages/AgriculturalAtlasPage.tsx`)
- Update header title/subtitle to "AgriGrid Atlas — Agricultural intelligence and resource coordination for Africa."
- Add a "Recommendations" anchor section so the nav link scrolls into the panel.
- Keep map + filters + region details unchanged.

### 4. Crop recommendation cards — Next Actions
In `src/components/atlas/CropRecommendationCard.tsx`, append a "Prochaines actions" row with 5 compact buttons that link to `/marketplace` with the appropriate query param and crop context:

| Button | Route |
|---|---|
| Find equipment | `/marketplace?type=equipment&crop=<name>` |
| Find workers | `/marketplace?type=job&crop=<name>` |
| Find storage | `/marketplace?type=warehouse&crop=<name>` |
| Find transport | `/marketplace?type=transport&crop=<name>` |
| Find buyers | `/marketplace?type=produce&crop=<name>` |

Use small icon buttons (Wrench, Users, Warehouse, Truck, ShoppingCart) wrapped as `Link`s. No backend or business logic changes.

### 5. Marketplace reframing (`src/pages/Marketplace.tsx`)
- Rename page heading and breadcrumbs to **"Resources"** / **"Resource Coordination"** (i18n).
- Read `?type=` and `?crop=` from URL on mount and pre-populate `typeFilter` + `search` so next-action links land on a pre-filtered view.
- Keep route `/marketplace` and all data fetching, RLS, and listing logic **unchanged**.

### 6. i18n updates
Add/update keys in both `en.json` and `fr.json`:
- `nav.atlas`, `nav.recommendations`, `nav.resources`, `nav.marketDemand`, `nav.profile`
- `hero.*` rewritten Atlas-first
- `cta.*` rewritten with "Open the Atlas"
- `marketplace.pageTitle` → "Resources" / "Ressources"
- `crop.nextActions.*` (equipment, workers, storage, transport, buyers)

### Acceptance check
- `/atlas` is the homepage primary CTA. ✓
- Marketplace still works at `/marketplace` and all listing/detail/new routes intact. ✓
- "Resources" label visible across nav, footer, marketplace heading. ✓
- Crop recommendation cards show 5 next-action buttons routing to `/marketplace?type=...`. ✓
- No routes removed; `/atlas/explorer`, `/atlas/region/:id`, `/marketplace/new`, `/marketplace/:id` untouched. ✓

### Out of scope
- No backend/Supabase changes.
- No marketplace business logic, RLS, or schema changes.
- Dashboard/messages/reputation flows unchanged.