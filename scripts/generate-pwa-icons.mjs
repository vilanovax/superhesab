import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const svgPath = path.join(root, "public/icons/icon.svg");
const outDir = path.join(root, "public/icons");

const sizes = [192, 512, 180];

await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  const name =
    size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, name));
  console.log("wrote", name);
}

// Favicon 32x32
await sharp(svgPath)
  .resize(32, 32)
  .png()
  .toFile(path.join(root, "public/favicon.png"));
console.log("wrote favicon.png");
