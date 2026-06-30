export type CheckStatus = "ok" | "atencao" | "desatualizado";

export interface CheckItem {
  id: string;
  titulo: string;
  status: CheckStatus;
  detalhe: string;
  origem: "regra" | "ia";
}

export interface ExtractedReportData {
  unidade: string | null;
  periodoInicio: string | null; // dd/mm/aaaa
  periodoFim: string | null; // dd/mm/aaaa
  mesesGraficoAgua: string[]; // ex: ["janeiro","fevereiro","marco","abril","maio"]
  mesesGraficoEnergia: string[];
  dataLimpezaReservatorio: string | null;
  dataControlePragas: string | null;
  validadeLicencaSanitaria: string | null;
  mesCorteFiscal: string | null;
  totalChamados: number | null;
  anexosCitados: string[];
  textoCompleto: string;
  numeroPaginas: number;
}

export interface ImageFingerprint {
  pagina: number;
  hash: string;
}

export interface HistoricoMes {
  unidade: string;
  periodoFim: string; // usado como chave de ordenacao / identificacao do mes
  dados: ExtractedReportData;
  imagens: ImageFingerprint[];
  salvoEm: string;
}

export interface AnalysisResult {
  unidade: string | null;
  periodo: string | null;
  itens: CheckItem[];
  resumo: {
    ok: number;
    atencao: number;
    desatualizado: number;
  };
  temHistoricoAnterior: boolean;
}
