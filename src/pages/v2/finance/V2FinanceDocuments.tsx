// AGRI-GRID V2 — Phase 3B: financing document checklist.
// Documents are REUSED from the Phase 3A versioned library — never uploaded twice.
// A checklist line is satisfied once; extra linked documents never raise readiness.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, FileText, Link2, Loader2, Unlink } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  docDescription,
  docLabel,
  fetchFinanceDocuments,
  fetchLibraryDocuments,
  linkDocument,
  unlinkDocument,
  type FinanceDocumentStatus, formatDate} from "@/lib/v2/finance";

type LibraryDoc = { id: string; title: string; category: string; current_version: number };

const V2FinanceDocuments = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [docs, setDocs] = useState<FinanceDocumentStatus[]>([]);
  const [library, setLibrary] = useState<LibraryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [d, l] = await Promise.all([fetchFinanceDocuments(activeOrg.id), fetchLibraryDocuments(activeOrg.id)]);
      setDocs(d);
      setLibrary(l as LibraryDoc[]);
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const attach = async (code: string, documentId: string) => {
    if (!activeOrg) return;
    setPending(code);
    try {
      await linkDocument(activeOrg.id, code, documentId);
      toast({ title: t("v2.finance.documentLinked") });
      load();
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const detach = async (linkId: string) => {
    try {
      await unlinkDocument(linkId);
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

  if (!activeOrg) return <EmptyState icon={FileText} title={t("v2.finance.noData")} />;

  const groups: FinanceDocumentStatus["importance"][] = ["required", "recommended", "situational"];

  return (
    <div>
      <PageHeader title={t("v2.finance.documentsTitle")} description={t("v2.finance.documentsDescription")} />

      <div className="mb-5 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        {t("v2.finance.documentsNotice")}{" "}
        <Link className="underline" to="/app/compliance/documents">
          {t("v2.finance.openLibrary")}
        </Link>
      </div>

      {groups.map((group) => {
        const items = docs.filter((d) => d.importance === group);
        if (!items.length) return null;
        return (
          <div key={group} className="mb-8">
            <h2 className="mb-3 font-serif text-lg text-foreground">{t(`v2.finance.importance.${group}`)}</h2>
            <div className="space-y-3">
              {items.map((d) => (
                <div key={d.code} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-medium text-foreground">
                        {docLabel(d, i18n.language)}
                        {d.available && (
                          <StatusBadge label={t("v2.finance.availableBadge")} tone="success" />
                        )}
                        {!d.available && d.linked_but_expired && (
                          <StatusBadge label={t("v2.finance.expiredBadge")} tone="danger" />
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{docDescription(d, i18n.language)}</p>
                    </div>
                    <div className="w-full sm:w-64">
                      <Select
                        value=""
                        onValueChange={(v) => attach(d.code, v)}
                        disabled={pending === d.code || library.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              library.length
                                ? t("v2.finance.linkExisting")
                                : t("v2.finance.libraryEmpty")
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {library.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id}>
                              {doc.title} (v{doc.current_version})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {d.linked_documents?.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {d.linked_documents.map((ld) => (
                        <li
                          key={ld.link_id}
                          className="flex items-center justify-between gap-2 rounded border border-border bg-background px-3 py-1.5 text-xs"
                        >
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Link2 className="h-3.5 w-3.5" />
                            {ld.title ?? "—"}
                            {ld.current_version ? (
                              <span className="text-muted-foreground/70">· v{ld.current_version}</span>
                            ) : null}
                            {ld.expiry_date ? (
                              <span
                                className={
                                  ld.expiry_status === "expired"
                                    ? "text-destructive"
                                    : "text-muted-foreground/70"
                                }
                              >
                                · {t(`v2.finance.expiry.${ld.expiry_status ?? "no_expiry"}`)} (
                                {formatDate(ld.expiry_date, i18n.language)})
                              </span>
                            ) : null}
                            <span className="text-muted-foreground/70">
                              · {t("v2.finance.source.compliance_document_library")}
                            </span>
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => detach(ld.link_id)}>
                            <Unlink className="mr-1 h-3.5 w-3.5" />
                            {t("v2.finance.unlink")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {d.linked_documents?.length > 1 && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5" />
                      {t("v2.finance.duplicateNotice")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default V2FinanceDocuments;
