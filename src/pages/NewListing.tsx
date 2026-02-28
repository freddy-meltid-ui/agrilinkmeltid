import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, ArrowLeft, ImagePlus, X, Crown } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const NewListing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    type: "",
    title: "",
    description: "",
    price: "",
    price_unit: "per unit",
    location: "",
    is_premium: false,
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("newListing.imageTooLarge"));
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("listing-images").upload(path, imageFile);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    let image_url: string | null = null;
    if (imageFile) {
      image_url = await uploadImage();
      if (!image_url) {
        toast.error(t("newListing.imageUploadError"));
        setSubmitting(false);
        return;
      }
    }

    const { data, error } = await supabase.from("listings").insert({
      user_id: user.id,
      type: form.type as any,
      title: form.title,
      description: form.description,
      price: form.price ? parseFloat(form.price) : null,
      price_unit: form.price_unit,
      location: form.location || null,
      image_url,
      is_premium: form.is_premium,
      premium_until: form.is_premium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    }).select("id").single();

    if (error) {
      toast.error(t("newListing.error"));
    } else {
      toast.success(t("newListing.success"));
      // If produce listing, redirect to harvest suggestions
      if (form.type === "produce" && data) {
        navigate(`/harvest-suggestions?listing=${data.id}&title=${encodeURIComponent(form.title)}`);
      } else {
        navigate("/dashboard");
      }
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

          {/* Image Upload */}
          <div>
            <Label>{t("newListing.image")}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1 hover:bg-background"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-sm">{t("newListing.addImage")}</span>
              </button>
            )}
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

          {/* Premium Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">{t("newListing.premium")}</p>
                <p className="text-xs text-muted-foreground">{t("newListing.premiumDesc")}</p>
              </div>
            </div>
            <Switch
              checked={form.is_premium}
              onCheckedChange={(checked) => setForm({ ...form, is_premium: checked })}
            />
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
