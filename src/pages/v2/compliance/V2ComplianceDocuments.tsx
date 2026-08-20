// AGRI-GRID V2 — Phase 3A: versioned document library with validity tracking.
// Uploading a new file never overwrites the previous one: it creates a new
// version and the history stays available.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, History, Loader2, Plus, Upload } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  DOCUMENT_CATEGORIES,
  addDocumentVersion,
  createDocument,
  expiryStatus,
  expiryTone,
  fetchDocuments,
  signedEvidenceUrl,
  uploadDocumentFile,
  type ComplianceDocument,
  type ComplianceDocumentVersion,
  type DocumentCategory,
} from "@/lib/v2/compliance";

type DocRow = ComplianceDocument & { versions: ComplianceDocumentVersion[] };

const V2ComplianceDocuments = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [versionFor, setVersionFor] = useState<DocRow | null>(null);
  const [historyFor, setHistoryFor] = useState<DocRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", category: "legal" as DocumentCategory, description: "" });
  const [vForm, setVForm] = useState({ file: null as File | null, issue_date: "", expiry_date: "", notes: "" });

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setDocs(await fetchDocuments(activeOrg.id));
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const submitDoc = async () => {
    if (!activeOrg || !form.title.trim()) return;
    setSaving(true);
    try {
      await createDocument({
        organization_id: activeOrg.id,
        title: form.title.trim(),
        category: form.category,
        description: form.description || null,
      });
      toast({ title: t("v2.compliance.documentCreated") });
      setNewOpen(false);
      setForm({ title: "", category: "legal", description: "" });
      load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const submitVersion = async () => {
    if (!activeOrg || !versionFor || !vForm.file) return;
    setSaving(true);
    try {
      const path = await uploadDocumentFile(activeOrg.id, vForm.file);
      await addDocumentVersion({
        document_id: versionFor.id,
        storage_path: path,
        file_name: vForm.file.name,
        issue_date: vForm.issue_date || null,
        expiry_date: vForm.expiry_date || null,
        notes: vForm.notes || null,
      });
      toast({ title: t("v2.compliance.versionAdded") });
      setVersionFor(null);
      setVForm({ file: null, issue_date: "", expiry_date: "", notes: "" });
      load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openFile = async (path: string) => {
    const url = await signedEvidenceUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast({ title: t("v2.common.error"), variant: "destructive" });
  };

  if (loading || orgLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("v2.compliance.tabs.documents")}
        description={t("v2.compliance.documentsDescription")}
        actions={
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                {t("v2.compliance.newDocument")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("v2.compliance.newDocument")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("v2.compliance.documentTitle")}</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>{t("v2.compliance.documentCategory")}</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v as DocumentCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`v2.compliance.docCategory.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("v2.compliance.actionDescription")}</Label>
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submitDoc} disabled={saving || !form.title.trim()}>
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {t("v2.common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {!docs.length ? (
        <EmptyState
          icon={FileText}
          title={t("v2.compliance.noDocuments")}
          description={t("v2.compliance.noDocumentsDescription")}
        />
      ) : (
        <div className="space-y-3">
          {docs.map((d) => {
            const current = d.versions?.find((v) => v.is_current) ?? null;
            const status = expiryStatus(current?.expiry_date);
            return (
              <div key={d.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{d.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(`v2.compliance.docCategory.${d.category}`)} · v{d.current_version} ·{" "}
                      {t("v2.compliance.versionCount", { count: d.versions?.length ?? 0 })}
                    </p>
                    {current?.expiry_date && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("v2.compliance.expiryDate")}: {current.expiry_date}
                      </p>
                    )}
                  </div>
                  <StatusBadge label={t(`v2.compliance.expiry.${status}`)} tone={expiryTone(status)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {current && (
                    <Button size="sm" variant="outline" onClick={() => openFile(current.storage_path)}>
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                      {t("v2.compliance.openCurrent")}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setVersionFor(d)}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {t("v2.compliance.newVersion")}
                  </Button>
                  {(d.versions?.length ?? 0) > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => setHistoryFor(d)}>
                      <History className="mr-1.5 h-3.5 w-3.5" />
                      {t("v2.compliance.history")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!versionFor} onOpenChange={(o) => !o && setVersionFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.compliance.newVersion")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("v2.compliance.file")}</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setVForm({ ...vForm, file: e.target.files?.[0] ?? null })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("v2.compliance.issueDate")}</Label>
                <Input
                  type="date"
                  value={vForm.issue_date}
                  onChange={(e) => setVForm({ ...vForm, issue_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("v2.compliance.expiryDate")}</Label>
                <Input
                  type="date"
                  value={vForm.expiry_date}
                  onChange={(e) => setVForm({ ...vForm, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{t("v2.compliance.notes")}</Label>
              <Textarea rows={2} value={vForm.notes} onChange={(e) => setVForm({ ...vForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitVersion} disabled={saving || !vForm.file}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("v2.compliance.upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.compliance.history")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {[...(historyFor?.versions ?? [])]
              .sort((a, b) => b.version_number - a.version_number)
              .map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => openFile(v.storage_path)}
                  className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:border-primary/40"
                >
                  <span className="truncate">
                    v{v.version_number} · {v.file_name}
                  </span>
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                    {new Date(v.uploaded_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default V2ComplianceDocuments;
