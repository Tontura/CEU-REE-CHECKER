import { CheckItem, ImageFingerprint } from "./types";

export function rodarChecagensAutomaticas(
  dados: any,
  fingerprintsAtual: ImageFingerprint[],
  historicoAnterior: any
): CheckItem[] {
  const itens: CheckItem[] = [];

  // --- 1. FOTOS ---
  // Se tem imagens, está bom (OK)
  if (fingerprintsAtual.length > 0) {
    itens.push({
      id: "fotos_presenca",
      label: "Fotos no relatório",
      status: "ok",
      observacao: `O relatório contém ${fingerprintsAtual.length} imagens/fotos registradas.`,
      categoria: "Regra automática"
    });
  } else {
    itens.push({
      id: "fotos_presenca",
      label: "Fotos no relatório",
      status: "atencao",
      observacao: "Não foram detectadas fotos neste relatório.",
      categoria: "Regra automática"
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
      label: "Licença Sanitária",
      status: "ok",
      observacao: `Licença identificada com validade até ${dados.validadeLicencaSanitaria}.`,
      categoria: "Regra automática"
    });
  } else if (citouAnexo) {
    itens.push({
      id: "licenca_sanitaria",
      label: "Licença Sanitária",
      status: "ok", // Colocamos como OK se ela existe como anexo
      observacao: "Licença Sanitária citada nos anexos do relatório.",
      categoria: "Regra automática"
    });
  } else {
    itens.push({
      id: "licenca_sanitaria",
      label: "Licença Sanitária",
      status: "atencao",
      observacao: "Não foi possível confirmar a presença da Licença Sanitária.",
      categoria: "Regra automática"
    });
  }

  // --- 3. OUTROS DADOS (Controle de Pragas, Reservatório, etc) ---
  if (dados.dataControlePragas) {
    itens.push({
      id: "pragas",
      label: "Controle de Pragas",
      status: "ok",
      observacao: `Realizado em: ${dados.dataControlePragas}.`,
      categoria: "Regra automática"
    });
  }

  if (dados.dataLimpezaReservatorio) {
    itens.push({
      id: "reservatorio",
      label: "Limpeza de Reservatório",
      status: "ok",
      observacao: `Realizada em: ${dados.dataLimpezaReservatorio}.`,
      categoria: "Regra automática"
    });
  }

  return itens;
}
