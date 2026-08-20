// AGRI-GRID V2 — Phase 3B: consent-based lender pack sharing.
// Nothing leaves the organisation without an explicit, scoped, expiring share.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Loader2, Share2, ShieldOff } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  RECIPIENT_TYPES,
  SHARE_SCOPES,
  createShare,
  fetchFinanceEvents,
  fetchFinanceShares,
  revokeShare,
  type FinanceEvent,
  type FinanceShare,
  type FinanceShareScope,
} from "@/lib/v2/finance";


const V2FinanceSharing = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [shares, setShares] = useState<FinanceShare[]>([]);
  const [events, setEvents] = useState<FinanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [form, setForm] = useState({
    recipient_type: "bank",
    recipient_name: "",
    recipient_email: "",
    expires_in_days: "30",
  });
  const [scopes, setScopes] = useState<FinanceShareScope[]>([...SHARE_SCOPES]);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [s, e] = await Promise.all([fetchFinanceShares(activeOrg.id), fetchFinanceEvents(activeOrg.id)]);
      setShares(s);
      setEvents(e);
    } catch (err) {
      toast({ title: t("v2.common.error"), description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const submit = async () => {
    if (!activeOrg || !form.recipient_name.trim() || scopes.length === 0) return;
    setCreating(true);
    try {
      const res = await createShare({
        organization_id: activeOrg.id,
        recipient_type: form.recipient_type as FinanceShare["recipient_type"],
        recipient_name: form.recipient_name.trim(),
        recipient_email: form.recipient_email.trim() || null,
        scopes,
        expires_in_days: Number(form.expires_in_days) || 30,
      });
      setLastToken(res.token);
      setForm({ ...form, recipient_name: "", recipient_email: "" });
      toast({ title: t("v2.finance.shareCreated") });
      load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await revokeShare(id);
      toast({ title: t("v2.finance.shareRevoked") });
      load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

  if (loading || orgLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeOrg) return <EmptyState icon={Share2} title={t("v2.finance.noData")} />;

  const shareUrl = lastToken ? `${window.location.origin}/finance-pack/${lastToken}` : null;

  return (
    <div>
      <PageHeader title={t("v2.finance.sharingTitle")} description={t("v2.finance.sharingDescription")} />

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-serif text-lg text-foreground">{t("v2.finance.newShare")}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <Label>{t("v2.finance.fields.recipientType")}</Label>
            <Select value={form.recipient_type} onValueChange={(v) => setForm({ ...form, recipient_type: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECIPIENT_TYPES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`v2.finance.recipientTypes.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("v2.finance.fields.recipientName")}</Label>
            <Input
              className="mt-1"
              value={form.recipient_name}
              onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
            />
          </div>
          <div>
            <Label>{t("v2.finance.fields.recipientEmail")}</Label>
            <Input
              className="mt-1"
              type="email"
              value={form.recipient_email}
              onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
            />
          </div>
          <div>
            <Label>{t("v2.finance.fields.expiresIn")}</Label>
            <Input
              className="mt-1"
              type="number"
              min={1}
              max={365}
              value={form.expires_in_days}
              onChange={(e) => setForm({ ...form, expires_in_days: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4">
          <Label>{t("v2.finance.scopesLabel")}</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {SHARE_SCOPES.map((scope) => (
              <label key={scope} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={scopes.includes(scope)}
                  onCheckedChange={(checked) =>
                    setScopes(checked ? [...scopes, scope] : scopes.filter((s) => s !== scope))
                  }
                />
                {t(`v2.finance.scopes.${scope}`)}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("v2.finance.scopesHint")}</p>
        </div>

        <Button className="mt-4" size="sm" onClick={submit} disabled={creating || !form.recipient_name.trim()}>
          {creating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {t("v2.finance.createShare")}
        </Button>

        {shareUrl && (
          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">{t("v2.finance.shareLinkOnce")}</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto whitespace-nowrap rounded bg-background px-2 py-1 text-xs">
                {shareUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast({ title: t("v2.finance.copied") });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <h2 className="mt-8 font-serif text-xl text-foreground">{t("v2.finance.activeShares")}</h2>
      {shares.length === 0 ? (
        <EmptyState icon={Share2} title={t("v2.finance.noShares")} />
      ) : (
        <div className="mt-3 space-y-2">
          {shares.map((s) => {
            const expired = new Date(s.expires_at) < new Date();
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                <div>
                  <p className="font-medium text-foreground">{s.recipient_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`v2.finance.recipientTypes.${s.recipient_type}`)} ·{" "}
                    {t("v2.finance.expiresOn", { date: new Date(s.expires_at).toLocaleDateString(i18n.language) })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(s.scopes ?? []).map((sc) => t(`v2.finance.scopes.${sc}`)).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    label={
                      s.revoked_at
                        ? t("v2.finance.revoked")
                        : expired
                        ? t("v2.finance.expired")
                        : t("v2.finance.active")
                    }
                    tone={s.revoked_at || expired ? "neutral" : "success"}
                  />
                  {!s.revoked_at && (
                    <Button size="sm" variant="outline" onClick={() => revoke(s.id)}>
                      <ShieldOff className="mr-1.5 h-4 w-4" />
                      {t("v2.finance.revoke")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mt-8 font-serif text-xl text-foreground">{t("v2.finance.auditLog")}</h2>
      <div className="mt-3 space-y-1.5">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("v2.finance.noEvents")}</p>
        ) : (
          events.map((e) => (
            <div key={e.id} className="flex justify-between gap-3 rounded border border-border bg-card px-3 py-2 text-xs">
              <span className="text-foreground">
                {t(`v2.finance.events.${e.event_type}`, { defaultValue: e.event_type })}
              </span>
              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString(i18n.language)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default V2FinanceSharing;
