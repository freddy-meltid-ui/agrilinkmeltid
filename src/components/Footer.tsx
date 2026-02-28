import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border py-12 px-4 bg-card">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="Agri Grid logo" className="h-9 w-auto" />
            </div>
            <p className="text-muted-foreground text-sm">{t("footer.description")}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">{t("footer.platform")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.forFarmers")}</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.forBuyers")}</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.forTransporters")}</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.marketplace")}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">{t("footer.company")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.aboutUs")}</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.careers")}</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.blog")}</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.contact")}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">{t("footer.support")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.helpCenter")}</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.terms")}</li>
              <li className="hover:text-foreground cursor-pointer transition-colors">{t("footer.privacy")}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-10 pt-6 text-center text-sm text-muted-foreground">
          © 2026 Agri Grid. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;