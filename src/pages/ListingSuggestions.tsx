import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sprout, ArrowRight, Warehouse, Truck, ShoppingCart, MapPin, User,
  Star, MessageSquare, Sparkles, CheckCircle2, Tractor, Briefcase, Wheat, Factory
} from "lucide-react";
import { useTranslation } from "react-i18next";

type ProfileSuggestion = {
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
  type: string;
  seller_name: string | null;
};

// Define what suggestions each listing type should show
const SUGGESTION_CONFIG: Record<string, {
  listings: string[]; // listing types to suggest
  roles: string[]; // user roles to suggest
}> = {
  produce: {
    listings: ["warehouse", "transport", "processing"],
    roles: ["processor", "wholesaler", "semi_wholesaler"],
  },
  equipment: {
    listings: ["produce"],
    roles: ["farmer"],
  },
  warehouse: {
    listings: ["produce", "transport"],
    roles: ["farmer", "wholesaler", "semi_wholesaler"],
  },
  processing: {
    listings: ["produce", "transport"],
    roles: ["farmer", "wholesaler", "semi_wholesaler"],
  },
  transport: {
    listings: ["produce", "warehouse"],
    roles: ["farmer", "warehouse_owner"],
  },
  job: {
    listings: [],
    roles: ["farmer", "worker"],
  },
};

