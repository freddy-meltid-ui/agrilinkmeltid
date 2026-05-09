import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto max-w-6xl flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Agri Grid logo" className="h-9 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/atlas" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.atlas")}</Link>
          <Link to="/atlas#recommendations" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.recommendations")}</Link>
          <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.resources")}</Link>
          <Link to="/crop-prices" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.marketDemand")}</Link>
          <Link to={user ? "/profile" : "/auth"} className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.profile")}</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <Link to="/dashboard"><Button size="sm">{t("nav.dashboard")}</Button></Link>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm">{t("nav.login")}</Button></Link>
              <Link to="/auth"><Button size="sm">{t("nav.getStarted")}</Button></Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-b border-border px-4 py-4 space-y-3">
          <Link to="/atlas" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t("nav.atlas")}</Link>
          <Link to="/atlas#recommendations" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t("nav.recommendations")}</Link>
          <Link to="/marketplace" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t("nav.resources")}</Link>
          <Link to="/crop-prices" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t("nav.marketDemand")}</Link>
          <Link to={user ? "/profile" : "/auth"} className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t("nav.profile")}</Link>
          <div className="flex gap-3 pt-2 items-center">
            <LanguageSwitcher />
            {user ? (
              <Link to="/dashboard"><Button size="sm">{t("nav.dashboard")}</Button></Link>
            ) : (
              <>
                <Link to="/auth"><Button variant="ghost" size="sm">{t("nav.login")}</Button></Link>
                <Link to="/auth"><Button size="sm">{t("nav.getStarted")}</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
