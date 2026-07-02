for (let i = 0; i < opList.fnArray.length; i++) {
  const operacao = opList.fnArray[i];

  const ehImagem =
    operacao === OPS.paintImageXObject ||
    operacao === OPS.paintInlineImageXObject;

  if (!ehImagem) {
    continue;
  }

  const nome = opList.argsArray[i]?.[0];

  try {
    const img = await new Promise<any>((resolve, reject) => {
      page.objs.get(nome, (obj: any) => resolve(obj));

      setTimeout(() => {
        reject(new Error("timeout"));
      }, 5000);
    });

    if (
      img &&
      img.data &&
      img.width &&
      img.height
    ) {
      const canais = Math.max(
        3,
        Math.round(
          img.data.length /
            (img.width * img.height)
        )
      );

      const hash = calcularAverageHash(
        img.data,
        img.width,
        img.height,
        canais
      );

      fingerprints.push({
        pagina: pageNum,
        hash,
      });
    }
  } catch {
    continue;
  }
}
