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
  
  // Mês de referência do relatório
  const mesRelNum = dados.periodoFim?.split("/")[1];
  const nomesMeses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const nomeMesAlvo = nomesMeses[parseInt(mesRelNum) - 1] || "";

  // 1. Contexto e Apresentação
  const temContexto = texto.includes("contexto") || texto.includes("introdução");
  const temApres = texto.includes("apresentação") || texto.includes("contextualização");
  itens.push({
    id: "apres", titulo: "Contexto e Apresentação",
    status: (temContexto || temApres) ? "ok" : "atencao",
    detalhe: (temContexto && temApres) ? "Seções de contexto e apresentação identificadas." : "Relatório pode estar sem introdução formal.",
    origem: "regra"
  });

  // 2. Fotos
  const temFotos = texto.includes("registro fotográfico") || texto.includes("fotos") || texto.includes("iluminância");
  itens.push({
    id: "fotos", titulo: "Registros Fotográficos",
    status: temFotos ? "ok" : "atencao",
    detalhe: temFotos ? "Menções a fotos e evidências encontradas." : "Não foram encontradas menções explícitas a fotos.",
    origem: "regra"
  });

  // 3. Água, Luz e Gás (Verificação de Mês)
  const temAgua = texto.includes("água") && texto.includes(nomeMesAlvo);
  const temLuz = (texto.includes("energia") || texto.includes("luz")) && texto.includes(nomeMesAlvo);
  const temGas = (texto.includes("gás") || texto.includes("glp"));
  itens.push({
    id: "utilidades", titulo: "Água, Luz e Gás",
    status: (temAgua && temLuz) ? "ok" : "atencao",
    detalhe: `Água/Luz ${nomeMesAlvo}: ${temAgua && temLuz ? 'OK' : 'Mês não citado'}. Gás: ${temGas ? 'Citado' : 'Não citado'}.`,
    origem: "regra"
  });

  // 4. Controle de Pragas (Data + Mês + Anexo)
  const pragaDataOk = dados.dataControlePragas?.toLowerCase().includes(nomeMesAlvo) || dados.dataControlePragas?.includes(`/${mesRelNum}/`);
  const pragaAnexo = texto.includes("anexo") && (texto.includes("praga") || texto.includes("desinsetização"));
  itens.push({
    id: "praga", titulo: "Controle de Pragas",
    status: (pragaDataOk && pragaAnexo) ? "ok" : "atencao",
    detalhe: `Data: ${dados.dataControlePragas || 'Não detectada'}. Mês OK: ${pragaDataOk ? 'Sim' : 'Não'}. Anexo citado: ${pragaAnexo ? 'Sim' : 'Não'}.`,
    origem: "regra"
  });

  // 5. Limpeza de Reservatórios (Data + Mês + Anexo)
  const resDataOk = dados.dataLimpezaReservatorio?.toLowerCase().includes(nomeMesAlvo) || dados.dataLimpezaReservatorio?.includes(`/${mesRelNum}/`);
  const resAnexo = texto.includes("anexo") && (texto.includes("reservatório") || texto.includes("caixa"));
  itens.push({
    id: "reserva", titulo: "Limpeza de Reservatório",
    status: (resDataOk && resAnexo) ? "ok" : "atencao",
    detalhe: `Data: ${dados.dataLimpezaReservatorio || 'Não detectada'}. Mês OK: ${resDataOk ? 'Sim' : 'Não'}. Anexo citado: ${resAnexo ? 'Sim' : 'Não'}.`,
    origem: "regra"
  });

  // 6. TI e Wi-Fi
  const temTI = texto.includes("wi-fi") || texto.includes("internet") || texto.includes("link");
  itens.push({
    id: "ti", titulo: "Disponibilidade TI e Wi-Fi",
    status: temTI ? "ok" : "atencao",
    detalhe: temTI ? "Sistemas de conectividade citados." : "Informações de TI não localizadas.",
    origem: "regra"
  });

  // 7. Câmeras (CFTV)
  const temCftv = texto.includes("cftv") || texto.includes("câmeras") || texto.includes("monitoramento");
  itens.push({
    id: "cftv", titulo: "Disponibilidade de Câmeras",
    status: temCftv ? "ok" : "atencao",
    detalhe: temCftv ? "Sistema de monitoramento citado." : "Não há menção ao estado das câmeras.",
    origem: "regra"
  });

  // 8. Sistema de Chamados
  const temChamados = texto.includes("chamados") || texto.includes("manusis") || texto.includes("solicitações");
  itens.push({
    id: "chamados", titulo: "Sistema de Chamados",
    status: temChamados ? "ok" : "atencao",
    detalhe: temChamados ? "Relato de manutenção e chamados identificado." : "Dados de chamados não localizados.",
    origem: "regra"
  });

  // 9. Regularidade Fiscal e Trabalhista
  const fiscalOk = (texto.includes("fgts") || texto.includes("inss") || texto.includes("trabalhista")) && texto.includes(nomeMesAlvo);
  itens.push({
    id: "fiscal", titulo: "Regularidade Fiscal",
    status: fiscalOk ? "ok" : "atencao",
    detalhe: fiscalOk ? `Certidões de ${nomeMesAlvo} identificadas.` : `Não foi encontrada menção a encargos de ${nomeMesAlvo}.`,
    origem: "regra"
  });

  // 10. Licença Sanitária
  const temSanit = texto.includes("sanitária") || texto.includes("vigilância") || texto.includes("lva");
  itens.push({
    id: "sanit", titulo: "Licença Sanitária",
    status: temSanit ? "ok" : "atencao",
    detalhe: temSanit ? "Licença Sanitária citada (verificar anexo final)." : "Não foi encontrada menção à Licença Sanitária.",
    origem: "regra"
  });

  return itens;
}
