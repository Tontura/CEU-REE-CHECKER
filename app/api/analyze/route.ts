import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { erro: "Arquivo não enviado" },
        { status: 400 }
      );
    }

    const blob = await put(file.name, file, {
      access: "public",
    });

    return NextResponse.json({
      url: blob.url,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao enviar arquivo",
      },
      { status: 500 }
    );
  }
}
