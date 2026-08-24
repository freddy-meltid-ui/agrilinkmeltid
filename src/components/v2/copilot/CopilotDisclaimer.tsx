// AGRI-GRID V2 — Phase 3C.1: mandatory advisory disclaimer.
// Shown on every Copilot surface. Agri-Grid never certifies and the Copilot
// never produces an official audit conclusion.
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CopilotDisclaimer = ({ className, compact = false }: { className?: string; compact?: boolean }) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground",
        className,
      )}
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{compact ? t("v2.copilot.disclaimerShort") : t("v2.copilot.disclaimer")}</p>
    </div>
  );
};

export default CopilotDisclaimer;
