/**
 * Upload media + full source to GitHub via Git Data API (binary-safe).
 * Works without system git / Xcode license.
 *
 *   export GITHUB_TOKEN=ghp_xxxxxxxx
 *   node scripts/push-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OWNER = process.env.GITHUB_OWNER || "OOS-Team";
const REPO = process.env.GITHUB_REPO || "noahwave";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

if (!TOKEN) {
  console.error(`\nMissing GITHUB_TOKEN.\n\n1. Open https://github.com/settings/tokens\n2. Generate new token (classic) → enable scope: repo\n3. Run:\n\n   export GITHUB_TOKEN=ghp_your_token_here\n   node scripts/push-assets.mjs\n`);
  process.exit(1);
}

const SKIP = new Set([
  "node_modules",
  ".next",
  ".git",
  "backend/.venv",
  "backend/__pycache__",
]);

function walk(dir, prefix = "") {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    if (name === ".env.local" || name === ".DS_Store") continue;
    if (name.endsWith(".tsbuildinfo") || name === "next-env.d.ts") continue;
    if (
      name.startsWith(".mcp") ||
      name.startsWith(".vercel-push") ||
      name.startsWith(".gallery") ||
      name.startsWith(".push") ||
      name.startsWith(".upload")
    )
      continue;
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (rel === "backend/.venv" || rel.startsWith("backend/__pycache__")) continue;
      out.push(...walk(abs, rel));
    } else {
      out.push(rel.split(path.sep).join("/"));
    }
  }
  return out;
}

async function gh(apiPath, opts = {}) {
  const res = await fetch(`https://api.github.com${apiPath}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${opts.method || "GET"} ${apiPath} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

const files = walk(ROOT);
console.log(`Uploading ${files.length} files to ${OWNER}/${REPO}@${BRANCH}…`);

const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
const baseCommit = await gh(`/repos/${OWNER}/${REPO}/git/commits/${ref.object.sha}`);

const tree = [];
const BATCH = 4;
for (let i = 0; i < files.length; i += BATCH) {
  const slice = files.slice(i, i + BATCH);
  await Promise.all(
    slice.map(async (rel) => {
      const buf = fs.readFileSync(path.join(ROOT, rel));
      const isText =
        !/\.(png|jpe?g|webp|gif|mp4|webm|mov|ico|woff2?|ttf|wasm|bin)$/i.test(rel) &&
        !rel.includes("model-shard");
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
console.log("\nCreating tree + commit…");

const newTree = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
  method: "POST",
  body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
});

const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
  method: "POST",
  body: JSON.stringify({
    message: "Add gallery media, face models, and full MATRIX/archive components",
    tree: newTree.sha,
    parents: [ref.object.sha],
  }),
});

await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
  method: "PATCH",
  body: JSON.stringify({ sha: commit.sha }),
});

console.log(`\nDone → https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`);
console.log("Vercel will redeploy automatically. Wait ~1–2 min for media to show.");
