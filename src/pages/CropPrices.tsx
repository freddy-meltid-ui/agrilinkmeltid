import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, TrendingUp, TrendingDown, Minus, Search, BarChart3, Activity, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { COUNTRIES } from "@/lib/countries";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

type CropPrice = {
  id: string;
  crop_name: string;
  price: number;
  currency: string;
  unit: string;
  market_name: string;
  country: string;
  city: string | null;
  recorded_at: string;
  source: string | null;
};

type DemandSignal = {
  id: string;
  crop_name: string;
  country: string;
  city: string | null;
  demand_level: string;
  buyer_count: number;
  listing_count: number;
  recorded_at: string;
};

const CropPrices = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [demandSignals, setDemandSignals] = useState<DemandSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);

  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [pricesRes, demandRes] = await Promise.all([
        supabase.from("crop_prices").select("*").order("recorded_at", { ascending: false }).limit(500),
        supabase.from("demand_signals").select("*").order("recorded_at", { ascending: false }).limit(200),
      ]);
      setPrices((pricesRes.data as CropPrice[]) || []);
      setDemandSignals((demandRes.data as DemandSignal[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Derive unique crops and countries
  const availableCrops = useMemo(() => [...new Set(prices.map((p) => p.crop_name))].sort(), [prices]);
  const availableCountries = useMemo(() => [...new Set(prices.map((p) => p.country))].sort(), [prices]);

  // Filter prices
  const filteredPrices = useMemo(() => {
    return prices.filter((p) => {
      if (countryFilter !== "all" && p.country !== countryFilter) return false;
      if (search && !p.crop_name.toLowerCase().includes(search.toLowerCase()) && !p.market_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [prices, countryFilter, search]);

  // Latest price per crop (for table display)
  const latestByCrop = useMemo(() => {
    const map: Record<string, CropPrice & { previousPrice?: number }> = {};
    const sorted = [...filteredPrices].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    sorted.forEach((p) => {
      const key = `${p.crop_name}-${p.market_name}`;
      if (!map[key]) {
        map[key] = { ...p };
      } else if (!map[key].previousPrice) {
        map[key].previousPrice = p.price;
      }
    });
    return Object.values(map);
  }, [filteredPrices]);

  // Historical data for selected crop
  const historicalData = useMemo(() => {
    if (!selectedCrop) return [];
    return filteredPrices
      .filter((p) => p.crop_name === selectedCrop)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map((p) => ({
        date: new Date(p.recorded_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric" }),
        price: p.price,
        market: p.market_name,
      }));
  }, [filteredPrices, selectedCrop, lang]);

  // Demand signals for display
  const filteredDemand = useMemo(() => {
    return demandSignals.filter((d) => {
      if (countryFilter !== "all" && d.country !== countryFilter) return false;
      if (search && !d.crop_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [demandSignals, countryFilter, search]);

  // Demand chart data
  const demandChartData = useMemo(() => {
    const map: Record<string, { crop: string; buyers: number; listings: number }> = {};
    filteredDemand.forEach((d) => {
      if (!map[d.crop_name]) map[d.crop_name] = { crop: d.crop_name, buyers: 0, listings: 0 };
      map[d.crop_name].buyers += d.buyer_count;
      map[d.crop_name].listings += d.listing_count;
    });
    return Object.values(map).sort((a, b) => b.buyers - a.buyers).slice(0, 10);
  }, [filteredDemand]);

  const getCountryLabel = (code: string) => {
    const c = COUNTRIES.find((co) => co.code === code);
    return c ? c.name[lang as "en" | "fr"] : code;
  };

  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getDemandBadge = (level: string) => {
    const colors: Record<string, string> = {
      high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return <Badge className={`${colors[level] || colors.medium} text-xs`}>{t(`cropPrices.demand.${level}`)}</Badge>;
  };

  // Generate sample data if empty (for demo)
  const hasPrices = prices.length > 0;
  const hasDemand = demandSignals.length > 0;

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
                <Link to="/marketplace"><Button variant="ghost" size="sm">{t("nav.marketplace")}</Button></Link>
              </>
            ) : (
              <Link to="/auth"><Button size="sm">{t("marketplace.signIn")}</Button></Link>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            {t("cropPrices.title")}
          </h1>
          <p className="text-muted-foreground">{t("cropPrices.subtitle")}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("cropPrices.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-full sm:w-48">
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

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("cropPrices.loading")}</div>
        ) : !hasPrices && !hasDemand ? (
          <div className="text-center py-16">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h2 className="font-serif text-xl mb-2 text-muted-foreground">{t("cropPrices.noData")}</h2>
            <p className="text-muted-foreground text-sm mb-6">{t("cropPrices.noDataDesc")}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Section 1: Local Market Prices */}
            <section>
              <h2 className="font-serif text-xl mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                {t("cropPrices.marketPrices")}
              </h2>
              {latestByCrop.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("cropPrices.noPrices")}</p>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left py-3 px-4 font-medium">{t("cropPrices.crop")}</th>
                        <th className="text-left py-3 px-4 font-medium">{t("cropPrices.market")}</th>
                        <th className="text-right py-3 px-4 font-medium">{t("cropPrices.price")}</th>
                        <th className="text-center py-3 px-4 font-medium">{t("cropPrices.trend")}</th>
                        <th className="text-left py-3 px-4 font-medium">{t("cropPrices.date")}</th>
                        <th className="text-center py-3 px-4 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestByCrop.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium">{p.crop_name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{p.market_name}</td>
                          <td className="py-3 px-4 text-right font-bold text-primary">
                            {p.price.toLocaleString()} {p.currency}
                            <span className="text-muted-foreground font-normal text-xs ml-1">/{p.unit.replace("per ", "")}</span>
                          </td>
                          <td className="py-3 px-4 text-center">{getTrendIcon(p.price, p.previousPrice)}</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">
                            {new Date(p.recorded_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCrop(selectedCrop === p.crop_name ? null : p.crop_name)}
                              className="text-xs"
                            >
                              <BarChart3 className="w-3 h-3 mr-1" />
                              {t("cropPrices.history")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Section 2: Historical Trends Chart */}
            {selectedCrop && historicalData.length > 0 && (
              <section>
                <h2 className="font-serif text-xl mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  {t("cropPrices.historicalTrends")}: {selectedCrop}
                </h2>
                <div className="bg-card border border-border rounded-xl p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Section 3: Demand Signals */}
            <section>
              <h2 className="font-serif text-xl mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                {t("cropPrices.demandSignals")}
              </h2>
              {filteredDemand.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("cropPrices.noDemand")}</p>
              ) : (
                <>
                  {demandChartData.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-6 mb-6">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={demandChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="crop" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              color: "hsl(var(--foreground))",
                            }}
                          />
                          <Bar dataKey="buyers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t("cropPrices.buyers")} />
                          <Bar dataKey="listings" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} name={t("cropPrices.listings")} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDemand.slice(0, 9).map((d) => (
                      <div key={d.id} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{d.crop_name}</span>
                          {getDemandBadge(d.demand_level)}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>{t("cropPrices.buyers")}: <span className="font-medium text-foreground">{d.buyer_count}</span></p>
                          <p>{t("cropPrices.listings")}: <span className="font-medium text-foreground">{d.listing_count}</span></p>
                          <p>{d.city ? `${d.city}, ` : ""}{getCountryLabel(d.country)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default CropPrices;
