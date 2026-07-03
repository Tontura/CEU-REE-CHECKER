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
  const dataRef = parseDataBr(dados.periodoFim) || new Date();

  const validarServico = (dataStr: string | null, titulo: string, id: string) => {
    const dataServico = parseDataBr(dataStr || "");
    if (!dataServico) {
      itens.push({ id, titulo, status: "atencao", detalhe: "Data não encontrada no texto.", origem: "regra" });
      return;
    }
    const diffMeses = (dataRef.getFullYear() - dataServico.getFullYear()) * 12 + (dataRef.getMonth() - dataServico.getMonth());
    const estaValido = diffMeses <= 4;
    itens.push({
      id, titulo, status: estaValido ? "ok" : "atencao",
      detalhe: `Realizado em ${dataStr}. ${estaValido ? 'Dentro da validade.' : 'Vencido (limite 4 meses).'}`,
      origem: "regra"
    });
  };

  validarServico(dados.dataControlePragas, "Controle de Pragas", "pragas");
  validarServico(dados.dataLimpezaReservatorio, "Limpeza de Reservatório", "reservatorio");

  const mesRelNum = dados.periodoFim?.split("/")[1];
  const nomesMeses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const nomeMesAlvo = nomesMeses[parseInt(mesRelNum) - 1] || "";
  
  const temFiscal = (texto.includes("fgts") || texto.includes("inss") || texto.includes("cnd")) && texto.includes(nomeMesAlvo);
  itens.push({
    id: "fiscal", titulo: "Regularidade Fiscal", status: temFiscal ? "ok" : "atencao",
    detalhe: temFiscal ? `Comprovações de ${nomeMesAlvo} identificadas.` : `Mês de ${nomeMesAlvo} não localizado.`,
    origem: "regra"
  });

  return itens;
}
