import { NextRequest, NextResponse } from "next/server";
import { extrairTextoPdf, extrairDadosRelatorio } from "@/lib/pdfExtract";
import { extrairFingerprintsImagens } from "@/lib/pdfImages";
import { rodarChecagensAutomaticas } from "@/lib/rules";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const arquivo = formData.get("arquivo") as File | null;

    if (!arquivo) return NextResponse.json({ erro: "Arquivo não enviado." }, { status: 400 });

    const arrayBuffer = await arquivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    // 1. Extração pesada (ocorre apenas dentro do servidor)
    const { texto, paginas } = await extrairTextoPdf(buffer);
    const dados = extrairDadosRelatorio(texto, paginas);

    if (!dados.unidade || !dados.periodoFim) {
      return NextResponse.json({ erro: "Dados básicos (Unidade/Período) não encontrados no PDF." }, { status: 422 });
    }

    const fingerprintsAtual = await extrairFingerprintsImagens(bytes);

    // 2. Análise (usa o texto gigante, mas gera um resultado pequeno)
    const itensRegras = rodarChecagensAutomaticas(dados, fingerprintsAtual, null);

    // 3. RESPOSTA SEGURA (NÃO enviamos o textoCompleto de volta)
    return NextResponse.json({
      unidade: dados.unidade,
      periodo: `${dados.periodoInicio || ""} a ${dados.periodoFim}`,
      itens: itensRegras,
      resumo: {
        ok: itensRegras.filter(i => i.status === "ok").length,
        atencao: itensRegras.filter(i => i.status === "atencao").length,
        desatualizado: 0
      },
      temHistoricoAnterior: false
    });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ erro: "Erro ao processar o arquivo. Tente novamente." }, { status: 500 });
  }
}
