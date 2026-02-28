import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sprout, ArrowLeft, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import UserReputation from "@/components/UserReputation";
import { useTranslation } from "react-i18next";

const Reputation = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const userId = params.get("user");
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const roleLabels: Record<string, string> = {
    farmer: t("auth.farmer"),
    worker: t("auth.worker"),
    equipment_renter: t("auth.equipmentRenter"),
    warehouse_owner: t("auth.warehouseOwner"),
    transporter: t("auth.transporter"),
    buyer: t("auth.buyer"),
  };

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
      setProfile(p);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      setRoles(r?.map((x: any) => x.role) || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (!userId) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("reputation.noUser")}</div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("reputation.loading")}</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-primary" />
            <span className="font-serif text-xl">Agri Grid</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Link to="/marketplace" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> {t("reputation.backToMarketplace")}
        </Link>

        {/* User header */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl">{profile?.full_name || t("marketplace.anonymous")}</h1>
              {profile?.city && profile?.country && (
                <p className="text-muted-foreground text-sm">{profile.city}, {profile.country}</p>
              )}
              <div className="flex gap-2 mt-2">
                {roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">{roleLabels[role] || role}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <UserReputation userId={userId} />
      </main>
    </div>
  );
};

export default Reputation;
