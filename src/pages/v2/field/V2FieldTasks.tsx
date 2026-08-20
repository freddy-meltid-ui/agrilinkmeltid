// AGRI-GRID V2 — Phase 1D: sourcing-driven reconfirmation tasks for field agents.
// The processor's identity is never shown: agents see the supplier, crop and needed date.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ClipboardCheck, Loader2, XCircle } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { confirmReconfirmationTask, fetchTaskFeed, updateTaskStatus, type TaskFeedRow } from "@/lib/v2/sourcing";
import { supabase } from "@/integrations/supabase/client";

const PRIORITY_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  urgent: "danger",
  high: "warning",
  normal: "neutral",
  low: "neutral",
};

const V2FieldTasks = () => {
  const { t, i18n } = useTranslation();
  const [tasks, setTasks] = useState<TaskFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<TaskFeedRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ quantity: "", unit: "t", start: "", end: "", quality: "", price: "", observation: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await fetchTaskFeed());
    } catch {
      setTasks([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = (task: TaskFeedRow) => {
    setActive(task);
    setForm({
      quantity: task.current_quantity != null ? String(task.current_quantity) : "",
      unit: task.current_unit ?? "t",
      start: "",
      end: "",
      quality: "",
      price: "",
      observation: "",
    });
  };

  const submit = async (available: boolean) => {
    if (!active) return;
    setBusy(true);
    try {
      const { data: task } = await supabase
        .from("v2_reconfirmation_tasks")
        .select("id, supply_id, sourcing_request_id")
        .eq("id", active.task_id)
        .single();
      await confirmReconfirmationTask(task!, {
        available,
        quantity: form.quantity ? Number(form.quantity) : null,
        unit_code: form.unit || null,
        availability_start: form.start || null,
        availability_end: form.end || null,
        quality_grade: form.quality || null,
        asking_price: form.price ? Number(form.price) : null,
        observation: form.observation || null,
      });
      toast({ title: t(available ? "v2.tasks.confirmed" : "v2.tasks.markedUnavailable") });
      setActive(null);
      await load();
    } catch (e) {
      toast({ title: t("v2.tasks.error"), description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-6">
      <PageHeader title={t("v2.tasks.title")} description={t("v2.tasks.description")} />

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : tasks.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t("v2.tasks.emptyTitle")} description={t("v2.tasks.emptyDescription")} />
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const crop = i18n.language.startsWith("fr") ? task.crop_name_fr : task.crop_name_en;
            const closed = ["confirmed", "not_available", "completed", "cancelled"].includes(task.status);
            return (
              <li key={task.task_id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {t("v2.tasks.confirmLine", {
                        quantity: task.current_quantity != null ? `${task.current_quantity} ${task.current_unit ?? ""}` : "—",
                        crop: crop ?? "—",
                        supplier: task.supplier_name,
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {task.supplier_code}
                      {task.commune ? ` · ${task.commune}` : ""}
                      {task.needed_by ? ` · ${t("v2.tasks.neededBy", { date: new Date(task.needed_by).toLocaleDateString(i18n.language) })}` : ""}
                    </p>
                    {task.reason && <p className="mt-1 text-xs text-muted-foreground">{task.reason}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge label={t(`v2.tasks.priority.${task.priority}`, { defaultValue: task.priority })} tone={PRIORITY_TONE[task.priority] ?? "neutral"} />
                    <StatusBadge label={t(`v2.tasks.status.${task.status}`, { defaultValue: task.status })} tone={closed ? "success" : "info"} />
                  </div>
                </div>

                {!closed && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => open(task)}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      {t("v2.tasks.confirmCta")}
                    </Button>
                    {task.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await updateTaskStatus(task.task_id, "in_progress");
                          load();
                        }}
                      >
                        {t("v2.tasks.startCta")}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.tasks.dialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("v2.tasks.quantity")}</Label>
              <Input className="mt-1" type="number" step="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <Label>{t("v2.tasks.unit")}</Label>
              <Input className="mt-1" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div>
              <Label>{t("v2.tasks.from")}</Label>
              <Input className="mt-1" type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </div>
            <div>
              <Label>{t("v2.tasks.to")}</Label>
              <Input className="mt-1" type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
            <div>
              <Label>{t("v2.tasks.quality")}</Label>
              <Input className="mt-1" value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })} />
            </div>
            <div>
              <Label>{t("v2.tasks.price")}</Label>
              <Input className="mt-1" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t("v2.tasks.observation")}</Label>
              <Textarea className="mt-1" value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => submit(false)} disabled={busy}>
              <XCircle className="mr-1.5 h-4 w-4" />
              {t("v2.tasks.notAvailable")}
            </Button>
            <Button onClick={() => submit(true)} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
              {t("v2.tasks.confirmSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default V2FieldTasks;
