// AGRI-GRID V2 — KPI card
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
};

const KpiCard = ({ label, value, hint, icon: Icon, className }: Props) => (
  <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
    </div>
    <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export default KpiCard;
