import { BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const VerifiedBadge = ({ className = "" }: { className?: string }) => {
  const { t } = useTranslation();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <BadgeCheck className={`w-4 h-4 text-primary shrink-0 ${className}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{t("verified.badge")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerifiedBadge;
