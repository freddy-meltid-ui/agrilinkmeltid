# Agri-Grid V2 — Architecture Assessment & Parallel Foundation

Scope of this step: sections 0, 50, 51 and 58 only. Audit V1, guarantee it stays intact, set up the V2 shell and the migration/feature-flag strategy. No business modules are built yet.

## 1. Current application audit

**Public / marketing**
- `/` — Index (Navbar, Hero, Stakeholders, HowItWorks, Stats, CTA, Footer)

**Auth**
- `/auth`, `/reset-password` — Supabase email/password, `AuthProvider` in `src/hooks/useAuth.tsx` (loads profile + roles)

**Marketplace (V1 core)**
- `/dashboard`, `/marketplace`, `/marketplace/new`, `/marketplace/:id`, `/messages`, `/profile`, `/reputation`, `/nearby`, `/crop-prices`, `/harvest-suggestions`, `/listing-suggestions`

**Atlas (V1, reusable in V2)**
- `/atlas`, `/atlas/explorer`, `/atlas/region/:regionId`, `/atlas/offline`, `/atlas/sync`
- Leaflet map, cadastre WMS layer, region/crop intelligence, offline cache (`offlineAtlas.ts`), offline action queue (`offlineQueue.ts` + `useSyncQueue` + `SyncQueueProvider`), PDF export

**Backend**
- 22 tables. Marketplace: `profiles`, `listings`, `messages`, `reviews`, `transactions`, `user_roles`, `crop_prices`, `demand_signals`.
- Atlas reference: `countries`, `regions`, `soil_profiles`, `crop_profiles`, `crop_recommendations`, `rainfall_profiles`, `seasonality_profiles`, `yield_estimates`, `recommendation_scores`, `saved_recommendations`, `atlas_feedback`.
- Field/offline: `field_sessions`, `farmer_interests`. WhatsApp: `whatsapp_sessions`.
- Enums: `app_role` (farmer, worker, equipment_renter, warehouse_owner, transporter, buyer, processor, wholesaler, semi_wholesaler), `listing_type`, `listing_status`.
- Edge function: `whatsapp-webhook`. Storage bucket: `listing-images`.
- i18n FR/EN via `src/i18n`.

**Reusable in V2 (no change needed):** `useAuth`, supabase client, shadcn `ui/` primitives, Atlas map components, offline queue/cache libs, i18n setup, brand tokens in `index.css`, logo.

**Must remain untouched:** every existing route above, all existing tables/enums/policies, `AuthProvider` contract, `App.tsx` V1 route entries.

## 2. V1 preservation guarantee

- V1 routes stay exactly as they are; nothing is deleted or renamed.
- New V2 pages live under `src/pages/v2/` and `src/components/v2/`, mounted on a new `/app` route tree. A `/legacy` alias can redirect to the existing V1 dashboard if wanted later.
- No shared V1 file is modified except `App.tsx` (adding routes) and `src/i18n/*.json` (adding a new `v2` namespace key block).
- Every new file gets a header comment `// AGRI-GRID V2` ; V1 files stay unannotated.

## 3. Proposed V2 architecture (shell only in this step)

```text
src/
  pages/v2/            AppShell-hosted V2 pages (placeholders for now)
  components/v2/       layout/, ui-kit/ (KPI card, status badge, page header, empty state)
  lib/v2/              featureFlags.ts, orgContext helpers
  hooks/v2/            useOrganization.ts (active org + membership + role)
```

Routing (added to `App.tsx`, V1 untouched):

```text
/app                  -> V2 shell, redirects to /app/dashboard
/app/dashboard        -> placeholder "Coming soon" (Phase 1)
/app/supply           -> placeholder
/app/sourcing         -> placeholder
/app/suppliers        -> placeholder
/app/operations       -> placeholder
/app/atlas            -> reuses existing Atlas inside V2 shell
/app/compliance       -> placeholder
/app/finance          -> placeholder
/app/documents        -> placeholder
/app/settings         -> org + membership settings
/app/marketplace      -> link out to legacy marketplace (secondary)
```

Shell: responsive sidebar (desktop) / bottom nav (mobile), org switcher, user menu, French default. Placeholders are explicitly labelled "Bientôt disponible" — no fake buttons.

Auth/tenancy: `useAuth` stays as is; a V2-only `OrganizationProvider` wraps `/app` and resolves the user's organizations + role. Users with no organization are routed to `/app/onboarding` (built in the next phase).

## 4. Database strategy (additive only)

This step creates **only the tenancy foundation**, prefixed `v2_`:

- `v2_organizations` — name, legal_name, type (processor / cooperative / agrigrid), country, region, status, timestamps.
- `v2_organization_members` — organization_id, user_id, role, invited_by, timestamps, unique(org, user).
- `v2_org_role` enum — `processor_admin`, `processor_employee`, `field_agent`, `farmer`, `cooperative_manager`, `agrigrid_admin`, `compliance_advisor`, `financial_partner`.
- Security-definer helpers `v2_is_org_member(org, user)` and `v2_has_org_role(org, user, role)` to avoid recursive RLS.
- RLS: members read their own organizations; only `processor_admin` / `agrigrid_admin` can write. GRANTs to `authenticated` + `service_role` on both tables; no `anon` access.
- No existing table is altered, renamed or dropped. All later V2 entities (farmers, supply, sourcing, purchases, inventory, compliance, finance) will be new `v2_` tables carrying `organization_id`, `created_by`, `source`, `verification_status`, `created_at`, `updated_at`.

Migration rule for the whole V2 programme: additive migrations only. Any destructive change is proposed and approved first.

## 5. Feature flag

- `src/lib/v2/featureFlags.ts` exposes `AGRIGRID_V2_ENABLED`, resolved from (1) a `?v2=1` / localStorage override, (2) build-time default `true` in preview.
- When disabled, `/app/*` redirects to `/dashboard`; V1 is always reachable regardless of flag state.
- A discreet "Passer à la V2 / Revenir à la V1" switch in both shells for testing.

## 6. Deliverables of this step

1. V2 route tree + shell layout + navigation with honest placeholders.
2. Organization context provider and `useOrganization` hook.
3. `v2_organizations` / `v2_organization_members` migration with RLS and grants.
4. Feature flag + V1/V2 switch.
5. `v2` i18n namespace (FR primary, EN parallel).
6. Verification pass: all V1 routes load unchanged.

Business modules (onboarding, supply, sourcing, matching, purchases, inventory, ops, compliance, finance, admin, demo data) come in the following phases, in the order given in section 59.
