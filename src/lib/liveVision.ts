/** Client-side live frame analysis — how the machine "sees" you. */

export type LivePalette = { hex: string; rgb: [number, number, number]; share: number };

export type LivePerception = {
  brightness: number;
  contrast: number;
  saturation: number;
  edgeDensity: number;
  warmth: number;
  motion: number;
  centerX: number; // 0–1 mass center (mirrored preview space)
  centerY: number;
  focus: number; // how concentrated the subject mass is
  mood: string;
  signalClass: string;
  poeticRead: string;
  palette: LivePalette[];
  channels: { r: number; g: number; b: number };
  timestamp: number;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function classify(
  brightness: number,
  contrast: number,
  saturation: number,
  warmth: number,
  edgeDensity: number,
  motion: number
): { mood: string; signalClass: string; poeticRead: string } {
  let mood: string;
  let signalClass: string;

  if (motion > 0.22) {
    mood = "unstable presence";
    signalClass = "MOTION SPIKE";
  } else if (brightness < 0.22 && contrast > 0.3) {
    mood = "nocturne / high-tension";
    signalClass = "DEEP BAND";
  } else if (brightness > 0.7 && saturation < 0.2) {
    mood = "bleached liminal";
    signalClass = "WHITE NOISE FIELD";
  } else if (warmth > 0.12 && saturation > 0.28) {
    mood = "ember ritual";
    signalClass = "WARM CHANNEL";
  } else if (warmth < -0.08 && brightness < 0.55) {
    mood = "cold oracle";
    signalClass = "CYAN SUBSTRATE";
  } else if (edgeDensity > 0.2) {
    mood = "fracture architecture";
    signalClass = "EDGE STORM";
  } else if (brightness < 0.35) {
    mood = "shadow subject";
    signalClass = "LOW LIGHT LOCK";
  } else {
    mood = "suspended drift";
    signalClass = "SLOW WAVE";
  }

  const poeticRead =
    motion > 0.22
      ? `Subject refuses stillness. Motion at ${(motion * 100).toFixed(0)}% — the machine tracks a moving ghost, not a portrait.`
      : `Live lock: ${mood}. Luminance ${(brightness * 100).toFixed(0)}%, edge hum ${(edgeDensity * 100).toFixed(0)}%. Classified ${signalClass}. You are being read as temperature and pulse.`;

  return { mood, signalClass, poeticRead };
}

/** Quantize a small RGB buffer into a rough palette */
function extractPalette(
  data: Uint8ClampedArray,
  sampleStep: number,
  n = 5
): LivePalette[] {
  const buckets = new Map<number, { r: number; g: number; b: number; c: number }>();

  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const r = data[i] >> 4; // 16 levels
    const g = data[i + 1] >> 4;
    const b = data[i + 2] >> 4;
    const key = (r << 8) | (g << 4) | b;
    const cur = buckets.get(key);
    if (cur) {
      cur.r += data[i];
      cur.g += data[i + 1];
      cur.b += data[i + 2];
      cur.c += 1;
    } else {
      buckets.set(key, { r: data[i], g: data[i + 1], b: data[i + 2], c: 1 });
    }
  }

  const ranked = [...buckets.values()].sort((a, b) => b.c - a.c).slice(0, n);
  const total = ranked.reduce((s, x) => s + x.c, 0) || 1;

  return ranked.map((x) => {
    const r = Math.round(x.r / x.c);
    const g = Math.round(x.g / x.c);
    const b = Math.round(x.b / x.c);
    return {
      hex: rgbToHex(r, g, b),
      rgb: [r, g, b] as [number, number, number],
      share: x.c / total,
    };
  });
}

/**
 * Analyze a downscaled frame. `prevGray` optional for motion.
 * Returns perception + gray buffer for next frame motion compare.
 */
