import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const NewListing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "",
    title: "",
    description: "",
    price: "",
    price_unit: "per unit",
    location: "",
  });

  const TYPES = [
    { value: "produce", label: t("newListing.produceLabel") },
    { value: "equipment", label: t("newListing.equipmentLabel") },
    { value: "warehouse", label: t("newListing.warehouseLabel") },
    { value: "transport", label: t("newListing.transportLabel") },
    { value: "job", label: t("newListing.jobLabel") },
  ];

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase.from("listings").insert({
      user_id: user.id,
      type: form.type as any,
      title: form.title,
      description: form.description,
      price: form.price ? parseFloat(form.price) : null,
      price_unit: form.price_unit,
      location: form.location || null,
    });

    if (error) {
      toast.error(t("newListing.error"));
    } else {
      toast.success(t("newListing.success"));
      navigate("/dashboard");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl flex items-center h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-primary" />
            <span className="font-serif text-xl">Agri Grid</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> {t("newListing.back")}
        </button>

        <h1 className="font-serif text-3xl mb-6">{t("newListing.title")}</h1>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5">
          <div>
            <Label>{t("newListing.type")} *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue placeholder={t("newListing.selectType")} /></SelectTrigger>
              <SelectContent>
                {TYPES.map((tp) => (
                  <SelectItem key={tp.value} value={tp.value}>{tp.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("newListing.titleField")} *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("newListing.titlePlaceholder")} required />
          </div>

          <div>
            <Label>{t("newListing.description")}</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("newListing.descriptionPlaceholder")} rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("newListing.price")}</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>{t("newListing.priceUnit")}</Label>
              <Input value={form.price_unit} onChange={(e) => setForm({ ...form, price_unit: e.target.value })} placeholder={t("newListing.priceUnitPlaceholder")} />
            </div>
          </div>

          <div>
            <Label>{t("newListing.location")}</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("newListing.locationPlaceholder")} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !form.type || !form.title}>
            {submitting ? t("newListing.submitting") : t("newListing.submit")}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default NewListing;