import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sprout, Search, Filter, MapPin, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

const Marketplace = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [listings, setListings] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const TYPES = [
    { value: "all", label: t("marketplace.allTypes") },
    { value: "produce", label: t("marketplace.produce") },
    { value: "equipment", label: t("marketplace.equipment") },
    { value: "warehouse", label: t("marketplace.warehouse") },
    { value: "transport", label: t("marketplace.transport") },
    { value: "job", label: t("marketplace.jobs") },
  ];

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      let query = supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter as any);
      }

      const { data } = await query;
      setListings(data || []);

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((l: any) => l.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", userIds);
        const profileMap: Record<string, any> = {};
        profilesData?.forEach((p: any) => { profileMap[p.user_id] = p; });
        setProfiles(profileMap);
      }

      setLoading(false);
    };
    fetchListings();
  }, [typeFilter]);

  const filtered = listings.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.description?.toLowerCase().includes(search.toLowerCase()) ||
      l.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-primary" />
            <span className="font-serif text-xl">Agri Grid</span>
          </Link>
          <nav className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard"><Button variant="ghost" size="sm">{t("nav.dashboard")}</Button></Link>
                <Link to="/marketplace/new"><Button size="sm">{t("marketplace.postListing")}</Button></Link>
              </>
            ) : (
              <Link to="/auth"><Button size="sm">{t("marketplace.signIn")}</Button></Link>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl mb-2">{t("marketplace.title")}</h1>
          <p className="text-muted-foreground">{t("marketplace.subtitle")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("marketplace.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((tp) => (
                <SelectItem key={tp.value} value={tp.value}>{tp.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("marketplace.loadingListings")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{t("marketplace.noListings")}</p>
            {user && (
              <Link to="/marketplace/new">
                <Button>{t("marketplace.postFirst")}</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((listing) => (
              <div key={listing.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-[var(--card-hover-shadow)] transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="capitalize text-xs">{listing.type}</Badge>
                  {listing.location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {listing.location}
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-lg mb-2">{listing.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{listing.description}</p>
                {listing.price && (
                  <p className="text-primary font-bold text-lg mb-4">
                    ₦{listing.price.toLocaleString()}
                    <span className="text-muted-foreground font-normal text-xs ml-1">{listing.price_unit}</span>
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t("dashboard.by")} {profiles[listing.user_id]?.full_name || t("marketplace.anonymous")}
                  </span>
                  {user && user.id !== listing.user_id && (
                    <Link to={`/messages?to=${listing.user_id}&listing=${listing.id}`}>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-1" /> {t("marketplace.contact")}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Marketplace;
