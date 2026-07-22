export type Artwork = {
  id: string;
  title: string;
  codename: string;
  description: string;
  filename: string;
  type: "image" | "video";
  url: string;
  extension: string;
  tags: string[];
};

export type ColorSwatch = {
  hex: string;
  rgb: number[];
  share: number;
};

export type VisionAnalysis = {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  saturation: number;
  edge_density: number;
  warmth: number;
  mood: string;
  signal_class: string;
  poetic_read: string;
  palette: ColorSwatch[];
  channels: { red: number; green: number; blue: number };
};

/** Optional live API (local FastAPI). Empty in static/free deploys. */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/** Free Formspree form id, e.g. "xyzabcde" from formspree.io/f/xyzabcde */
const FORMSPREE_ID =
  process.env.NEXT_PUBLIC_FORMSPREE_ID?.trim() || "";

export function getApiBase() {
  return API_BASE;
}

export function hasContactEndpoint() {
  return Boolean(FORMSPREE_ID || API_BASE);
}

/**
 * Prefer static catalog (works offline + free Vercel).
 * Optionally fall back to FastAPI if static fails and API_BASE is set.
 */
export async function fetchWorks(
  type: "image" | "video" | "all" = "all"
): Promise<Artwork[]> {
  let works: Artwork[] | null = null;

  try {
    const res = await fetch("/data/works.json", { cache: "no-store" });
    if (res.ok) {
      works = (await res.json()) as Artwork[];
    }
  } catch {
    // try API next
  }

  if (!works && API_BASE) {
    const res = await fetch(`${API_BASE}/api/works?type=all`);
    if (!res.ok) {
      throw new Error(`Failed to load works (${res.status})`);
    }
    works = (await res.json()) as Artwork[];
  }

  if (!works) {
    throw new Error("Archive offline — works catalog missing.");
  }

  if (type === "all") return works;
  return works.filter((w) => w.type === type);
}

export async function analyzeVision(file: Blob, filename = "capture.jpg") {
  if (!API_BASE) {
    throw new Error("Vision API not configured (static deploy).");
  }
  const body = new FormData();
  body.append("file", file, filename);
  const res = await fetch(`${API_BASE}/api/vision/analyze`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Vision analysis failed (${res.status})`);
  }
  return res.json() as Promise<VisionAnalysis>;
}

/**
 * Contact: Formspree (free) if configured, else optional local FastAPI.
 */
export async function sendContact(payload: {
  name: string;
  email: string;
  message: string;
}): Promise<{ ok: boolean; detail: string }> {
  if (FORMSPREE_ID) {
    const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        message: payload.message,
        _subject: `NoahWave ping from ${payload.name}`,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      errors?: { message?: string }[];
    };
    if (!res.ok) {
      const msg =
        data.error ||
        data.errors?.map((e) => e.message).filter(Boolean).join(", ") ||
        `Contact failed (${res.status})`;
      throw new Error(msg);
    }
    return { ok: true, detail: "SIGNAL RECEIVED." };
  }

  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Contact failed (${res.status})`);
    }
    return res.json();
  }

  throw new Error(
    "Contact not configured. Set NEXT_PUBLIC_FORMSPREE_ID (free) or run the API."
  );
}
