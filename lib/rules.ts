import { CheckItem, ImageFingerprint } from "./types";

function parseDataBr(str: string): Date | null {
  if (!str) return null;
  const meses: any = { janeiro:0, fevereiro:1, março:2, abril:3, maio:4, junho:5, julho:6, agosto:7, setembro:8, outubro:9, novembro:10, dezembro:11 };
  
  if (str.includes("/")) {
    const [d, m, y] = str.split("/").map(Number);
    return new Date(y, m - 1, d);
  } else {
    const match = str.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
    if (match) {
      const [_, d, m, y] = match;
      return new Date(parseInt(y), meses[m.toLowerCase()] || 0, parseInt(d));
    }
  }
  return null;
}

export function rodarChecagensAutomaticas(dados: any, fingerprintsAtual: ImageFingerprint[], historicoAnterior: any): CheckItem[] {
  const itens: CheckItem[] = [];
  const texto = dados.textoCompleto?.toLowerCase() || "";
  const dataRef = parseDataBr(dados.periodoFim) || new Date();

  const validarQuadrimestral = (dataStr: string, titulo: string, id: string) => {
    const dataServico = parseDataBr(dataStr);
    if (!dataServico) {
      itens.push({ id, titulo, status: "atencao", detalhe: `Data não identificada no texto para validade.`, origem: "regra" });
      return;
    }
    const diffMeses = (dataRef.getFullYear() - dataServico.getFullYear()) * 12 + (dataRef.getMonth() - dataServico.getMonth());
    const estaValido = diffMeses <= 4;
    itens.push({
      id, titulo,
      status: estaValido ? "ok" : "atencao",
      detalhe: `Realizado em ${dataStr}. ${estaValido ? 'Dentro da validade quadrimestral.' : 'Atenção: Vencido ou fora do período de 4 meses.' }`,
      origem: "regra"
    });
  };

  validarQuadrimestral(dados.dataControlePragas, "Controle de Pragas", "pragas");
  validarQuadrimestral(dados.dataLimpezaReservatorio, "Limpeza de Reservatório", "reservatorio");

  const temTI = texto.includes("wi-fi") || texto.includes("internet") || texto.includes("conectividade");
  itens.push({
    id: "ti", titulo: "TI e Wi-Fi",
    status: temTI ? "ok" : "atencao",
    detalhe: temTI ? "Infraestrutura de TI citada no relatório." : "Informações de TI não localizadas.",
    origem: "regra"
  });

  const temCftv = texto.includes("cftv") || texto.includes("câmeras") || texto.includes("monitoramento");
  itens.push({
    id: "cftv", titulo: "Câmeras (CFTV)",
    status: temCftv ? "ok" : "atencao",
    detalhe: temCftv ? "Menção ao sistema de câmeras identificada." : "Sistema de câmeras não citado.",
    origem: "regra"
  });

  const temFiscal = texto.includes("fgts") || texto.includes("inss") || texto.includes("cnd") || texto.includes("regularidade");
  itens.push({
    id: "fiscal", titulo: "Regularidade Fiscal/Trabalhista",
    status: temFiscal ? "ok" : "atencao",
    detalhe: temFiscal ? "Dados de regularidade identificados no texto." : "Não foram identificadas menções à regularidade fiscal.",
    origem: "regra"
  });

  return itens;
}
