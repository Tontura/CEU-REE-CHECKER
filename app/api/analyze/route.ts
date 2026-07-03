import { NextRequest, NextResponse } from "next/server";
import { extrairTextoPdf, extrairDadosRelatorio } from "@/lib/pdfExtract";
import { extrairFingerprintsImagens } from "@/lib/pdfImages";
import { rodarChecagensAutomaticas } from "@/lib/rules";
import { rodarChecagensIA } from "@/lib/claude";
import { buscarUltimoHistorico, salvarHistorico } from "@/lib/historico";
import { AnalysisResult, CheckItem } from "@/lib/types";
import zlib from "zlib"; // Importado para compressão

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const arquivo = formData.get("arquivo") as File | null;
    const usarIA = formData.get("usarIA") === "true";

    if (!arquivo) {
      return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const arrayBuffer = await arquivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    const { texto, paginas } = await extrairTextoPdf(buffer);
    const dados = extrairDadosRelatorio(texto, paginas);

    if (!dados.unidade || !dados.periodoFim) {
      return NextResponse.json(
        { erro: "Não foi possível identificar a unidade (CEU) ou o período do relatório neste PDF." },
        { status: 422 }
      );
    }

    const fingerprintsAtual = await extrairFingerprintsImagens(bytes);
    const historicoAnterior = await buscarUltimoHistorico(dados.unidade, dados.periodoFim);

    const itensRegras = rodarChecagensAutomaticas(dados, fingerprintsAtual, historicoAnterior);
    let itensIA: CheckItem[] = [];
    if (usarIA) {
      itensIA = await rodarChecagensIA(dados);
    }

    const todosItens = [...itensRegras, ...itensIA];

    // --- LÓGICA DE COMPRESSÃO PARA O REDIS ---
    // Clonamos o objeto para não afetar a resposta da API atual
    const dadosParaHistorico = JSON.parse(JSON.stringify(dados));
    
    if (dadosParaHistorico.textoCompleto) {
      // Comprime o texto gigante usando Gzip
      const compressedBuffer = zlib.gzipSync(dadosParaHistorico.textoCompleto);
      // Substitui o texto original por uma string identificada e codificada em base64
      dadosParaHistorico.textoCompleto = `GZIPPED:${compressedBuffer.toString("base64")}`;
    }

    await salvarHistorico({
      unidade: dados.unidade,
      periodoFim: dados.periodoFim,
      dados: dadosParaHistorico, // Enviando os dados comprimidos
      imagens: fingerprintsAtual,
      salvoEm: new Date().toISOString(),
    });
    // ------------------------------------------

    const resumo = {
      ok: todosItens.filter((i) => i.status === "ok").length,
      atencao: todosItens.filter((i) => i.status === "atencao").length,
      desatualizado: todosItens.filter((i) => i.status === "desatualizado").length,
    };

    const resultado: AnalysisResult = {
      unidade: dados.unidade,
      periodo: `${dados.periodoInicio} a ${dados.periodoFim}`,
      itens: todosItens,
      resumo,
      temHistoricoAnterior: historicoAnterior !== null,
    };

    return NextResponse.json(resultado);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { erro: `Erro ao processar o relatório: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
