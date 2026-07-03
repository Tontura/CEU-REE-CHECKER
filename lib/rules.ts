import { CheckItem, ImageFingerprint } from "./types";

export function rodarChecagensAutomaticas(
  dados: any,
  fingerprintsAtual: ImageFingerprint[],
  historicoAnterior: any
): CheckItem[] {
  const itens: CheckItem[] = [];

  // --- 1. FOTOS ---
  if (fingerprintsAtual && fingerprintsAtual.length > 0) {
    itens.push({
      id: "fotos_presenca",
      titulo: "Fotos no relatório",
      status: "ok",
      detalhe: `O relatório contém ${fingerprintsAtual.length} imagens/fotos registradas.`,
      origem: "regra"
    });
  } else {
    itens.push({
      id: "fotos_presenca",
      titulo: "Fotos no relatório",
      status: "atencao",
      detalhe: "Não foram detectadas fotos neste relatório.",
      origem: "regra"
    });
  }

  // --- 2. LICENÇA SANITÁRIA ---
  const temData = !!dados.validadeLicencaSanitaria;
  const citouAnexo = dados.anexosCitados?.some((a: string) => 
    a.toLowerCase().includes("sanit") || a.toLowerCase().includes("licen")
  );

  if (temData) {
    itens.push({
      id: "licenca_sanitaria",
      titulo: "Licença Sanitária",
      status: "ok",
      detalhe: `Licença identificada com validade até ${dados.validadeLicencaSanitaria}.`,
      origem: "regra"
    });
  } else if (citouAnexo) {
    itens.push({
      id: "licenca_sanitaria",
      titulo: "Licença Sanitária",
      status: "ok",
      detalhe: "Licença Sanitária citada nos anexos do relatório.",
      origem: "regra"
    });
  } else {
    itens.push({
      id: "licenca_sanitaria",
      titulo: "Licença Sanitária",
      status: "atencao",
      detalhe: "Não foi possível confirmar a presença ou validade da Licença Sanitária.",
      origem: "regra"
    });
  }

  // --- 3. CONTROLE DE PRAGAS ---
  if (dados.dataControlePragas) {
    itens.push({
      id: "pragas",
      titulo: "Controle de Pragas",
      status: "ok",
      detalhe: `Realizado em: ${dados.dataControlePragas}.`,
      origem: "regra"
    });
  }

  // --- 4. LIMPEZA DE RESERVATÓRIO ---
  if (dados.dataLimpezaReservatorio) {
    itens.push({
      id: "reservatorio",
      titulo: "Limpeza de Reservatório",
      status: "ok",
      detalhe: `Realizada em: ${dados.dataLimpezaReservatorio}.`,
      origem: "regra"
    });
  }

  return itens;
}
