"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { AnalysisResult } from "@/lib/types";
import { ResultadoAnalise } from "@/components/ResultadoAnalise";

export default function Home() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [usarIA, setUsarIA] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<AnalysisResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function analisar() {
    if (!arquivo) return;

    setCarregando(true);
    setErro(null);
    setResultado(null);

    try {
      const blob = await upload(arquivo.name, arquivo, {
        handleUploadUrl: "/api/blob/upload",
      });

      const formData = new FormData();
      formData.append("arquivoUrl", blob.url);
      formData.append("usarIA", String(usarIA));

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const textoErro = await res.text();

        try {
          const json = JSON.parse(textoErro);
          setErro(json.erro || "Erro ao processar o relatório.");
        } catch {
          setErro(textoErro || "Erro ao processar o relatório.");
        }

        return;
      }

      const data = await res.json();
      setResultado(data as AnalysisResult);
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Erro inesperado ao processar o relatório."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-slate-50 px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Checador de Relatórios de Encargos — CEUs
        </h1>

        <p className="max-w-xl text-sm text-slate-500">
