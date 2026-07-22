/**
 * Upload project (including binaries) to GitHub via Contents/Git Data API.
 * Usage:
 *   export GITHUB_TOKEN=ghp_xxx   # classic PAT with repo scope
 *   node scripts/upload-to-github.mjs
 *
 * Or after fixing Xcode license, prefer:
 *   ./scripts/push-to-github.sh
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const OWNER = process.env.GITHUB_OWNER || "OOS-Team";
const REPO = process.env.GITHUB_REPO || "noahwave";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const ROOT = new URL("..", import.meta.url).pathname;

if (!TOKEN) {
  console.error("Set GITHUB_TOKEN (PAT with repo scope) and re-run.");
  process.exit(1);
}

const SKIP = new Set([
  "node_modules",
  ".next",
  ".git",
  "backend/.venv",
  "backend/__pycache__",
  ".env.local",
  ".DS_Store",
]);

async function walk(dir, base = "") {
  const out = [];
  for (const name of await readdir(dir)) {
    const rel = base ? `${base}/${name}` : name;
    if (SKIP.has(name) || SKIP.has(rel) || rel.startsWith("backend/.venv") || rel.startsWith("backend/__pycache__"))
      continue;
    if (name === "tsconfig.tsbuildinfo" || name === "next-env.d.ts") continue;
    const abs = join(dir, name);
    const st = await stat(abs);
    if (st.isDirectory()) out.push(...(await walk(abs, rel)));
    else out.push(rel);
  }
  return out;
}

async function gh(path, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${opts.method || "GET"} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return body;
}

const files = await walk(ROOT);
console.log(`Uploading ${files.length} files to ${OWNER}/${REPO}@${BRANCH}...`);

// Get current commit SHA
const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
const baseCommitSha = ref.object.sha;
const baseCommit = await gh(`/repos/${OWNER}/${REPO}/git/commits/${baseCommitSha}`);
const baseTreeSha = baseCommit.tree.sha;

// Create blobs (sequential to avoid rate limits; parallel in small batches)
const tree = [];
const batchSize = 5;
for (let i = 0; i < files.length; i += batchSize) {
  const slice = files.slice(i, i + batchSize);
  await Promise.all(
    slice.map(async (rel) => {
      const buf = await readFile(join(ROOT, rel));
      const isText = !/\.(png|jpe?g|webp|gif|mp4|webm|mov|ico|woff2?|ttf|eot|wasm)$/i.test(rel);
      const blob = await gh(`/repos/${OWNER}/${REPO}/git/blobs`, {
        method: "POST",
        body: JSON.stringify(
          isText
            ? { content: buf.toString("utf8"), encoding: "utf-8" }
            : { content: buf.toString("base64"), encoding: "base64" }
        ),
      });
      tree.push({ path: rel, mode: "100644", type: "blob", sha: blob.sha });
      process.stdout.write(".");
    })
  );
}
console.log("\nCreating tree...");
const newTree = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
  method: "POST",
  body: JSON.stringify({ base_tree: baseTreeSha, tree }),
});
const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
  method: "POST",
  body: JSON.stringify({
    message: "NoahWave: full project (source + media)",
    tree: newTree.sha,
    parents: [baseCommitSha],
  }),
});
await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
  method: "PATCH",
  body: JSON.stringify({ sha: commit.sha }),
});
console.log(`Done: https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`);
