// AGRI-GRID V2 — field network admin console (agents, assignments, data quality)
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldAlert, UserPlus, Users } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import FreshnessBadge from "@/components/v2/field/FreshnessBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useFieldNetwork } from "@/hooks/v2/useFieldNetwork";
import { computeFreshness } from "@/lib/v2/freshness";
import { runFieldMutation } from "@/lib/v2/fieldSync";
import type { FieldAgent } from "@/lib/v2/supply";

type Assignment = { id: string; supplier_id: string; field_agent_id: string; is_primary: boolean };

const V2FieldAdmin = () => {
  const { t } = useTranslation();
  const { isAdmin, workspace, thresholds, reload } = useFieldNetwork();

  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ supplierId: "", agentId: "" });
  const [agentForm, setAgentForm] = useState({ user_id: "", full_name: "", phone: "", coverage: "" });
  const [agentOpen, setAgentOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [agentRes, assignRes] = await Promise.all([
      supabase.from("v2_field_agents").select("*").order("full_name"),
      supabase.from("v2_supplier_assignments").select("id, supplier_id, field_agent_id, is_primary"),
    ]);
    setAgents((agentRes.data as FieldAgent[]) ?? []);
    setAssignments((assignRes.data as Assignment[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin, load]);

  const staleSuppliers = useMemo(
    () =>
      workspace.suppliers.filter(
        (s) => computeFreshness(s.last_verified_at ?? s.updated_at, thresholds).status === "needs_verification",
      ),
    [workspace.suppliers, thresholds],
  );

  const assignedCount = (agentId: string) => assignments.filter((a) => a.field_agent_id === agentId).length;

  if (!isAdmin) {
    return <EmptyState icon={ShieldAlert} title={t("v2.field.admin.restricted")} description={t("v2.field.admin.restrictedHint")} />;
  }

  const createAgent = async () => {
    setBusy(true);
    await runFieldMutation(
      "supplier.update",
      async () => {
        const { error } = await supabase.from("v2_field_agents").insert({
          user_id: agentForm.user_id.trim(),
          full_name: agentForm.full_name.trim(),
          phone: agentForm.phone || null,
          assigned_areas: agentForm.coverage
            ? agentForm.coverage.split(",").map((a) => a.trim()).filter(Boolean)
            : [],
          status: "active",
        });
        if (error) throw error;
      },
      { successMessage: t("v2.field.admin.agentCreated") },
    );
    setBusy(false);
    setAgentOpen(false);
    setAgentForm({ user_id: "", full_name: "", phone: "", coverage: "" });
    load();
  };

  const createAssignment = async () => {
    if (!assignForm.supplierId || !assignForm.agentId) return;
    setBusy(true);
    await runFieldMutation(
      "supplier.update",
      async () => {
        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase.from("v2_supplier_assignments").insert({
          supplier_id: assignForm.supplierId,
          field_agent_id: assignForm.agentId,
          assigned_by: userRes.user?.id,
        });
        if (error) throw error;
      },
      { successMessage: t("v2.field.admin.assignmentCreated") },
    );
    setBusy(false);
    setAssignOpen(false);
    setAssignForm({ supplierId: "", agentId: "" });
    await load();
    await reload();
  };

  return (
    <div className="pb-8">
      <PageHeader title={t("v2.field.admin.title")} description={t("v2.field.admin.description")} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("v2.field.admin.agents")} value={agents.length} icon={Users} />
        <KpiCard label={t("v2.field.admin.suppliers")} value={workspace.suppliers.length} icon={Users} />
        <KpiCard label={t("v2.field.admin.assignments")} value={assignments.length} icon={Users} />
        <KpiCard label={t("v2.field.admin.staleRecords")} value={staleSuppliers.length} icon={ShieldAlert} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Dialog open={agentOpen} onOpenChange={setAgentOpen}>
          <DialogTrigger asChild>
            <Button className="h-12"><UserPlus className="mr-2 h-4 w-4" />{t("v2.field.admin.newAgent")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("v2.field.admin.newAgent")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>{t("v2.field.admin.agentName")}</Label><Input className="h-12" value={agentForm.full_name} onChange={(e) => setAgentForm({ ...agentForm, full_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("v2.field.admin.agentUserId")}</Label><Input className="h-12" value={agentForm.user_id} onChange={(e) => setAgentForm({ ...agentForm, user_id: e.target.value })} placeholder="uuid" /></div>
              <div className="space-y-1.5"><Label>{t("v2.field.register.phone")}</Label><Input className="h-12" value={agentForm.phone} onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("v2.field.admin.coverage")}</Label><Input className="h-12" value={agentForm.coverage} onChange={(e) => setAgentForm({ ...agentForm, coverage: e.target.value })} /></div>
              <p className="text-xs text-muted-foreground">{t("v2.field.admin.agentLinkHint")}</p>
            </div>
            <DialogFooter>
              <Button className="h-12 w-full" disabled={busy || !agentForm.full_name || !agentForm.user_id} onClick={createAgent}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("v2.common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-12">{t("v2.field.admin.newAssignment")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("v2.field.admin.newAssignment")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("v2.field.admin.supplier")}</Label>
                <Select value={assignForm.supplierId} onValueChange={(v) => setAssignForm({ ...assignForm, supplierId: v })}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {workspace.suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("v2.field.admin.agent")}</Label>
                <Select value={assignForm.agentId} onValueChange={(v) => setAssignForm({ ...assignForm, agentId: v })}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button className="h-12 w-full" disabled={busy} onClick={createAssignment}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("v2.common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{t("v2.field.admin.agents")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {agents.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground">{a.assigned_areas?.join(", ") || "—"} · {t("v2.field.admin.assignedCount", { count: assignedCount(a.id) })}</p>
                </div>
                <StatusBadge tone={a.status === "active" ? "success" : "warning"} label={a.status} />
              </div>
            ))}
            {!loading && agents.length === 0 && <p className="text-sm text-muted-foreground">{t("v2.field.admin.noAgents")}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{t("v2.field.admin.dataQuality")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {staleSuppliers.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{s.display_name}</p>
                  <p className="text-xs text-muted-foreground">{[s.village, s.commune].filter(Boolean).join(", ") || "—"}</p>
                </div>
                <FreshnessBadge date={s.last_verified_at ?? s.updated_at} thresholds={thresholds} />
              </div>
            ))}
            {staleSuppliers.length === 0 && <p className="text-sm text-muted-foreground">{t("v2.field.sections.allFresh")}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default V2FieldAdmin;
