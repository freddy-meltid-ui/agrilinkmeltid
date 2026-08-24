// AGRI-GRID V2 — Phase 3C.1: transparency + consent before the first analysis.
// The backend refuses any analysis (CONSENT_REQUIRED) until this is recorded,
// so AI use is never hidden from the processor.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { acceptConsent } from "@/lib/v2/copilot";

const ConsentGate = ({
  open,
  onOpenChange,
  organizationId,
  consentVersion,
  onAccepted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  consentVersion: string;
  onAccepted: () => void;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const accept = async () => {
    setSaving(true);
    try {
      await acceptConsent(organizationId, consentVersion);
      toast({ title: t("v2.copilot.consentRecorded") });
      onOpenChange(false);
      onAccepted();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldQuestion className="h-5 w-5 text-primary" />
            {t("v2.copilot.consentTitle")}
          </DialogTitle>
          <DialogDescription>{t("v2.copilot.consentIntro")}</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>{t("v2.copilot.consentPoint1")}</li>
          <li>{t("v2.copilot.consentPoint2")}</li>
          <li>{t("v2.copilot.consentPoint3")}</li>
          <li>{t("v2.copilot.consentPoint4")}</li>
        </ul>
        <p className="text-xs text-muted-foreground">{t("v2.copilot.consentVersion", { version: consentVersion })}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("v2.common.cancel")}
          </Button>
          <Button onClick={accept} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("v2.copilot.consentAccept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  );
};

export default ConsentGate;
