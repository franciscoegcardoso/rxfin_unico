/**
 * Exporta o relatório FIPE para PDF com margens mínimas e identidade visual RXFin.
 * Usa html-to-image para capturar seções e jsPDF para montar o documento.
 */
import type { RefObject } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const PDF_MARGIN_MM = 8;
const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;
const PDF_CONTENT_WIDTH_MM = PDF_PAGE_WIDTH_MM - 2 * PDF_MARGIN_MM;
const PDF_CONTENT_HEIGHT_MM = PDF_PAGE_HEIGHT_MM - 2 * PDF_MARGIN_MM;

const SECTION_ORDER = [
  'header',
  'valorFipe',
  'quantoCusta',
  'historicoFipe',
  'analiseSafra',
  'precoPorAno',
  'historico0km',
] as const;

export type PdfSectionRefs = Record<string, HTMLDivElement | null>;

export interface FipePdfExportOptions {
  sectionRefs: RefObject<PdfSectionRefs>;
  fileName?: string;
}

/**
 * Captura cada seção do relatório e gera o PDF.
 * O container do relatório deve estar montado no DOM (ex.: em div oculto).
 */
export async function exportFipeReportToPdf(options: FipePdfExportOptions): Promise<void> {
  const { sectionRefs, fileName = 'analise-fipe-rxfin.pdf' } = options;
  const refs = sectionRefs.current;
  if (!refs) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  let y = PDF_MARGIN_MM;
  const captureOptions = {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff',
    style: { margin: 0, padding: 0 },
  };

  for (const key of SECTION_ORDER) {
    const el = refs[key];
    if (!el) continue;

    try {
      const dataUrl = await toPng(el, captureOptions);
      const imgW = el.offsetWidth;
      const imgH = el.offsetHeight;
      if (imgW <= 0 || imgH <= 0) continue;

      // Escalar para caber na largura útil da página
      const scale = PDF_CONTENT_WIDTH_MM / imgW;
      const scaledH = imgH * scale;

      // Se não couber na página atual, quebrar para próxima
      if (y + scaledH > PDF_PAGE_HEIGHT_MM - PDF_MARGIN_MM) {
        doc.addPage();
        y = PDF_MARGIN_MM;
      }

      doc.addImage(
        dataUrl,
        'PNG',
        PDF_MARGIN_MM,
        y,
        PDF_CONTENT_WIDTH_MM,
        Math.min(scaledH, PDF_CONTENT_HEIGHT_MM)
      );
      y += scaledH + 4; // 4mm entre seções
    } catch (err) {
      console.warn(`FipePdfExport: falha ao capturar seção "${key}"`, err);
    }
  }

  doc.save(fileName);
}
