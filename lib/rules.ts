import { CheckItem, ImageFingerprint } from "./types";

export function rodarChecagensAutomaticas(
  dados: any,
  fingerprintsAtual: ImageFingerprint[],
  historicoAnterior: any
): CheckItem[] {
  const itens: CheckItem[] = [];
  const texto = dados.textoCompleto?.toLowerCase() || "";
  const anexos = dados.anexosCitados?.map((a: string) => a.toLowerCase()) || [];

  // 1. CONTEXTO E APRESENTAÇÃO
  const temApresentacao = texto.includes("apresentação") || texto.includes("contextualização") || texto.includes("introdução");
  itens.push({
    id: "contexto",
    titulo: "Contexto e Apresentação",
    status: temApresentacao ? "ok" : "atencao",
    detalhe: temApresentacao ? "Estrutura de apresentação identificada no relatório." : "Não foi identificada uma seção clara de apresentação ou contexto.",
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

  // 3. FORNECIMENTOS (ÁGUA, LUZ E GÁS) - VERIFICAÇÃO DE MÊS
  // Pega o mês do período fim (ex: "14/05/2026" -> Maio)
  const mesRelatorio = dados.periodoFim?.split("/")[1];
  const nomesMeses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const mesNome = nomesMeses[parseInt(mesRelatorio) - 1];

  const aguaOk = dados.mesesGraficoAgua?.some((m: string) => m.toLowerCase().includes(mesNome));
  const luzOk = dados.mesesGraficoEnergia?.some((m: string) => m.toLowerCase().includes(mesNome));
  const gasCitado = texto.includes("gás") || texto.includes("glp");

  itens.push({
    id: "concessionarias",
    titulo: "Consumo de Água, Luz e Gás",
    status: (aguaOk && luzOk) ? "ok" : "atencao",
    detalhe: `Água: ${aguaOk ? 'Mês OK' : 'Mês divergente'}. Luz: ${luzOk ? 'Mês OK' : 'Mês divergente'}. Gás: ${gasCitado ? 'Citado' : 'Não identificado'}.`,
    origem: "regra"
  });

  // 4. CONTROLE DE PRAGAS E RESERVATÓRIOS (DATA E ANEXOS)
  const temAnexoPragas = anexos.some((a: string) => a.includes("praga") || a.includes("certificado"));
  const temAnexoAgua = anexos.some((a: string) => a.includes("limpeza") || a.includes("reservatório") || a.includes("caixa"));

  itens.push({
    id: "pragas_reservatorio",
    titulo: "Pragas e Reservatórios",
    status: (dados.dataControlePragas && temAnexoPragas) ? "ok" : "atencao",
    detalhe: `Pragas: ${dados.dataControlePragas || 'Sem data'} (${temAnexoPragas ? 'Com anexo' : 'Sem anexo'}). Reservatório: ${dados.dataLimpezaReservatorio || 'Sem data'} (${temAnexoAgua ? 'Com anexo' : 'Sem anexo'}).`,
    origem: "regra"
  });

  // 5. TI E WI-FI
  const temTI = texto.includes("wi-fi") || texto.includes("internet") || texto.includes("link de dados") || texto.includes("conectividade");
  itens.push({
    id: "ti_wifi",
    titulo: "Disponibilidade de TI e Wi-Fi",
    status: temTI ? "ok" : "atencao",
    detalhe: temTI ? "Menções à infraestrutura de rede e Wi-Fi encontradas." : "Não foram encontradas informações sobre TI/Wi-Fi.",
    origem: "regra"
  });

  // 6. CÂMERAS (CFTV)
  const temCameras = texto.includes("câmeras") || texto.includes("monitoramento") || texto.includes("cftv");
  itens.push({
    id: "cameras",
    titulo: "Sistema de Câmeras (CFTV)",
    status: temCameras ? "ok" : "atencao",
    detalhe: temCameras ? "Relato sobre funcionamento de câmeras identificado." : "Não há menção ao sistema de câmeras.",
    origem: "regra"
  });

  // 7. SISTEMA DE CHAMADOS
  itens.push({
    id: "chamados",
    titulo: "Sistema de Chamados",
    status: (dados.totalChamados !== null && dados.totalChamados >= 0) ? "ok" : "atencao",
    detalhe: dados.totalChamados !== null ? `Total de ${dados.totalChamados} chamados registrados no período.` : "Dados de chamados não identificados.",
    origem: "regra"
  });

  // 8. REGULARIDADE FISCAL E TRABALHISTA
  const temFiscal = anexos.some((a: string) => a.includes("fgts") || a.includes("trabalhista") || a.includes("cnd") || a.includes("regularidade"));
  itens.push({
    id: "fiscal",
    titulo: "Regularidade Fiscal e Trabalhista",
    status: temFiscal ? "ok" : "atencao",
    detalhe: temFiscal ? "Certidões de regularidade fiscal/trabalhista identificadas nos anexos." : "Certidões obrigatórias não identificadas nos anexos.",
    origem: "regra"
  });

  // 9. LICENÇA SANITÁRIA
  const temLicenca = dados.validadeLicencaSanitaria || anexos.some((a: string) => a.includes("sanitária"));
  itens.push({
    id: "licenca",
    titulo: "Licença Sanitária",
    status: temLicenca ? "ok" : "atencao",
    detalhe: dados.validadeLicencaSanitaria ? `Vencimento em: ${dados.validadeLicencaSanitaria}.` : (temLicenca ? "Citada nos anexos, verifique validade." : "Não identificada."),
    origem: "regra"
  });

  return itens;
}
