import { AlertTriangle } from "lucide-react";

const DisclaimerBanner = () => (
  <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
    <p>
      <strong>Avertissement :</strong> Les recommandations et rendements sont indicatifs.
      Ils doivent être validés par des données locales, des essais terrain ou un conseiller agronome.
      L'Atlas Agricole Intelligent n'est pas un cadastre officiel et ne fournit aucune information
      de propriété foncière.
    </p>
  </div>
);

export default DisclaimerBanner;
