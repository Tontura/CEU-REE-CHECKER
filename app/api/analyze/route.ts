import { NextRequest, NextResponse } from "next/server";
import { extrairTextoPdf, extrairDadosRelatorio } from "@/lib/pdfExtract";
import { extrairFingerprintsImagens } from "@/lib/pdfImages";
import { rodarChecagensAutomaticas } from "@/lib/rules";
import { rodarChecagensIA } from "@/lib/claude";
import { buscarUltimoHistorico, salvarHistorico } from "@/lib/historico";
import { AnalysisResult, CheckItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const arquivo = formData.get("arquivo") as File | null;
    const usarIA = formData.get("usarIA") === "true";

    if (!arquivo) {
      return NextResponse.json(
        { erro: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    const arrayBuffer = await arquivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    // Extração de texto e dados para a análise atual
    const { texto, paginas } = await extrairTextoPdf(buffer);
    const dados = extrairDadosRelatorio(texto, paginas);

    if (!dados.unidade || !dados.periodoFim) {
      return NextResponse.json(
        { erro: "Não foi possível identificar a unidade ou o período no PDF." },
        { status: 422 }
      );
    }

    // Extração de fingerprints de imagens
    const fingerprintsAtual = await extrairFingerprintsImagens(bytes);

    // Busca histórico anterior para comparação
    const historicoAnterior = await buscarUltimoHistorico(
      dados.unidade,
      dados.periodoFim
    );

    // Roda as checagens automáticas
    const itensRegras = rodarChecagensAutomaticas(
      dados,
      fingerprintsAtual,
      historicoAnterior
    );

    let itensIA: CheckItem[] = [];
    if (usarIA) {
      itensIA = await rodarChecagensIA(dados);
    }

    const todosItens = [...itensRegras, ...itensIA];

    // --- SALVAMENTO NO HISTÓRICO (RESOLVENDO ERRO DE 10MB) ---
    // Removemos o textoCompleto (que tem 13MB) antes de salvar no Redis
    // e limitamos a quantidade de imagens para economizar espaço.
    const { textoCompleto, ...dadosParaHistorico } = dados;
    const imagensReduzidas = fingerprintsAtual.slice(0, 50);

    await salvarHistorico({
      unidade: dados.unidade,
      periodoFim: dados.periodoFim,
      dados: dadosParaHistorico,
      imagens: imagensReduzidas,
      salvoEm: new Date().toISOString(),
    });
    // --------------------------------------------------------

    const resumo = {
      ok: todosItens.filter((i) => i.status === "ok").length,
      atencao: todosItens.filter((i) => i.status === "atencao").length,
      desatualizado: todosItens.filter((i) => i.status === "desatualizado").length,
    };

    const resultado: AnalysisResult = {
      unidade: dados.unidade,
      periodo: `${dados.periodoInicio || ""} a ${dados.periodoFim}`,
      itens: todosItens,
      resumo,
      temHistoricoAnterior: historicoAnterior !== null,
    };

    return NextResponse.json(resultado);
  } catch (e) {
    console.error("Erro na API de análise:", e);
    return NextResponse.json(
      { erro: "Erro interno ao processar o relatório." },
      { status: 500 }
    );
  }
}
