"use client";

import { useState, useRef } from "react";
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
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      formData.append("usarIA", String(usarIA));

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 413) {
          setErro(
            "PDF maior que 5 MB. Compacte o arquivo antes de enviar."
          );
          return;
        }

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
          Envie o PDF do relatório mensal de qualquer unidade. O sistema verifica
          datas, validades, consistência dos dados e compara automaticamente com
          o relatório do mês anterior salvo no histórico.
        </p>
      </div>

      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
        <label
          htmlFor="arquivo"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-10 text-slate-500 hover:border-slate-400"
        >
          <span className="text-sm">
            {arquivo
              ? `Arquivo selecionado: ${arquivo.name}`
              : "Clique para selecionar o PDF do relatório"}
          </span>

          <input
            ref={inputRef}
            id="arquivo"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (!file) return;

              setErro(null);

              if (file.size > 5 * 1024 * 1024) {
                setErro(
                  "PDF maior que 5 MB. Compacte o PDF antes de enviar."
                );

                setArquivo(null);

                if (inputRef.current) {
                  inputRef.current.value = "";
                }

                return;
              }

              setArquivo(file);
            }}
          />
        </label>

        <div className="mt-4 flex items-center justify-between">
        
            {carregando ? "Analisando..." : "Analisar relatório"}
          </button>
        </div>

        {erro && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>

      {resultado && <ResultadoAnalise resultado={resultado} />}
    </main>
  );
}
