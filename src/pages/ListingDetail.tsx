import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, MessageSquare, Star, Crown, Calendar, Package } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [listing, setListing] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sellerRating, setSellerRating] = useState<{ avg: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: listingData } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (!listingData) {
        setLoading(false);
        return;
      }

      setListing(listingData);

      const [profileRes, reviewsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", listingData.user_id).single(),
        supabase.from("reviews").select("rating").eq("reviewed_id", listingData.user_id),
        supabase.from("user_roles").select("role").eq("user_id", listingData.user_id),
      ]);

      setProfile({ ...profileRes.data, roles: rolesRes.data?.map((r: any) => r.role) || [] });

      if (reviewsRes.data && reviewsRes.data.length > 0) {
        const sum = reviewsRes.data.reduce((a: number, r: any) => a + r.rating, 0);
        setSellerRating({ avg: sum / reviewsRes.data.length, count: reviewsRes.data.length });
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("dashboard.loading")}</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">{t("listingDetail.notFound")}</p>
        <Link to="/marketplace"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> {t("listingDetail.backToMarketplace")}</Button></Link>
      </div>
    );
  }

  const isPremium = listing.is_premium && (!listing.premium_until || new Date(listing.premium_until) > new Date());
  const createdDate = new Date(listing.created_at).toLocaleDateString();

  const typeLabels: Record<string, string> = {
    produce: t("marketplace.produce"),
    equipment: t("marketplace.equipment"),
    warehouse: t("marketplace.warehouse"),
    transport: t("marketplace.transport"),
    processing: t("marketplace.processing"),
    job: t("marketplace.jobs"),
  };

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Agri Grid logo" className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/marketplace"><Button variant="ghost" size="sm">{t("nav.marketplace")}</Button></Link>
            {user ? (
              <Link to="/dashboard"><Button variant="ghost" size="sm">{t("nav.dashboard")}</Button></Link>
            ) : (
              <Link to="/auth"><Button size="sm">{t("marketplace.signIn")}</Button></Link>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Link to="/marketplace" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("listingDetail.backToMarketplace")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {listing.image_url && (
              <div className="rounded-xl overflow-hidden border border-border">
                <img src={listing.image_url} alt={listing.title} className="w-full h-64 md:h-80 object-cover" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge variant="outline" className="capitalize">{typeLabels[listing.type] || listing.type}</Badge>
                <Badge variant={listing.status === "active" ? "default" : "secondary"} className="capitalize">{listing.status}</Badge>
                {isPremium && (
                  <Badge className="bg-primary text-primary-foreground gap-1">
                    <Crown className="w-3 h-3" /> {t("marketplace.premium")}
                  </Badge>
                )}
              </div>

              <h1 className="font-serif text-3xl mb-2">{listing.title}</h1>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                {listing.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {listing.location}</span>
                )}
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {createdDate}</span>
              </div>

              {listing.price != null && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                  <p className="text-primary font-bold text-2xl">
                    ₦{listing.price.toLocaleString()}
                    {listing.price_unit && <span className="text-muted-foreground font-normal text-sm ml-2">{listing.price_unit}</span>}
                  </p>
                </div>
              )}

              <div>
                <h2 className="font-semibold text-lg mb-2">{t("listingDetail.description")}</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {listing.description || t("listingDetail.noDescription")}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar - Seller Info */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">{t("listingDetail.seller")}</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <Link to={`/reputation?user=${listing.user_id}`} className="font-semibold hover:text-primary transition-colors flex items-center gap-1">
                    {profile?.full_name || t("marketplace.anonymous")}
                    {profile?.is_verified && <VerifiedBadge />}
                  </Link>
                  {profile?.country && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {profile.city ? `${profile.city}, ` : ""}{profile.country}
                    </p>
                  )}
                </div>
              </div>

              {sellerRating && (
                <div className="flex items-center gap-2 text-sm mb-3">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  <span className="font-medium">{sellerRating.avg.toFixed(1)}</span>
                  <span className="text-muted-foreground">({sellerRating.count} {t("reputation.reviews")})</span>
                </div>
              )}

              {profile?.roles && profile.roles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {profile.roles.map((role: string) => (
                    <Badge key={role} variant="secondary" className="text-xs">{roleLabels[role] || role}</Badge>
                  ))}
                </div>
              )}

              {profile?.bio && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{profile.bio}</p>
              )}

              {user && user.id !== listing.user_id && (
                <Link to={`/messages?to=${listing.user_id}&listing=${listing.id}`} className="block">
                  <Button className="w-full">
                    <MessageSquare className="w-4 h-4 mr-2" /> {t("listingDetail.contactSeller")}
                  </Button>
                </Link>
              )}

              {!user && (
                <Link to="/auth" className="block">
                  <Button className="w-full" variant="outline">
                    {t("listingDetail.signInToContact")}
                  </Button>
                </Link>
              )}

              <Link to={`/reputation?user=${listing.user_id}`} className="block mt-2">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  <Star className="w-3 h-3 mr-1" /> {t("reputation.viewReputation")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ListingDetail;
