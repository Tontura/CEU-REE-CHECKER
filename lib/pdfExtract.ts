import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// Configuração do Worker para ambiente Node.js
if (typeof window === "undefined") {
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export async function extrairTextoPdf(buffer: Buffer) {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  let textoCompleto = "";
  const paginasTexto: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    const textoPagina = strings.join(" ");
    textoCompleto += textoPagina + "\n";
    paginasTexto.push(textoPagina);
  }

  return { texto: textoCompleto, paginas: paginasTexto };
}

export function extrairDadosRelatorio(texto: string, paginas: string[]): any {
  const dados: any = {
    unidade: null,
    periodoInicio: null,
    periodoFim: null,
    dataLimpezaReservatorio: null,
    dataControlePragas: null,
    validadeLicencaSanitaria: null,
    totalChamados: null,
    anexosCitados: [],
    textoCompleto: texto,
    numeroPaginas: paginas.length
  };

  // 1. Identificar Unidade (Ex: CEU Silvio Santos)
  const unidadeMatch = texto.match(/CEU\s+([A-Za-zÀ-ÿ\s]+?)(?=\s*\||Relatório|PERÍODO)/i);
  if (unidadeMatch) dados.unidade = unidadeMatch[0].trim();

  // 2. Identificar Período (00/00/0000 a 00/00/0000)
  const periodoMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/);
  if (periodoMatch) {
    dados.periodoInicio = periodoMatch[1];
    dados.periodoFim = periodoMatch[2];
  }

  // 3. Identificar Data Limpeza Reservatório (Aceita "18 de junho de 2026" ou "18/06/2026")
  const limpezaMatch = texto.match(/(?:limpeza|desinfecção)[^.]+?(?:realizada|executada)[^.]+?(\d{1,2}(?:\/|\s+de\s+)\w+(?:\/|\s+de\s+)\d{4})/i);
  if (limpezaMatch) dados.dataLimpezaReservatorio = limpezaMatch[1];

  // 4. Identificar Data Controle Pragas
  const pragasMatch = texto.match(/(?:controle de pragas|desinsetização)[^.]+?(?:realizado|executado)[^.]+?(\d{1,2}(?:\/|\s+de\s+)\w+(?:\/|\s+de\s+)\d{4})/i);
  if (pragasMatch) dados.dataControlePragas = pragasMatch[1];

  // 5. Chamados
  const chamadosMatch = texto.match(/total\s*de\s*chamados[^:]*:\s*(\d+)/i) || texto.match(/(\d+)\s*chamados/i);
  if (chamadosMatch) dados.totalChamados = parseInt(chamadosMatch[1]);

  // 6. Anexos Citados (Procura por nomes de anexos comuns)
  const anexosMatch = texto.match(/Anexo\s+[IVX]+[^.]+/gi);
  if (anexosMatch) dados.anexosCitados = anexosMatch.map(a => a.trim());

  return dados;
}
