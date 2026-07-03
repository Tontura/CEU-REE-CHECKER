import { CheckItem, ImageFingerprint } from "./types";

export function rodarChecagensAutomaticas(
  dados: any,
  fingerprintsAtual: ImageFingerprint[],
  historicoAnterior: any
): CheckItem[] {
  const itens: CheckItem[] = [];
  const texto = dados.textoCompleto?.toLowerCase() || "";
  
  // Helpers para datas
  const mesRelatorioNum = dados.periodoFim?.split("/")[1]; // "05"
  const nomesMeses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const mesRelatorioNome = nomesMeses[parseInt(mesRelatorioNum) - 1];

  // 1. CONTEXTO E APRESENTAÇÃO
  const temApresentacao = texto.includes("apresentação") || texto.includes("contextualização") || texto.includes("introdução");
  itens.push({
    id: "contexto",
    titulo: "Contexto e Apresentação",
    status: temApresentacao ? "ok" : "atencao",
    detalhe: temApresentacao ? "Estrutura de apresentação identificada." : "Não foi identificada uma seção clara de apresentação.",
    origem: "regra"
  });

  // 2. FOTOS
  itens.push({
    id: "fotos",
    titulo: "Fotos e Imagens",
    status: fingerprintsAtual.length > 0 ? "ok" : "atencao",
    detalhe: fingerprintsAtual.length > 0 ? `Identificadas ${fingerprintsAtual.length} imagens no documento.` : "Nenhuma foto detectada.",
    origem: "regra"
  });

  // 3. CONTROLE DE PRAGAS (SEPARADO)
  const pragasData = dados.dataControlePragas || "";
  const pragasMesOk = pragasData.toLowerCase().includes(mesRelatorioNome) || pragasData.includes(`/${mesRelatorioNum}/`);
  const temDiaPragas = /\d{1,2}\/\d{1,2}\/\d{4}/.test(pragasData) || /\d{1,2} de/.test(pragasData.toLowerCase());

  itens.push({
    id: "controle_pragas",
    titulo: "Controle de Pragas",
    status: (temDiaPragas && pragasMesOk) ? "ok" : (pragasMesOk ? "atencao" : "atencao"),
    detalhe: pragasMesOk 
      ? (temDiaPragas ? `Realizado no dia ${pragasData}.` : `Mês de ${mesRelatorioNome} identificado, mas sem o dia exato.`)
      : "Data não encontrada ou diverge do mês do relatório.",
    origem: "regra"
  });

  // 4. LIMPEZA DE RESERVATÓRIO (SEPARADO)
  const reservaData = dados.dataLimpezaReservatorio || "";
  const reservaMesOk = reservaData.toLowerCase().includes(mesRelatorioNome) || reservaData.includes(`/${mesRelatorioNum}/`);
  const temDiaReserva = /\d{1,2}\/\d{1,2}\/\d{4}/.test(reservaData) || /\d{1,2} de/.test(reservaData.toLowerCase());

  itens.push({
    id: "limpeza_reservatorio",
    titulo: "Limpeza de Reservatório",
    status: (temDiaReserva && reservaMesOk) ? "ok" : (reservaMesOk ? "atencao" : "atencao"),
    detalhe: reservaMesOk 
      ? (temDiaReserva ? `Realizada no dia ${reservaData}.` : `Mês de ${mesRelatorioNome} identificado, mas sem o dia exato.`)
      : "Data não encontrada ou diverge do mês do relatório.",
    origem: "regra"
  });

  // 5. REGULARIDADE FISCAL E TRABALHISTA (BUSCA NO TEXTO)
  const termosFiscal = ["fgts", "inss", "trabalhista", "cnd", "regularidade fiscal", "certidão"];
  const citouFiscal = termosFiscal.some(t => texto.includes(t));
  // Busca por qualquer data próxima aos termos fiscais no texto
  const temDataFiscal = /\d{1,2}\/\d{1,2}\/\d{4}/.test(texto);

  itens.push({
    id: "fiscal",
    titulo: "Regularidade Fiscal e Trabalhista",
    status: (citouFiscal && temDataFiscal) ? "ok" : "atencao",
    detalhe: citouFiscal ? "Dados de regularidade identificados no corpo do texto." : "Não foram identificadas menções à regularidade fiscal no texto.",
    origem: "regra"
  });

  // 6. LICENÇA SANITÁRIA (CONSIDERA ÚLTIMAS IMAGENS)
  const citouSanitaria = texto.includes("sanitária") || texto.includes("vigilância");
  const temMuitasImagens = fingerprintsAtual.length > 5; // Geralmente a licença é uma das últimas imagens

  itens.push({
    id: "licenca_sanitaria",
    titulo: "Licença Sanitária",
    status: (citouSanitaria || dados.validadeLicencaSanitaria) ? "ok" : "atencao",
    detalhe: dados.validadeLicencaSanitaria 
      ? `Validade: ${dados.validadeLicencaSanitaria}.` 
      : (citouSanitaria ? "Licença citada e possivelmente presente nos anexos fotográficos finais." : "Documento não identificado."),
    origem: "regra"
  });

  // 7. TI, WI-FI E CÂMERAS
  const temTI = texto.includes("wi-fi") || texto.includes("internet") || texto.includes("link");
  const temCameras = texto.includes("câmeras") || texto.includes("cftv") || texto.includes("monitoramento");
  
  itens.push({
    id: "infra",
    titulo: "TI, Wi-Fi e Câmeras",
    status: (temTI && temCameras) ? "ok" : "atencao",
    detalhe: `TI/Wi-Fi: ${temTI ? 'OK' : 'Não citado'}. Câmeras: ${temCameras ? 'OK' : 'Não citado'}.`,
    origem: "regra"
  });

  // 8. FORNECIMENTOS (ÁGUA E LUZ)
  const aguaOk = dados.mesesGraficoAgua?.some((m: string) => m.toLowerCase().includes(mesRelatorioNome));
  const luzOk = dados.mesesGraficoEnergia?.some((m: string) => m.toLowerCase().includes(mesRelatorioNome));

  itens.push({
    id: "consumos",
    titulo: "Consumo de Água e Luz",
    status: (aguaOk && luzOk) ? "ok" : "atencao",
    detalhe: `Água: ${aguaOk ? 'Mês Correto' : 'Divergente'}. Luz: ${luzOk ? 'Mês Correto' : 'Divergente'}.`,
    origem: "regra"
  });

  return itens;
}
