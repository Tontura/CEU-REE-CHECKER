// Substitua a função extrairDadosRelatorio dentro de lib/pdfExtract.ts
export function extrairDadosRelatorio(texto: string, paginas: string[]): any {
  const dados: any = {
    unidade: null,
    periodoInicio: null,
    periodoFim: null,
    dataLimpezaReservatorio: null,
    dataControlePragas: null,
    validadeLicencaSanitaria: null,
    totalChamados: null,
    anexosCitados: [],
    textoCompleto: texto,
    numeroPaginas: paginas.length
  };

  // Identificar Unidade (Ex: CEU Silvio Santos)
  const unidadeMatch = texto.match(/CEU\s+([A-Za-zÀ-ÿ\s]+?)(?=\s*\||Relatório|PERÍODO)/i);
  if (unidadeMatch) dados.unidade = unidadeMatch[0].trim();

  // Identificar Período
  const periodoMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/);
  if (periodoMatch) {
    dados.periodoInicio = periodoMatch[1];
    dados.periodoFim = periodoMatch[2];
  }

  // Identificar Data Limpeza Reservatório (Aceita "18 de junho de 2026" ou "18/06/2026")
  const limpezaMatch = texto.match(/(?:limpeza|desinfecção)[^.]+?(?:realizada|executada)[^.]+?(\d{1,2}(?:\/|\s+de\s+)\w+(?:\/|\s+de\s+)\d{4})/i);
  if (limpezaMatch) dados.dataLimpezaReservatorio = limpezaMatch[1];

  // Identificar Data Controle Pragas
  const pragasMatch = texto.match(/(?:controle de pragas|desinsetização)[^.]+?(?:realizado|executado)[^.]+?(\d{1,2}(?:\/|\s+de\s+)\w+(?:\/|\s+de\s+)\d{4})/i);
  if (pragasMatch) dados.dataControlePragas = pragasMatch[1];

  // Chamados
  const chamadosMatch = texto.match(/total\s*de\s*chamados[^:]*:\s*(\d+)/i) || texto.match(/(\d+)\s*chamados/i);
  if (chamadosMatch) dados.totalChamados = parseInt(chamadosMatch[1]);

  return dados;
}