export function analyzeFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  prevGray: Float32Array | null
): { perception: LivePerception; gray: Float32Array } {
  const img = ctx.getImageData(0, 0, width, height);
  const { data } = img;
  const n = width * height;
  const gray = new Float32Array(n);

  let sum = 0;
  let sumSq = 0;
  let satAcc = 0;
  let warmAcc = 0;
  let rAcc = 0;
  let gAcc = 0;
  let bAcc = 0;
  let mass = 0;
  let mx = 0;
  let my = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      gray[y * width + x] = lum;
      sum += lum;
      sumSq += lum * lum;
      rAcc += r;
      gAcc += g;
      bAcc += b;

      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      satAcc += max === 0 ? 0 : (max - min) / max;
      warmAcc += (r - b) / 255;

      // Skin-ish / subject mass (warm mid tones) for tracking box
      const skin =
        r > 60 &&
        g > 40 &&
        b > 20 &&
        r > g &&
        r > b &&
        Math.abs(r - g) > 10 &&
        lum > 0.15 &&
        lum < 0.9
          ? lum
          : lum > 0.45
            ? lum * 0.25
            : 0;
      if (skin > 0.05) {
        mass += skin;
        mx += x * skin;
        my += y * skin;
      }
    }
  }

  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  const contrast = clamp01(Math.sqrt(variance) * 2.4);
  const brightness = clamp01(mean);
  const saturation = clamp01(satAcc / n);
  const warmth = warmAcc / n;

  // Sobel-ish edge density (horizontal + vertical neighbors)
  let edgeAcc = 0;
  let edgeCount = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = y * width + x;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + width] - gray[i - width];
      edgeAcc += Math.min(1, Math.hypot(gx, gy) * 2.5);
      edgeCount++;
    }
  }
  const edgeDensity = clamp01(edgeAcc / (edgeCount || 1));

  // Motion vs previous gray
  let motion = 0;
  if (prevGray && prevGray.length === gray.length) {
    let diff = 0;
    const step = 3;
    let c = 0;
    for (let i = 0; i < gray.length; i += step) {
      diff += Math.abs(gray[i] - prevGray[i]);
      c++;
    }
    motion = clamp01((diff / c) * 4.5);
  }

  // Mass center (image space, not mirrored)
  let centerX = 0.5;
  let centerY = 0.45;
  let focus = 0.2;
  if (mass > 0.01) {
    centerX = mx / mass / width;
    centerY = my / mass / height;
    // concentration: inverse spread proxy from mass density
    focus = clamp01(mass / (n * 0.12));
  }

  const { mood, signalClass, poeticRead } = classify(
    brightness,
    contrast,
    saturation,
    warmth,
    edgeDensity,
    motion
  );

  const palette = extractPalette(data, Math.max(1, Math.floor(n / 800)), 5);

  return {
    gray,
    perception: {
      brightness,
      contrast,
      saturation,
      edgeDensity,
      warmth,
      motion,
      centerX,
      centerY,
      focus,
      mood,
      signalClass,
      poeticRead,
      palette,
      channels: {
        r: rAcc / n / 255,
        g: gAcc / n / 255,
        b: bAcc / n / 255,
      },
      timestamp: performance.now(),
    },
  };
}

