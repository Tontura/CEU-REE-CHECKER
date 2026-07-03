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
  
  // Identificação do Mês do Relatório
  const mesRelatorioNum = dados.periodoFim?.split("/")[1]; 
  const nomesMeses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const mesNomeRelatorio = nomesMeses[parseInt(mesRelatorioNum) - 1] || "";
  const dataRef = parseDataBr(dados.periodoFim) || new Date();

  // 1. CONTEXTO E APRESENTAÇÃO
  const temContexto = texto.includes("apresentação") || texto.includes("contexto") || texto.includes("introdução");
  itens.push({
    id: "ctx", titulo: "Contexto e Apresentação", status: temContexto ? "ok" : "atencao",
    detalhe: temContexto ? "Introdução e contextualização identificadas." : "Falta seção de apresentação.", origem: "regra"
  });

  // 2. FOTOS
  itens.push({
    id: "fot", titulo: "Fotos e Imagens", status: fingerprintsAtual.length > 5 ? "ok" : "atencao",
    detalhe: `O relatório contém ${fingerprintsAtual.length} imagens registradas.`, origem: "regra"
  });

  // 3. CONTROLE DE PRAGAS (Separado)
  const pragasData = dados.dataControlePragas || "";
  const pragasMesOk = pragasData.toLowerCase().includes(mesNomeRelatorio) || pragasData.includes(`/${mesRelatorioNum}/`);
  const temDiaPragas = /\d{1,2}/.test(pragasData);
  const dataPragasObj = parseDataBr(pragasData);
  const pragasValida = dataPragasObj ? ((dataRef.getTime() - dataPragasObj.getTime()) / (1000*60*60*24*30)) <= 4 : false;

  itens.push({
    id: "praga", titulo: "Controle de Pragas",
    status: (temDiaPragas && pragasMesOk && pragasValida) ? "ok" : "atencao",
    detalhe: pragasMesOk ? (temDiaPragas ? `Realizado em ${pragasData}. ${pragasValida ? 'Válido.' : 'Vencido.'}` : `Mês de ${mesNomeRelatorio} OK, mas sem o dia exato.`) : "Data de pragas não encontrada ou fora do mês.",
    origem: "regra"
  });

  // 4. LIMPEZA DE RESERVATÓRIO (Separado)
  const resData = dados.dataLimpezaReservatorio || "";
  const resMesOk = resData.toLowerCase().includes(mesNomeRelatorio) || resData.includes(`/${mesRelatorioNum}/`);
  const temDiaRes = /\d{1,2}/.test(resData);
  const dataResObj = parseDataBr(resData);
  const resValida = dataResObj ? ((dataRef.getTime() - dataResObj.getTime()) / (1000*60*60*24*30)) <= 4 : false;

  itens.push({
    id: "reserva", titulo: "Limpeza de Reservatório",
    status: (temDiaRes && resMesOk && resValida) ? "ok" : "atencao",
    detalhe: resMesOk ? (temDiaRes ? `Realizada em ${resData}. ${resValida ? 'Válido.' : 'Vencido.'}` : `Mês de ${mesNomeRelatorio} OK, mas sem o dia exato.`) : "Data de reservatório não encontrada ou fora do mês.",
    origem: "regra"
  });

  // 5. REGULARIDADE FISCAL (Somente verificação de Mês)
  const temFiscal = texto.includes("fgts") || texto.includes("inss") || texto.includes("regularidade");
  const mesFiscalOk = texto.includes(mesNomeRelatorio);
  itens.push({
    id: "fisc", titulo: "Regularidade Fiscal e Trabalhista",
    status: (temFiscal && mesFiscalOk) ? "ok" : "atencao",
    detalhe: mesFiscalOk ? `Comprovações de ${mesNomeRelatorio} encontradas.` : `Atenção: Mês de ${mesNomeRelatorio} não citado no corpo do texto fiscal.`,
    origem: "regra"
  });

  // 6. TI, WI-FI E CÂMERAS
  const infra = (texto.includes("wi-fi") || texto.includes("internet")) && (texto.includes("cftv") || texto.includes("câmeras"));
  itens.push({
    id: "infra", titulo: "TI, Wi-Fi e Câmeras", status: infra ? "ok" : "atencao",
    detalhe: infra ? "Sistemas de conectividade e segurança citados." : "Informações de TI ou Câmeras incompletas.", origem: "regra"
  });

  // 7. LICENÇA SANITÁRIA
  const sanit = texto.includes("sanitária") || texto.includes("vigilância");
  itens.push({
    id: "sanit", titulo: "Licença Sanitária", status: sanit ? "ok" : "atencao",
    detalhe: sanit ? "Citada no relatório (verificar última imagem)." : "Licença não identificada.", origem: "regra"
  });

  return itens;
}
