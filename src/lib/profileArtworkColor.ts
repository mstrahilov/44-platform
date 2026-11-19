/**
 * Mirrors the iOS profile backdrop sampler: average the full artwork, keep its
 * hue, and constrain its HSB value to a dark range that keeps white text clear.
 */
export function sampleProfileArtworkColor(image: HTMLImageElement): string | null {
  if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  try {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'medium';
    context.drawImage(image, 0, 0, 1, 1);

    const [redByte, greenByte, blueByte, alphaByte] = context.getImageData(0, 0, 1, 1).data;
    const alpha = alphaByte / 255;
    // UIKit's sampler reads the premultiplied RGB bytes from its 1×1 context
    // and then makes the result opaque. Apply the same treatment to PNG alpha.
    const red = (redByte / 255) * alpha;
    const green = (greenByte / 255) * alpha;
    const blue = (blueByte / 255) * alpha;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;

    let hue = 0;
    if (delta > 0) {
      if (max === red) hue = 60 * (((green - blue) / delta) % 6);
      else if (max === green) hue = 60 * ((blue - red) / delta + 2);
      else hue = 60 * ((red - green) / delta + 4);
      if (hue < 0) hue += 360;
    }

    const saturation = max === 0 ? 0 : delta / max;
    const brightness = Math.min(Math.max(max * 0.42, 0.07), 0.19);
    const adjustedSaturation = saturation < 0.05 ? saturation : Math.min(saturation * 1.3, 0.5);

    return hsbToRgbCss(hue, adjustedSaturation, brightness);
  } catch {
    // Canvas can reject pixels from external images without CORS permission.
    return null;
  }
}

function hsbToRgbCss(hue: number, saturation: number, brightness: number): string {
  const chroma = brightness * saturation;
  const hueSector = ((hue / 60) % 2 + 2) % 2;
  const secondary = chroma * (1 - Math.abs(hueSector - 1));
  const offset = brightness - chroma;

  let channels: [number, number, number];
  if (hue < 60) channels = [chroma, secondary, 0];
  else if (hue < 120) channels = [secondary, chroma, 0];
  else if (hue < 180) channels = [0, chroma, secondary];
  else if (hue < 240) channels = [0, secondary, chroma];
  else if (hue < 300) channels = [secondary, 0, chroma];
  else channels = [chroma, 0, secondary];

  const [red, green, blue] = channels.map(channel => Math.round((channel + offset) * 255));
  return `rgb(${red} ${green} ${blue})`;
}
