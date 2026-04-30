import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Satellite, Map, CloudRain, Bell, Building2, TrendingUp } from "lucide-react";

const items = [
  { icon: Satellite, label: "Intégration de données satellite (NDVI, humidité)" },
  { icon: Map, label: "Vraies couches géospatiales (GeoJSON, vecteurs)" },
  { icon: CloudRain, label: "Données météo historiques et prévisionnelles" },
  { icon: Bell, label: "Alertes climatiques et phénologiques" },
  { icon: Building2, label: "Cadastre agricole officiel (si données disponibles)" },
  { icon: TrendingUp, label: "Scoring d'investissement agricole" },
];

const FutureRoadmap = () => (
  <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-stone-50">
    <CardHeader>
      <CardTitle className="text-lg text-emerald-900">Évolutions futures</CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.label} className="flex items-start gap-3 text-sm text-stone-700">
            <it.icon className="h-4 w-4 mt-0.5 text-emerald-700 flex-shrink-0" />
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export default FutureRoadmap;
