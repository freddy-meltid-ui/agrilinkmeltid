// AGRI-GRID V2 — Phase 3A: findings (readiness gaps) and corrective actions.
// Completing an action never makes a requirement compliant: a reassessment is
// always required, and the UI says so explicitly.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Wrench } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  actionTone,
  completeAction,
  createAction,
  fetchActions,
  fetchFindings,
  findingTone,
  severityTone,
  startAction,
  type ComplianceAction,
  type ComplianceFinding,
} from "@/lib/v2/compliance";

const V2ComplianceActions = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [actions, setActions] = useState<ComplianceAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [planFor, setPlanFor] = useState<ComplianceFinding | null>(null);
  const [completeFor, setCompleteFor] = useState<ComplianceAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", responsible_name: "", due_date: "" });
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [f, a] = await Promise.all([fetchFindings(activeOrg.id), fetchActions(activeOrg.id)]);
      setFindings(f);
      setActions(a);
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const submitPlan = async () => {
    if (!activeOrg || !planFor || !form.title.trim()) return;
    setSaving(true);
    try {
      await createAction({
        organization_id: activeOrg.id,
        finding_id: planFor.id,
        title: form.title.trim(),
        description: form.description || null,
        responsible_name: form.responsible_name || null,
        due_date: form.due_date || null,
        priority: planFor.severity,
      });
      toast({ title: t("v2.compliance.actionCreated") });
      setPlanFor(null);
      setForm({ title: "", description: "", responsible_name: "", due_date: "" });
      load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const submitComplete = async () => {
    if (!completeFor) return;
    setSaving(true);
    try {
      await completeAction(completeFor.id, note || null);
      toast({ title: t("v2.compliance.actionCompleted"), description: t("v2.compliance.reassessmentRequired") });
      setCompleteFor(null);
      setNote("");
      load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || orgLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openFindings = findings.filter((f) => ["open", "action_planned", "in_progress"].includes(f.status));

  return (
    <div>
      <PageHeader title={t("v2.compliance.tabs.actions")} description={t("v2.compliance.actionsDescription")} />

      <h2 className="mb-3 font-serif text-xl text-foreground">{t("v2.compliance.findings")}</h2>
      {!openFindings.length ? (
        <EmptyState icon={CheckCircle2} title={t("v2.compliance.noFindings")} />
      ) : (
        <div className="space-y-3">
          {openFindings.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{f.title}</p>
                  {f.description && <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge label={t(`v2.compliance.severity.${f.severity}`)} tone={severityTone(f.severity)} />
                  <StatusBadge label={t(`v2.compliance.findingStatus.${f.status}`)} tone={findingTone(f.status)} />
                </div>
              </div>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPlanFor(f);
                    setForm({ title: f.title, description: "", responsible_name: "", due_date: "" });
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("v2.compliance.planAction")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 mb-3 font-serif text-xl text-foreground">{t("v2.compliance.correctiveActions")}</h2>
      {!actions.length ? (
        <EmptyState icon={Wrench} title={t("v2.compliance.noActions")} />
      ) : (
        <div className="space-y-3">
          {actions.map((a) => {
            const overdue =
              a.due_date && ["open", "in_progress"].includes(a.status) && new Date(a.due_date) < new Date();
            return (
              <div key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{a.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.responsible_name || t("v2.compliance.unassigned")}
                      {a.due_date ? ` · ${a.due_date}` : ""}
                    </p>
                    {a.completion_note && <p className="mt-2 text-sm text-muted-foreground">{a.completion_note}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {overdue && (
                      <StatusBadge label={t("v2.compliance.overdue")} tone="danger" />
                    )}
                    <StatusBadge label={t(`v2.compliance.actionStatus.${a.status}`)} tone={actionTone(a.status)} />
                  </div>
                </div>
                {["open", "in_progress"].includes(a.status) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => startAction(a.id).then(load)}>
                        {t("v2.compliance.startAction")}
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setCompleteFor(a)}>
                      {t("v2.compliance.completeAction")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!planFor} onOpenChange={(o) => !o && setPlanFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.compliance.planAction")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("v2.compliance.actionTitle")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("v2.compliance.actionDescription")}</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("v2.compliance.responsible")}</Label>
                <Input
                  value={form.responsible_name}
                  onChange={(e) => setForm({ ...form, responsible_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("v2.compliance.dueDate")}</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitPlan} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("v2.common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completeFor} onOpenChange={(o) => !o && setCompleteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.compliance.completeAction")}</DialogTitle>
          </DialogHeader>
          <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("v2.compliance.reassessmentRequired")}
          </p>
          <div>
            <Label>{t("v2.compliance.completionNote")}</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={submitComplete} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("v2.compliance.completeAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default V2ComplianceActions;
