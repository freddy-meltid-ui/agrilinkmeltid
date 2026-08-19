// AGRI-GRID V2 — organization settings (tenancy foundation)
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { supabase } from "@/integrations/supabase/client";

const V2Settings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { organizations, activeOrg, activeRole, refresh, loading } = useOrganization();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const createOrganization = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("v2_organizations")
      .insert({ name: name.trim(), created_by: user.id })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      toast.error(t("v2.settings.createError"));
      return;
    }

    const { error: memberError } = await supabase
      .from("v2_organization_members")
      .insert({ organization_id: data.id, user_id: user.id, role: "processor_admin" });

    setSaving(false);
    if (memberError) {
      toast.error(t("v2.settings.createError"));
      return;
    }
    setName("");
    toast.success(t("v2.settings.createSuccess"));
    await refresh();
  };

  if (!user) {
    return (
      <>
        <PageHeader title={t("v2.settings.title")} description={t("v2.settings.description")} />
        <EmptyState icon={Building2} title={t("v2.settings.signInRequired")} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("v2.settings.title")} description={t("v2.settings.description")} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-medium mb-4">{t("v2.settings.currentOrg")}</h2>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : activeOrg ? (
            <div className="space-y-2 text-sm">
              <p className="text-lg font-semibold text-foreground">{activeOrg.name}</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={t(`v2.roles.${activeRole}`, { defaultValue: activeRole ?? "" })} tone="success" />
                <StatusBadge label={activeOrg.org_type} />
                <StatusBadge label={activeOrg.country} />
              </div>
              <p className="text-muted-foreground">
                {t("v2.settings.orgCount", { count: organizations.length })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("v2.settings.noOrg")}</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-medium mb-4">{t("v2.settings.createOrg")}</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="org-name">{t("v2.settings.orgName")}</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("v2.settings.orgNamePlaceholder")}
                className="mt-1"
              />
            </div>
            <Button onClick={createOrganization} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("v2.settings.createOrg")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("v2.settings.createHint")}</p>
          </div>
        </section>
      </div>
    </>
  );
};

export default V2Settings;
