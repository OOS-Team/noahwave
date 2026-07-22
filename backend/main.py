"""
FastAPI backend for the generative art portfolio.
Artwork catalog + computer vision analysis + contact.
"""

from __future__ import annotations

import colorsys
import hashlib
import io
import os
from pathlib import Path
from typing import Literal
from urllib.parse import quote

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFilter, ImageStat
from pydantic import BaseModel, EmailStr, Field

DEFAULT_MEDIA = Path(__file__).resolve().parent.parent / "public" / "gallery"
MEDIA_DIR = Path(os.getenv("MEDIA_DIR", str(DEFAULT_MEDIA))).resolve()

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
VIDEO_EXTS = {".mp4", ".webm", ".mov", ".m4v"}

# Hidden from the public gallery
EXCLUDED_FILES = {
    "80wavy.jpg",
    "noahwave_god_--ar_9151_--sref_httpss.mj.run4Ih5NjKXFGA_--v_6._85c7e041-e5a4-44fe-8869-2a34f765fb07_0.png",
}

# Mysterious / neo-tech artist titles (match by exact filename or substring key)
ARTWORK_META: dict[str, dict[str, str | list[str]]] = {
    "Wave Black Kopie.jpg": {
        "title": "Abyss Signal",
        "codename": "NW-01·VOID",
        "description": "A low-frequency field study — black as active space, not absence.",
        "tags": ["signal", "void", "wave"],
    },
    "Wave Whiite Kopie.jpg": {
        "title": "Null Bloom",
        "codename": "NW-02·WHITE",
        "description": "Overexposed silence. Light treated as a material that refuses form.",
        "tags": ["signal", "light", "wave"],
    },
    "system crasher Kopie.jpg": {
        "title": "Kernel Ghost",
        "codename": "NW-07·CRASH",
        "description": "The afterimage of a system that learned to dream mid-failure.",
        "tags": ["glitch", "system", "haunt"],
    },
    "photo_2021-12-19_23-42-21 Kopie.jpg": {
        "title": "Subject Zero",
        "codename": "NW-00·ARC",
        "description": "An archival body before the machines rewrote the face of myth.",
        "tags": ["archive", "portrait", "origin"],
    },
    "noahwave_Dark_portrait": {
        "title": "Silicon Oracle",
        "codename": "NW-11·PHANTOM",
        "description": "A prophet consumed by his own architecture — authority dissolving into code-shadow.",
        "tags": ["oracle", "portrait", "neo-tech"],
    },
    "noahwave_gods_desk": {
        "title": "Oracle Terminal",
        "codename": "NW-13·DESK",
        "description": "Where divinity files its reports. Sacred bureaucracy in phosphor glow.",
        "tags": ["mythic", "terminal", "desk"],
    },
    "death_suspended_in_time": {
        "title": "Chronostasis",
        "codename": "NW-22·HOLD",
        "description": "Time held at the throat. A white-room limbo between pulse and afterlife.",
        "tags": ["motion", "liminal", "time"],
    },
    "social_noahwave_god_--ar_5877": {
        "title": "Apotheosis Stream",
        "codename": "NW-15·ASCEND",
        "description": "Divinity rendered as continuous signal — low-motion ascent into machine-god form.",
        "tags": ["motion", "mythic", "stream"],
    },
    "social_noahwave_god_--ar_9151": {
        "title": "Sacred Loop",
        "codename": "NW-16·ENDLESS",
        "description": "A closed circuit of worship. The loop is the prayer.",
        "tags": ["motion", "mythic", "loop"],
    },
    # Fallback keys for death videos (two variants share stem pattern)
    "social_noahwave_death_suspended_in_time_white_room_future_ultra_real_5741f48a": {
        "title": "Chronostasis α",
        "codename": "NW-22·α",
        "description": "First hold of suspended death — white architecture, frozen breath.",
        "tags": ["motion", "liminal", "time"],
    },
    "social_noahwave_death_suspended_in_time_white_room_future_ultra_real_8c47e1d7": {
        "title": "Chronostasis β",
        "codename": "NW-22·β",
        "description": "Second hold. Same room, different fracture in the timeline.",
        "tags": ["motion", "liminal", "time"],
    },
}

