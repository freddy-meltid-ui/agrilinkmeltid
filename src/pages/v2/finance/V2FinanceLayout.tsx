// AGRI-GRID V2 — Phase 3B: finance module shell (sub-navigation + disclaimer)
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/app/finance", end: true, labelKey: "v2.finance.tabs.overview" },
  { to: "/app/finance/request", end: false, labelKey: "v2.finance.tabs.request" },
  { to: "/app/finance/documents", end: false, labelKey: "v2.finance.tabs.documents" },
  { to: "/app/finance/dossier", end: false, labelKey: "v2.finance.tabs.dossier" },
  { to: "/app/finance/sharing", end: false, labelKey: "v2.finance.tabs.sharing" },
];

const V2FinanceLayout = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground print:hidden">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{t("v2.finance.disclaimer")}</p>
      </div>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border print:hidden">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
};

export default V2FinanceLayout;
