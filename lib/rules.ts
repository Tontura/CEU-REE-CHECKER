import { CheckItem, ExtractedReportData, HistoricoMes, ImageFingerprint } from "./types";
import { compararFingerprints } from "./pdfImages";

function parseDataBR(data: string | null): Date | null {
  if (!data) return null;
  // formatos aceitos: dd/mm/aaaa
  const match = data.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, d, m, a] = match;
    return new Date(parseInt(a), parseInt(m) - 1, parseInt(d));
  }
  // formato "18 de junho de 2026"
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const matchExtenso = data.toLowerCase().match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
  if (matchExtenso) {
    const [, d, mesNome, a] = matchExtenso;
    const mesIndex = MESES.findIndex((m) => m === mesNome);
    if (mesIndex >= 0) return new Date(parseInt(a), mesIndex, parseInt(d));
  }
  return null;
}

function nomeMesParaIndice(nome: string): number {
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return MESES.indexOf(nome.toLowerCase());
}

export function rodarChecagensAutomaticas(
  dados: ExtractedReportData,
  fingerprintsAtual: ImageFingerprint[],
  historicoAnterior: HistoricoMes | null
): CheckItem[] {
  const itens: CheckItem[] = [];

  // 1. Período do relatório presente e coerente (fim > início, ~30 dias)
  const inicio = parseDataBR(dados.periodoInicio);
  const fim = parseDataBR(dados.periodoFim);
  if (inicio && fim) {
    const dias = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
    if (dias > 0 && dias <= 35) {
      itens.push({
        id: "periodo",
        titulo: "Período do relatório",
        status: "ok",
        detalhe: `Período de ${dados.periodoInicio} a ${dados.periodoFim} (${Math.round(dias)} dias) está coerente com o ciclo mensal.`,
        origem: "regra",
      });
    } else {
      itens.push({
        id: "periodo",
        titulo: "Período do relatório",
        status: "atencao",
        detalhe: `Período de ${dados.periodoInicio} a ${dados.periodoFim} tem ${Math.round(dias)} dias — fora do padrão de ~30 dias esperado.`,
        origem: "regra",
      });
    }
  } else {
    itens.push({
      id: "periodo",
      titulo: "Período do relatório",
      status: "atencao",
      detalhe: "Não foi possível localizar as datas de início/fim do período no relatório.",
      origem: "regra",
    });
  }

  // 2. Gráficos de água/energia: nos PDFs desse modelo, os gráficos são IMAGENS
  // (não texto), então não é possível confirmar com certeza qual mês está
  // representado neles. Esta checagem é apenas um indício textual: verifica se o mês
  // de referência do período aparece mencionado em algum lugar do documento.
  if (fim) {
    const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const mesEsperado = MESES[fim.getMonth()];
    const presenteAgua = dados.mesesGraficoAgua.includes(mesEsperado);
    itens.push({
      id: "grafico-consumo",
      titulo: "Dados de consumo de água/energia",
      status: presenteAgua ? "ok" : "atencao",
      detalhe: presenteAgua
        ? `O mês de referência (${mesEsperado}) aparece mencionado no documento. Atenção: os gráficos de consumo são imagens dentro do PDF, então confirme visualmente se a última barra do gráfico corresponde a este mês.`
        : `O mês de referência do período (${mesEsperado}) não foi encontrado mencionado em texto no documento. Como os gráficos de consumo são imagens, isso não confirma desatualização — recomenda-se conferir visualmente se a última barra dos gráficos de água/energia corresponde a ${mesEsperado}.`,
      origem: "regra",
    });
  }

  // 3. Limpeza de reservatório dentro do ciclo quadrimestral (120 dias)
  const dataLimpeza = parseDataBR(dados.dataLimpezaReservatorio);
  if (dataLimpeza && fim) {
    const diasDesdeLimpeza = (fim.getTime() - dataLimpeza.getTime()) / (1000 * 60 * 60 * 24);
    const dentroDoCiclo = diasDesdeLimpeza >= -10 && diasDesdeLimpeza <= 130;
    itens.push({
      id: "limpeza-reservatorio",
      titulo: "Limpeza de reservatório de água",
      status: dentroDoCiclo ? "ok" : "atencao",
      detalhe: dentroDoCiclo
        ? `Última limpeza registrada em ${dados.dataLimpezaReservatorio}, dentro do ciclo quadrimestral previsto.`
        : `Última limpeza registrada em ${dados.dataLimpezaReservatorio} — verificar se está dentro do ciclo quadrimestral (120 dias) em relação ao período do relatório.`,
      origem: "regra",
    });
  } else {
    itens.push({
      id: "limpeza-reservatorio",
      titulo: "Limpeza de reservatório de água",
      status: "atencao",
      detalhe: "Não foi possível localizar a data da última limpeza do reservatório no texto.",
      origem: "regra",
    });
  }

  // 4. Controle de pragas
  const dataPragas = parseDataBR(dados.dataControlePragas);
  if (dataPragas) {
    itens.push({
      id: "controle-pragas",
      titulo: "Controle de pragas",
      status: "ok",
      detalhe: `Execução registrada em ${dados.dataControlePragas}.`,
      origem: "regra",
    });
  } else {
    itens.push({
      id: "controle-pragas",
      titulo: "Controle de pragas",
      status: "atencao",
      detalhe: "Não foi possível localizar a data de execução do controle de pragas no texto.",
      origem: "regra",
    });
  }

  // 5. Validade da licença sanitária (anexo)
  const validadeLicenca = parseDataBR(dados.validadeLicencaSanitaria);
  if (validadeLicenca) {
    const hoje = fim ?? new Date();
    const vencida = validadeLicenca.getTime() < hoje.getTime();
    itens.push({
      id: "licenca-sanitaria",
      titulo: "Validade da licença sanitária (anexo)",
      status: vencida ? "desatualizado" : "ok",
      detalhe: vencida
        ? `A licença sanitária do anexo está com validade vencida (${dados.validadeLicencaSanitaria}).`
        : `Licença sanitária válida até ${dados.validadeLicencaSanitaria}.`,
      origem: "regra",
    });
  } else {
    itens.push({
      id: "licenca-sanitaria",
      titulo: "Validade da licença sanitária (anexo)",
      status: "atencao",
      detalhe: "Não foi encontrada data de validade de licença sanitária nos anexos.",
      origem: "regra",
    });
  }

  // 6. Mês de corte da regularidade fiscal compatível com o período
  if (dados.mesCorteFiscal && fim) {
    const partes = dados.mesCorteFiscal.toLowerCase().split(" de ");
    const mesIndice = nomeMesParaIndice(partes[0]?.trim() ?? "");
    const anoCorte = parseInt(partes[1] ?? "0", 10);
    const compativel = mesIndice === fim.getMonth() && anoCorte === fim.getFullYear();
    itens.push({
      id: "regularidade-fiscal",
      titulo: "Regularidade fiscal e trabalhista",
      status: compativel ? "ok" : "desatualizado",
      detalhe: compativel
        ? `Mês de corte (${dados.mesCorteFiscal}) compatível com o período do relatório.`
        : `Mês de corte citado (${dados.mesCorteFiscal}) não corresponde ao mês final do período do relatório — documentação pode estar desatualizada.`,
      origem: "regra",
    });
  } else {
    itens.push({
      id: "regularidade-fiscal",
      titulo: "Regularidade fiscal e trabalhista",
      status: "atencao",
      detalhe: "Não foi possível localizar o mês de corte da regularidade fiscal no texto.",
      origem: "regra",
    });
  }

  // 7. Anexos citados (apenas valida se foram citados — checagem de presença real do arquivo é feita no número de páginas)
  if (dados.anexosCitados.length > 0) {
    itens.push({
      id: "anexos",
      titulo: "Anexos citados no relatório",
      status: "ok",
      detalhe: `Anexos citados: ${dados.anexosCitados.join("; ")}. Verifique manualmente se o conteúdo do anexo está presente nas páginas finais do PDF.`,
      origem: "regra",
    });
  } else {
    itens.push({
      id: "anexos",
      titulo: "Anexos citados no relatório",
      status: "atencao",
      detalhe: "Nenhum anexo citado foi identificado no texto do relatório.",
      origem: "regra",
    });
  }

  // 8. Comparação com histórico (mês anterior) — fotos repetidas e total de chamados igual
  if (historicoAnterior) {
    const comparacaoImagens = compararFingerprints(fingerprintsAtual, historicoAnterior.imagens);
    const percentualIdentico =
      comparacaoImagens.totalAtual > 0 ? comparacaoImagens.identicas / comparacaoImagens.totalAtual : 0;

    if (comparacaoImagens.totalAtual === 0) {
      itens.push({
        id: "fotos-repetidas",
        titulo: "Fotos repetidas em relação ao mês anterior",
        status: "atencao",
        detalhe: "Não foi possível extrair imagens deste PDF para comparação (formato de imagem não suportado pela extração automática).",
        origem: "regra",
      });
    } else if (percentualIdentico >= 0.3) {
      itens.push({
        id: "fotos-repetidas",
        titulo: "Fotos repetidas em relação ao mês anterior",
        status: "desatualizado",
        detalhe: `${comparacaoImagens.identicas} de ${comparacaoImagens.totalAtual} imagens parecem idênticas às do relatório anterior (páginas: ${comparacaoImagens.paginasSuspeitas.join(", ")}). Possível reaproveitamento de fotos antigas.`,
        origem: "regra",
      });
    } else {
      itens.push({
        id: "fotos-repetidas",
        titulo: "Fotos repetidas em relação ao mês anterior",
        status: "ok",
        detalhe: `Apenas ${comparacaoImagens.identicas} de ${comparacaoImagens.totalAtual} imagens coincidem com o mês anterior — dentro do esperado.`,
        origem: "regra",
      });
    }

    if (dados.totalChamados !== null && historicoAnterior.dados.totalChamados !== null) {
      const igual = dados.totalChamados === historicoAnterior.dados.totalChamados;
      itens.push({
        id: "chamados-repetidos",
        titulo: "Total de chamados vs. mês anterior",
        status: igual ? "atencao" : "ok",
        detalhe: igual
          ? `O total de chamados (${dados.totalChamados}) é idêntico ao do mês anterior — vale conferir se o dado foi realmente atualizado.`
          : `Total de chamados atual: ${dados.totalChamados}. Mês anterior: ${historicoAnterior.dados.totalChamados}.`,
        origem: "regra",
      });
    }
  } else {
    itens.push({
      id: "fotos-repetidas",
      titulo: "Fotos repetidas em relação ao mês anterior",
      status: "atencao",
      detalhe: "Não há relatório anterior salvo desta unidade para comparação. A partir do próximo mês essa checagem ficará disponível.",
      origem: "regra",
    });
  }

  return itens;
}
