// Import direto do arquivo interno evita um bug conhecido do pdf-parse
// (o index.js do pacote roda um bloco de teste quando empacotado pelo Next.js).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
import { ExtractedReportData } from "./types";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buscarData(regex: RegExp, texto: string): string | null {
  const match = texto.match(regex);
  return match ? match[1] : null;
}

export async function extrairTextoPdf(buffer: Buffer): Promise<{ texto: string; paginas: number }> {
  const resultado = await pdfParse(buffer);
  return { texto: resultado.text, paginas: resultado.numpages };
}

export function extrairDadosRelatorio(texto: string, numeroPaginas: number): ExtractedReportData {
  const textoNorm = normalizar(texto);

  // Unidade (CEU)
  const unidadeMatch = texto.match(/CEU\s+([A-ZÀ-Ú][\wÀ-ú\s]{2,30}?)(?:\s{2,}|\s+\d{2}\/\d{2}\/\d{4}|\n)/);
  const unidade = unidadeMatch ? `CEU ${unidadeMatch[1].trim()}` : null;

  // Período do relatório: "15/05/2026 a 14/06/2026"
  const periodoMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/);
  const periodoInicio = periodoMatch ? periodoMatch[1] : null;
  const periodoFim = periodoMatch ? periodoMatch[2] : null;

  // Meses citados nos gráficos de água/energia (capturamos todos os meses do texto em sequência)
  const mesesEncontrados: string[] = [];
  MESES.forEach((mes) => {
    const mesNorm = normalizar(mes);
    const re = new RegExp(`\\b${mesNorm}\\b`, "g");
    if (re.test(textoNorm)) mesesEncontrados.push(mes);
  });

  // Data limpeza de reservatório
  const dataLimpezaReservatorio = buscarData(
    /reservat[oó]rios?\s+de\s+[áa]gua\s+foram\s+realizadas?\s+no\s+dia\s+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i,
    texto
  ) ?? buscarData(/limpeza\s+e\s+desinfec[cç][aã]o[^\.]*?(\d{1,2}\/\d{1,2}\/\d{2,4})/i, texto);

  // Data controle de pragas
  const dataControlePragas = buscarData(
    /controle\s+de\s+pragas\s+e\s+desinsetiza[cç][aã]o\s+foi\s+executado\s+em\s+(\d{2}\/\d{2}\/\d{4})/i,
    texto
  );

  // Validade licença sanitária (anexo)
  const validadeLicencaSanitaria = buscarData(/DATA DE VALIDADE:\s*(\d{2}\/\d{2}\/\d{4})/i, texto);

  // Mês de corte da regularidade fiscal
  const mesCorteFiscalMatch = texto.match(/m[eê]s de corte em\s+(\w+\s+de\s+\d{4})/i);
  const mesCorteFiscal = mesCorteFiscalMatch ? mesCorteFiscalMatch[1] : null;

  // Total de chamados
  const chamadosMatch = texto.match(/(\d+)\s+solicita[cç][oõ]es\s+de\s+servi[cç]os\/chamados/i);
  const totalChamados = chamadosMatch ? parseInt(chamadosMatch[1], 10) : null;

  // Anexos citados (ex: "Anexo I – ...")
  const anexosCitados = Array.from(texto.matchAll(/Anexo\s+([IVX]+)\s*[–\-]\s*([^\n]+)/gi)).map(
    (m) => `Anexo ${m[1]} - ${m[2].trim()}`
  );

  return {
    unidade,
    periodoInicio,
    periodoFim,
    mesesGraficoAgua: mesesEncontrados,
    mesesGraficoEnergia: mesesEncontrados,
    dataLimpezaReservatorio,
    dataControlePragas,
    validadeLicencaSanitaria,
    mesCorteFiscal,
    totalChamados,
    anexosCitados,
    textoCompleto: texto,
    numeroPaginas,
  };
}
