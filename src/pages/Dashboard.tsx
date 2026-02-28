import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sprout, Plus, Package, MessageSquare, LogOut, User, Edit, Trash2, Star, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { user, profile, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [listings, setListings] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: listingsData } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setListings(listingsData || []);

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };

    fetchData();

    const channel = supabase
      .channel("dashboard-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, () => {
        setUnreadCount((c) => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const deleteListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) {
      toast.error(t("dashboard.deleteFailed"));
    } else {
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast.success(t("dashboard.deleteSuccess"));
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">{t("dashboard.loading")}</div>;
  }

  const roleLabels: Record<string, string> = {
    farmer: t("auth.farmer"),
    worker: t("auth.worker"),
    equipment_renter: t("auth.equipmentRenter"),
    warehouse_owner: t("auth.warehouseOwner"),
    transporter: t("auth.transporter"),
    buyer: t("auth.buyer"),
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-primary" />
            <span className="font-serif text-xl">Agri Grid</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/marketplace">
              <Button variant="ghost" size="sm"><Package className="w-4 h-4 mr-2" /> {t("dashboard.marketplace")}</Button>
            </Link>
            <Link to="/messages">
              <Button variant="ghost" size="sm" className="relative">
                <MessageSquare className="w-4 h-4 mr-2" /> {t("dashboard.messages")}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }}>
              <LogOut className="w-4 h-4 mr-2" /> {t("dashboard.signOut")}
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="font-serif text-2xl">{profile?.full_name || t("dashboard.welcome")}</h1>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
              <div className="flex gap-2 mt-2">
                {roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {roleLabels[role] || role}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/nearby">
                <Button variant="outline" size="sm"><MapPin className="w-4 h-4 mr-2" /> {t("nearby.findNearby")}</Button>
              </Link>
              <Link to={`/reputation?user=${user?.id}`}>
                <Button variant="outline" size="sm"><Star className="w-4 h-4 mr-2" /> {t("reputation.viewReputation")}</Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" /> {t("dashboard.editProfile")}</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <p className="text-3xl font-bold text-primary">{listings.length}</p>
            <p className="text-muted-foreground text-sm mt-1">{t("dashboard.activeListings")}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <p className="text-3xl font-bold text-primary">{unreadCount}</p>
            <p className="text-muted-foreground text-sm mt-1">{t("dashboard.unreadMessages")}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <p className="text-3xl font-bold text-primary">{roles.length}</p>
            <p className="text-muted-foreground text-sm mt-1">{t("dashboard.activeRoles")}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl">{t("dashboard.myListings")}</h2>
          <Link to="/marketplace/new">
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> {t("dashboard.newListing")}</Button>
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("dashboard.noListings")}</p>
            <Link to="/marketplace/new">
              <Button className="mt-4" size="sm"><Plus className="w-4 h-4 mr-2" /> {t("dashboard.createListing")}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs capitalize">{listing.type}</Badge>
                  <Badge variant={listing.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                    {listing.status}
                  </Badge>
                </div>
                <h3 className="font-semibold mb-1">{listing.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{listing.description}</p>
                {listing.price && (
                  <p className="text-primary font-semibold">₦{listing.price.toLocaleString()} <span className="text-muted-foreground font-normal text-xs">{listing.price_unit}</span></p>
                )}
                <div className="flex gap-2 mt-4">
                  <Button variant="ghost" size="sm" onClick={() => deleteListing(listing.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
