import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const exts = [".tsx", ".ts", ".jsx", ".js"];

function resolveImport(spec: string, fromFile: string): string | null {
  const base = spec.startsWith("@/")
    ? join(root, "src", spec.slice(2))
    : spec.startsWith(".")
      ? resolve(dirname(fromFile), spec)
      : null;
  if (!base) return null;
  const candidates = [
    base,
    ...exts.map((ext) => base + ext),
    ...exts.map((ext) => join(base, "index" + ext)),
  ];
  return (
    candidates.find((candidate) => {
      try {
        return statSync(candidate).isFile();
      } catch {
        return false;
      }
    }) ?? null
  );
}

/** Static value imports reachable from the admin route, not dynamic server calls. */
function clientImportEdges(entry: string): { file: string; spec: string; line: number }[] {
  const seen = new Set<string>();
  const bad: { file: string; spec: string; line: number }[] = [];
  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      const match = /^\s*import\s+(?!type\b)(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/.exec(line);
      if (!match) return;
      const spec = match[1];
      if (spec.startsWith("node:") || spec.includes(".server")) {
        bad.push({ file: file.slice(root.length + 1), spec, line: index + 1 });
      }
      const next = resolveImport(spec, file);
      if (next) walk(next);
    });
  };
  walk(entry);
  return bad;
}

test("the admin page's client import graph does not statically import server modules", () => {
  const src = join(root, "src");
  assert.ok(readdirSync(src).length > 0);
  assert.deepEqual(clientImportEdges(join(src, "routes/admin.tsx")), []);
});
