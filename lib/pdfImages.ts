import { ImageFingerprint } from "./types";

// Usamos a build legacy do pdfjs-dist, que funciona em Node sem dependências nativas
// para o que precisamos aqui: ler os bitmaps das imagens embutidas no PDF.
// Importante: isso é "melhor esforço" — PDFs muito diferentes na estrutura podem
// exigir ajustes finos nessa extração.

async function carregarPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

/**
 * Calcula um "average hash" (aHash) de 8x8 bits a partir de um bitmap RGB/RGBA.
 * Funciona como impressão digital visual: imagens iguais ou quase iguais geram
 * o mesmo hash (ou um hash com distância de Hamming muito baixa).
 */
function calcularAverageHash(data: Uint8ClampedArray, width: number, height: number, channels: number): string {
  const tamanho = 8;
  const blocos: number[] = new Array(tamanho * tamanho).fill(0);
  const contagens: number[] = new Array(tamanho * tamanho).fill(0);

  for (let y = 0; y < height; y++) {
    const blocoY = Math.min(tamanho - 1, Math.floor((y / height) * tamanho));
    for (let x = 0; x < width; x++) {
      const blocoX = Math.min(tamanho - 1, Math.floor((x / width) * tamanho));
      const idx = (y * width + x) * channels;
      const r = data[idx] ?? 0;
      const g = data[idx + 1] ?? 0;
      const b = data[idx + 2] ?? 0;
      const cinza = (r + g + b) / 3;
      const posBloco = blocoY * tamanho + blocoX;
      blocos[posBloco] += cinza;
      contagens[posBloco] += 1;
    }
  }

  const medias = blocos.map((soma, i) => (contagens[i] ? soma / contagens[i] : 0));
  const mediaGeral = medias.reduce((a, b) => a + b, 0) / medias.length;

  let hashBin = "";
  for (const m of medias) {
    hashBin += m >= mediaGeral ? "1" : "0";
  }

  // Converte string binária de 64 bits para hex (16 caracteres)
  let hashHex = "";
  for (let i = 0; i < hashBin.length; i += 4) {
    hashHex += parseInt(hashBin.slice(i, i + 4), 2).toString(16);
  }
  return hashHex;
}

export function distanciaHamming(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) return Number.MAX_SAFE_INTEGER;
  let distancia = 0;
  for (let i = 0; i < hashA.length; i++) {
    const a = parseInt(hashA[i], 16);
    const b = parseInt(hashB[i], 16);
    let xor = a ^ b;
    while (xor) {
      distancia += xor & 1;
      xor >>= 1;
    }
  }
  return distancia;
}

export async function extrairFingerprintsImagens(buffer: Uint8Array): Promise<ImageFingerprint[]> {
  const fingerprints: ImageFingerprint[] = [];
  try {
    const pdfjs = await carregarPdfjs();
    const loadingTask = pdfjs.getDocument({ data: buffer, isEvalSupported: false });
    const doc = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const opList = await page.getOperatorList();
        const OPS = pdfjs.OPS;

        for (let i = 0; i < opList.fnArray.length; i++) {
          if (opList.fnArray[i] === OPS.paintImageXObject) {
            const nome = opList.argsArray[i][0];
            try {
              const img = await new Promise<any>((resolve, reject) => {
                page.objs.get(nome, (obj: any) => resolve(obj));
                setTimeout(() => reject(new Error("timeout")), 5000);
              });
              if (img && img.data && img.width && img.height) {
                const canais = img.data.length / (img.width * img.height);
                const hash = calcularAverageHash(img.data, img.width, img.height, Math.round(canais));
                fingerprints.push({ pagina: pageNum, hash });
              }
            } catch {
              // imagem não pôde ser lida (formato não suportado sem canvas) - ignora
            }
          }
        }
      } catch {
        // página com erro de parsing - segue para a próxima
      }
    }
  } catch (e) {
    console.error("Erro ao extrair imagens do PDF:", e);
  }
  return fingerprints;
}

/**
 * Compara duas listas de fingerprints (mês atual x mês anterior) e retorna
 * quantas imagens parecem ser idênticas (distância de Hamming muito baixa).
 */
export function compararFingerprints(
  atual: ImageFingerprint[],
  anterior: ImageFingerprint[],
  limiarIdentico = 4
): { totalAtual: number; identicas: number; paginasSuspeitas: number[] } {
  let identicas = 0;
  const paginasSuspeitas: number[] = [];
  for (const imgAtual of atual) {
    const houveMatch = anterior.some((imgAnterior) => {
      const dist = distanciaHamming(imgAtual.hash, imgAnterior.hash);
      return dist <= limiarIdentico;
    });
    if (houveMatch) {
      identicas++;
      paginasSuspeitas.push(imgAtual.pagina);
    }
  }
  return { totalAtual: atual.length, identicas, paginasSuspeitas: Array.from(new Set(paginasSuspeitas)) };
}
