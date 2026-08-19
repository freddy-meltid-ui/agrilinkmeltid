// AGRI-GRID V2 — status badge
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  success: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-accent/20 text-accent-foreground border-accent/30",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-secondary text-secondary-foreground border-transparent",
};

const StatusBadge = ({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
}) => (
  <Badge variant="outline" className={cn("font-medium", toneClasses[tone], className)}>
    {label}
  </Badge>
);

export default StatusBadge;
