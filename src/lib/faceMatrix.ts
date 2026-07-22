/**
 * Matrix-style face perception — face-api loaded only in the browser
 * (dynamic import avoids Next.js SSR / TextEncoder crashes).
 */

export type FaceSubject = {
  id: string;
  box: { x: number; y: number; width: number; height: number };
  age: number;
  gender: "male" | "female";
  genderProb: number;
  expression: string;
  expressionScore: number;
  expressions: Record<string, number>;
  landmarks?: { x: number; y: number }[];
  score: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FaceApi = any;

let faceapi: FaceApi | null = null;
let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

export function isFaceModelsLoaded() {
  return modelsLoaded;
}

async function getFaceApi(): Promise<FaceApi> {
  if (faceapi) return faceapi;
  if (typeof window === "undefined") {
    throw new Error("Face models only run in the browser.");
  }
  const mod = await import("@vladmandic/face-api");
  faceapi = mod.default ?? mod;
  return faceapi;
}

export async function loadFaceModels(modelUrl = "/models"): Promise<void> {
  if (modelsLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const api = await getFaceApi();

    try {
      if (api.tf?.setBackend) {
        await api.tf.setBackend("webgl");
        await api.tf.ready();
      }
    } catch {
      /* cpu fallback */
    }

    await Promise.all([
      api.nets.tinyFaceDetector.loadFromUri(modelUrl),
      api.nets.ageGenderNet.loadFromUri(modelUrl),
      api.nets.faceExpressionNet.loadFromUri(modelUrl),
      api.nets.faceLandmark68Net.loadFromUri(modelUrl),
    ]);
    modelsLoaded = true;
  })();

  try {
    await loadPromise;
  } catch (e) {
    loadPromise = null;
    throw e;
  }
}

function subjectId(
  box: { x: number; y: number; width: number; height: number },
  i: number
) {
  const seed = Math.round(box.x + box.y * 3 + box.width * 7);
  return `SUB-${(seed % 0xffff).toString(16).toUpperCase().padStart(4, "0")}${i}`;
}

function topExpression(expr: Record<string, number>): {
  name: string;
  score: number;
  all: Record<string, number>;
} {
  const entries = Object.entries(expr);
  entries.sort((a, b) => b[1] - a[1]);
  const all: Record<string, number> = {};
  for (const [k, v] of entries) all[k] = v;
  return {
    name: entries[0]?.[0] ?? "unknown",
    score: entries[0]?.[1] ?? 0,
    all,
  };
}

export async function detectSubjects(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<FaceSubject[]> {
  if (!modelsLoaded || !faceapi) return [];

  const api = faceapi;
  const options = new api.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: 0.4,
  });

  try {
    const results = await api
      .detectAllFaces(input, options)
      .withFaceLandmarks()
      .withAgeAndGender()
      .withFaceExpressions();

    return results.map(
      (
        d: {
          detection: {
            box: { x: number; y: number; width: number; height: number };
            score: number;
          };
          age: number;
          gender: string;
          genderProbability: number;
          expressions: Record<string, number>;
          landmarks?: { positions: { x: number; y: number }[] };
        },
        i: number
      ) => {
        const box = d.detection.box;
        const { name, score, all } = topExpression(d.expressions);
        const pts = d.landmarks?.positions?.map((p) => ({ x: p.x, y: p.y }));
        return {
          id: subjectId(box, i),
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          },
          age: d.age,
          gender: d.gender as "male" | "female",
          genderProb: d.genderProbability,
          expression: name,
          expressionScore: score,
          expressions: all,
          landmarks: pts,
          score: d.detection.score,
        };
      }
    );
  } catch {
    const plain = await api
      .detectAllFaces(input, options)
      .withAgeAndGender()
      .withFaceExpressions();

    return plain.map(
      (
        d: {
          detection: {
            box: { x: number; y: number; width: number; height: number };
            score: number;
          };
          age: number;
          gender: string;
          genderProbability: number;
          expressions: Record<string, number>;
        },
        i: number
      ) => {
        const box = d.detection.box;
        const { name, score, all } = topExpression(d.expressions);
        return {
          id: subjectId(box, i),
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          },
          age: d.age,
          gender: d.gender as "male" | "female",
          genderProb: d.genderProbability,
          expression: name,
          expressionScore: score,
          expressions: all,
          score: d.detection.score,
        };
      }
    );
  }
}

