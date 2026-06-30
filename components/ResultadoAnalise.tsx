"use client";

import { AnalysisResult, CheckItem } from "@/lib/types";

const STATUS_CONFIG: Record<CheckItem["status"], { emoji: string; label: string; classe: string }> = {
  ok: { emoji: "✅", label: "Atualizado", classe: "border-green-200 bg-green-50" },
  atencao: { emoji: "⚠️", label: "Atenção", classe: "border-amber-200 bg-amber-50" },
  desatualizado: { emoji: "❌", label: "Desatualizado", classe: "border-red-200 bg-red-50" },
};

export function ResultadoAnalise({ resultado }: { resultado: AnalysisResult }) {
  return (
    <div className="w-full max-w-3xl flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{resultado.unidade}</h2>
            <p className="text-sm text-slate-500">Período: {resultado.periodo}</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">{resultado.resumo.ok} ok</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">{resultado.resumo.atencao} atenção</span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">{resultado.resumo.desatualizado} desatualizado</span>
          </div>
        </div>
        {!resultado.temHistoricoAnterior && (
          <p className="mt-3 text-xs text-slate-400">
            Nenhum relatório anterior desta unidade foi encontrado no histórico — comparações entre meses (fotos repetidas, dados sem variação) ficarão disponíveis a partir do próximo envio.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {resultado.itens.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          return (
            <div key={item.id} className={`rounded-xl border p-4 ${cfg.classe}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-slate-900">
                  {cfg.emoji} {item.titulo}
                </h3>
                <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {item.origem === "ia" ? "Análise IA" : "Regra automática"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{item.detalhe}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
