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

  // Função para validar Pragas e Reservatórios (4 meses)
  const validarServico = (dataStr: string | null, titulo: string, id: string) => {
    const dataServico = parseDataBr(dataStr || "");
    if (!dataServico) {
      itens.push({ id, titulo, status: "atencao", detalhe: "Data não identificada no texto.", origem: "regra" });
      return;
    }
    const diffMeses = (dataRef.getFullYear() - dataServico.getFullYear()) * 12 + (dataRef.getMonth() - dataServico.getMonth());
    const estaValido = diffMeses <= 4;
    itens.push({
      id, titulo,
      status: estaValido ? "ok" : "atencao",
      detalhe: `Realizado em ${dataStr}. ${estaValido ? 'Dentro da validade quadrimestral.' : 'Vencido ou fora do prazo (limite 4 meses).' }`,
      origem: "regra"
    });
  };

  // 1 e 2. Serviços Quadrimestrais
  validarServico(dados.dataControlePragas, "Controle de Pragas", "pragas");
  validarServico(dados.dataLimpezaReservatorio, "Limpeza de Reservatório", "reservatorio");

  // 3. Regularidade Fiscal (Confere se o mês atual aparece no texto)
  const mesRelNum = dados.periodoFim?.split("/")[1];
  const nomesMeses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const nomeMesAlvo = nomesMeses[parseInt(mesRelNum) - 1] || "";
  
  const temFiscal = (texto.includes("fgts") || texto.includes("inss") || texto.includes("cnd")) && texto.includes(nomeMesAlvo);
  itens.push({
    id: "fiscal", titulo: "Regularidade Fiscal e Trabalhista",
    status: temFiscal ? "ok" : "atencao",
    detalhe: temFiscal ? `Comprovações de ${nomeMesAlvo} identificadas.` : `Não foi encontrada menção ao mês de ${nomeMesAlvo} nas certidões.`,
    origem: "regra"
  });

  // 4. TI e Câmeras (Presença no texto)
  const temInfra = (texto.includes("wi-fi") || texto.includes("internet")) && (texto.includes("cftv") || texto.includes("câmeras"));
  itens.push({
    id: "infra", titulo: "TI, Wi-Fi e Câmeras",
    status: temInfra ? "ok" : "atencao",
    detalhe: temInfra ? "Menções a sistemas de rede e segurança encontradas." : "Faltam informações sobre TI ou Monitoramento.",
    origem: "regra"
  });

  // 5. Licença Sanitária (Presença no texto)
  const temSanit = texto.includes("sanitária") || texto.includes("vigilância");
  itens.push({
    id: "sanit", titulo: "Licença Sanitária",
    status: temSanit ? "ok" : "atencao",
    detalhe: temSanit ? "Licença citada (verificar validade na foto final)." : "Licença não identificada no texto.",
    origem: "regra"
  });

  return itens;
}
