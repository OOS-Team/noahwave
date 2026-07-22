import { access, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "public", "data", "works.json");

await mkdir(join(ROOT, "public", "data"), { recursive: true });
try {
  await access(OUT);
  console.log("works.json present");
} catch {
  await writeFile(OUT, "[]\n");
  console.log("wrote empty works.json");
}
