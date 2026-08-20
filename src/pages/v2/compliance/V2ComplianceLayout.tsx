// AGRI-GRID V2 — Phase 3A: compliance module shell (sub-navigation + disclaimer)
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/app/compliance", end: true, labelKey: "v2.compliance.tabs.overview" },
  { to: "/app/compliance/actions", end: false, labelKey: "v2.compliance.tabs.actions" },
  { to: "/app/compliance/documents", end: false, labelKey: "v2.compliance.tabs.documents" },
];

const V2ComplianceLayout = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{t("v2.compliance.disclaimer")}</p>
      </div>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
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

export default V2ComplianceLayout;