app = FastAPI(
    title="Generative Art Portfolio API",
    description="Personal generative art website backend",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Artwork(BaseModel):
    id: str
    title: str
    codename: str
    description: str
    filename: str
    type: Literal["image", "video"]
    url: str
    extension: str
    tags: list[str] = Field(default_factory=list)


class ContactMessage(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=5000)


class ContactResponse(BaseModel):
    ok: bool
    detail: str


class ColorSwatch(BaseModel):
    hex: str
    rgb: list[int]
    share: float


class VisionAnalysis(BaseModel):
    width: int
    height: int
    brightness: float
    contrast: float
    saturation: float
    edge_density: float
    warmth: float
    mood: str
    signal_class: str
    poetic_read: str
    palette: list[ColorSwatch]
    channels: dict[str, float]


def _stable_id(filename: str) -> str:
    return hashlib.sha1(filename.encode("utf-8")).hexdigest()[:12]


def _meta_for(filename: str) -> dict[str, str | list[str]]:
    if filename in ARTWORK_META:
        return ARTWORK_META[filename]
    # Prefer longest substring keys so specific variants win over generics
    for key, meta in sorted(
        ARTWORK_META.items(), key=lambda item: len(item[0]), reverse=True
    ):
        if key in filename:
            return meta
    # Mysterious fallback
    stem_hash = _stable_id(filename)[:4].upper()
    return {
        "title": f"Unknown Node {stem_hash}",
        "codename": f"NW-X·{stem_hash}",
        "description": "Uncatalogued transmission from the archive.",
        "tags": ["archive"],
    }


def scan_artworks() -> list[Artwork]:
    if not MEDIA_DIR.exists():
        return []

    works: list[Artwork] = []
    for path in sorted(MEDIA_DIR.iterdir(), key=lambda p: p.name.lower()):
        if not path.is_file() or path.name in EXCLUDED_FILES:
            continue
        # Also exclude by partial match for the god still if name differs slightly
        if path.name.startswith("noahwave_god_--ar_9151") and path.suffix.lower() in IMAGE_EXTS:
            continue
        if path.name.lower() == "80wavy.jpg":
            continue

        ext = path.suffix.lower()
        if ext in IMAGE_EXTS:
            media_type: Literal["image", "video"] = "image"
        elif ext in VIDEO_EXTS:
            media_type = "video"
        else:
            continue

        meta = _meta_for(path.name)
        tags = list(meta.get("tags") or [])
        if media_type not in tags:
            tags = [media_type, *tags]

        works.append(
            Artwork(
                id=_stable_id(path.name),
                title=str(meta["title"]),
                codename=str(meta["codename"]),
                description=str(meta["description"]),
                filename=path.name,
                type=media_type,
                url=f"/gallery/{quote(path.name)}",
                extension=ext.lstrip("."),
                tags=tags,
            )
        )
    return works


def _hex_rgb(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def _quantize_palette(img: Image.Image, n: int = 5) -> list[ColorSwatch]:
    small = img.convert("RGB").resize((64, 64), Image.Resampling.LANCZOS)
    # Adaptive palette extraction
    paletted = small.quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    palette = paletted.getpalette() or []
    color_counts: dict[tuple[int, int, int], int] = {}
    for px in paletted.getdata():
        i = int(px) * 3
        if i + 2 >= len(palette):
            continue
        rgb = (palette[i], palette[i + 1], palette[i + 2])
        color_counts[rgb] = color_counts.get(rgb, 0) + 1

    total = sum(color_counts.values()) or 1
    ranked = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)[:n]
    return [
        ColorSwatch(
            hex=_hex_rgb(*rgb),
            rgb=list(rgb),
            share=round(count / total, 3),
        )
        for rgb, count in ranked
    ]


def _mood_from_stats(
    brightness: float,
    contrast: float,
    saturation: float,
    warmth: float,
    edge_density: float,
) -> tuple[str, str, str]:
    """Return mood, signal_class, poetic_read."""
    if brightness < 0.28 and contrast > 0.35:
        mood = "nocturne / high-tension"
        signal = "DEEP BAND"
    elif brightness > 0.72 and saturation < 0.25:
        mood = "bleached liminal"
        signal = "WHITE NOISE FIELD"
    elif warmth > 0.15 and saturation > 0.35:
        mood = "ember ritual"
        signal = "WARM CHANNEL"
    elif warmth < -0.1 and brightness < 0.5:
        mood = "cold oracle"
        signal = "CYAN SUBSTRATE"
    elif edge_density > 0.18:
        mood = "fracture architecture"
        signal = "EDGE STORM"
    else:
        mood = "suspended drift"
        signal = "SLOW WAVE"

    poetic = (
        f"The machine reads a {mood} field — brightness at {brightness:.0%}, "
        f"edges humming at {edge_density:.0%} density. "
        f"Classified as {signal}. This frame does not explain itself; "
        f"it only returns a temperature and a pulse."
    )
    return mood, signal, poetic


def analyze_image_bytes(data: bytes) -> VisionAnalysis:
    try:
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc

    # Cap size for speed
    max_side = 720
    w, h = img.size
    if max(w, h) > max_side:
        scale = max_side / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        w, h = img.size

    stat = ImageStat.Stat(img)
    # Per-channel means 0-255
    r_m, g_m, b_m = stat.mean
    r_s, g_s, b_s = stat.stddev

    brightness = (0.2126 * r_m + 0.7152 * g_m + 0.0722 * b_m) / 255.0
    contrast = (0.2126 * r_s + 0.7152 * g_s + 0.0722 * b_s) / 128.0
    contrast = max(0.0, min(contrast, 1.5)) / 1.5

    # Sample saturation + warmth
    pixels = list(img.resize((48, 48), Image.Resampling.BILINEAR).getdata())
    sats: list[float] = []
    warm_acc = 0.0
    for r, g, b in pixels:
        h_hsv, s, _v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        sats.append(s)
        # warmth: red-yellow vs blue-cyan
        warm_acc += (r - b) / 255.0
    saturation = sum(sats) / len(sats) if sats else 0.0
    warmth = warm_acc / len(pixels) if pixels else 0.0

    # Edge density via simple high-pass
    gray = img.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_stat = ImageStat.Stat(edges)
    edge_density = min(1.0, (edge_stat.mean[0] / 255.0) * 2.2)

    palette = _quantize_palette(img, n=5)
    mood, signal_class, poetic = _mood_from_stats(
        brightness, contrast, saturation, warmth, edge_density
    )

    return VisionAnalysis(
        width=w,
        height=h,
        brightness=round(brightness, 3),
        contrast=round(contrast, 3),
        saturation=round(saturation, 3),
        edge_density=round(edge_density, 3),
        warmth=round(warmth, 3),
        mood=mood,
        signal_class=signal_class,
        poetic_read=poetic,
        palette=palette,
        channels={
            "red": round(r_m / 255, 3),
            "green": round(g_m / 255, 3),
            "blue": round(b_m / 255, 3),
        },
    )


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "media_dir": str(MEDIA_DIR),
        "media_exists": MEDIA_DIR.exists(),
        "artwork_count": len(scan_artworks()),
    }


