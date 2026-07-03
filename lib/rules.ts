import { CheckItem, ImageFingerprint } from "./types";

// Função para converter data de texto para objeto Date
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
  const dataRef = parseDataBr(dados.periodoFim) || new Date();

  const validarQuadrimestral = (dataStr: string, titulo: string, id: string) => {
    const dataServico = parseDataBr(dataStr);
    if (!dataServico) {
      itens.push({ id, titulo, status: "atencao", detalhe: `Data não identificada no texto.`, origem: "regra" });
      return;
    }
    
    // Cálculo de meses de diferença
    const diffMeses = (dataRef.getFullYear() - dataServico.getFullYear()) * 12 + (dataRef.getMonth() - dataServico.getMonth());
    const estaValido = diffMeses <= 4;

    itens.push({
      id, titulo,
      status: estaValido ? "ok" : "atencao",
      detalhe: `${estaValido ? '✅' : '❌'} Realizado em ${dataStr}. ${estaValido ? 'Dentro da validade quadrimestral.' : 'Vencido (mais de 4 meses).' }`,
      origem: "regra"
    });
  };

  validarQuadrimestral(dados.dataControlePragas, "Controle de Pragas", "pragas");
  validarQuadrimestral(dados.dataLimpezaReservatorio, "Limpeza de Reservatório", "reservatorio");

  // Adicione aqui as outras regras de TI, Câmeras, etc., como fizemos anteriormente...
  return itens;
}
