import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const svgPath = path.join(root, "public/icons/icon.svg");
const outDir = path.join(root, "public/icons");

await mkdir(outDir, { recursive: true });

for (const size of [192, 512]) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
  console.log("wrote", `icon-${size}.png`);
}

await sharp(svgPath)
  .resize(180, 180)
  .png()
  .toFile(path.join(outDir, "apple-touch-icon.png"));
console.log("wrote apple-touch-icon.png");

/** Maskable 512: icon at 80% with brand fill — keeps ~20% safe zone. */
const maskableSize = 512;
const inner = Math.round(maskableSize * 0.8);
const pad = Math.round((maskableSize - inner) / 2);
const innerPng = await sharp(svgPath).resize(inner, inner).png().toBuffer();

await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background: { r: 15, g: 92, b: 87, alpha: 1 },
  },
})
  .composite([{ input: innerPng, top: pad, left: pad }])
  .png()
  .toFile(path.join(outDir, "icon-maskable-512.png"));
console.log("wrote icon-maskable-512.png");

await sharp(svgPath)
  .resize(32, 32)
  .png()
  .toFile(path.join(root, "public/favicon.png"));
console.log("wrote favicon.png");