/** Smooth boxes between detections for less jitter */
export function smoothSubjects(
  prev: FaceSubject[],
  next: FaceSubject[],
  alpha = 0.45
): FaceSubject[] {
  if (!prev.length) return next;
  return next.map((n) => {
    const ncx = n.box.x + n.box.width / 2;
    const ncy = n.box.y + n.box.height / 2;
    let best = prev[0];
    let bestD = Infinity;
    for (const p of prev) {
      const pcx = p.box.x + p.box.width / 2;
      const pcy = p.box.y + p.box.height / 2;
      const d = (pcx - ncx) ** 2 + (pcy - ncy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best) return n;
    return {
      ...n,
      id: best.id,
      box: {
        x: best.box.x * (1 - alpha) + n.box.x * alpha,
        y: best.box.y * (1 - alpha) + n.box.y * alpha,
        width: best.box.width * (1 - alpha) + n.box.width * alpha,
        height: best.box.height * (1 - alpha) + n.box.height * alpha,
      },
      age: best.age * (1 - alpha) + n.age * alpha,
      genderProb: best.genderProb * (1 - alpha) + n.genderProb * alpha,
      landmarks: n.landmarks,
    };
  });
}

const GREEN = "#00ff41";
const GREEN_DIM = "rgba(0, 255, 65, 0.35)";
const GREEN_SOFT = "rgba(0, 255, 65, 0.12)";

/** Map video pixel → display pixel with object-fit: cover (+ optional mirror). */
function mapCoverPoint(
  x: number,
  y: number,
  videoW: number,
  videoH: number,
  displayW: number,
  displayH: number,
  mirrored: boolean
) {
  const scale = Math.max(displayW / videoW, displayH / videoH);
  const ox = (displayW - videoW * scale) / 2;
  const oy = (displayH - videoH * scale) / 2;
  let dx = x * scale + ox;
  const dy = y * scale + oy;
  if (mirrored) dx = displayW - dx;
  return { x: dx, y: dy, scale };
}

/** Matrix HUD in display canvas space (mirrored to match CSS-flipped video). */
export function drawMatrixHud(
  ctx: CanvasRenderingContext2D,
  displayW: number,
  displayH: number,
  videoW: number,
  videoH: number,
  subjects: FaceSubject[],
  opts: { scanY: number; t: number; frame: number; mirrored: boolean }
) {
  ctx.clearRect(0, 0, displayW, displayH);

  const scale = Math.max(displayW / videoW, displayH / videoH);

  ctx.fillStyle = "rgba(0, 12, 4, 0.28)";
  ctx.fillRect(0, 0, displayW, displayH);

  ctx.font = "10px ui-monospace, monospace";
  ctx.fillStyle = "rgba(0, 255, 65, 0.07)";
  for (let col = 0; col < displayW; col += 22) {
    const seed = (col * 13 + opts.frame * 3) % 97;
    for (let row = 0; row < 10; row++) {
      const ch = (seed + row * 7) % 2 === 0 ? "1" : "0";
      const y = ((opts.t * 0.06 + row * 20 + col * 0.3) % (displayH + 40)) - 20;
      ctx.fillText(ch, col, y);
    }
  }

  const beamY = (((opts.scanY % 1) + 1) % 1) * displayH;
  const g = ctx.createLinearGradient(0, beamY - 20, 0, beamY + 20);
  g.addColorStop(0, "rgba(0,255,65,0)");
  g.addColorStop(0.5, "rgba(0,255,65,0.28)");
  g.addColorStop(1, "rgba(0,255,65,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, beamY - 20, displayW, 40);
  ctx.fillStyle = "rgba(0,255,65,0.7)";
  ctx.fillRect(0, beamY, displayW, 1);

  ctx.fillStyle = "rgba(0,0,0,0.14)";
  for (let y = 0; y < displayH; y += 3) ctx.fillRect(0, y, displayW, 1);

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, displayW, 40);
  ctx.fillStyle = GREEN;
  ctx.font = "bold 12px ui-monospace, monospace";
  ctx.fillText("MATRIX // BIOMETRIC SCAN", 12, 25);
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillStyle = GREEN_DIM;
  const right = `FRAME ${opts.frame}  ·  SUBJECTS ${subjects.length}`;
  ctx.fillText(right, displayW - 12 - ctx.measureText(right).width, 25);

  subjects.forEach((sub, idx) => {
    const tl = mapCoverPoint(
      sub.box.x,
      sub.box.y,
      videoW,
      videoH,
      displayW,
      displayH,
      false
    );
    let bx = tl.x;
    const by = tl.y;
    const bw = sub.box.width * scale;
    const bh = sub.box.height * scale;
    if (opts.mirrored) {
      bx = displayW - bx - bw;
    }

    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    const arm = Math.min(18, bw * 0.18);
    ctx.lineWidth = 2;
    const corners: [number, number, number, number][] = [
      [bx, by, 1, 1],
      [bx + bw, by, -1, 1],
      [bx, by + bh, 1, -1],
      [bx + bw, by + bh, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * arm);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * arm, cy);
      ctx.stroke();
    }

    if (sub.landmarks?.length) {
      ctx.fillStyle = "rgba(0,255,65,0.8)";
      for (const p of sub.landmarks) {
        const pt = mapCoverPoint(
          p.x,
          p.y,
          videoW,
          videoH,
          displayW,
          displayH,
          opts.mirrored
        );
        ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
      }
    }

    const panelW = 172;
    let panelX = bx + bw + 10;
    if (panelX + panelW > displayW - 8) panelX = bx - panelW - 10;
    if (panelX < 8) panelX = 8;
    let panelY = Math.max(48, by);
    if (panelY + 140 > displayH - 8) panelY = displayH - 148;

    ctx.fillStyle = "rgba(0, 8, 2, 0.88)";
    ctx.fillRect(panelX, panelY, panelW, 136);
    ctx.strokeStyle = GREEN_DIM;
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, 136);

    const age = Math.round(sub.age);
    const gender = sub.gender.toUpperCase();
    const gProb = Math.round(sub.genderProb * 100);
    const expr = sub.expression.toUpperCase();
    const eProb = Math.round(sub.expressionScore * 100);
    const conf = Math.round(sub.score * 100);

    const lines = [
      `ID   ${sub.id}`,
      `AGE  ${age} YRS`,
      `SEX  ${gender}  ${gProb}%`,
      `EXPR ${expr}`,
      `     ${eProb}% MATCH`,
      `CONF ${conf}%`,
      `NODE ${idx + 1}/${subjects.length}`,
    ];

    ctx.font = "11px ui-monospace, monospace";
    lines.forEach((line, li) => {
      ctx.fillStyle = li === 0 ? GREEN : "rgba(0,255,65,0.88)";
      ctx.fillText(line, panelX + 10, panelY + 18 + li * 16);
    });

    ctx.strokeStyle = GREEN_SOFT;
    ctx.beginPath();
    ctx.moveTo(opts.mirrored ? bx : bx + bw, by + bh * 0.3);
    ctx.lineTo(panelX + (panelX < bx ? panelW : 0), panelY + 20);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, displayH - 36, displayW, 36);
  ctx.fillStyle = subjects.length ? GREEN : GREEN_DIM;
  ctx.font = "11px ui-monospace, monospace";
  const status = subjects.length
    ? `LOCK · ${subjects.length} BIOMETRIC TARGET${subjects.length > 1 ? "S" : ""}`
    : "SCANNING · NO FACE IN FIELD";
  ctx.fillText(status, 12, displayH - 14);
  ctx.fillStyle = GREEN_DIM;
  const hint = "AGE · GENDER · EXPRESSION · LANDMARKS";
  ctx.fillText(
    hint,
    Math.max(12, displayW - 12 - ctx.measureText(hint).width),
    displayH - 14
  );
}

export function expressionBars(expressions: Record<string, number>) {
  return Object.entries(expressions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, score]) => ({ name, score }));
}
