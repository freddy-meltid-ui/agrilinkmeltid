import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ForgotPasswordLink = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(t("auth.resetEmailSent"));
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-sm text-primary hover:underline w-full text-center mt-2"
        >
          {t("auth.forgotPassword")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">{t("auth.resetPassword")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {t("auth.resetPasswordSubtitle")}
        </p>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label htmlFor="resetEmail">{t("auth.email")}</Label>
            <Input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.pleaseWait") : t("auth.sendResetLink")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordLink;
