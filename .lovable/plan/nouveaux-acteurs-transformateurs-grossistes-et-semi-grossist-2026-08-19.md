# Nouveaux acteurs : transformateurs, grossistes et semi-grossistes

## Objectif

Élargir les acteurs de la chaîne de valeur : ajouter le rôle **Transformateur**, et remplacer le rôle générique **Acheteur** par deux rôles distincts, **Grossiste** et **Semi-grossiste**. Les transformateurs obtiennent aussi une nouvelle catégorie d'annonces « Transformation » dans les Ressources.

## Ce qui change pour l'utilisateur

- À l'inscription et dans le profil, la liste des rôles devient : Agriculteur, Ouvrier agricole, Loueur d'équipement, Propriétaire d'entrepôt, Transporteur, **Transformateur**, **Grossiste**, **Semi-grossiste**.
- Les comptes existants marqués « Acheteur » deviennent automatiquement « Grossiste ».
- La page « À proximité » propose des onglets Stockage, Transport, **Transformation**, Acheteurs (grossistes + semi-grossistes regroupés, avec badge distinguant les deux).
- Les Ressources (marketplace) gagnent une catégorie **Transformation** : unités et services de transformation, filtrable comme les autres types.
- Les recommandations de l'Atlas ajoutent une action « Trouver un transformateur » à côté de « Trouver un acheteur ».
- La section acteurs de la page d'accueil affiche une carte Transformateurs et distingue grossistes / semi-grossistes.
- Tous les libellés sont ajoutés en français et en anglais.

## Détails techniques

Migration base de données (une seule migration) :
- Ajouter aux types énumérés : `app_role` → `processor`, `wholesaler`, `semi_wholesaler` ; `listing_type` → `processing`.
- Migrer les données : `UPDATE public.user_roles SET role = 'wholesaler' WHERE role = 'buyer'` (les valeurs d'énumération Postgres ne pouvant pas être supprimées, `buyer` reste dans le type mais n'est plus utilisée ni proposée dans l'interface).
- Aucune nouvelle table, donc aucune modification de RLS ou de GRANT.

Code (après régénération des types) :
- `src/pages/Auth.tsx`, `src/pages/Profile.tsx` : liste `ROLES` mise à jour (retrait de `buyer`, ajout des trois nouveaux).
- `src/pages/Dashboard.tsx`, `src/pages/NearbyMatches.tsx`, `src/pages/ListingSuggestions.tsx`, `src/components/UserReputation.tsx` : libellés de rôles et regroupements (`wholesaler`/`semi_wholesaler` traités comme acheteurs, nouvel onglet/filtre transformateurs).
- `src/pages/NewListing.tsx`, `src/pages/Marketplace.tsx`, `src/pages/ListingDetail.tsx` : type d'annonce `processing` ajouté aux sélecteurs et filtres.
- `src/components/atlas/CropRecommendationCard.tsx` : action suivante « Transformation » pointant vers `/marketplace?type=processing&crop=...`.
- `src/components/StakeholderSection.tsx` : carte Transformateurs + libellés acheteurs affinés.
- `supabase/functions/whatsapp-webhook/index.ts` : menu ressources enrichi de l'option transformation.
- `src/i18n/en.json` / `src/i18n/fr.json` : nouvelles clés `auth.processor`, `auth.wholesaler`, `auth.semiWholesaler`, `marketplace.processing`, libellés de section.
