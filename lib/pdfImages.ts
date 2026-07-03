import { OPS, getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "path";
import { ImageFingerprint } from "./types";

if (typeof window === "undefined") {
  GlobalWorkerOptions.workerSrc = path.join(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
  );
}

function calcularAverageHash(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  canais: number
): string {
  const totalPixels = width * height;
  const grays: number[] = new Array(totalPixels);

  for (let p = 0; p < totalPixels; p++) {
    const offset = p * canais;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    grays[p] = (r + g + b) / 3;
  }

  const sum = grays.reduce((acc, v) => acc + v, 0);
  const media = sum / grays.length;

  let hash = "";
  for (let p = 0; p < grays.length; p++) {
    const bit = grays[p] >= media ? "1" : "0";
    hash += bit;
  }
  return hash;
}

function similaridadeHash(hashA: string, hashB: string): number {
  if (!hashA || !hashB || hashA.length !== hashB.length) return 0;
  let diferentes = 0;
  for (let i = 0; i < hashA.length; i++) {
    if (hashA[i] !== hashB[i]) diferentes++;
  }
  return 1 - diferentes / hashA.length;
}

export async function extrairFingerprintsImagens(
  pdfBuffer: Buffer | Uint8Array
): Promise<ImageFingerprint[]> {
  const fingerprints: ImageFingerprint[] = [];
  try {
    const loadingTask = getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const opList = await page.getOperatorList();
        for (let i = 0; i < opList.fnArray.length; i++) {
          const operacao = opList.fnArray[i];
          if (operacao !== OPS.paintImageXObject && operacao !== OPS.paintInlineImageXObject) continue;
          const nome = opList.argsArray[i]?.[0];
          try {
            const img = await new Promise<any>((resolve, reject) => {
              page.objs.get(nome, (obj: any) => resolve(obj));
              setTimeout(() => reject(new Error("timeout")), 5000);
            });
            if (img && img.data && img.width && img.height) {
              const canais = Math.max(3, Math.round(img.data.length / (img.width * img.height)));
              const hash = calcularAverageHash(img.data, img.width, img.height, canais);
              fingerprints.push({ pagina: pageNum, hash });
            }
          } catch { continue; }
        }
      } catch (erroPagina) { console.error(erroPagina); }
    }
  } catch (erro) { console.error(erro); }
  return fingerprints;
}

export function compararFingerprints(atual: ImageFingerprint[], anterior: ImageFingerprint[], limiar = 0.9) {
  let identicas = 0;
  const paginasSuspeitas: number[] = [];
  for (const fpAtual of atual) {
    const encontrouIgual = anterior.some(fpAnterior => similaridadeHash(fpAtual.hash, fpAnterior.hash) >= limiar);
    if (encontrouIgual) {
      identicas++;
      paginasSuspeitas.push(fpAtual.pagina);
    }
  }
  return { totalAtual: atual.length, identicas, paginasSuspeitas: Array.from(new Set(paginasSuspeitas)) };
}
