import { CheckItem, ImageFingerprint } from "./types";

export function rodarChecagensAutomaticas(
  dados: any,
  fingerprintsAtual: ImageFingerprint[],
  historicoAnterior: any
): CheckItem[] {
  const itens: CheckItem[] = [];
  const texto = dados.textoCompleto?.toLowerCase() || "";
  const anexos = dados.anexosCitados?.map((a: string) => a.toLowerCase()) || [];
  
  // Helpers para identificar o mês do relatório
  const mesRelatorioNum = dados.periodoFim?.split("/")[1]; 
  const nomesMeses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const mesRelatorioNome = nomesMeses[parseInt(mesRelatorioNum) - 1] || "";

  // 1. CONTEXTO E APRESENTAÇÃO
  const temContexto = texto.includes("contexto") || texto.includes("introdução");
  const temApresentacao = texto.includes("apresentação") || texto.includes("contextualização");
  itens.push({
    id: "contexto_apresentacao",
    titulo: "Contexto e Apresentação",
    status: (temContexto || temApresentacao) ? "ok" : "atencao",
    detalhe: (temContexto && temApresentacao) ? "Seções de contexto e apresentação identificadas." : "Faltam seções claras de introdução ou contexto.",
    origem: "regra"
  });

  // 2. FOTOS
  itens.push({
    id: "fotos",
    titulo: "Fotos e Imagens",
    status: fingerprintsAtual.length > 5 ? "ok" : "atencao",
    detalhe: `Identificadas ${fingerprintsAtual.length} imagens. Relatórios REE devem conter registros fotográficos detalhados.`,
    origem: "regra"
  });

  // 3. ÁGUA, LUZ E GÁS (VERIFICAÇÃO DE MÊS)
  const aguaMesOk = dados.mesesGraficoAgua?.some((m: string) => m.toLowerCase().includes(mesRelatorioNome));
  const luzMesOk = dados.mesesGraficoEnergia?.some((m: string) => m.toLowerCase().includes(mesRelatorioNome));
  const temGas = texto.includes("gás") || texto.includes("glp") || texto.includes("combustível");
  
  itens.push({
    id: "concessionarias",
    titulo: "Água, Luz e Gás",
    status: (aguaMesOk && luzMesOk) ? "ok" : "atencao",
    detalhe: `Água: ${aguaMesOk ? 'Mês OK' : 'Mês divergente'}. Luz: ${luzMesOk ? 'Mês OK' : 'Mês divergente'}. Gás: ${temGas ? 'Identificado' : 'Não citado'}.`,
    origem: "regra"
  });

  // 4. CONTROLE DE PRAGAS (DATA + ANEXO)
  const temAnexoPragas = anexos.some((a: string) => a.includes("praga") || a.includes("dedetização") || a.includes("certificado"));
  const pragasDataOk = dados.dataControlePragas?.includes(mesRelatorioNome) || dados.dataControlePragas?.includes(`/${mesRelatorioNum}/`);
  
  itens.push({
    id: "pragas",
    titulo: "Controle de Pragas",
    status: (pragasDataOk && temAnexoPragas) ? "ok" : "atencao",
    detalhe: `Data: ${dados.dataControlePragas || 'Não encontrada'}. Certificado: ${temAnexoPragas ? 'Anexado' : 'Não identificado'}.`,
    origem: "regra"
  });

  // 5. LIMPEZA DE RESERVATÓRIO (DATA + ANEXO)
  const temAnexoAgua = anexos.some((a: string) => a.includes("reservatório") || a.includes("caixa") || a.includes("limpeza"));
  const reservaDataOk = dados.dataLimpezaReservatorio?.includes(mesRelatorioNome) || dados.dataLimpezaReservatorio?.includes(`/${mesRelatorioNum}/`);

  itens.push({
    id: "reservatorio",
    titulo: "Limpeza de Reservatório",
    status: (reservaDataOk && temAnexoAgua) ? "ok" : "atencao",
    detalhe: `Data: ${dados.dataLimpezaReservatorio || 'Não encontrada'}. Laudo: ${temAnexoAgua ? 'Anexado' : 'Não identificado'}.`,
    origem: "regra"
  });

  // 6. TI E WI-FI
  const temTI = texto.includes("wi-fi") || texto.includes("internet") || texto.includes("link") || texto.includes("conectividade");
  itens.push({
    id: "ti_wifi",
    titulo: "Disponibilidade de TI e Wi-Fi",
    status: temTI ? "ok" : "atencao",
    detalhe: temTI ? "Menções à infraestrutura de rede e Wi-Fi encontradas." : "Não foram encontradas informações sobre TI ou Wi-Fi.",
    origem: "regra"
  });

  // 7. CÂMERAS (CFTV)
  const temCameras = texto.includes("câmeras") || texto.includes("cftv") || texto.includes("monitoramento");
  itens.push({
    id: "cameras",
    titulo: "Disponibilidade de Câmeras",
    status: temCameras ? "ok" : "atencao",
    detalhe: temCameras ? "Sistema de monitoramento citado no relatório." : "Não há informações sobre o funcionamento das câmeras.",
    origem: "regra"
  });

  // 8. SISTEMA DE CHAMADOS
  const temChamados = dados.totalChamados !== null && dados.totalChamados >= 0;
  itens.push({
    id: "chamados",
    titulo: "Sistema de Chamados",
    status: temChamados ? "ok" : "atencao",
    detalhe: temChamados ? `${dados.totalChamados} chamados registrados no período.` : "Dados de chamados (Manusis/Outros) não identificados.",
    origem: "regra"
  });

  // 9. REGULARIDADE FISCAL E TRABALHISTA
  const citouFiscal = texto.includes("fgts") || texto.includes("inss") || texto.includes("trabalhista") || texto.includes("cnd");
  const dataFiscalRecente = texto.includes("2026") || texto.includes(mesRelatorioNome); // Verifica se há datas do ano/mês atual
  
  itens.push({
    id: "fiscal",
    titulo: "Regularidade Fiscal e Trabalhista",
    status: (citouFiscal && dataFiscalRecente) ? "ok" : "atencao",
    detalhe: citouFiscal ? "Menções a certidões e encargos encontradas no texto." : "Não foram identificadas comprovações fiscais/trabalhistas atualizadas.",
    origem: "regra"
  });

  // 10. LICENÇA SANITÁRIA
  const citouSanitaria = texto.includes("sanitária") || texto.includes("vigilância");
  const temDataSanitaria = !!dados.validadeLicencaSanitaria;
  
  itens.push({
    id: "licenca_sanitaria",
    titulo: "Licença Sanitária",
    status: (citouSanitaria || temDataSanitaria) ? "ok" : "atencao",
    detalhe: temDataSanitaria ? `Validade identificada: ${dados.validadeLicencaSanitaria}.` : (citouSanitaria ? "Citada no relatório (verificar imagem da licença no final)." : "Licença Sanitária não identificada."),
    origem: "regra"
  });

  return itens;
}
