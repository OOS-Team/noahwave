"use client";

import { useEffect, useMemo, useState } from "react";
import type { Artwork } from "@/lib/api";
import { fetchWorks } from "@/lib/api";

type Filter = "all" | "image" | "video";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "image", label: "STILLS" },
  { id: "video", label: "LOOPS" },
];

const MARQUEE = [
  "MYTH",
  "SIGNAL",
  "GLITCH",
  "DIVINITY",
  "CIRCUIT",
  "LOOP",
  "NOISE",
  "LIGHT",
  "HAUNT",
  "ECSTASY",
];

function ArtCard({
  work,
  index,
  onOpen,
}: {
  work: Artwork;
  index: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative mb-4 block w-full break-inside-avoid text-left"
    >
      <div className="relative overflow-hidden border border-[#00ff41]/20 bg-black transition group-hover:border-[#00ff41]/60 group-hover:shadow-[0_0_40px_rgba(0,255,65,0.12)]">
        {/* Frame chrome */}
        <div className="absolute left-0 top-0 z-20 flex w-full items-center justify-between border-b border-[#00ff41]/15 bg-black/80 px-2 py-1 font-mono text-[9px] tracking-widest text-[#00ff41]/50">
          <span>
            {String(index + 1).padStart(3, "0")} · {work.codename}
          </span>
          <span>{work.type === "video" ? "VID" : "IMG"}</span>
        </div>

        <div className="relative overflow-hidden bg-black pt-6">
          {work.type === "video" ? (
            <video
              src={work.url}
              muted
              loop
              playsInline
              autoPlay
              className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.03] group-hover:contrast-125 group-hover:saturate-150"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={work.url}
              alt={work.title}
              loading="lazy"
              className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.03] group-hover:contrast-125 group-hover:saturate-150"
            />
          )}

          {/* Phosphor wash + scan texture for ecstatic pop */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-[#00ff41]/5 mix-blend-screen opacity-80" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-40" />

          <div className="absolute inset-x-0 bottom-0 z-10 border-t border-[#00ff41]/15 bg-black/85 px-3 py-2.5">
            <p className="font-mono text-[10px] tracking-[0.25em] text-[#00d4ff]/80 uppercase">
              {work.codename}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#00ff41] phosphor">
              {work.title}
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute right-2 top-8 border border-[#00ff41]/40 bg-black/70 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-[#00ff41] opacity-0 transition group-hover:opacity-100">
          OPEN_
        </div>
      </div>
    </button>
  );
}

export function Gallery() {
  const [works, setWorks] = useState<Artwork[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Artwork | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchWorks("all");
        if (!cancelled) {
          setWorks(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("ARCHIVE OFFLINE — retry later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return works;
    return works.filter((w) => w.type === filter);
  }, [works, filter]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <section id="gallery" className="relative px-5 py-20 md:px-8 md:py-28">
      {/* Terminal marquee */}
      <div className="mb-12 overflow-hidden border-y border-[#00ff41]/20 bg-black/50 py-2">
        <div className="animate-marquee flex w-max gap-8 whitespace-nowrap font-mono text-[10px] tracking-[0.4em] text-[#00ff41]/45 uppercase">
          {Array.from({ length: 2 }).map((_, rep) => (
            <span key={rep} className="flex gap-8">
              {MARQUEE.map((w) => (
                <span key={`${rep}-${w}`}>
                  <span className="text-[#00ff41]/80">//</span> {w}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="term-label mb-2">// section.01</p>
            <h2 className="text-4xl font-black tracking-tight text-[#00ff41] phosphor md:text-6xl">
              ARCHIVE
            </h2>
            <p className="mt-2 font-mono text-xs text-[#00ff41]/45">
              Ecstatic packets. Click to expand transmission.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`border px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase transition ${
                  filter === f.id
                    ? "border-[#00ff41] bg-[#00ff41] text-black"
                    : "border-[#00ff41]/30 text-[#00ff41]/60 hover:border-[#00ff41]/70 hover:text-[#00ff41]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 font-mono text-xs tracking-widest text-[#00ff41]/50 uppercase">
            <span className="cursor-blink">decrypting pixels</span>
          </div>
        )}

        {error && (
          <div className="border border-[#ff003c]/50 bg-[#ff003c]/10 p-6 text-center font-mono text-sm text-[#ff003c]">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {filtered.map((work, i) => (
              <ArtCard
                key={work.id}
                work={work}
                index={i}
                onOpen={() => setActive(work)}
              />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="py-16 text-center font-mono text-sm text-[#00ff41]/40">
            // empty sector
          </p>
        )}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden border border-[#00ff41]/40 bg-[#050a05] shadow-[0_0_60px_rgba(0,255,65,0.15)]"
          >
            <div className="flex items-center justify-between border-b border-[#00ff41]/25 bg-black px-4 py-2 font-mono text-[10px] tracking-widest text-[#00ff41]/60 uppercase">
              <span>
                VIEW · {active.codename} · {active.type}
              </span>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="border border-[#00ff41]/40 px-2 py-0.5 text-[#00ff41] transition hover:bg-[#00ff41] hover:text-black"
              >
                ESC / ×
              </button>
            </div>

            {active.type === "video" ? (
              <video
                src={active.url}
                controls
                autoPlay
                loop
                className="max-h-[72vh] w-full object-contain bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt={active.title}
                className="max-h-[72vh] w-full object-contain bg-black"
              />
            )}

            <div className="border-t border-[#00ff41]/20 px-4 py-3">
              <p className="font-mono text-[10px] tracking-[0.3em] text-[#00d4ff]/70 uppercase">
                {active.codename}
              </p>
              <h3 className="text-lg font-bold text-[#00ff41] phosphor">
                {active.title}
              </h3>
              {active.description && (
                <p className="mt-1 font-mono text-xs text-[#00ff41]/45">
                  {active.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
