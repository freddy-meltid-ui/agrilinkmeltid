// AGRI-GRID V2 — reusable page header
import { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

const PageHeader = ({ title, description, actions }: Props) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-5 mb-6">
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-foreground">{title}</h1>
      {description && <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
