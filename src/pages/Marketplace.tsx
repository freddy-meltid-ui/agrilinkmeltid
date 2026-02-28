import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sprout, Search, Filter, MapPin, MessageSquare, Star, SlidersHorizontal, X, Crown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import { COUNTRIES } from "@/lib/countries";

const Marketplace = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [listings, setListings] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [sellerRatings, setSellerRatings] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState(0);
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

        // Fetch average ratings for all sellers
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("reviewed_id, rating")
          .in("reviewed_id", userIds);
        const ratingsMap: Record<string, { sum: number; count: number }> = {};
        reviewsData?.forEach((r: any) => {
          if (!ratingsMap[r.reviewed_id]) ratingsMap[r.reviewed_id] = { sum: 0, count: 0 };
          ratingsMap[r.reviewed_id].sum += r.rating;
          ratingsMap[r.reviewed_id].count += 1;
        });
        const avgMap: Record<string, number> = {};
        Object.entries(ratingsMap).forEach(([uid, v]) => { avgMap[uid] = v.sum / v.count; });
        setSellerRatings(avgMap);
      }

      setLoading(false);
    };
    fetchListings();
  }, [typeFilter]);

  // Derive available countries & cities from listings
  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    listings.forEach((l) => {
      const p = profiles[l.user_id];
      if (p?.country) countries.add(p.country);
    });
    return Array.from(countries).sort();
  }, [listings, profiles]);

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    listings.forEach((l) => {
      const p = profiles[l.user_id];
      if (p?.city && (countryFilter === "all" || p.country === countryFilter)) {
        cities.add(p.city);
      }
    });
    return Array.from(cities).sort();
  }, [listings, profiles, countryFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (countryFilter !== "all") count++;
    if (cityFilter !== "all") count++;
    if (minPrice) count++;
    if (maxPrice) count++;
    if (minRating > 0) count++;
    return count;
  }, [countryFilter, cityFilter, minPrice, maxPrice, minRating]);

  const clearFilters = () => {
    setCountryFilter("all");
    setCityFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setMinRating(0);
  };

  const filtered = useMemo(() => {
    const results = listings.filter((l) => {
      // Text search
      const matchesSearch =
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.description?.toLowerCase().includes(search.toLowerCase()) ||
        l.location?.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Country filter
      if (countryFilter !== "all") {
        const p = profiles[l.user_id];
        if (p?.country !== countryFilter) return false;
      }

      // City filter
      if (cityFilter !== "all") {
        const p = profiles[l.user_id];
        if (p?.city !== cityFilter) return false;
      }

      // Price range
      if (minPrice && l.price != null && l.price < Number(minPrice)) return false;
      if (maxPrice && l.price != null && l.price > Number(maxPrice)) return false;

      // Seller rating
      if (minRating > 0) {
        const rating = sellerRatings[l.user_id];
        if (!rating || rating < minRating) return false;
      }

      return true;
    });
    // Sort: premium listings first
    return results.sort((a, b) => {
      const aPrem = a.is_premium && (!a.premium_until || new Date(a.premium_until) > new Date());
      const bPrem = b.is_premium && (!b.premium_until || new Date(b.premium_until) > new Date());
      if (aPrem && !bPrem) return -1;
      if (!aPrem && bPrem) return 1;
      return 0;
    });
  }, [listings, search, countryFilter, cityFilter, minPrice, maxPrice, minRating, profiles, sellerRatings]);

  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const getCountryLabel = (code: string) => {
    const c = COUNTRIES.find((c) => c.code === code);
    return c ? c.name[lang as "en" | "fr"] : code;
  };

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

        {/* Search + Type + Advanced Filters */}
        <div className="flex flex-col gap-3 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
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

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  {t("marketplace.filters")}
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                      {t("marketplace.activeFilters", { count: activeFilterCount })}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-4" align="end">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{t("marketplace.filters")}</h4>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-0 text-xs text-muted-foreground">
                      <X className="w-3 h-3 mr-1" /> {t("marketplace.clearFilters")}
                    </Button>
                  )}
                </div>

                {/* Country */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("marketplace.country")}</label>
                  <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setCityFilter("all"); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("marketplace.allCountries")}</SelectItem>
                      {availableCountries.map((code) => (
                        <SelectItem key={code} value={code}>{getCountryLabel(code)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("marketplace.city")}</label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("marketplace.allCities")}</SelectItem>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("marketplace.priceRange")}</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={t("marketplace.minPrice")}
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder={t("marketplace.maxPrice")}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Seller Rating */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t("marketplace.sellerRating")}</label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[minRating]}
                      onValueChange={([v]) => setMinRating(v)}
                      min={0}
                      max={5}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-16 text-right flex items-center gap-1 justify-end">
                      {minRating > 0 ? (
                        <><Star className="w-3 h-3 text-primary fill-primary" /> {minRating}+</>
                      ) : (
                        <span className="text-muted-foreground text-xs">{t("marketplace.anyRating")}</span>
                      )}
                    </span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
            {filtered.map((listing) => {
              const isPremiumActive = listing.is_premium && (!listing.premium_until || new Date(listing.premium_until) > new Date());
              return (
                <div key={listing.id} className={`bg-card rounded-xl border p-6 hover:shadow-[var(--card-hover-shadow)] transition-shadow ${isPremiumActive ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
                  {listing.image_url && (
                    <div className="relative -mx-6 -mt-6 mb-4 rounded-t-xl overflow-hidden">
                      <img src={listing.image_url} alt={listing.title} className="w-full h-40 object-cover" />
                      {isPremiumActive && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-primary text-primary-foreground gap-1">
                            <Crown className="w-3 h-3" /> {t("marketplace.premium")}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">{listing.type}</Badge>
                      {isPremiumActive && !listing.image_url && (
                        <Badge className="bg-primary text-primary-foreground gap-1 text-xs">
                          <Crown className="w-3 h-3" /> {t("marketplace.premium")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {sellerRatings[listing.user_id] && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 text-primary fill-primary" />
                          {sellerRatings[listing.user_id].toFixed(1)}
                        </span>
                      )}
                      {listing.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {listing.location}
                        </span>
                      )}
                    </div>
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
                    <Link to={`/reputation?user=${listing.user_id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      {t("dashboard.by")} {profiles[listing.user_id]?.full_name || t("marketplace.anonymous")}
                    </Link>
                    {user && user.id !== listing.user_id && (
                      <Link to={`/messages?to=${listing.user_id}&listing=${listing.id}`}>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 mr-1" /> {t("marketplace.contact")}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Marketplace;
