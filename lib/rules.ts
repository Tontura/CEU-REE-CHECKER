import { CheckItem, ImageFingerprint } from "./types";

export function rodarChecagensAutomaticas(
  dados: any,
  fingerprintsAtual: ImageFingerprint[],
  historicoAnterior: any
): CheckItem[] {
  const itens: CheckItem[] = [];
  const texto = dados.textoCompleto?.toLowerCase() || "";
  
  const mesRelatorioNum = dados.periodoFim?.split("/")[1]; 
  const nomesMeses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const mesRelatorioNome = nomesMeses[parseInt(mesRelatorioNum) - 1] || "";

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

  // 3. CONTROLE DE PRAGAS
  const pragasData = dados.dataControlePragas || "";
  const pragasMesOk = pragasData.toLowerCase().includes(mesRelatorioNome) || pragasData.includes(`/${mesRelatorioNum}/`);
  const temDiaPragas = /\d{1,2}/.test(pragasData);

  itens.push({
    id: "controle_pragas",
    titulo: "Controle de Pragas",
    status: (temDiaPragas && pragasMesOk) ? "ok" : "atencao",
    detalhe: pragasMesOk 
      ? (temDiaPragas ? `Realizado em ${pragasData}.` : `Mês de ${mesRelatorioNome} identificado, mas sem o dia exato.`)
      : "Data não encontrada ou diverge do mês do relatório.",
    origem: "regra"
  });

  // 4. LIMPEZA DE RESERVATÓRIO
  const reservaData = dados.dataLimpezaReservatorio || "";
  const reservaMesOk = reservaData.toLowerCase().includes(mesRelatorioNome) || reservaData.includes(`/${mesRelatorioNum}/`);
  const temDiaReserva = /\d{1,2}/.test(reservaData);

  itens.push({
    id: "limpeza_reservatorio",
    titulo: "Limpeza de Reservatório",
    status: (temDiaReserva && reservaMesOk) ? "ok" : "atencao",
    detalhe: reservaMesOk 
      ? (temDiaReserva ? `Realizada em ${reservaData}.` : `Mês de ${mesRelatorioNome} identificado, mas sem o dia exato.`)
      : "Data não encontrada ou diverge do mês do relatório.",
    origem: "regra"
  });

  // 5. REGULARIDADE FISCAL E TRABALHISTA
  const termosFiscal = ["fgts", "inss", "trabalhista", "cnd", "regularidade", "certidão"];
  const citouFiscal = termosFiscal.some(t => texto.includes(t));
  const temDataFiscal = /\d{1,2}\/\d{1,2}\/\d{4}/.test(texto);

  itens.push({
    id: "fiscal",
    titulo: "Regularidade Fiscal e Trabalhista",
    status: (citouFiscal && temDataFiscal) ? "ok" : "atencao",
    detalhe: citouFiscal ? "Dados de regularidade identificados no texto." : "Não foram identificadas menções à regularidade fiscal.",
    origem: "regra"
  });

  // 6. LICENÇA SANITÁRIA
  const citouSanitaria = texto.includes("sanitária") || texto.includes("vigilância");
  itens.push({
    id: "licenca_sanitaria",
    titulo: "Licença Sanitária",
    status: (citouSanitaria || dados.validadeLicencaSanitaria) ? "ok" : "atencao",
    detalhe: dados.validadeLicencaSanitaria ? `Validade: ${dados.validadeLicencaSanitaria}.` : (citouSanitaria ? "Licença citada (verificar fotos finais)." : "Documento não identificado."),
    origem: "regra"
  });

  return itens;
}
