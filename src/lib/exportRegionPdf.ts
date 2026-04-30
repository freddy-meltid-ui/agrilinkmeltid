import jsPDF from "jspdf";
import type { BeninRegion } from "@/lib/beninRegions";

const DISCLAIMER =
  "Avertissement : Les recommandations et rendements de ce document sont indicatifs. " +
  "Ils doivent être validés par des données locales, des essais terrain ou un conseiller agronome. " +
  "L'Atlas Agricole Intelligent n'est pas un cadastre officiel et ne fournit aucune information " +
  "de propriété foncière. Ce document n'a aucune valeur légale.";

export const exportRegionPdf = (region: BeninRegion) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin - 60) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, size: number, opts: { bold?: boolean; color?: [number, number, number] } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? [40, 40, 40]));
    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = size * 1.25;
    ensureSpace(lines.length * lineHeight);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight;
  };

  // Header band
  doc.setFillColor(6, 78, 59); // emerald-900
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Atlas Agricole — Fiche région", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`,
    margin,
    52,
  );
  y = 100;

  // Region title
  writeWrapped(`${region.name} — ${region.country}`, 20, { bold: true, color: [6, 78, 59] });
  y += 4;
  writeWrapped(region.agroecological_zone, 11, { color: [90, 90, 90] });
  y += 12;

  // Key data block
  writeWrapped("Caractéristiques agronomiques", 13, { bold: true, color: [20, 83, 45] });
  y += 4;
  const facts: [string, string][] = [
    ["Pluviométrie", region.rainfall_mm],
    ["Sol dominant", region.dominant_soil],
    ["Fertilité", region.fertility_level],
    ["Potentiel d'irrigation", region.irrigation_potential],
    ["Potentiel global", region.potential_level],
  ];
  facts.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    ensureSpace(16);
    doc.text(`${k} :`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(v, margin + 130, y);
    y += 16;
  });
  y += 10;

  // Crops
  writeWrapped(`Cultures recommandées (${region.recommended_crops.length})`, 13, {
    bold: true,
    color: [20, 83, 45],
  });
  y += 4;

  region.recommended_crops.forEach((c) => {
    ensureSpace(80);
    // Crop card background
    const startY = y;
    doc.setFillColor(245, 250, 247);
    doc.setDrawColor(209, 230, 219);
    const cardHeightEstimate = 70;
    doc.roundedRect(margin, startY, contentWidth, cardHeightEstimate, 4, 4, "FD");

    y = startY + 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(6, 78, 59);
    doc.text(c.crop_name, margin + 12, y);

    // Suitability tag right-aligned
    const tag = `Aptitude : ${c.suitability}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(tag, pageWidth - margin - 12, y, { align: "right" });
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = [
      `Rendement attendu : ${c.expected_yield_range}`,
      `Contraintes : ${c.key_constraints}`,
      `Recommandation : ${c.recommendation}`,
    ];
    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, contentWidth - 24);
      doc.text(wrapped, margin + 12, y);
      y += wrapped.length * 12;
    });
    y = Math.max(y, startY + cardHeightEstimate) + 10;
  });

  // Disclaimer footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fy = pageHeight - 56;
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(251, 191, 36); // amber-400
    doc.roundedRect(margin, fy, contentWidth, 44, 4, 4, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15);
    const dl = doc.splitTextToSize(DISCLAIMER, contentWidth - 16);
    doc.text(dl, margin + 8, fy + 12);

    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${p} / ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: "right" });
    doc.text("AgriGrid · Atlas Agricole", margin, pageHeight - 18);
  }

  doc.save(`atlas-agricole-${region.id}.pdf`);
};
