export async function getCroppedImg(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  rotation = 0,
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const rad = (rotation * Math.PI) / 180;

  // tuvali kırpılacak boyuta ayarla
  canvas.width = crop.width;
  canvas.height = crop.height;

  // döndürme gerekiyorsa (genelde 0)
  if (rotation) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
  }

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height, // kaynak (resmin içinden)
    0,
    0,
    canvas.width,
    canvas.height, // hedef (tuvale)
  );

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9),
  );
}
