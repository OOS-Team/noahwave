import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const OWNER = "OOS-Team";
const REPO = "noahwave";
const BRANCH = "main";

const files = [
  "scripts/generate-works.mjs",
  "public/data/works.json",
  "src/app/globals.css",
  "src/components/Gallery.tsx",
  "src/components/VisionLab.tsx",
  "src/lib/faceMatrix.ts",
  "src/lib/liveVision.ts",
  "package.json",
  "backend/main.py",
  "scripts/push-to-github.mjs",
];

if (!TOKEN) {
  console.error("Set GITHUB_TOKEN and re-run: node scripts/push-critical.mjs");
  process.exit(1);
}

async function gh(pathname, opts = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathname} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
const base = await gh(`/repos/${OWNER}/${REPO}/git/commits/${ref.object.sha}`);
const tree = [];
for (const file of files) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  const blob = await gh(`/repos/${OWNER}/${REPO}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content, encoding: "utf-8" }),
  });
  tree.push({ path: file, mode: "100644", type: "blob", sha: blob.sha });
  process.stdout.write(".");
}
console.log("");
const newTree = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
  method: "POST",
  body: JSON.stringify({ base_tree: base.tree.sha, tree }),
});
const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
  method: "POST",
  body: JSON.stringify({
    message: "Fix Vercel build: complete missing source files",
    tree: newTree.sha,
    parents: [ref.object.sha],
  }),
});
await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
  method: "PATCH",
  body: JSON.stringify({ sha: commit.sha }),
});
console.log("OK", commit.html_url || commit.sha);
