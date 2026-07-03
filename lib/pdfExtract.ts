// @ts-ignore
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

if (typeof window === "undefined") {
  try {
    // @ts-ignore
    const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (e) {}
}

export async function extrairTextoPdf(buffer: Buffer) {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  let textoCompleto = "";
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    textoCompleto += content.items.map((item: any) => item.str).join(" ") + " ";
  }
  
  return { texto: textoCompleto };
}

// Corrigido para aceitar apenas 1 argumento: texto
export function extrairDadosRelatorio(texto: string): any {
  const unidadeMatch = texto.match(/CEU\s+([A-Za-zÀ-ÿ\s]+?)(?=\s*\||Relatório|PERÍODO)/i);
  const periodoMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/);
  
  const limpezaMatch = texto.match(/(?:limpeza|desinfecção)[^.]+?(\d{1,2}(?:\/|\s+de\s+)\w+(?:\/|\s+de\s+)\d{4})/i);
  const pragasMatch = texto.match(/(?:controle de pragas|desinsetização)[^.]+?(\d{1,2}(?:\/|\s+de\s+)\w+(?:\/|\s+de\s+)\d{4})/i);

  return {
    unidade: unidadeMatch ? unidadeMatch[0].trim() : "CEU Não Identificado",
    periodoInicio: periodoMatch ? periodoMatch[1] : "",
    periodoFim: periodoMatch ? periodoMatch[2] : "",
    dataLimpezaReservatorio: limpezaMatch ? limpezaMatch[1] : null,
    dataControlePragas: pragasMatch ? pragasMatch[1] : null
  };
}
