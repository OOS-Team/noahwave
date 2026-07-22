/**
 * Scan public/gallery and write public/data/works.json
 * Mirrors backend metadata / exclusion rules for static (backend-free) deploys.
 *
 * Usage: node scripts/generate-works.mjs
 */
import { createHash } from "node:crypto";
import { readdir, writeFile, mkdir, access } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MEDIA_DIR = join(ROOT, "public", "gallery");
const OUT = join(ROOT, "public", "data", "works.json");

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".m4v"]);

const EXCLUDED = new Set([
  "80wavy.jpg",
  "noahwave_god_--ar_9151_--sref_httpss.mj.run4Ih5NjKXFGA_--v_6._85c7e041-e5a4-44fe-8869-2a34f765fb07_0.png",
]);

const ARTWORK_META = {
  "Wave Black Kopie.jpg": {
    title: "Abyss Signal",
    codename: "NW-01·VOID",
    description:
      "A low-frequency field study — black as active space, not absence.",
    tags: ["signal", "void", "wave"],
  },
  "Wave Whiite Kopie.jpg": {
    title: "Null Bloom",
    codename: "NW-02·WHITE",
    description:
      "Overexposed silence. Light treated as a material that refuses form.",
    tags: ["signal", "light", "wave"],
  },
  "system crasher Kopie.jpg": {
    title: "Kernel Ghost",
    codename: "NW-07·CRASH",
    description:
      "The afterimage of a system that learned to dream mid-failure.",
    tags: ["glitch", "system", "haunt"],
  },
  "photo_2021-12-19_23-42-21 Kopie.jpg": {
    title: "Subject Zero",
    codename: "NW-00·ARC",
    description:
      "An archival body before the machines rewrote the face of myth.",
    tags: ["archive", "portrait", "origin"],
  },
  noahwave_Dark_portrait: {
    title: "Silicon Oracle",
    codename: "NW-11·PHANTOM",
    description:
      "A prophet consumed by his own architecture — authority dissolving into code-shadow.",
    tags: ["oracle", "portrait", "neo-tech"],
  },
  noahwave_gods_desk: {
    title: "Oracle Terminal",
    codename: "NW-13·DESK",
    description:
      "Where divinity files its reports. Sacred bureaucracy in phosphor glow.",
    tags: ["mythic", "terminal", "desk"],
  },
  death_suspended_in_time: {
    title: "Chronostasis",
    codename: "NW-22·HOLD",
    description:
      "Time held at the throat. A white-room limbo between pulse and afterlife.",
    tags: ["motion", "liminal", "time"],
  },
  "social_noahwave_god_--ar_5877": {
    title: "Apotheosis Stream",
    codename: "NW-15·ASCEND",
    description:
      "Divinity rendered as continuous signal — low-motion ascent into machine-god form.",
    tags: ["motion", "mythic", "stream"],
  },
  "social_noahwave_god_--ar_9151": {
    title: "Sacred Loop",
    codename: "NW-16·ENDLESS",
    description: "A closed circuit of worship. The loop is the prayer.",
    tags: ["motion", "mythic", "loop"],
  },
  social_noahwave_death_suspended_in_time_white_room_future_ultra_real_5741f48a: {
    title: "Chronostasis α",
    codename: "NW-22·α",
    description:
      "First hold of suspended death — white architecture, frozen breath.",
    tags: ["motion", "liminal", "time"],
  },
  social_noahwave_death_suspended_in_time_white_room_future_ultra_real_8c47e1d7: {
    title: "Chronostasis β",
    codename: "NW-22·β",
    description: "Second hold. Same room, different fracture in the timeline.",
    tags: ["motion", "liminal", "time"],
  },
};

function stableId(filename) {
  return createHash("sha1").update(filename).digest("hex").slice(0, 12);
}

function metaFor(filename) {
  if (ARTWORK_META[filename]) return ARTWORK_META[filename];
  const keys = Object.keys(ARTWORK_META).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (filename.includes(key)) return ARTWORK_META[key];
  }
  const stem = stableId(filename).slice(0, 4).toUpperCase();
  return {
    title: `Unknown Node ${stem}`,
    codename: `NW-X·${stem}`,
    description: "Uncatalogued transmission from the archive.",
    tags: ["archive"],
  };
}

await mkdir(join(ROOT, "public", "data"), { recursive: true });

let names = [];
try {
  await access(MEDIA_DIR);
  names = (await readdir(MEDIA_DIR)).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
} catch {
  // No gallery folder on this machine/deploy — keep existing catalog if present
  console.warn(
    `No gallery at ${MEDIA_DIR}; leaving public/data/works.json unchanged if it exists.`
  );
  try {
    await access(OUT);
    console.log("Using existing public/data/works.json");
    process.exit(0);
  } catch {
    await writeFile(OUT, "[]\n");
    console.log("Wrote empty public/data/works.json");
    process.exit(0);
  }
}

const works = [];
for (const name of names) {
  if (EXCLUDED.has(name)) continue;
  if (name.toLowerCase() === "80wavy.jpg") continue;
  const ext = extname(name).toLowerCase();
  if (name.startsWith("noahwave_god_--ar_9151") && IMAGE_EXTS.has(ext)) continue;

  let type;
  if (IMAGE_EXTS.has(ext)) type = "image";
  else if (VIDEO_EXTS.has(ext)) type = "video";
  else continue;

  const meta = metaFor(name);
  const tags = [...(meta.tags || [])];
  if (!tags.includes(type)) tags.unshift(type);

  works.push({
    id: stableId(name),
    title: meta.title,
    codename: meta.codename,
    description: meta.description,
    filename: name,
    type,
    url: `/gallery/${encodeURIComponent(name).replace(/%2F/g, "/")}`,
    extension: ext.slice(1),
    tags,
  });
}

await writeFile(OUT, JSON.stringify(works, null, 2) + "\n");
console.log(`Wrote ${works.length} works → public/data/works.json`);
