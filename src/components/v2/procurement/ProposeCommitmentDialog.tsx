// AGRI-GRID V2 — Phase 1E: the processor selects a matched supplier and asks for an
// explicit quantity. This creates a PROPOSAL only — nothing is reserved until the
// supplier (or their field agent) confirms.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Handshake, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MatchRow, SourcingRequest } from "@/lib/v2/sourcing";

export type ProposePayload = {
  quantity: number;
  unitCode: string;
  start: string | null;
  end: string | null;
  targetPrice: number | null;
  notes: string | null;
};

const ProposeCommitmentDialog = ({
  open,
  onOpenChange,
  row,
  request,
  suggested,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: MatchRow | null;
  request: SourcingRequest;
  suggested?: number;
  busy?: boolean;
  onSubmit: (payload: ProposePayload) => void;
}) => {
  const { t } = useTranslation();
  const available = Number(row?.quantity_tonnes ?? 0);
  const [quantity, setQuantity] = useState("");
  const [start, setStart] = useState(request.availability_start);
  const [end, setEnd] = useState(request.availability_end);
  const [price, setPrice] = useState(request.target_price ? String(request.target_price) : "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !row) return;
    const proposal = Math.min(available, suggested && suggested > 0 ? suggested : available);
    setQuantity(proposal ? proposal.toFixed(2) : "");
    setStart(request.availability_start);
    setEnd(request.availability_end);
    setPrice(request.target_price ? String(request.target_price) : "");
    setNotes("");
  }, [open, row, available, suggested, request.availability_start, request.availability_end, request.target_price]);

  const qty = Number(quantity);
  const tooMuch = qty > available + 0.001;
  const invalid = !qty || qty <= 0 || tooMuch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("v2.procurement.propose.title")}</DialogTitle>
          <DialogDescription>
            {t("v2.procurement.propose.description", { supplier: row?.supplier_ref ?? "", available: available.toFixed(2) })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="commit-qty">{t("v2.procurement.propose.quantity")}</Label>
            <Input
              id="commit-qty"
              type="number"
              step="0.01"
              min="0"
              className="mt-1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {tooMuch && <p className="mt-1 text-xs text-destructive">{t("v2.procurement.propose.tooMuch", { available: available.toFixed(2) })}</p>}
          </div>
          <div>
            <Label htmlFor="commit-start">{t("v2.procurement.propose.from")}</Label>
            <Input id="commit-start" type="date" className="mt-1" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="commit-end">{t("v2.procurement.propose.to")}</Label>
            <Input id="commit-end" type="date" className="mt-1" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="commit-price">{t("v2.procurement.propose.price")}</Label>
            <Input id="commit-price" type="number" step="1" className="mt-1" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="commit-notes">{t("v2.procurement.propose.notes")}</Label>
            <Textarea id="commit-notes" className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{t("v2.procurement.propose.disclaimer")}</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            disabled={invalid || busy}
            onClick={() =>
              onSubmit({
                quantity: qty,
                unitCode: "t",
                start: start || null,
                end: end || null,
                targetPrice: price ? Number(price) : null,
                notes: notes || null,
              })
            }
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Handshake className="mr-2 h-4 w-4" />}
            {t("v2.procurement.propose.cta")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProposeCommitmentDialog;
