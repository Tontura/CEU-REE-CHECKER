import { Redis } from "@upstash/redis";
import zlib from "zlib";

const redis = Redis.fromEnv();

function tratarDadosRecuperados(item: any) {
  if (!item || !item.dados) return item;
  
  if (item.dados.textoCompleto?.startsWith("GZIPPED:")) {
    try {
      const base64Data = item.dados.textoCompleto.replace("GZIPPED:", "");
      const buffer = Buffer.from(base64Data, "base64");
      item.dados.textoCompleto = zlib.gunzipSync(buffer).toString();
    } catch (e) {
      console.error("Erro na descompressão:", e);
    }
  }
  return item;
}

export async function buscarUltimoHistorico(unidade: string, periodoFimAtual: string) {
  try {
    const key = `ceu:historico:${unidade.toLowerCase().replace(/\s+/g, "-")}`;
    const historico = await redis.lrange(key, 0, -1);

    if (!historico || historico.length === 0) return null;

    const lista = historico.map((item: any) => {
      const obj = typeof item === "string" ? JSON.parse(item) : item;
      return tratarDadosRecuperados(obj);
    });

    return lista.find((h: any) => h.periodoFim !== periodoFimAtual) || null;
  } catch (error) {
    return null;
  }
}

export async function salvarHistorico(payload: any) {
  try {
    const key = `ceu:historico:${payload.unidade.toLowerCase().replace(/\s+/g, "-")}`;
    await redis.lpush(key, JSON.stringify(payload));
    await redis.ltrim(key, 0, 9); // Mantém os últimos 10
    return { ok: true };
  } catch (error) {
    console.error("Erro ao salvar:", error);
    throw error;
  }
}
