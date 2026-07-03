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

  // Função Auxiliar de Validade
  const validarQuadrimestral = (dataStr: string, titulo: string, id: string) => {
    const dataServico = parseDataBr(dataStr);
    if (!dataServico) {
      itens.push({ id, titulo, status: "atencao", detalhe: `Data não identificada no texto ou formato inválido.`, origem: "regra" });
      return;
    }
    const diffMeses = (dataRef.getFullYear() - dataServico.getFullYear()) * 12 + (dataRef.getMonth() - dataServico.getMonth());
    const estaValido = diffMeses <= 4;
    itens.push({
      id, titulo,
      status: estaValido ? "ok" : "atencao",
      detalhe: `Realizado em ${dataStr}. ${estaValido ? 'Dentro da validade quadrimestral.' : 'Atenção: Vencido ou próximo do vencimento (limite 4 meses).' }`,
      origem: "regra"
    });
  };

  // 1 e 2. Pragas e Reservatórios
  validarQuadrimestral(dados.dataControlePragas, "Controle de Pragas", "pragas");
  validarQuadrimestral(dados.dataLimpezaReservatorio, "Limpeza de Reservatório", "reservatorio");

  // 3. TI e Wi-Fi
  const temTI = texto.includes("wi-fi") || texto.includes("internet") || texto.includes("conectividade");
  itens.push({
    id: "ti", titulo: "TI e Wi-Fi",
    status: temTI ? "ok" : "atencao",
    detalhe: temTI ? "Infraestrutura de rede citada." : "Informações de TI não localizadas.",
    origem: "regra"
  });

  // 4. Câmeras
  const temCftv = texto.includes("cftv") || texto.includes("câmeras") || texto.includes("monitoramento");
  itens.push({
    id: "cftv", titulo: "Câmeras (CFTV)",
    status: temCftv ? "ok" : "atencao",
    detalhe: temCftv ? "Sistema de monitoramento operacional." : "Menção às câmeras não localizada.",
    origem: "regra"
  });

  // 5. Fiscal/Trabalhista
  const temFiscal = texto.includes("fgts") || texto.includes("inss") || texto.includes("cnd");
  itens.push({
    id: "fiscal", titulo: "Regularidade Fiscal/Trabalhista",
    status: temFiscal ? "ok" : "atencao",
    detalhe: temFiscal ? "Comprovações fiscais identificadas no texto." : "Certidões não localizadas no texto.",
    origem: "regra"
  });

  return itens;
}
