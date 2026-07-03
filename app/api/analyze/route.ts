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

    if (!arquivo) {
      return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const arrayBuffer = await arquivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    // 1. Extração de Texto do PDF
    const { texto, paginas } = await extrairTextoPdf(buffer);
    
    // 2. Extração de Dados (Datas, Unidade, etc)
    const dados = extrairDadosRelatorio(texto, paginas);

    if (!dados.unidade || !dados.periodoFim) {
      return NextResponse.json({ erro: "Não foi possível identificar o CEU ou o Período no PDF." }, { status: 422 });
    }

    // 3. Extração de Imagens/Fotos (para a análise atual)
    const fingerprintsAtual = await extrairFingerprintsImagens(bytes);

    // 4. Rodar as Regras Automáticas (Pragas, Reservatório, Fiscal, etc)
    // Passamos null no histórico anterior porque agora não salvamos mais nada
    const itensRegras = rodarChecagensAutomaticas(dados, fingerprintsAtual, null);

    // 5. Retornar apenas o resultado da análise para a tela
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
    console.error("Erro na análise:", e);
    return NextResponse.json(
      { erro: "Erro ao processar o PDF. Certifique-se de que é um arquivo válido." },
      { status: 500 }
    );
  }
}
