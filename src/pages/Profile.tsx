import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sprout, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { COUNTRIES, getCurrencyByCountry } from "@/lib/countries";

const ROLES = [
  { value: "farmer", labelKey: "auth.farmer" },
  { value: "worker", labelKey: "auth.worker" },
  { value: "equipment_renter", labelKey: "auth.equipmentRenter" },
  { value: "warehouse_owner", labelKey: "auth.warehouseOwner" },
  { value: "transporter", labelKey: "auth.transporter" },
  { value: "buyer", labelKey: "auth.buyer" },
];

const Profile = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("fr") ? "fr" : "en";
  const { user, profile, roles, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setCountry(profile.country || "");
      setCity(profile.city || "");
      setBio(profile.bio || "");
      // Strip phone code prefix for editing
      const c = COUNTRIES.find((c) => c.code === profile.country);
      if (c && profile.phone?.startsWith(c.phoneCode)) {
        setPhone(profile.phone.replace(c.phoneCode, "").trim());
      } else {
        setPhone(profile.phone || "");
      }
    }
  }, [profile]);

  useEffect(() => {
    if (roles.length > 0) setSelectedRoles([...roles]);
  }, [roles]);

  const selectedCountry = COUNTRIES.find((c) => c.code === country);
  const currency = country ? getCurrencyByCountry(country) : "";

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedRoles.length === 0) {
      toast.error(t("auth.selectRole"));
      return;
    }
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          country,
          city,
          phone: selectedCountry ? `${selectedCountry.phoneCode} ${phone}` : phone,
          currency,
          bio,
        })
        .eq("user_id", user.id);
      if (profileError) throw profileError;

      // Sync roles: delete removed, insert added
      const currentRoles = roles;
      const toDelete = currentRoles.filter((r) => !selectedRoles.includes(r));
      const toAdd = selectedRoles.filter((r) => !currentRoles.includes(r));

      if (toDelete.length > 0) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id)
          .in("role", toDelete as any);
      }
      if (toAdd.length > 0) {
        await supabase
          .from("user_roles")
          .insert(toAdd.map((role) => ({ user_id: user.id, role: role as any })));
      }

      await refreshProfile();
      toast.success(t("profile.saved"));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-primary" />
            <span className="font-serif text-xl">AgriLink</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> {t("profile.backToDashboard")}
        </button>

        <h1 className="font-serif text-2xl mb-6">{t("profile.title")}</h1>

        <form onSubmit={handleSave} className="bg-card rounded-xl border border-border p-6 space-y-5">
          <div>
            <Label htmlFor="fullName">{t("auth.fullName")}</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div>
            <Label>{t("auth.country")}</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder={t("auth.selectCountry")} />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name[lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="city">{t("auth.city")}</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="phone">{t("auth.phone")}</Label>
            <div className="flex gap-2">
              {selectedCountry && (
                <span className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground min-w-[60px] justify-center">
                  {selectedCountry.phoneCode}
                </span>
              )}
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="flex-1" />
            </div>
          </div>

          {currency && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
              {t("auth.currency")}: <span className="font-semibold text-foreground">{currency}</span>
            </div>
          )}

          <div>
            <Label htmlFor="bio">{t("profile.bio")}</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder={t("profile.bioPlaceholder")} />
          </div>

          <div>
            <Label className="mb-3 block">{t("auth.roles")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRoles.includes(role.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox checked={selectedRoles.includes(role.value)} onCheckedChange={() => toggleRole(role.value)} />
                  <span className="text-sm">{t(role.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? t("auth.pleaseWait") : t("profile.save")}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default Profile;
