// Fails when the JavaScript every visitor downloads before the login form (the entry chunk and the
// chunks preloaded with it, gzipped) is over the budget, or when the drawing stack is in it.
// Run after `npm run build`. Lower BUDGET_KB as the bundle shrinks (the goal is 300).
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 440;
const dist = new URL("../dist/", import.meta.url);
const html = readFileSync(new URL("index.html", dist), "utf8");
const files = [
  ...html.matchAll(/<script[^>]*type="module"[^>]*src="\/([^"]+)"/g),
  ...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="\/([^"]+)"/g),
].map((m) => m[1]);

let total = 0;
const heavy = [];
for (const f of files) {
  const code = readFileSync(new URL(f, dist));
  const kb = gzipSync(code).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(7)} kB  ${f}`);
  if (
    /Konva|react-reconciler/.test(
      code.toString("utf8").replace(/assets\/[\w.-]*Konva[\w.-]*\.js/g, ""),
    )
  )
    heavy.push(f);
}
console.log(
  `${total.toFixed(1).padStart(7)} kB  initial JavaScript (gzip), budget ${BUDGET_KB} kB`,
);
if (heavy.length) {
  console.error(`The drawing stack (Konva) is in the initial load: ${heavy.join(", ")}`);
  process.exit(1);
}
if (total > BUDGET_KB) {
  console.error(`Over the budget by ${(total - BUDGET_KB).toFixed(1)} kB`);
  process.exit(1);
}
