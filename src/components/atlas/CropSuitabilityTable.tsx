import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { RecommendedCropEntry } from "@/lib/atlas";

const suitabilityStyles: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-stone-100 text-stone-700 border-stone-300",
};
const suitabilityLabel: Record<string, string> = { high: "Élevée", medium: "Moyenne", low: "Faible" };

const CropSuitabilityTable = ({ crops }: { crops: RecommendedCropEntry[] }) => {
  if (!crops.length) {
    return <p className="text-sm text-stone-500 py-8 text-center">Aucune recommandation pour cette sélection.</p>;
  }
  return (
    <div className="rounded-lg border border-stone-200 overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-stone-50 hover:bg-stone-50">
            <TableHead>Culture</TableHead>
            <TableHead>Aptitude</TableHead>
            <TableHead>Rendement attendu</TableHead>
            <TableHead className="hidden md:table-cell">Pluviométrie</TableHead>
            <TableHead className="hidden lg:table-cell">Sol préféré</TableHead>
            <TableHead className="hidden lg:table-cell">Facteurs de risque</TableHead>
            <TableHead>Recommandation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {crops.map((c) => (
            <TableRow key={c.crop_id}>
              <TableCell className="font-medium text-stone-900">{c.crop_name}</TableCell>
              <TableCell>
                <Badge variant="outline" className={suitabilityStyles[c.suitability]}>
                  {suitabilityLabel[c.suitability]}
                </Badge>
              </TableCell>
              <TableCell className="text-stone-700">{c.expected_yield_range}</TableCell>
              <TableCell className="hidden md:table-cell text-stone-700">{c.required_rainfall}</TableCell>
              <TableCell className="hidden lg:table-cell text-stone-600 text-xs">
                {c.preferred_soil.join(", ") || "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-stone-600 text-xs">
                {c.risk_factors.join(", ") || "—"}
              </TableCell>
              <TableCell className="text-stone-700 text-sm max-w-xs">{c.recommendation || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CropSuitabilityTable;
