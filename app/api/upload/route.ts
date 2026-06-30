import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

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
    return NextResponse.json(
      { erro: String(error) },
      { status: 500 }
    );
  }
}
