export type Suitability = "élevée" | "moyenne" | "faible";
export type Level = "faible" | "moyenne" | "élevée";
export type IrrigationLevel = "faible" | "moyen" | "élevé";

export type RecommendedCrop = {
  crop_name: string;
  suitability: Suitability;
  expected_yield_range: string;
  key_constraints: string;
  recommendation: string;
};

export type BeninRegion = {
  id: string;
  name: string;
  country: "Bénin";
  coordinates: [number, number]; // [lat, lng]
  agroecological_zone: string;
  rainfall_mm: string;
  rainfall_avg: number; // mm/an, used for filtering
  dominant_soil: string;
  fertility_level: Level;
  irrigation_potential: IrrigationLevel;
  potential_level: Level;
  recommended_crops: RecommendedCrop[];
};

export const BENIN_CENTER: [number, number] = [9.3, 2.3];

export const beninRegions: BeninRegion[] = [
  {
    id: "alibori",
    name: "Alibori",
    country: "Bénin",
    coordinates: [11.3, 2.9],
    agroecological_zone: "Zone cotonnière du Nord",
    rainfall_mm: "700–1000 mm/an",
    rainfall_avg: 850,
    dominant_soil: "Sols ferrugineux tropicaux",
    fertility_level: "moyenne",
    irrigation_potential: "moyen",
    potential_level: "élevée",
    recommended_crops: [
      {
        crop_name: "Coton",
        suitability: "élevée",
        expected_yield_range: "1.2–1.8 t/ha",
        key_constraints: "Pression parasitaire, prix fluctuants",
        recommendation: "Rotation avec légumineuses pour préserver la fertilité.",
      },
      {
        crop_name: "Maïs",
        suitability: "élevée",
        expected_yield_range: "1.5–3.0 t/ha",
        key_constraints: "Sécheresse en début de cycle",
        recommendation: "Variétés à cycle court (90 jours) recommandées.",
      },
      {
        crop_name: "Sorgho",
        suitability: "élevée",
        expected_yield_range: "0.8–1.5 t/ha",
        key_constraints: "Oiseaux granivores",
        recommendation: "Bien adapté aux zones à pluviométrie limitée.",
      },
      {
        crop_name: "Niébé",
        suitability: "moyenne",
        expected_yield_range: "0.5–1.0 t/ha",
        key_constraints: "Insectes de stockage",
        recommendation: "Excellente culture de rotation enrichissant le sol.",
      },
    ],
  },
  {
    id: "borgou",
    name: "Borgou",
    country: "Bénin",
    coordinates: [9.8, 2.6],
    agroecological_zone: "Zone vivrière du Sud-Borgou",
    rainfall_mm: "900–1200 mm/an",
    rainfall_avg: 1050,
    dominant_soil: "Sols ferrugineux tropicaux lessivés",
    fertility_level: "moyenne",
    irrigation_potential: "moyen",
    potential_level: "élevée",
    recommended_crops: [
      {
        crop_name: "Maïs",
        suitability: "élevée",
        expected_yield_range: "1.8–3.5 t/ha",
        key_constraints: "Variabilité pluviométrique",
        recommendation: "Associer fumure organique + minérale.",
      },
      {
        crop_name: "Igname",
        suitability: "élevée",
        expected_yield_range: "8–15 t/ha",
        key_constraints: "Demande forte en main d'œuvre",
        recommendation: "Plantation en buttes sur sols profonds.",
      },
      {
        crop_name: "Soja",
        suitability: "moyenne",
        expected_yield_range: "0.8–1.5 t/ha",
        key_constraints: "Marché de transformation limité",
        recommendation: "Excellente culture de rotation.",
      },
      {
        crop_name: "Anacarde",
        suitability: "moyenne",
        expected_yield_range: "0.4–0.8 t/ha",
        key_constraints: "Cycle de production long",
        recommendation: "Bon potentiel d'export.",
      },
    ],
  },
  {
    id: "atacora",
    name: "Atacora",
    country: "Bénin",
    coordinates: [10.3, 1.4],
    agroecological_zone: "Zone montagneuse de l'Atacora",
    rainfall_mm: "1000–1300 mm/an",
    rainfall_avg: 1150,
    dominant_soil: "Sols squelettiques et lithosols",
    fertility_level: "faible",
    irrigation_potential: "faible",
    potential_level: "moyenne",
    recommended_crops: [
      {
        crop_name: "Sorgho",
        suitability: "élevée",
        expected_yield_range: "0.7–1.4 t/ha",
        key_constraints: "Sols superficiels",
        recommendation: "Cultures en terrasses pour limiter l'érosion.",
      },
      {
        crop_name: "Mil",
        suitability: "élevée",
        expected_yield_range: "0.5–1.2 t/ha",
        key_constraints: "Faible fertilité",
        recommendation: "Très tolérant aux conditions difficiles.",
      },
      {
        crop_name: "Fonio",
        suitability: "moyenne",
        expected_yield_range: "0.4–0.9 t/ha",
        key_constraints: "Mécanisation difficile",
        recommendation: "Culture de niche à forte valeur.",
      },
    ],
  },
  {
    id: "donga",
    name: "Donga",
    country: "Bénin",
    coordinates: [9.7, 1.7],
    agroecological_zone: "Zone Ouest des terres de barre",
    rainfall_mm: "1100–1300 mm/an",
    rainfall_avg: 1200,
    dominant_soil: "Sols ferrugineux tropicaux",
    fertility_level: "moyenne",
    irrigation_potential: "moyen",
    potential_level: "élevée",
    recommended_crops: [
      {
        crop_name: "Igname",
        suitability: "élevée",
        expected_yield_range: "9–16 t/ha",
        key_constraints: "Main d'œuvre intensive",
        recommendation: "Filière bien structurée régionalement.",
      },
      {
        crop_name: "Manioc",
        suitability: "élevée",
        expected_yield_range: "10–20 t/ha",
        key_constraints: "Maladie de la mosaïque",
        recommendation: "Utiliser des boutures certifiées.",
      },
      {
        crop_name: "Riz pluvial",
        suitability: "moyenne",
        expected_yield_range: "1.5–3.0 t/ha",
        key_constraints: "Variabilité pluviométrique",
        recommendation: "Variétés tolérantes à la sécheresse.",
      },
    ],
  },
  {
    id: "collines",
    name: "Collines",
    country: "Bénin",
    coordinates: [8.0, 2.3],
    agroecological_zone: "Zone des terres de barre du Centre",
    rainfall_mm: "1100–1300 mm/an",
    rainfall_avg: 1200,
    dominant_soil: "Sols ferrallitiques",
    fertility_level: "moyenne",
    irrigation_potential: "moyen",
    potential_level: "élevée",
    recommended_crops: [
      {
        crop_name: "Maïs",
        suitability: "élevée",
        expected_yield_range: "2.0–3.5 t/ha",
        key_constraints: "Pression parasitaire (chenilles)",
        recommendation: "Deux cycles possibles avec gestion intégrée.",
      },
      {
        crop_name: "Manioc",
        suitability: "élevée",
        expected_yield_range: "12–22 t/ha",
        key_constraints: "Logistique de transformation",
        recommendation: "Forte demande pour gari et tapioca.",
      },
      {
        crop_name: "Anacarde",
        suitability: "élevée",
        expected_yield_range: "0.5–1.0 t/ha",
        key_constraints: "Variation des prix internationaux",
        recommendation: "Pôle de production en pleine expansion.",
      },
      {
        crop_name: "Soja",
        suitability: "moyenne",
        expected_yield_range: "1.0–1.7 t/ha",
        key_constraints: "Accès limité aux semences certifiées",
        recommendation: "Marché en croissance.",
      },
    ],
  },
  {
    id: "zou",
    name: "Zou",
    country: "Bénin",
    coordinates: [7.2, 2.1],
    agroecological_zone: "Zone des terres de barre",
    rainfall_mm: "1100–1300 mm/an",
    rainfall_avg: 1200,
    dominant_soil: "Terres de barre (sols ferrallitiques rouges)",
    fertility_level: "moyenne",
    irrigation_potential: "moyen",
    potential_level: "élevée",
    recommended_crops: [
      {
        crop_name: "Maïs",
        suitability: "élevée",
        expected_yield_range: "1.8–3.0 t/ha",
        key_constraints: "Dégradation des sols",
        recommendation: "Apport régulier de matière organique.",
      },
      {
        crop_name: "Manioc",
        suitability: "élevée",
        expected_yield_range: "10–18 t/ha",
        key_constraints: "Concurrence foncière",
        recommendation: "Variétés à haute teneur en amidon.",
      },
      {
        crop_name: "Tomate",
        suitability: "moyenne",
        expected_yield_range: "10–25 t/ha",
        key_constraints: "Maladies fongiques",
        recommendation: "Privilégier la saison sèche avec irrigation.",
      },
    ],
  },
  {
    id: "atlantique",
    name: "Atlantique",
    country: "Bénin",
    coordinates: [6.55, 2.1],
    agroecological_zone: "Zone côtière des pêcheries",
    rainfall_mm: "1100–1400 mm/an",
    rainfall_avg: 1250,
    dominant_soil: "Sols hydromorphes et sablonneux",
    fertility_level: "moyenne",
    irrigation_potential: "élevé",
    potential_level: "élevée",
    recommended_crops: [
      {
        crop_name: "Ananas",
        suitability: "élevée",
        expected_yield_range: "40–60 t/ha",
        key_constraints: "Logistique d'export",
        recommendation: "Variété pain de sucre très demandée à l'export.",
      },
      {
        crop_name: "Maraîchage (tomate, piment)",
        suitability: "élevée",
        expected_yield_range: "15–30 t/ha",
        key_constraints: "Pression urbaine",
        recommendation: "Accès direct au marché de Cotonou.",
      },
      {
        crop_name: "Palmier à huile",
        suitability: "moyenne",
        expected_yield_range: "8–14 t/ha (régimes)",
        key_constraints: "Plantations vieillissantes",
        recommendation: "Renouvellement variétal recommandé.",
      },
    ],
  },
  {
    id: "oueme",
    name: "Ouémé",
    country: "Bénin",
    coordinates: [6.65, 2.55],
    agroecological_zone: "Zone des vallées et bas-fonds",
    rainfall_mm: "1100–1400 mm/an",
    rainfall_avg: 1250,
    dominant_soil: "Sols alluvionnaires fertiles",
    fertility_level: "élevée",
    irrigation_potential: "élevé",
    potential_level: "élevée",
    recommended_crops: [
      {
        crop_name: "Riz irrigué",
        suitability: "élevée",
        expected_yield_range: "3.5–6.0 t/ha",
        key_constraints: "Maintenance des aménagements",
        recommendation: "Bas-fonds aménageables, deux cycles annuels.",
      },
      {
        crop_name: "Maraîchage",
        suitability: "élevée",
        expected_yield_range: "15–35 t/ha",
        key_constraints: "Pression parasitaire",
        recommendation: "Forte demande urbaine de Porto-Novo / Cotonou.",
      },
      {
        crop_name: "Manioc",
        suitability: "élevée",
        expected_yield_range: "15–25 t/ha",
        key_constraints: "Maladies virales",
        recommendation: "Filière gari très active.",
      },
    ],
  },
  {
    id: "mono",
    name: "Mono",
    country: "Bénin",
    coordinates: [6.6, 1.75],
    agroecological_zone: "Zone côtière Sud-Ouest",
    rainfall_mm: "900–1200 mm/an",
    rainfall_avg: 1050,
    dominant_soil: "Sols sablonneux et hydromorphes",
    fertility_level: "moyenne",
    irrigation_potential: "élevé",
    potential_level: "moyenne",
    recommended_crops: [
      {
        crop_name: "Maïs",
        suitability: "moyenne",
        expected_yield_range: "1.2–2.5 t/ha",
        key_constraints: "Petite saison plus courte",
        recommendation: "Variétés à cycle court conseillées.",
      },
      {
        crop_name: "Palmier à huile",
        suitability: "élevée",
        expected_yield_range: "8–13 t/ha (régimes)",
        key_constraints: "Vieillissement des plantations",
        recommendation: "Renouvellement avec semences sélectionnées.",
      },
      {
        crop_name: "Maraîchage",
        suitability: "moyenne",
        expected_yield_range: "10–20 t/ha",
        key_constraints: "Sols sableux à amender",
        recommendation: "Apports organiques importants nécessaires.",
      },
    ],
  },
  {
    id: "couffo",
    name: "Couffo",
    country: "Bénin",
    coordinates: [6.95, 1.75],
    agroecological_zone: "Zone des terres de barre dégradées",
    rainfall_mm: "900–1100 mm/an",
    rainfall_avg: 1000,
    dominant_soil: "Terres de barre dégradées",
    fertility_level: "faible",
    irrigation_potential: "moyen",
    potential_level: "moyenne",
    recommended_crops: [
      {
        crop_name: "Maïs",
        suitability: "moyenne",
        expected_yield_range: "1.0–2.0 t/ha",
        key_constraints: "Sols dégradés",
        recommendation: "Restauration de la fertilité prioritaire.",
      },
      {
        crop_name: "Manioc",
        suitability: "élevée",
        expected_yield_range: "8–15 t/ha",
        key_constraints: "Marché local saturé",
        recommendation: "Bien adapté aux sols pauvres.",
      },
      {
        crop_name: "Niébé",
        suitability: "élevée",
        expected_yield_range: "0.5–1.0 t/ha",
        key_constraints: "Insectes de stockage",
        recommendation: "Régénère les sols par fixation d'azote.",
      },
    ],
  },
  {
    id: "plateau",
    name: "Plateau",
    country: "Bénin",
    coordinates: [7.25, 2.65],
    agroecological_zone: "Zone des terres de barre du Sud-Est",
    rainfall_mm: "1100–1300 mm/an",
    rainfall_avg: 1200,
    dominant_soil: "Terres de barre",
    fertility_level: "moyenne",
    irrigation_potential: "moyen",
    potential_level: "élevée",
    recommended_crops: [
      {
        crop_name: "Manioc",
        suitability: "élevée",
        expected_yield_range: "12–22 t/ha",
        key_constraints: "Logistique de transformation",
        recommendation: "Pôle de production majeur de gari.",
      },
      {
        crop_name: "Maïs",
        suitability: "élevée",
        expected_yield_range: "1.8–3.0 t/ha",
        key_constraints: "Variabilité pluviométrique",
        recommendation: "Deux cycles annuels possibles.",
      },
      {
        crop_name: "Anacarde",
        suitability: "moyenne",
        expected_yield_range: "0.4–0.8 t/ha",
        key_constraints: "Long cycle d'entrée en production",
        recommendation: "Bon potentiel d'export.",
      },
    ],
  },
  {
    id: "littoral",
    name: "Littoral",
    country: "Bénin",
    coordinates: [6.37, 2.42],
    agroecological_zone: "Zone urbaine côtière",
    rainfall_mm: "1200–1400 mm/an",
    rainfall_avg: 1300,
    dominant_soil: "Sols sablonneux côtiers",
    fertility_level: "faible",
    irrigation_potential: "élevé",
    potential_level: "faible",
    recommended_crops: [
      {
        crop_name: "Maraîchage péri-urbain",
        suitability: "moyenne",
        expected_yield_range: "10–25 t/ha",
        key_constraints: "Pression foncière forte (Cotonou)",
        recommendation: "Privilégier cultures hors-sol et serres.",
      },
      {
        crop_name: "Aquaculture",
        suitability: "moyenne",
        expected_yield_range: "n/d",
        key_constraints: "Qualité de l'eau",
        recommendation: "Activité complémentaire à fort potentiel.",
      },
    ],
  },
];

export const allCropNames = (): string[] => {
  const set = new Set<string>();
  beninRegions.forEach((r) => r.recommended_crops.forEach((c) => set.add(c.crop_name)));
  return Array.from(set).sort();
};
