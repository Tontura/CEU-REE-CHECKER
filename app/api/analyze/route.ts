import { NextRequest, NextResponse } from "next/server";
import { extrairTextoPdf, extrairDadosRelatorio } from "@/lib/pdfExtract";
import { rodarChecagensAutomaticas } from "@/lib/rules";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const arquivo = formData.get("arquivo") as File | null;
    if (!arquivo) return NextResponse.json({ erro: "PDF ausente" }, { status: 400 });

    const buffer = Buffer.from(await arquivo.arrayBuffer());

    // 1. Extração de texto (fica apenas na memória do servidor)
    const { texto } = await extrairTextoPdf(buffer);
    
    // 2. Extração de dados (Unidade, Datas, etc)
    const dados = extrairDadosRelatorio(texto);

    // 3. Rodar as checagens (Passamos o texto como string separada)
    const itensRegras = rodarChecagensAutomaticas(dados, texto);

    // 4. RESPOSTA MINÚSCULA (JSON de poucos KB)
    return NextResponse.json({
      unidade: dados.unidade,
      periodo: `${dados.periodoInicio} a ${dados.periodoFim}`,
      itens: itensRegras,
      resumo: {
        ok: itensRegras.filter(i => i.status === "ok").length,
        atencao: itensRegras.filter(i => i.status === "atencao").length,
        desatualizado: 0
      }
    });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ erro: "Erro ao processar o arquivo. Tente novamente." }, { status: 500 });
  }
}
