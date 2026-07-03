"use client";

import { AnalysisResult } from "@/lib/types";

export default function ResultadoAnalise({ resultado }: { resultado: AnalysisResult }) {
  return (
    <div className="mt-8 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Resumo da Análise</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Conforme</p>
            <p className="text-2xl font-bold text-green-700">{resultado.resumo.ok}</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">Atenção</p>
            <p className="text-2xl font-bold text-yellow-700">{resultado.resumo.atencao}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 font-medium">Histórico</p>
            <p className="text-xs text-gray-500">{resultado.temHistoricoAnterior ? "Identificado" : "Primeiro"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {resultado.itens.map((item, index) => (
          <div key={index} className={`p-4 rounded-lg border ${
            item.status === "ok" ? "bg-white border-gray-200" : "bg-yellow-50 border-yellow-200"
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.status === "ok" ? "✅" : "⚠️"}</span>
              <div>
                <h3 className="font-bold text-gray-800">{item.titulo}</h3>
                <p className="text-sm text-gray-600">{item.detalhe}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
