import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <Select value={i18n.language.startsWith("fr") ? "fr" : "en"} onValueChange={(v) => i18n.changeLanguage(v)}>
      <SelectTrigger className="w-auto gap-1 border-none bg-transparent h-8 px-2 text-sm">
        <Globe className="w-4 h-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">EN</SelectItem>
        <SelectItem value="fr">FR</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
