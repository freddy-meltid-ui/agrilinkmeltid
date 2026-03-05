import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const ResetPassword = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") === "recovery") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("auth.passwordsMismatch"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("auth.passwordUpdated"));
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <Sprout className="w-8 h-8 text-primary" />
            <span className="font-serif text-2xl">Agri Grid</span>
          </div>
          <p className="text-muted-foreground mb-4">{t("auth.invalidResetLink")}</p>
          <Button onClick={() => navigate("/auth")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("auth.backToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/auth")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> {t("auth.backToLogin")}
        </button>

        <div className="flex items-center gap-2 mb-8">
          <Sprout className="w-8 h-8 text-primary" />
          <span className="font-serif text-2xl">Agri Grid</span>
        </div>

        <div className="bg-card rounded-xl border border-border p-8">
          <h1 className="font-serif text-2xl mb-2">{t("auth.setNewPassword")}</h1>
          <p className="text-muted-foreground text-sm mb-6">{t("auth.setNewPasswordSubtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">{t("auth.newPassword")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.pleaseWait") : t("auth.updatePassword")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
