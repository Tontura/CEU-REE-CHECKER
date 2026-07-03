import { Redis } from "@upstash/redis";
import zlib from "zlib";

const redis = Redis.fromEnv();

function tratarDados(item: any) {
  if (item?.dados?.textoCompleto?.startsWith("GZIPPED:")) {
    try {
      const base64Data = item.dados.textoCompleto.replace("GZIPPED:", "");
      item.dados.textoCompleto = zlib.gunzipSync(Buffer.from(base64Data, "base64")).toString();
    } catch (e) { console.error(e); }
  }
  return item;
}

export async function buscarUltimoHistorico(unidade: string, periodoFimAtual: string) {
  try {
    const key = `ceu:historico:${unidade.toLowerCase().replace(/\s+/g, "-")}`;
    const data = await redis.lrange(key, 0, -1);
    if (!data) return null;
    const lista = data.map((item: any) => tratarDados(typeof item === "string" ? JSON.parse(item) : item));
    return lista.find((h: any) => h.periodoFim !== periodoFimAtual) || null;
  } catch { return null; }
}

export async function salvarHistorico(payload: any) {
  const key = `ceu:historico:${payload.unidade.toLowerCase().replace(/\s+/g, "-")}`;
  await redis.lpush(key, JSON.stringify(payload));
  await redis.ltrim(key, 0, 9);
  return { ok: true };
}
