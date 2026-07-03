import { NextRequest, NextResponse } from "next/server";
import { extrairTextoPdf, extrairDadosRelatorio } from "@/lib/pdfExtract";
import { extrairFingerprintsImagens } from "@/lib/pdfImages";
import { rodarChecagensAutomaticas } from "@/lib/rules";
import { buscarUltimoHistorico, salvarHistorico } from "@/lib/historico";
import { AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const arquivo = formData.get("arquivo") as File | null;

    if (!arquivo) return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });

    const arrayBuffer = await arquivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    const { texto, paginas } = await extrairTextoPdf(buffer);
    const dados = extrairDadosRelatorio(texto, paginas);

    if (!dados.unidade || !dados.periodoFim) {
      return NextResponse.json({ erro: "Dados não identificados." }, { status: 422 });
    }

    const fingerprintsAtual = await extrairFingerprintsImagens(bytes);
    const historicoAnterior = await buscarUltimoHistorico(dados.unidade, dados.periodoFim);
    const itensRegras = rodarChecagensAutomaticas(dados, fingerprintsAtual, historicoAnterior);

    const { textoCompleto, ...dadosParaHistorico } = dados;
    await salvarHistorico({
      unidade: dados.unidade,
      periodoFim: dados.periodoFim,
      dados: dadosParaHistorico,
      imagens: fingerprintsAtual.slice(0, 50),
      salvoEm: new Date().toISOString(),
    });

    const resultado: AnalysisResult = {
      unidade: dados.unidade,
      periodo: `${dados.periodoInicio || ""} a ${dados.periodoFim}`,
      itens: itensRegras,
      resumo: {
        ok: itensRegras.filter(i => i.status === "ok").length,
        atencao: itensRegras.filter(i => i.status === "atencao").length,
        desatualizado: itensRegras.filter(i => i.status === "desatualizado").length,
      },
      temHistoricoAnterior: historicoAnterior !== null,
    };

    return NextResponse.json(resultado);
  } catch (e) {
    return NextResponse.json({ erro: "Erro no processamento." }, { status: 500 });
  }
}