/** Draw machine-vision overlay onto a canvas matching the video display. */
export function drawMachineOverlay(
  overlay: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: LivePerception,
  opts: {
    scanY: number;
    showEdges: boolean;
    edgeCanvas?: HTMLCanvasElement | null;
    t: number;
  }
) {
  overlay.clearRect(0, 0, w, h);

  // Aura tint from warmth / signal
  const warm = p.warmth;
  const aura =
    warm > 0.08
      ? `rgba(251, 146, 60, ${0.06 + p.saturation * 0.08})`
      : warm < -0.05
        ? `rgba(34, 211, 238, ${0.07 + p.edgeDensity * 0.08})`
        : `rgba(232, 121, 249, ${0.05 + p.motion * 0.1})`;
  overlay.fillStyle = aura;
  overlay.fillRect(0, 0, w, h);

  // Edge perception layer
  if (opts.showEdges && opts.edgeCanvas) {
    overlay.save();
    overlay.globalAlpha = 0.35 + p.edgeDensity * 0.35;
    overlay.globalCompositeOperation = "screen";
    overlay.drawImage(opts.edgeCanvas, 0, 0, w, h);
    overlay.restore();
  }

  // Scanline grid
  overlay.strokeStyle = "rgba(34, 211, 238, 0.06)";
  overlay.lineWidth = 1;
  const grid = 28;
  for (let x = 0; x < w; x += grid) {
    overlay.beginPath();
    overlay.moveTo(x, 0);
    overlay.lineTo(x, h);
    overlay.stroke();
  }
  for (let y = 0; y < h; y += grid) {
    overlay.beginPath();
    overlay.moveTo(0, y);
    overlay.lineTo(w, y);
    overlay.stroke();
  }

  // Horizontal scan beam
  const sy = ((opts.scanY % 1) + 1) % 1;
  const beamY = sy * h;
  const grad = overlay.createLinearGradient(0, beamY - 18, 0, beamY + 18);
  grad.addColorStop(0, "rgba(34, 211, 238, 0)");
  grad.addColorStop(0.5, "rgba(34, 211, 238, 0.35)");
  grad.addColorStop(1, "rgba(34, 211, 238, 0)");
  overlay.fillStyle = grad;
  overlay.fillRect(0, beamY - 18, w, 36);
  overlay.fillStyle = "rgba(34, 211, 238, 0.7)";
  overlay.fillRect(0, beamY, w, 1.5);

  // CRT scanlines
  overlay.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < h; y += 3) {
    overlay.fillRect(0, y, w, 1);
  }

  // Target lock — video is CSS mirrored, overlay is not mirrored on same box
  // Video has scale-x-[-1], overlay sits on top unmirrored in same container.
  // Subject center is in camera space; mirror X for overlay to match mirrored video.
  const lx = (1 - p.centerX) * w;
  const ly = p.centerY * h;
  const boxW = w * (0.28 + p.focus * 0.15);
  const boxH = h * (0.36 + p.focus * 0.12);
  const x0 = lx - boxW / 2;
  const y0 = ly - boxH / 2;

  const lockAlpha = 0.45 + p.focus * 0.4 + Math.sin(opts.t * 0.005) * 0.1;
  overlay.strokeStyle = `rgba(34, 211, 238, ${lockAlpha})`;
  overlay.lineWidth = 1.5;
  const arm = Math.min(28, boxW * 0.2);

  // Corner brackets
  const corners: [number, number][] = [
    [x0, y0],
    [x0 + boxW, y0],
    [x0, y0 + boxH],
    [x0 + boxW, y0 + boxH],
  ];
  for (const [cx, cy] of corners) {
    const dx = cx === x0 ? 1 : -1;
    const dy = cy === y0 ? 1 : -1;
    overlay.beginPath();
    overlay.moveTo(cx, cy + dy * arm);
    overlay.lineTo(cx, cy);
    overlay.lineTo(cx + dx * arm, cy);
    overlay.stroke();
  }

  // Crosshair
  overlay.strokeStyle = `rgba(244, 114, 182, ${0.35 + p.motion * 0.4})`;
  overlay.beginPath();
  overlay.moveTo(lx - 12, ly);
  overlay.lineTo(lx + 12, ly);
  overlay.moveTo(lx, ly - 12);
  overlay.lineTo(lx, ly + 12);
  overlay.stroke();
  overlay.beginPath();
  overlay.arc(lx, ly, 6 + p.motion * 10, 0, Math.PI * 2);
  overlay.stroke();

  // Top HUD strip
  overlay.fillStyle = "rgba(0,0,0,0.45)";
  overlay.fillRect(0, 0, w, 36);
  overlay.font = "11px ui-monospace, monospace";
  overlay.fillStyle = "rgba(34, 211, 238, 0.95)";
  overlay.fillText("MACHINE PERCEPTION · LIVE", 12, 22);
  overlay.fillStyle = "rgba(255,255,255,0.55)";
  overlay.fillText(p.signalClass, w - 12 - overlay.measureText(p.signalClass).width, 22);

  // Bottom readouts
  overlay.fillStyle = "rgba(0,0,0,0.5)";
  overlay.fillRect(0, h - 52, w, 52);
  overlay.fillStyle = "rgba(255,255,255,0.7)";
  overlay.font = "10px ui-monospace, monospace";
  const line1 = `LUM ${(p.brightness * 100).toFixed(0)}%  CTR ${(p.contrast * 100).toFixed(0)}%  EDGE ${(p.edgeDensity * 100).toFixed(0)}%  MOT ${(p.motion * 100).toFixed(0)}%`;
  overlay.fillText(line1, 12, h - 28);
  overlay.fillStyle = "rgba(232, 121, 249, 0.85)";
  overlay.fillText(p.mood.toUpperCase(), 12, h - 12);

  // Palette chips
  const chips = p.palette.slice(0, 5);
  chips.forEach((c, i) => {
    const cx = w - 14 - (chips.length - i) * 18;
    overlay.fillStyle = c.hex;
    overlay.fillRect(cx, h - 40, 14, 14);
    overlay.strokeStyle = "rgba(255,255,255,0.25)";
    overlay.strokeRect(cx, h - 40, 14, 14);
  });
}

/** Build a small edge visualization canvas from analysis gray buffer */
export function renderEdgeLayer(
  edgeCanvas: HTMLCanvasElement,
  gray: Float32Array,
  width: number,
  height: number,
  tint: [number, number, number] = [34, 211, 238]
) {
  edgeCanvas.width = width;
  edgeCanvas.height = height;
  const ctx = edgeCanvas.getContext("2d");
  if (!ctx) return;
  const out = ctx.createImageData(width, height);
  const d = out.data;
  const [tr, tg, tb] = tint;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + width] - gray[i - width];
      const e = Math.min(1, Math.hypot(gx, gy) * 3.2);
      const p = i * 4;
      d[p] = tr * e;
      d[p + 1] = tg * e;
      d[p + 2] = tb * e;
      d[p + 3] = e * 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}
