import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const directory = await mkdtemp(path.join(tmpdir(), "schwab-insights-"));
try {
  const output = path.join(directory, "test.cjs");
  await build({ entryPoints: ["tests/realtime-intelligence.test.ts"], bundle: true, platform: "node", format: "cjs", external: ["cloudflare:workers"], outfile: output });
  const result = spawnSync(process.execPath, ["--test", output], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