@app.get("/api/works", response_model=list[Artwork])
def list_works(type: Literal["image", "video", "all"] = "all") -> list[Artwork]:
    works = scan_artworks()
    if type != "all":
        works = [w for w in works if w.type == type]
    return works


@app.get("/api/works/{work_id}", response_model=Artwork)
def get_work(work_id: str) -> Artwork:
    for work in scan_artworks():
        if work.id == work_id:
            return work
    raise HTTPException(status_code=404, detail="Artwork not found")


@app.post("/api/vision/analyze", response_model=VisionAnalysis)
async def vision_analyze(file: UploadFile = File(...)) -> VisionAnalysis:
    if not file.content_type or not file.content_type.startswith("image/"):
        # Allow empty content-type from canvas captures
        if file.content_type and not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Please upload an image file.")
    data = await file.read()
    if len(data) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 12MB).")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    return analyze_image_bytes(data)


@app.post("/api/contact", response_model=ContactResponse)
def contact(payload: ContactMessage) -> ContactResponse:
    inbox = Path(__file__).resolve().parent / "contact_messages.log"
    line = (
        f"{payload.name} <{payload.email}>: "
        f"{payload.message.replace(chr(10), ' ')[:500]}\n"
    )
    with inbox.open("a", encoding="utf-8") as f:
        f.write(line)
    return ContactResponse(ok=True, detail="Message received. Thank you.")
