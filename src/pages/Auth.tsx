import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const Auth = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("fr") ? "fr" : "en";
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const selectedCountry = COUNTRIES.find((c) => c.code === country);
  const currency = country ? getCurrencyByCountry(country) : "";

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.welcomeBackToast"));
        navigate("/dashboard");
      } else {
        if (selectedRoles.length === 0) {
          toast.error(t("auth.selectRole"));
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (data.user) {
          const roleInserts = selectedRoles.map((role) => ({
            user_id: data.user!.id,
            role: role as any,
          }));
          await supabase.from("user_roles").insert(roleInserts);

          await supabase
            .from("profiles")
            .update({
              full_name: fullName,
              country,
              city,
              phone: selectedCountry ? `${selectedCountry.phoneCode} ${phone}` : phone,
              currency,
            })
            .eq("user_id", data.user.id);
        }

        toast.success(t("auth.accountCreated"));
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> {t("auth.backToHome")}
        </button>

        <div className="flex items-center gap-2 mb-8">
          <Sprout className="w-8 h-8 text-primary" />
          <span className="font-serif text-2xl">AgriLink</span>
        </div>

        <div className="bg-card rounded-xl border border-border p-8">
          <h1 className="font-serif text-2xl mb-2">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {isLogin ? t("auth.signInSubtitle") : t("auth.signUpSubtitle")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <Label>{t("auth.country")}</Label>
                  <Select value={country} onValueChange={setCountry} required>
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
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">{t("auth.phone")}</Label>
                  <div className="flex gap-2">
                    {selectedCountry && (
                      <span className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground min-w-[60px] justify-center">
                        {selectedCountry.phoneCode}
                      </span>
                    )}
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="flex-1"
                    />
                  </div>
                </div>

                {currency && (
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
                    {t("auth.currency")}: <span className="font-semibold text-foreground">{currency}</span>
                  </div>
                )}

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
                        <Checkbox
                          checked={selectedRoles.includes(role.value)}
                          onCheckedChange={() => toggleRole(role.value)}
                        />
                        <span className="text-sm">{t(role.labelKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.pleaseWait") : isLogin ? t("auth.signIn") : t("auth.createAccountBtn")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? t("auth.signUp") : t("auth.signInLink")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
