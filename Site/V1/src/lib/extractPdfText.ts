import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
// https://github.com/mozilla/pdf.js/issues/18269 — worker URL pour Vite
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

/** Nombre minimal de caractères « utiles » : en dessous, on tente l’OCR (bulletin scanné). */
const DEFAULT_MIN_TEXT_LENGTH = 120;

const OCR_PAGE_SCALE = 2.35;

export type ExtractPdfOptions = {
  /** Ignore la couche texte et passe tout de suite par OCR (pages rendues en image). */
  forceOcr?: boolean;
  /** Seuil pour déclencher l’OCR si le PDF a une couche texte trop pauvre. */
  minTextLength?: number;
  /** Messages pour l’UI (ex. « OCR : page 2/3 »). */
  onProgress?: (message: string) => void;
};

export type ExtractPdfResult = {
  text: string;
  /** Indique si le texte final vient de Tesseract (scan / image). */
  usedOcr: boolean;
};

async function extractTextLayer(pdf: PDFDocumentProxy): Promise<string> {
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it && typeof it.str === "string" ? it.str : ""))
      .join(" ");
    parts.push(line);
  }
  return parts.join("\n");
}

async function ocrPdfPages(pdf: PDFDocumentProxy, onProgress?: (message: string) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  onProgress?.("Téléchargement du moteur OCR (première fois : ~10–20 s)…");

  const worker = await createWorker("fra+eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && m.progress != null && m.progress > 0 && m.progress < 1) {
        onProgress?.(`Reconnaissance en cours… ${Math.round(m.progress * 100)} %`);
      }
    },
  });

  try {
    const parts: string[] = [];
    const n = pdf.numPages;
    for (let i = 1; i <= n; i++) {
      onProgress?.(`OCR : page ${i} / ${n}…`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: OCR_PAGE_SCALE });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Impossible d’utiliser Canvas 2D pour l’OCR.");
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;
      const { data } = await worker.recognize(canvas);
      parts.push(data.text ?? "");
    }
    return parts.join("\n\n");
  } finally {
    await worker.terminate();
  }
}

function meaningfulTextLength(text: string): number {
  return text.replace(/\s+/g, " ").trim().length;
}

/**
 * Extrait le texte d’un PDF : couche texte d’abord, puis OCR (Tesseract, français) si scan ou texte trop court.
 */
export async function extractTextFromPdfFile(
  file: File,
  options: ExtractPdfOptions = {},
): Promise<ExtractPdfResult> {
  const { forceOcr = false, minTextLength = DEFAULT_MIN_TEXT_LENGTH, onProgress } = options;

  const data = new Uint8Array(await file.arrayBuffer());
  onProgress?.("Ouverture du PDF…");
  const pdf = await pdfjs.getDocument({ data }).promise;

  let native = "";
  if (!forceOcr) {
    onProgress?.("Lecture du texte intégré…");
    native = await extractTextLayer(pdf);
  }

  const nativeLen = meaningfulTextLength(native);
  if (!forceOcr && nativeLen >= minTextLength) {
    return { text: native, usedOcr: false };
  }

  onProgress?.(
    forceOcr
      ? "OCR forcé : analyse des pages comme images…"
      : `Peu de texte natif (${nativeLen} car.) — tentative OCR sur ${pdf.numPages} page(s)…`,
  );

  try {
    const ocrText = await ocrPdfPages(pdf, onProgress);
    const ocrLen = meaningfulTextLength(ocrText);
    if (ocrLen > nativeLen) {
      return { text: ocrText, usedOcr: true };
    }
    if (nativeLen > 0) {
      onProgress?.("OCR peu concluant — conservation du texte natif.");
      return { text: native, usedOcr: false };
    }
    return { text: ocrText, usedOcr: true };
  } catch (e) {
    if (nativeLen > 0) {
      onProgress?.("OCR en échec — utilisation du texte natif partiel.");
      return { text: native, usedOcr: false };
    }
    throw e;
  }
}
