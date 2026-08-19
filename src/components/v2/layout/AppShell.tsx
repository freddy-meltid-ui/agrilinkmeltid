// AGRI-GRID V2 — application shell (sidebar on desktop, bottom nav on mobile)
import { ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut, Menu, RotateCcw, User as UserIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { setV2Enabled, V1_HOME } from "@/lib/v2/featureFlags";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import OrgSwitcher from "./OrgSwitcher";
import { V2_MOBILE_NAV, V2_NAV_ITEMS } from "./navItems";

const AppShell = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const backToV1 = () => {
    setV2Enabled(false);
    navigate(V1_HOME);
  };

  const navList = (onNavigate?: () => void) => (
    <nav className="space-y-1">
      {V2_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t("v2.shell.openMenu")}>
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <img src={logo} alt="Agri Grid" className="h-8 w-auto" />
          </Link>
          <div className="hidden sm:block">
            <OrgSwitcher />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={backToV1} title={t("v2.shell.backToV1")}>
              <RotateCcw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("v2.shell.backToV1")}</span>
            </Button>
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("v2.shell.signOut")}</span>
              </Button>
            ) : (
              <Link to="/auth">
                <Button size="sm">
                  <UserIcon className="mr-2 h-4 w-4" />
                  {t("v2.shell.signIn")}
                </Button>
              </Link>
            )}
          </div>
        </div>
        <div className="border-t border-border px-4 py-2 sm:hidden">
          <OrgSwitcher />
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-border p-3 lg:block">
          <div className="sticky top-20">{navList()}</div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 border-r border-border bg-background p-4">
              <div className="mb-4 flex items-center justify-between">
                <img src={logo} alt="Agri Grid" className="h-8 w-auto" />
                <button onClick={() => setMobileOpen(false)} aria-label={t("v2.shell.closeMenu")}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {navList(() => setMobileOpen(false))}
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-border bg-background lg:hidden">
        {V2_NAV_ITEMS.filter((i) => V2_MOBILE_NAV.includes(i.to)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2 text-[11px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="truncate px-1">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppShell;
