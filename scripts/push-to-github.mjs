/**
 * Push full project to GitHub without system `git` (works even if Xcode license blocks /usr/bin/git).
 *
 * 1) Create a free PAT: https://github.com/settings/tokens
 *    Scopes: repo
 * 2) Run:
 *    export GITHUB_TOKEN=ghp_xxxxxxxx
 *    node scripts/push-to-github.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "..");
const OWNER = process.env.GITHUB_OWNER || "OOS-Team";
const REPO = process.env.GITHUB_REPO || "noahwave";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const remote = `https://github.com/${OWNER}/${REPO}.git`;

if (!TOKEN) {
  console.error(`
Missing GITHUB_TOKEN.

Create a token: https://github.com/settings/tokens  (scope: repo)
Then:

  export GITHUB_TOKEN=ghp_your_token_here
  node scripts/push-to-github.mjs
`);
  process.exit(1);
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "backend/.venv",
  "backend/__pycache__",
]);

function walk(base, prefix = "") {
  const out = [];
  for (const name of fs.readdirSync(base)) {
    if (SKIP_DIRS.has(name)) continue;
    if (name === ".env.local" || name === ".DS_Store") continue;
    if (name.endsWith(".tsbuildinfo") || name === "next-env.d.ts") continue;
    if (name.endsWith(".pyc")) continue;
    const rel = prefix ? `${prefix}/${name}` : name;
    const abs = path.join(base, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (rel === "backend/.venv" || rel.startsWith("backend/__pycache__")) continue;
      out.push(...walk(abs, rel));
    } else {
      out.push(rel);
    }
  }
  return out;
}

console.log(`→ Staging files in ${dir}`);
if (!fs.existsSync(path.join(dir, ".git"))) {
  await git.init({ fs, dir, defaultBranch: BRANCH });
}

const files = walk(dir);
for (const filepath of files) {
  await git.add({ fs, dir, filepath });
}
console.log(`→ ${files.length} files staged`);

const sha = await git.commit({
  fs,
  dir,
  message: "NoahWave: full cypher archive (source + media)",
  author: {
    name: process.env.GIT_AUTHOR_NAME || "Noah",
    email: process.env.GIT_AUTHOR_EMAIL || "oos-team@users.noreply.github.com",
  },
});
console.log(`→ commit ${sha}`);

try {
  await git.deleteRemote({ fs, dir, remote: "origin" });
} catch {
  /* none */
}
await git.addRemote({ fs, dir, remote: "origin", url: remote });

console.log(`→ pushing to ${remote} (${BRANCH})…`);
await git.push({
  fs,
  http,
  dir,
  remote: "origin",
  ref: BRANCH,
  force: true,
  onAuth: () => ({ username: TOKEN, password: "x-oauth-basic" }),
});

console.log(`\nDone → https://github.com/${OWNER}/${REPO}`);
console.log("Next: import on https://vercel.com (free Hobby plan)");
