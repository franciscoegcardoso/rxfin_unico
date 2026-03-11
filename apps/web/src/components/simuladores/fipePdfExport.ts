/**
 * Exporta o relatório FIPE para PDF em uma única página A4.
 * Captura o container completo e escala para caber na página (evita elemento oculto = captura em branco).
 */
import type { RefObject } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const PDF_MARGIN_MM = 6;
const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;
const PDF_CONTENT_WIDTH_MM = PDF_PAGE_WIDTH_MM - 2 * PDF_MARGIN_MM;
const PDF_CONTENT_HEIGHT_MM = PDF_PAGE_HEIGHT_MM - 2 * PDF_MARGIN_MM;

export interface FipePdfExportOptions {
  /** Ref do container raiz do relatório (deve estar pintado no DOM, ex. opacity: 0 em viewport). */
  containerRef: RefObject<HTMLDivElement | null>;
  fileName?: string;
}

/**
 * Captura o container do relatório e gera um PDF de uma única página A4 com todo o conteúdo escalado.
 */
export async function exportFipeReportToPdf(options: FipePdfExportOptions): Promise<void> {
  const { containerRef, fileName = 'analise-fipe-rxfin.pdf' } = options;
  const el = containerRef.current;
  if (!el) {
    throw new Error('Container do relatório não encontrado. Tente novamente.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  try {
    const dataUrl = await toPng(el, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      style: { margin: 0, padding: 0 },
      filter: (node) => {
        // Não incluir nós que possam atrapalhar (ex. tooltips)
        if (node instanceof HTMLElement && node.getAttribute?.('data-pdf-ignore') === 'true') return false;
        return true;
      },
    });

    const imgW = el.offsetWidth;
    const imgH = el.offsetHeight;
    if (imgW <= 0 || imgH <= 0) {
      throw new Error('Dimensões do relatório inválidas. Tente novamente.');
    }

    // Escalar para caber em uma única página A4 (margens mínimas)
    const scaleW = PDF_CONTENT_WIDTH_MM / imgW;
    const scaleH = PDF_CONTENT_HEIGHT_MM / imgH;
    const scale = Math.min(scaleW, scaleH, 1);
    const w = imgW * scale;
    const h = imgH * scale;
    const x = PDF_MARGIN_MM + (PDF_CONTENT_WIDTH_MM - w) / 2;
    const y = PDF_MARGIN_MM + (PDF_CONTENT_HEIGHT_MM - h) / 2;

    doc.addImage(dataUrl, 'PNG', x, y, w, h);
  } catch (err) {
    console.error('FipePdfExport:', err);
    throw err;
  }

  doc.save(fileName);
}
