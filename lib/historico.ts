import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function buscarUltimoHistorico(unidade: string, periodoFimAtual: string) {
  try {
    const key = `ceu:historico:${unidade.toLowerCase().replace(/\s+/g, "-")}`;
    const data = await redis.lrange(key, 0, -1);
    if (!data || data.length === 0) return null;

    const lista = data.map((item: any) => 
      typeof item === "string" ? JSON.parse(item) : item
    );

    return lista.find((h: any) => h.periodoFim !== periodoFimAtual) || null;
  } catch {
    return null;
  }
}

export async function salvarHistorico(payload: any) {
  try {
    const key = `ceu:historico:${payload.unidade.toLowerCase().replace(/\s+/g, "-")}`;
    await redis.lpush(key, JSON.stringify(payload));
    await redis.ltrim(key, 0, 4); // Guarda os últimos 5 relatórios
    return { ok: true };
  } catch (error) {
    console.error("Erro ao salvar:", error);
    return { ok: false };
  }
}
