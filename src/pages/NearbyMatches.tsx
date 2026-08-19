import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sprout, ArrowLeft, Warehouse, Truck, ShoppingCart, MapPin, User, Star, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

type NearbyUser = {
  user_id: string;
  full_name: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  roles: string[];
};

const NearbyMatches = () => {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useAuth();
  const [nearby, setNearby] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user || !profile) return;

    const fetchNearby = async () => {
      setLoading(true);

      // Find profiles in the same city OR same country
      let query = supabase.from("profiles").select("user_id, full_name, city, country, bio").neq("user_id", user.id);

      if (profile.city) {
        query = query.or(`city.ilike.%${profile.city}%,country.eq.${profile.country}`);
      } else if (profile.country) {
        query = query.eq("country", profile.country);
      }

      const { data: profiles } = await query.limit(50);
      if (!profiles || profiles.length === 0) {
        setNearby([]);
        setLoading(false);
        return;
      }

      // Fetch roles for these users
      const userIds = profiles.map((p) => p.user_id);
      const { data: rolesData } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);

      const rolesMap: Record<string, string[]> = {};
      rolesData?.forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      const enriched: NearbyUser[] = profiles.map((p) => ({
        ...p,
        roles: rolesMap[p.user_id] || [],
      }));

      setNearby(enriched);
      setLoading(false);
    };

    fetchNearby();
  }, [user, profile, authLoading]);

  const filterByRole = (role: string) => nearby.filter((u) => u.roles.includes(role));

  const storageOwners = filterByRole("warehouse_owner");
  const transporters = filterByRole("transporter");
  const processors = filterByRole("processor");
  const buyers = nearby.filter((u) => u.roles.includes("wholesaler") || u.roles.includes("semi_wholesaler"));

  const roleLabels: Record<string, string> = {
    farmer: t("auth.farmer"),
    worker: t("auth.worker"),
    equipment_renter: t("auth.equipmentRenter"),
    warehouse_owner: t("auth.warehouseOwner"),
    transporter: t("auth.transporter"),
    processor: t("auth.processor"),
    wholesaler: t("auth.wholesaler"),
    semi_wholesaler: t("auth.semiWholesaler"),
    buyer: t("auth.buyer"),
  };

  const UserCard = ({ u }: { u: NearbyUser }) => (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{u.full_name || t("marketplace.anonymous")}</h3>
          {(u.city || u.country) && (
            <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {[u.city, u.country].filter(Boolean).join(", ")}
            </p>
          )}
          {u.bio && <p className="text-muted-foreground text-sm line-clamp-2 mt-2">{u.bio}</p>}
          <div className="flex flex-wrap gap-1 mt-2">
            {u.roles.map((r) => (
              <Badge key={r} variant="secondary" className="text-xs">{roleLabels[r] || r}</Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Link to={`/reputation?user=${u.user_id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full"><Star className="w-3 h-3 mr-1" /> {t("reputation.viewReputation")}</Button>
        </Link>
        <Link to={`/messages?to=${u.user_id}`} className="flex-1">
          <Button size="sm" className="w-full">{t("marketplace.contact")}</Button>
        </Link>
      </div>
    </div>
  );

  const EmptyState = ({ icon: Icon, label }: { icon: any; label: string }) => (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">{t("nearby.noResults", { type: label })}</p>
    </div>
  );

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("reputation.loading")}</div>;

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("nearby.signInRequired")}</p>
          <Link to="/auth"><Button>{t("marketplace.signIn")}</Button></Link>
        </div>
      </div>
    );
  }

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

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> {t("profile.backToDashboard")}
        </Link>

        <div className="mb-6">
          <h1 className="font-serif text-3xl mb-2">{t("nearby.title")}</h1>
          <p className="text-muted-foreground">
            {t("nearby.subtitle", { location: [profile.city, profile.country].filter(Boolean).join(", ") || "—" })}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("reputation.loading")}</div>
        ) : (
          <Tabs defaultValue="storage" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="storage" className="gap-2">
                <Warehouse className="w-4 h-4" /> {t("nearby.storage")} ({storageOwners.length})
              </TabsTrigger>
              <TabsTrigger value="transporters" className="gap-2">
                <Truck className="w-4 h-4" /> {t("nearby.transporters")} ({transporters.length})
              </TabsTrigger>
              <TabsTrigger value="processors" className="gap-2">
                <Factory className="w-4 h-4" /> {t("nearby.processors")} ({processors.length})
              </TabsTrigger>
              <TabsTrigger value="buyers" className="gap-2">
                <ShoppingCart className="w-4 h-4" /> {t("nearby.buyers")} ({buyers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="storage">
              {storageOwners.length === 0 ? (
                <EmptyState icon={Warehouse} label={t("nearby.storage").toLowerCase()} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storageOwners.map((u) => <UserCard key={u.user_id} u={u} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="transporters">
              {transporters.length === 0 ? (
                <EmptyState icon={Truck} label={t("nearby.transporters").toLowerCase()} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {transporters.map((u) => <UserCard key={u.user_id} u={u} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="processors">
              {processors.length === 0 ? (
                <EmptyState icon={Factory} label={t("nearby.processors").toLowerCase()} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processors.map((u) => <UserCard key={u.user_id} u={u} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="buyers">
              {buyers.length === 0 ? (
                <EmptyState icon={ShoppingCart} label={t("nearby.buyers").toLowerCase()} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {buyers.map((u) => <UserCard key={u.user_id} u={u} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default NearbyMatches;
