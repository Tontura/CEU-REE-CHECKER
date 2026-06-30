import { CheckItem, ExtractedReportData } from "./types";

const MODELO = "claude-sonnet-4-6";

export async function rodarChecagensIA(dados: ExtractedReportData): Promise<CheckItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return [
      {
        id: "ia-indisponivel",
        titulo: "Análise por IA",
        status: "atencao",
        detalhe: "ANTHROPIC_API_KEY não configurada nas variáveis de ambiente — análise por IA desativada.",
        origem: "ia",
      },
    ];
  }

  // Limita o texto enviado para controlar custo/latência
  const textoLimitado = dados.textoCompleto.slice(0, 12000);

  const prompt = `Você é um auditor analisando um "Relatório de Execução de Encargos" de um CEU (Centro Educacional Unificado) em São Paulo, parte de uma PPP. O relatório é mensal e segue sempre o mesmo modelo.

Sua tarefa: ler o texto abaixo e identificar APENAS inconsistências reais de atualização, como:
- Frases ou números que parecem ter sido copiados de um mês anterior e esquecidos de atualizar (ex: menção a uma data ou evento que não bate com o período do relatório)
- Contradições internas no texto (ex: diz que um serviço "ainda não foi feito" mas depois menciona ele como concluído)
- Menção a documentos, certificados ou prazos que parecem vencidos ou pendentes de atualização
- Informações vagas demais que deveriam ter sido substituídas por dados concretos do período

NÃO repita checagens óbvias de datas que já são feitas por outro sistema (período do relatório, validade de licença, mês de corte fiscal). Foque em nuances de TEXTO que só uma leitura cuidadosa pegaria.

Responda SOMENTE em JSON válido, sem markdown, no formato:
[{"titulo": "...", "status": "ok" | "atencao" | "desatualizado", "detalhe": "..."}]

Se não encontrar nenhuma inconsistência relevante, responda com uma lista contendo um único item de status "ok" dizendo que o texto está consistente.

Período do relatório: ${dados.periodoInicio} a ${dados.periodoFim}
Unidade: ${dados.unidade}

Texto do relatório:
"""
${textoLimitado}
"""`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const erroTexto = await response.text();
      return [
        {
          id: "ia-erro",
          titulo: "Análise por IA",
          status: "atencao",
          detalhe: `Falha ao chamar a API da Claude (status ${response.status}): ${erroTexto.slice(0, 200)}`,
          origem: "ia",
        },
      ];
    }

    const data = await response.json();
    const textoResposta = (data.content ?? [])
      .map((bloco: { type: string; text?: string }) => (bloco.type === "text" ? bloco.text : ""))
      .join("\n")
      .trim();

    const jsonLimpo = textoResposta.replace(/```json|```/g, "").trim();
    const itensIA = JSON.parse(jsonLimpo) as Array<{ titulo: string; status: string; detalhe: string }>;

    return itensIA.map((item, i) => ({
      id: `ia-${i}`,
      titulo: item.titulo,
      status: (["ok", "atencao", "desatualizado"].includes(item.status) ? item.status : "atencao") as CheckItem["status"],
      detalhe: item.detalhe,
      origem: "ia" as const,
    }));
  } catch (e) {
    return [
      {
        id: "ia-erro",
        titulo: "Análise por IA",
        status: "atencao",
        detalhe: `Erro ao processar resposta da IA: ${e instanceof Error ? e.message : String(e)}`,
        origem: "ia",
      },
    ];
  }
}
