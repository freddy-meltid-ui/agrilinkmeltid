// AGRI-GRID V2 — empty / coming-soon state
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
};

const EmptyState = ({ icon: Icon, title, description, action }: Props) => (
  <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
    {Icon && <Icon className="mx-auto mb-4 h-9 w-9 text-muted-foreground" />}
    <p className="font-medium text-foreground">{title}</p>
    {description && <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

export default EmptyState;
