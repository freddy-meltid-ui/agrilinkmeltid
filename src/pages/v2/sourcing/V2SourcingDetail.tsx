// AGRI-GRID V2 — Phase 1D: sourcing request detail — matching results, coverage, near-matches.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, History, Loader2, MapPin, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import CoverageOverview from "@/components/v2/sourcing/CoverageOverview";
import RecommendedSet from "@/components/v2/sourcing/RecommendedSet";
import MatchCard from "@/components/v2/sourcing/MatchCard";
import SourcingMap from "@/components/v2/sourcing/SourcingMap";
import { useProcessor } from "@/hooks/v2/useProcessor";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_REFERENCE, fetchReferenceData, refLabel, type ReferenceData } from "@/lib/v2/reference";
import {
  fetchSourcingEvents,
  fetchSourcingRequest,
  recommendCoverage,
  requestedTonnes,
  runMatching,
  STATUS_TONE,
  summariseMatches,
  updateSourcingRequest,
  type MatchRow,
  type SourcingEvent,
  type SourcingRequest,
} from "@/lib/v2/sourcing";

const V2SourcingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { bundle } = useProcessor();

  const [request, setRequest] = useState<SourcingRequest | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [events, setEvents] = useState<SourcingEvent[]>([]);
  const [tasks, setTasks] = useState<{ supply_id: string | null; status: string }[]>([]);
  const [reference, setReference] = useState<ReferenceData>(EMPTY_REFERENCE);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [busySupply, setBusySupply] = useState<string | null>(null);
  const [widen, setWiden] = useState({ radius: "", end: "" });

  useEffect(() => {
    fetchReferenceData().then(setReference);
  }, []);

  const loadTasks = useCallback(async (requestId: string) => {
    const { data } = await supabase.rpc("v2_sourcing_request_tasks", { _request_id: requestId });
    setTasks((data ?? []).map((r) => ({ supply_id: r.supply_id, status: r.status })));
  }, []);

  const runEngine = useCallback(
    async (req: SourcingRequest) => {
      setMatching(true);
      try {
        const result = await runMatching(req);
        setMatches(result.matches);
        setRequest(await fetchSourcingRequest(req.id));
        setEvents(await fetchSourcingEvents(req.id));
        await loadTasks(req.id);
      } catch (e) {
        toast({ title: t("v2.sourcing.matchError"), description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      } finally {
        setMatching(false);
      }
    },
    [t, loadTasks],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const req = await fetchSourcingRequest(id);
      if (cancelled) return;
      setRequest(req);
      setLoading(false);
      if (req) {
        setEvents(await fetchSourcingEvents(req.id));
        await loadTasks(req.id);
        if (params.get("run") === "1" || req.status !== "draft") await runEngine(req);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const requested = request ? requestedTonnes(request) : 0;
  const summary = useMemo(() => summariseMatches(matches, requested), [matches, requested]);
  const recommended = useMemo(
    () =>
      request
        ? recommendCoverage(matches, {
            requestedTonnes: requested,
            minPerSupplierT: request.min_quantity_per_supplier ? Number(request.min_quantity_per_supplier) : null,
            maxPerSupplierT: request.max_quantity_per_supplier ? Number(request.max_quantity_per_supplier) : null,
          }).allocations
        : [],
    [matches, request, requested],
  );

  const primary = matches.filter((m) => m.match_class === "match");
  const near = matches.filter((m) => m.match_class === "near_match");
  const facility = bundle.facilities.find((f) => f.id === request?.facility_id) ?? null;
  const allocatedBySupply = new Map(recommended.map((a) => [a.row.supply_id, a.tonnes]));
  const pendingTaskSupplies = new Set(
    tasks.filter((x) => ["open", "assigned", "in_progress"].includes(x.status)).map((x) => x.supply_id),
  );

  const requestReconfirmation = async (row: MatchRow) => {
    if (!request) return;
    setBusySupply(row.supply_id);
    const { error } = await supabase.rpc("v2_request_supply_reconfirmation", {
      _request_id: request.id,
      _supply_id: row.supply_id,
      _reason: t("v2.sourcing.reconfirmReason", { crop: request.crop_id, ref: row.supplier_ref }),
      _priority: "high",
    });
    setBusySupply(null);
    if (error) {
      toast({ title: t("v2.sourcing.reconfirmError"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("v2.sourcing.reconfirmCreated") });
    await loadTasks(request.id);
    setEvents(await fetchSourcingEvents(request.id));
  };

  const applyWidening = async () => {
    if (!request) return;
    const patch: Record<string, unknown> = {};
    if (widen.radius) patch.max_distance_km = Number(widen.radius);
    if (widen.end) patch.availability_end = widen.end;
    if (!Object.keys(patch).length) return;
    const updated = await updateSourcingRequest(request.id, patch);
    setRequest(updated);
    await runEngine(updated);
  };

  if (loading) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  if (!request) {
    return <EmptyState icon={Search} title={t("v2.sourcing.notFound")} description={t("v2.sourcing.notFoundHint")} />;
  }

  const crop = refLabel(reference.crops.find((c) => c.id === request.crop_id), i18n.language);
  const variety = request.variety_id ? refLabel(reference.varieties.find((v) => v.id === request.variety_id), i18n.language) : null;

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate("/app/sourcing")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {t("v2.sourcing.backToList")}
      </Button>

      <PageHeader
        title={`${crop}${variety ? ` — ${variety}` : ""} · ${requested.toFixed(1)} t`}
        description={t("v2.sourcing.detailSubtitle", {
          reference: request.reference,
          from: new Date(request.availability_start).toLocaleDateString(i18n.language),
          to: new Date(request.availability_end).toLocaleDateString(i18n.language),
          facility: facility?.name ?? "—",
          radius: request.max_distance_km ?? "—",
        })}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              label={t(`v2.sourcing.status.${request.status}`, { defaultValue: request.status })}
              tone={STATUS_TONE[request.status] ?? "neutral"}
            />
            <Button onClick={() => runEngine(request)} disabled={matching}>
              {matching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t("v2.sourcing.runMatching")}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <CoverageOverview summary={summary} />

        {summary.coverageRatio < 1 && (
          <section className="rounded-lg border border-dashed border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-medium">{t("v2.sourcing.widen.title")}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t("v2.sourcing.widen.description")}</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs">{t("v2.sourcing.fields.radius")}</Label>
                <Input
                  className="mt-1 w-32"
                  type="number"
                  placeholder={String(request.max_distance_km ?? "")}
                  value={widen.radius}
                  onChange={(e) => setWiden((w) => ({ ...w, radius: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">{t("v2.sourcing.fields.to")}</Label>
                <Input
                  className="mt-1 w-44"
                  type="date"
                  value={widen.end || request.availability_end}
                  onChange={(e) => setWiden((w) => ({ ...w, end: e.target.value }))}
                />
              </div>
              <Button variant="outline" onClick={applyWidening} disabled={matching}>
                {t("v2.sourcing.widen.cta")}
              </Button>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Tabs defaultValue="matches">
              <TabsList>
                <TabsTrigger value="matches">{t("v2.sourcing.tabs.matches", { count: primary.length })}</TabsTrigger>
                <TabsTrigger value="near">{t("v2.sourcing.tabs.near", { count: near.length })}</TabsTrigger>
                <TabsTrigger value="map">
                  <MapPin className="mr-1.5 h-4 w-4" />
                  {t("v2.sourcing.tabs.map")}
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="mr-1.5 h-4 w-4" />
                  {t("v2.sourcing.tabs.history")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="matches" className="mt-4 space-y-3">
                {matching ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("v2.sourcing.matchingRunning")}
                  </p>
                ) : primary.length === 0 ? (
                  <EmptyState icon={Search} title={t("v2.sourcing.noMatchTitle")} description={t("v2.sourcing.noMatchDescription")} />
                ) : (
                  primary.map((m) => (
                    <MatchCard
                      key={m.supply_id}
                      row={m}
                      allocated={allocatedBySupply.get(m.supply_id)}
                      onReconfirm={requestReconfirmation}
                      reconfirmBusy={busySupply === m.supply_id}
                      taskPending={pendingTaskSupplies.has(m.supply_id)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="near" className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">{t("v2.sourcing.nearNote")}</p>
                {near.length === 0 ? (
                  <EmptyState icon={AlertTriangle} title={t("v2.sourcing.noNearTitle")} description={t("v2.sourcing.noNearDescription")} />
                ) : (
                  near.map((m) => (
                    <MatchCard
                      key={m.supply_id}
                      row={m}
                      onReconfirm={requestReconfirmation}
                      reconfirmBusy={busySupply === m.supply_id}
                      taskPending={pendingTaskSupplies.has(m.supply_id)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="map" className="mt-4">
                <SourcingMap rows={matches} recommendedIds={recommended.map((a) => a.row.supply_id)} facility={facility} />
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <ul className="space-y-2 text-sm">
                  {events.map((e) => (
                    <li key={e.id} className="rounded-md border border-border p-3">
                      <p className="font-medium">{t(`v2.sourcing.event.${e.event_type}`, { defaultValue: e.event_type })}</p>
                      <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString(i18n.language)}</p>
                    </li>
                  ))}
                  {events.length === 0 && <p className="text-muted-foreground">{t("v2.sourcing.noEvents")}</p>}
                </ul>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <RecommendedSet allocations={recommended} requestedTonnes={requested} />
            {summary.identifiedTonnes > summary.highConfidenceTonnes && (
              <section className="rounded-lg border border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-accent-foreground" />
                  <h2 className="font-medium">{t("v2.sourcing.freshnessWarning.title")}</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("v2.sourcing.freshnessWarning.body", {
                    tonnes: (summary.identifiedTonnes - summary.highConfidenceTonnes).toFixed(1),
                  })}
                </p>
              </section>
            )}
            <p className="text-xs text-muted-foreground">{t("v2.sourcing.privacyNote")}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default V2SourcingDetail;
