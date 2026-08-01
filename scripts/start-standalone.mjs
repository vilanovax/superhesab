/**
 * Local prod runner for Next.js `output: "standalone"`.
 * `next start` cannot serve this mode — copy static/public like the Dockerfile.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next/standalone");
const serverJs = path.join(standalone, "server.js");
const staticSrc = path.join(root, ".next/static");
const staticDest = path.join(standalone, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");

if (!existsSync(serverJs)) {
  console.error("Missing .next/standalone/server.js — run `npm run build` first.");
  process.exit(1);
}
if (!existsSync(staticSrc)) {
  console.error("Missing .next/static — run `npm run build` first.");
  process.exit(1);
}

mkdirSync(path.join(standalone, ".next"), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
}

const port = process.env.PORT || "3003";
const child = spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
