import { Redis } from "@upstash/redis";
import { HistoricoMes } from "./types";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function chaveUnidade(unidade: string): string {
  const slug = unidade
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  return `ceu:historico:${slug}`;
}

/**
 * Busca o último relatório salvo de uma unidade (o mais recente antes do período atual).
 */
export async function buscarUltimoHistorico(unidade: string, periodoFimAtual: string): Promise<HistoricoMes | null> {
  const redis = getRedis();
  if (!redis) return null;

  const chave = chaveUnidade(unidade);
  const lista = await redis.lrange<HistoricoMes>(chave, 0, -1);
  if (!lista || lista.length === 0) return null;

  const parseDataBR = (d: string) => {
    const [dia, mes, ano] = d.split("/").map(Number);
    return new Date(ano, mes - 1, dia).getTime();
  };

  const atualTs = parseDataBR(periodoFimAtual);

  const anteriores = lista
    .filter((h) => parseDataBR(h.periodoFim) < atualTs)
    .sort((a, b) => parseDataBR(b.periodoFim) - parseDataBR(a.periodoFim));

  return anteriores[0] ?? null;
}

/**
 * Salva o relatório atual no histórico da unidade (mantém os últimos 12 meses).
 */
export async function salvarHistorico(historico: HistoricoMes): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const chave = chaveUnidade(historico.unidade);
  await redis.lpush(chave, historico);
  await redis.ltrim(chave, 0, 11);
}

export function redisConfigurado(): boolean {
  return getRedis() !== null;
}
