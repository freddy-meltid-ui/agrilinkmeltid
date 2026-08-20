// AGRI-GRID V2 — Phase 3A: compliance overview (readiness per program, activation)
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ClipboardCheck, FileWarning, Loader2, Plus, ShieldCheck, Wrench } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import {
  activateProgram,
  fetchComplianceDashboard,
  fetchOrgPrograms,
  fetchPrograms,
  programName,
  readinessTone,
  type ComplianceDashboard,
  type ComplianceProgram,
} from "@/lib/v2/compliance";

const V2ComplianceOverview = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [dashboard, setDashboard] = useState<ComplianceDashboard | null>(null);
  const [catalog, setCatalog] = useState<ComplianceProgram[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ program_id: "", facility_id: "none", target_audit_date: "" });

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [dash, programs, orgPrograms, fac] = await Promise.all([
        fetchComplianceDashboard(activeOrg.id),
        fetchPrograms(activeOrg.country),
        fetchOrgPrograms(activeOrg.id),
        supabase.from("v2_processing_facilities").select("id, name").eq("organization_id", activeOrg.id),
      ]);
      setDashboard(dash);
      setCatalog(programs);
      setActiveIds(orgPrograms.map((p) => p.program_id));
      setFacilities((fac.data as { id: string; name: string }[]) ?? []);
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const available = useMemo(() => catalog.filter((p) => !activeIds.includes(p.id)), [catalog, activeIds]);

  const submit = async () => {
    if (!activeOrg || !form.program_id) return;
    setSaving(true);
    try {
      await activateProgram({
        organization_id: activeOrg.id,
        program_id: form.program_id,
        facility_id: form.facility_id === "none" ? null : form.facility_id,
        target_audit_date: form.target_audit_date || null,
      });
      toast({ title: t("v2.compliance.programActivated") });
      setOpen(false);
      setForm({ program_id: "", facility_id: "none", target_audit_date: "" });
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

  if (!activeOrg) {
    return <EmptyState icon={ShieldCheck} title={t("v2.compliance.noProgramTitle")} />;
  }

  return (
    <div>
      <PageHeader
        title={t("v2.compliance.title")}
        description={t("v2.compliance.overviewDescription")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!available.length}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t("v2.compliance.activateProgram")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("v2.compliance.activateProgram")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("v2.compliance.program")}</Label>
                  <Select value={form.program_id} onValueChange={(v) => setForm({ ...form, program_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("v2.compliance.selectProgram")} />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {programName(p, i18n.language)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("v2.compliance.facility")}</Label>
                  <Select value={form.facility_id} onValueChange={(v) => setForm({ ...form, facility_id: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("v2.compliance.wholeOrganization")}</SelectItem>
                      {facilities.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("v2.compliance.targetAuditDate")}</Label>
                  <Input
                    type="date"
                    value={form.target_audit_date}
                    onChange={(e) => setForm({ ...form, target_audit_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={saving || !form.program_id}>
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {t("v2.compliance.activate")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("v2.compliance.kpi.programs")}
          value={dashboard?.active_programs ?? 0}
          icon={ClipboardCheck}
        />
        <KpiCard
          label={t("v2.compliance.kpi.openFindings")}
          value={dashboard?.open_findings ?? 0}
          hint={t("v2.compliance.kpi.criticalCount", { count: dashboard?.critical_findings ?? 0 })}
          icon={AlertTriangle}
        />
        <KpiCard
          label={t("v2.compliance.kpi.openActions")}
          value={dashboard?.open_actions ?? 0}
          hint={t("v2.compliance.kpi.overdue", { count: dashboard?.actions_overdue ?? 0 })}
          icon={Wrench}
        />
        <KpiCard
          label={t("v2.compliance.kpi.evidence")}
          value={dashboard?.evidence_total ?? 0}
          hint={t("v2.compliance.kpi.systemEvidence", { count: dashboard?.system_evidence ?? 0 })}
          icon={FileWarning}
        />
      </div>

      {(dashboard?.evidence_expired || dashboard?.documents_expired || dashboard?.evidence_expiring_soon || dashboard?.documents_expiring_soon) ? (
        <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-medium text-foreground">{t("v2.compliance.validity")}</p>
          <p className="mt-1 text-muted-foreground">
            {t("v2.compliance.validitySummary", {
              expired: (dashboard?.evidence_expired ?? 0) + (dashboard?.documents_expired ?? 0),
              soon: (dashboard?.evidence_expiring_soon ?? 0) + (dashboard?.documents_expiring_soon ?? 0),
              days: dashboard?.expiring_soon_days ?? 60,
            })}
          </p>
        </div>
      ) : null}

      <h2 className="mt-8 mb-3 font-serif text-xl text-foreground">{t("v2.compliance.myPrograms")}</h2>
      {!dashboard?.programs?.length ? (
        <EmptyState
          icon={ShieldCheck}
          title={t("v2.compliance.noProgramTitle")}
          description={t("v2.compliance.noProgramDescription")}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {dashboard.programs.map((p) => (
            <Link
              key={p.org_program_id}
              to={`/app/compliance/programs/${p.org_program_id}`}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {i18n.language.startsWith("fr") ? p.name_fr : p.name_en}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.code}</p>
                </div>
                <StatusBadge label={t(`v2.compliance.state.${p.state}`)} tone={readinessTone(p.state)} />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={Number(p.readiness) || 0} className="h-2" />
                <span className="w-14 shrink-0 text-right text-sm font-semibold text-foreground">
                  {Number(p.readiness ?? 0).toFixed(0)}%
                </span>
              </div>
              {p.critical_gate && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("v2.compliance.criticalGate")}
                </p>
              )}
              {p.target_audit_date && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("v2.compliance.targetAuditDate")}: {p.target_audit_date}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default V2ComplianceOverview;
