/**
 * Minimal .env.local loader for the probe scripts. tsx does not read it, and
 * Next's own loader is not available outside the app.
 *
 * Splits on /\r?\n/ rather than "\n": the file picks up CRLF endings whenever
 * it is touched by a Windows tool, and in a JS regex `.` excludes \r, so a
 * `(.*)$` match silently fails on every line of a CRLF file.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadEnv(file = ".env.local") {
  let text: string;
  try {
    text = readFileSync(join(process.cwd(), file), "utf8");
  } catch {
    throw new Error(`${file} not found. Run from the project root.`);
  }
  // Strip a BOM if a Windows editor added one.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  let loaded = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key]) continue;
    process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
    loaded++;
  }
  if (!process.env.AMD_API_KEY) throw new Error("AMD_API_KEY missing after loading " + file);
  return loaded;
}
