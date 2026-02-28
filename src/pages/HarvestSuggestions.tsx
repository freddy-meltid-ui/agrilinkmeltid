import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sprout, ArrowRight, Warehouse, Truck, ShoppingCart, MapPin, User, Star, MessageSquare, Sparkles, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type Suggestion = {
  user_id: string;
  full_name: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
};

type ListingSuggestion = {
  id: string;
  title: string;
  price: number | null;
  price_unit: string | null;
  location: string | null;
  user_id: string;
  seller_name: string | null;
};

const HarvestSuggestions = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get("listing");
  const listingTitle = searchParams.get("title") || "";

  const [warehouses, setWarehouses] = useState<ListingSuggestion[]>([]);
  const [transporters, setTransporters] = useState<Suggestion[]>([]);
  const [buyers, setBuyers] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;

    const fetchSuggestions = async () => {
      setLoading(true);

      // 1. Warehouse listings nearby
      const { data: warehouseListings } = await supabase
        .from("listings")
        .select("id, title, price, price_unit, location, user_id")
        .eq("type", "warehouse" as any)
        .eq("status", "active")
        .neq("user_id", user.id)
        .limit(6);

      if (warehouseListings && warehouseListings.length > 0) {
        const wUserIds = [...new Set(warehouseListings.map(w => w.user_id))];
        const { data: wProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", wUserIds);
        const nameMap: Record<string, string> = {};
        wProfiles?.forEach(p => { nameMap[p.user_id] = p.full_name || ""; });
        setWarehouses(warehouseListings.map(w => ({ ...w, seller_name: nameMap[w.user_id] || null })));
      }

      // 2. Nearby transporters (by profile role)
      let tQuery = supabase
        .from("profiles")
        .select("user_id, full_name, city, country, bio")
        .neq("user_id", user.id);

      if (profile.country) {
        tQuery = tQuery.eq("country", profile.country);
      }

      const { data: nearbyProfiles } = await tQuery.limit(50);

      if (nearbyProfiles && nearbyProfiles.length > 0) {
        const uids = nearbyProfiles.map(p => p.user_id);
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", uids);

        const roleMap: Record<string, string[]> = {};
        roles?.forEach(r => {
          if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
          roleMap[r.user_id].push(r.role);
        });

        const transporterProfiles = nearbyProfiles.filter(p => roleMap[p.user_id]?.includes("transporter"));
        const buyerProfiles = nearbyProfiles.filter(p => roleMap[p.user_id]?.includes("buyer"));

        setTransporters(transporterProfiles.slice(0, 6));
        setBuyers(buyerProfiles.slice(0, 6));
      }

      setLoading(false);
    };

    fetchSuggestions();
  }, [user, profile]);

  const SectionHeader = ({ icon: Icon, title, color }: { icon: any; title: string; color: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="font-serif text-xl">{title}</h2>
    </div>
  );

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
        {/* Success banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-8 flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h1 className="font-serif text-2xl mb-1">{t("harvestSuggestions.posted")}</h1>
            {listingTitle && (
              <p className="text-muted-foreground text-sm">"{listingTitle}"</p>
            )}
          </div>
        </div>

        {/* Smart suggestions intro */}
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-xl">{t("harvestSuggestions.title")}</h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("reputation.loading")}</div>
        ) : (
          <div className="space-y-10">
            {/* Storage Options */}
            <section>
              <SectionHeader icon={Warehouse} title={t("harvestSuggestions.storage")} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" />
              {warehouses.length === 0 ? (
                <p className="text-muted-foreground text-sm pl-13">{t("harvestSuggestions.noStorage")}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {warehouses.map((w) => (
                    <div key={w.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-medium mb-1">{w.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                        {w.location && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {w.location}</span>
                        )}
                        {w.price != null && (
                          <span className="text-primary font-semibold">₦{w.price.toLocaleString()} <span className="font-normal text-muted-foreground">{w.price_unit}</span></span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/messages?to=${w.user_id}${listingId ? `&listing=${listingId}` : ""}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full">
                            <MessageSquare className="w-3 h-3 mr-1" /> {t("marketplace.contact")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Transporters */}
            <section>
              <SectionHeader icon={Truck} title={t("harvestSuggestions.transporters")} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
              {transporters.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("harvestSuggestions.noTransporters")}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transporters.map((u) => (
                    <div key={u.user_id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{u.full_name || t("marketplace.anonymous")}</h3>
                          {(u.city || u.country) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {[u.city, u.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      {u.bio && <p className="text-muted-foreground text-xs line-clamp-2 mb-3">{u.bio}</p>}
                      <div className="flex gap-2">
                        <Link to={`/reputation?user=${u.user_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs">
                            <Star className="w-3 h-3 mr-1" /> {t("reputation.viewReputation")}
                          </Button>
                        </Link>
                        <Link to={`/messages?to=${u.user_id}${listingId ? `&listing=${listingId}` : ""}`} className="flex-1">
                          <Button size="sm" className="w-full text-xs">
                            <MessageSquare className="w-3 h-3 mr-1" /> {t("marketplace.contact")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Buyers */}
            <section>
              <SectionHeader icon={ShoppingCart} title={t("harvestSuggestions.buyers")} color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
              {buyers.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("harvestSuggestions.noBuyers")}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {buyers.map((u) => (
                    <div key={u.user_id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{u.full_name || t("marketplace.anonymous")}</h3>
                          {(u.city || u.country) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {[u.city, u.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      {u.bio && <p className="text-muted-foreground text-xs line-clamp-2 mb-3">{u.bio}</p>}
                      <div className="flex gap-2">
                        <Link to={`/reputation?user=${u.user_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs">
                            <Star className="w-3 h-3 mr-1" /> {t("reputation.viewReputation")}
                          </Button>
                        </Link>
                        <Link to={`/messages?to=${u.user_id}${listingId ? `&listing=${listingId}` : ""}`} className="flex-1">
                          <Button size="sm" className="w-full text-xs">
                            <MessageSquare className="w-3 h-3 mr-1" /> {t("marketplace.contact")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-6 border-t border-border">
          <Link to="/dashboard" className="flex-1">
            <Button variant="outline" className="w-full">{t("harvestSuggestions.goToDashboard")}</Button>
          </Link>
          <Link to="/marketplace" className="flex-1">
            <Button className="w-full gap-2">
              {t("harvestSuggestions.browseMarketplace")} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default HarvestSuggestions;
