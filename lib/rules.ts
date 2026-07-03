import { CheckItem } from "./types";

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

export function rodarChecagensAutomaticas(dados: any, textoBruto: string): CheckItem[] {
  const itens: CheckItem[] = [];
  const texto = textoBruto.toLowerCase();
  
  // Mês de referência do relatório para conferência de validade
  const mesRelNum = dados.periodoFim?.split("/")[1];
  const nomesMeses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const nomeMesAlvo = nomesMeses[parseInt(mesRelNum) - 1] || "";
  const dataRef = parseDataBr(dados.periodoFim) || new Date();

  // 1. Contexto e Apresentação
  const temContexto = texto.includes("contexto") || texto.includes("introdução");
  const temApres = texto.includes("apresentação") || texto.includes("contextualização");
  itens.push({
    id: "apres", titulo: "Contexto e Apresentação",
    status: (temContexto || temApres) ? "ok" : "atencao",
    detalhe: (temContexto && temApres) ? "Seções de contexto e apresentação identificadas." : "Relatório pode estar sem introdução formal.",
    origem: "regra"
  });

  // 2. Água, Luz e Gás (Verificação de Mês Correto)
  const temAgua = texto.includes("água") && texto.includes(nomeMesAlvo);
  const temLuz = (texto.includes("energia") || texto.includes("luz")) && texto.includes(nomeMesAlvo);
  const temGas = (texto.includes("gás") || texto.includes("glp"));
  itens.push({
    id: "utilidades", titulo: "Consumo de Água, Luz e Gás",
    status: (temAgua && temLuz) ? "ok" : "atencao",
    detalhe: `Água/Luz ${nomeMesAlvo}: ${temAgua && temLuz ? 'OK' : 'Mês não citado no gráfico'}. Gás: ${temGas ? 'Citado' : 'Não identificado'}.`,
    origem: "regra"
  });

  // 3. Controle de Pragas (Data + Quadrimestral + Anexo)
  const pragaDataObj = parseDataBr(dados.dataControlePragas || "");
  const pragaValida = pragaDataObj ? ((dataRef.getTime() - pragaDataObj.getTime()) / (1000*60*60*24*30)) <= 4 : false;
  const pragaAnexo = texto.includes("anexo") && (texto.includes("praga") || texto.includes("desinsetização"));
  
  itens.push({
    id: "praga", titulo: "Controle de Pragas",
    status: (pragaValida && pragaAnexo) ? "ok" : "atencao",
    detalhe: `Data: ${dados.dataControlePragas || 'Não detectada'}. Validade 4 meses: ${pragaValida ? 'OK' : 'Vencida'}. Anexo citado: ${pragaAnexo ? 'Sim' : 'Não'}.`,
    origem: "regra"
  });

  // 4. Limpeza de Reservatórios (Data + Quadrimestral + Anexo)
  const resDataObj = parseDataBr(dados.dataLimpezaReservatorio || "");
  const resValida = resDataObj ? ((dataRef.getTime() - resDataObj.getTime()) / (1000*60*60*24*30)) <= 4 : false;
  const resAnexo = texto.includes("anexo") && (texto.includes("reservatório") || texto.includes("caixa"));

  itens.push({
    id: "reserva", titulo: "Limpeza de Reservatório",
    status: (resValida && resAnexo) ? "ok" : "atencao",
    detalhe: `Data: ${dados.dataLimpezaReservatorio || 'Não detectada'}. Validade 4 meses: ${resValida ? 'OK' : 'Vencida'}. Anexo citado: ${resAnexo ? 'Sim' : 'Não'}.`,
    origem: "regra"
  });

  // 5. TI e Wi-Fi
  const temTI = texto.includes("wi-fi") || texto.includes("internet") || texto.includes("link");
  itens.push({
    id: "ti", titulo: "Disponibilidade de TI e Wi-Fi",
    status: temTI ? "ok" : "atencao",
    detalhe: temTI ? "Sistemas de conectividade e Wi-Fi citados." : "Informações de TI/Wi-Fi não localizadas.",
    origem: "regra"
  });

  // 6. Câmeras (CFTV)
  const temCftv = texto.includes("cftv") || texto.includes("câmeras") || texto.includes("monitoramento");
  itens.push({
    id: "cftv", titulo: "Sistema de Câmeras (CFTV)",
    status: temCftv ? "ok" : "atencao",
    detalhe: temCftv ? "Menção ao funcionamento das câmeras identificada." : "Dados de monitoramento não localizados.",
    origem: "regra"
  });

  // 7. Sistema de Chamados
  const temChamados = texto.includes("chamados") || texto.includes("manusis") || (dados.totalChamados !== null);
  itens.push({
    id: "chamados", titulo: "Sistema de Chamados",
    status: temChamados ? "ok" : "atencao",
    detalhe: temChamados ? "Relato de manutenção e chamados identificado." : "Dados de chamados não localizados.",
    origem: "regra"
  });

  // 8. Regularidade Fiscal e Trabalhista (Mês Correto)
  const fiscalOk = (texto.includes("fgts") || texto.includes("inss") || texto.includes("trabalhista")) && texto.includes(nomeMesAlvo);
  itens.push({
    id: "fiscal", titulo: "Regularidade Fiscal e Trabalhista",
    status: fiscalOk ? "ok" : "atencao",
    detalhe: fiscalOk ? `Certidões e encargos de ${nomeMesAlvo} identificados.` : `Não foi encontrada menção a encargos do mês de ${nomeMesAlvo}.`,
    origem: "regra"
  });

  // 9. Licença Sanitária (Menção + Anexo)
  const temSanit = texto.includes("sanitária") || texto.includes("vigilância") || texto.includes("lva");
  itens.push({
    id: "sanit", titulo: "Licença Sanitária",
    status: temSanit ? "ok" : "atencao",
    detalhe: temSanit ? "Licença Sanitária citada (verificar validade no anexo final)." : "Não foi identificada menção à Licença Sanitária.",
    origem: "regra"
  });

  return itens;
}