const LISTING_TYPE_META: Record<string, { icon: any; color: string; labelKey: string }> = {
  produce: { icon: Wheat, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", labelKey: "suggestions.produceListings" },
  equipment: { icon: Tractor, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", labelKey: "suggestions.equipmentListings" },
  warehouse: { icon: Warehouse, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", labelKey: "suggestions.warehouseListings" },
  transport: { icon: Truck, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", labelKey: "suggestions.transportListings" },
  processing: { icon: Factory, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", labelKey: "suggestions.processingListings" },
  job: { icon: Briefcase, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", labelKey: "suggestions.jobListings" },
};

const ROLE_META: Record<string, { icon: any; color: string; labelKey: string }> = {
  farmer: { icon: Wheat, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", labelKey: "suggestions.farmers" },
  worker: { icon: Briefcase, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", labelKey: "suggestions.workers" },
  processor: { icon: Factory, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", labelKey: "suggestions.processors" },
  wholesaler: { icon: ShoppingCart, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", labelKey: "suggestions.wholesalers" },
  semi_wholesaler: { icon: ShoppingCart, color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400", labelKey: "suggestions.semiWholesalers" },
  buyer: { icon: ShoppingCart, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", labelKey: "suggestions.buyers" },
  warehouse_owner: { icon: Warehouse, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", labelKey: "suggestions.warehouseOwners" },
  transporter: { icon: Truck, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", labelKey: "suggestions.transporters" },
  equipment_renter: { icon: Tractor, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", labelKey: "suggestions.equipmentRenters" },
};

const ListingSuggestions = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get("listing");
  const listingTitle = searchParams.get("title") || "";
  const listingType = searchParams.get("type") || "produce";

  const [suggestedListings, setSuggestedListings] = useState<Record<string, ListingSuggestion[]>>({});
  const [suggestedProfiles, setSuggestedProfiles] = useState<Record<string, ProfileSuggestion[]>>({});
  const [loading, setLoading] = useState(true);

  const config = SUGGESTION_CONFIG[listingType] || SUGGESTION_CONFIG.produce;

  useEffect(() => {
    if (!user || !profile) return;

    const fetchSuggestions = async () => {
      setLoading(true);

      // 1. Fetch suggested listings by type
      const listingResults: Record<string, ListingSuggestion[]> = {};
      for (const type of config.listings) {
        const { data } = await supabase
          .from("listings")
          .select("id, title, price, price_unit, location, user_id, type")
          .eq("type", type as any)
          .eq("status", "active")
          .neq("user_id", user.id)
          .limit(4);

        if (data && data.length > 0) {
          const uids = [...new Set(data.map(d => d.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", uids);
          const nameMap: Record<string, string> = {};
          profiles?.forEach(p => { nameMap[p.user_id] = p.full_name || ""; });
          listingResults[type] = data.map(d => ({ ...d, seller_name: nameMap[d.user_id] || null }));
        } else {
          listingResults[type] = [];
        }
      }
      setSuggestedListings(listingResults);

      // 2. Fetch profiles by role
      const profileResults: Record<string, ProfileSuggestion[]> = {};
      if (config.roles.length > 0) {
        let pQuery = supabase
          .from("profiles")
          .select("user_id, full_name, city, country, bio")
          .neq("user_id", user.id);
        if (profile.country) pQuery = pQuery.eq("country", profile.country);

        const { data: nearbyProfiles } = await pQuery.limit(50);
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

          for (const role of config.roles) {
            profileResults[role] = nearbyProfiles
              .filter(p => roleMap[p.user_id]?.includes(role))
              .slice(0, 4);
          }
        }
      }
      setSuggestedProfiles(profileResults);
      setLoading(false);
    };

    fetchSuggestions();
  }, [user, profile, listingType]);

  const SectionHeader = ({ icon: Icon, title, color }: { icon: any; title: string; color: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="font-serif text-xl">{title}</h2>
    </div>
  );

  const ListingCard = ({ item }: { item: ListingSuggestion }) => (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <h3 className="font-medium mb-1 text-sm">{item.title}</h3>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        {item.location && (
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</span>
        )}
        {item.price != null && (
          <span className="text-primary font-semibold">₦{item.price.toLocaleString()} <span className="font-normal text-muted-foreground">{item.price_unit}</span></span>
        )}
      </div>
      <div className="flex gap-2">
        <Link to={`/messages?to=${item.user_id}${listingId ? `&listing=${listingId}` : ""}`} className="flex-1">
          <Button size="sm" variant="outline" className="w-full text-xs">
            <MessageSquare className="w-3 h-3 mr-1" /> {t("marketplace.contact")}
          </Button>
        </Link>
      </div>
    </div>
  );

  const ProfileCard = ({ u }: { u: ProfileSuggestion }) => (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
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
  );

  const typeIcon = LISTING_TYPE_META[listingType]?.icon || Wheat;

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
            <h1 className="font-serif text-2xl mb-1">{t("suggestions.posted")}</h1>
            {listingTitle && (
              <p className="text-muted-foreground text-sm">"{listingTitle}"</p>
            )}
          </div>
        </div>

        {/* Smart suggestions intro */}
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-xl">{t("suggestions.title")}</h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("reputation.loading")}</div>
        ) : (
          <div className="space-y-10">
            {/* Listing-based suggestions */}
            {config.listings.map((type) => {
              const meta = LISTING_TYPE_META[type];
              if (!meta) return null;
              const items = suggestedListings[type] || [];
              return (
                <section key={type}>
                  <SectionHeader icon={meta.icon} title={t(meta.labelKey)} color={meta.color} />
                  {items.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("suggestions.noListings")}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((item) => <ListingCard key={item.id} item={item} />)}
                    </div>
                  )}
                </section>
              );
            })}

            {/* Role-based suggestions */}
            {config.roles.map((role) => {
              const meta = ROLE_META[role];
              if (!meta) return null;
              const profiles = suggestedProfiles[role] || [];
              return (
                <section key={role}>
                  <SectionHeader icon={meta.icon} title={t(meta.labelKey)} color={meta.color} />
                  {profiles.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("suggestions.noProfiles")}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profiles.map((u) => <ProfileCard key={u.user_id} u={u} />)}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-6 border-t border-border">
          <Link to="/dashboard" className="flex-1">
            <Button variant="outline" className="w-full">{t("suggestions.goToDashboard")}</Button>
          </Link>
          <Link to="/marketplace" className="flex-1">
            <Button className="w-full gap-2">
              {t("suggestions.browseMarketplace")} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ListingSuggestions;
