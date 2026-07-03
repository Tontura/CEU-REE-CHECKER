import { CheckItem, ImageFingerprint } from "./types";

// Auxiliar para ler datas do relatório
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

  // Função de Validade Quadrimestral
  const validarQuadrimestral = (dataStr: string, titulo: string, id: string) => {
    const dataServico = parseDataBr(dataStr);
    if (!dataServico) {
      itens.push({ id, titulo, status: "atencao", detalhe: "Data não encontrada no texto.", origem: "regra" });
      return;
    }
    const diffMeses = (dataRef.getFullYear() - dataServico.getFullYear()) * 12 + (dataRef.getMonth() - dataServico.getMonth());
    const estaValido = diffMeses <= 4;
    itens.push({
      id, titulo,
      status: estaValido ? "ok" : "atencao",
      detalhe: `Realizado em ${dataStr}. ${estaValido ? 'Dentro da validade de 4 meses.' : 'Vencido (mais de 4 meses).' }`,
      origem: "regra"
    });
  };

  // 1. Controle de Pragas
  validarQuadrimestral(dados.dataControlePragas, "Controle de Pragas", "pragas");

  // 2. Limpeza de Reservatório
  validarQuadrimestral(dados.dataLimpezaReservatorio, "Limpeza de Reservatório", "reservatorio");

  // 3. Contexto/Apresentação
  const temIntro = texto.includes("contexto") || texto.includes("apresentação") || texto.includes("introdução");
  itens.push({
    id: "contexto", titulo: "Apresentação e Contexto",
    status: temIntro ? "ok" : "atencao",
    detalhe: temIntro ? "Seção de introdução/apresentação identificada." : "Não foi identificada seção de contexto.",
    origem: "regra"
  });

  // 4. Fotos
  itens.push({
    id: "fotos", titulo: "Fotos e Imagens",
    status: fingerprintsAtual.length > 5 ? "ok" : "atencao",
    detalhe: `Identificadas ${fingerprintsAtual.length} imagens no relatório.`,
    origem: "regra"
  });

  // 5. TI, Wi-Fi e Câmeras
  const temTI = texto.includes("wi-fi") || texto.includes("internet");
  const temCftv = texto.includes("cftv") || texto.includes("câmeras") || texto.includes("monitoramento");
  itens.push({
    id: "infra", titulo: "TI, Wi-Fi e Câmeras",
    status: (temTI && temCftv) ? "ok" : "atencao",
    detalhe: `TI/Wi-Fi: ${temTI ? 'OK' : 'Não citado'}. Câmeras: ${temCftv ? 'OK' : 'Não citado'}.`,
    origem: "regra"
  });

// --- 6. Regularidade Fiscal e Trabalhista ---
  // 1. Identifica o mês do relatório (ex: "maio")
  const mesRelatorioNum = dados.periodoFim?.split("/")[1]; 
  const nomesMeses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const mesNomeRelatorio = nomesMeses[parseInt(mesRelatorioNum) - 1] || "";

  // 2. Verifica se o mês aparece no texto
  const mencionouMesCorreto = texto.includes(mesNomeRelatorio);
  
  // 3. Verifica termos fiscais
  const temPalavrasFiscal = texto.includes("fgts") || texto.includes("inss") || texto.includes("cnd") || texto.includes("regularidade") || texto.includes("trabalhista");

  itens.push({
    id: "fiscal", 
    titulo: "Regularidade Fiscal e Trabalhista",
    status: (mencionouMesCorreto && temPalavrasFiscal) ? "ok" : "atencao",
    detalhe: mencionouMesCorreto 
      ? `Comprovações de ${mesNomeRelatorio} identificadas no texto.` 
      : `Atenção: Não foi encontrada menção ao mês de ${mesNomeRelatorio} para as certidões fiscais.`,
    origem: "regra"
  });

  // 7. Vigilância Sanitária
  const temSanit = texto.includes("sanitária") || texto.includes("vigilância");
  itens.push({
    id: "sanitaria", titulo: "Licença Sanitária",
    status: temSanit ? "ok" : "atencao",
    detalhe: temSanit ? "Citada no relatório (verificar imagem final)." : "Não identificada.",
    origem: "regra"
  });

  return itens;
}
