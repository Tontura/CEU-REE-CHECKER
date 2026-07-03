import { NextRequest, NextResponse } from "next/server";
import { extrairTextoPdf, extrairDadosRelatorio } from "@/lib/pdfExtract";
import { extrairFingerprintsImagens } from "@/lib/pdfImages";
import { rodarChecagensAutomaticas } from "@/lib/rules";
import { rodarChecagensIA } from "@/lib/claude";
import { buscarUltimoHistorico, salvarHistorico } from "@/lib/historico";
import { AnalysisResult, CheckItem } from "@/lib/types";
import zlib from "zlib";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const arquivo = formData.get("arquivo") as File | null;
    const usarIA = formData.get("usarIA") === "true";
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
    
    let itensIA: CheckItem[] = [];
    if (usarIA) itensIA = await rodarChecagensIA(dados);

    const todosItens = [...itensRegras, ...itensIA];

    // COMPRESSÃO PARA O REDIS
    const dadosParaSalvar = { ...dados };
    if (dadosParaSalvar.textoCompleto) {
      const compressed = zlib.gzipSync(dadosParaSalvar.textoCompleto);
      dadosParaSalvar.textoCompleto = `GZIPPED:${compressed.toString("base64")}`;
    }

    await salvarHistorico({
      unidade: dados.unidade,
      periodoFim: dados.periodoFim,
      dados: dadosParaSalvar,
      imagens: fingerprintsAtual,
      salvoEm: new Date().toISOString(),
    });

    const resultado: AnalysisResult = {
      unidade: dados.unidade,
      periodo: `${dados.periodoInicio} a ${dados.periodoFim}`,
      itens: todosItens,
      resumo: {
        ok: todosItens.filter(i => i.status === "ok").length,
        atencao: todosItens.filter(i => i.status === "atencao").length,
        desatualizado: todosItens.filter(i => i.status === "desatualizado").length,
      },
      temHistoricoAnterior: historicoAnterior !== null,
    };
    return NextResponse.json(resultado);
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
