"use client";

import { useState } from "react";
import { Upload, FileText, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import ResultadoAnalise from "@/components/ResultadoAnalise";
import { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<AnalysisResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivo(e.target.files[0]);
      setErro(null);
    }
  };

  const analisarRelatorio = async () => {
    if (!arquivo) return;

    setAnalisando(true);
    setErro(null);

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || "Erro ao analisar o relatório");
      }

      setResultado(data);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setAnalisando(false);
    }
  };

  const resetar = () => {
    setArquivo(null);
    setResultado(null);
    setErro(null);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            CEU Relatório Checker
          </h1>
          <p className="text-gray-600">
            Análise automática de conformidade para Relatórios de Execução de Encargos
          </p>
        </div>

        {!resultado ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 transition-colors hover:border-blue-400">
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-1">
                {arquivo ? arquivo.name : "Arraste o PDF ou clique para selecionar"}
              </p>
              <p className="text-sm text-gray-500 mb-6">Apenas arquivos PDF (Modelo REE)</p>
              
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                id="file-upload"
                onChange={handleFileChange}
                disabled={analisando}
              />
              <label
                htmlFor="file-upload"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium cursor-pointer hover:bg-blue-700 transition-colors"
              >
                Selecionar Arquivo
              </label>
            </div>

            {erro && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{erro}</p>
              </div>
            )}

            <button
              onClick={analisarRelatorio}
              disabled={!arquivo || analisando}
              className={`w-full mt-8 py-3 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                !arquivo || analisando
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700 shadow-md"
              }`}
            >
              {analisando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando Relatório...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Iniciar Análise
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button
                onClick={resetar}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Analisar outro arquivo
              </button>
            </div>
            
            <ResultadoAnalise resultado={resultado} />
          </div>
        )}
      </div>

      {/* RODAPÉ COM SEUS CRÉDITOS */}
      <footer className="mt-12 text-center text-gray-400 text-sm space-y-1">
        <p>&copy; {new Date().getFullYear()} - Sistema de Verificação CEU</p>
        <p className="font-medium text-gray-500">Desenvolvido por Hilton Cortez</p>
      </footer>
    </main>
  );
}
