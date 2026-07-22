"use client";
import { useEffect, useState } from "react";
import type { Artwork } from "@/lib/api";
import { fetchWorks } from "@/lib/api";

export function Gallery() {
  const [works, setWorks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchWorks("all")
      .then(setWorks)
      .catch(() => setError("ARCHIVE OFFLINE"))
      .finally(() => setLoading(false));
  }, []);
  return (
    <section id="gallery" className="relative px-5 py-20 md:px-8 md:py-28">
      <p className="term-label mb-2">// section.01</p>
      <h2 className="text-4xl font-black text-[#00ff41] phosphor md:text-6xl">ARCHIVE</h2>
      {loading && (
        <p className="mt-6 font-mono text-xs text-[#00ff41]/50">decrypting pixels…</p>
      )}
      {error && (
        <p className="mt-6 font-mono text-sm text-[#ff003c]">{error}</p>
      )}
      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {works.map((w) => (
          <div
            key={w.id}
            className="mb-4 break-inside-avoid border border-[#00ff41]/25 bg-black"
          >
            {w.type === "video" ? (
              <video
                src={w.url}
                muted
                loop
                playsInline
                autoPlay
                className="h-auto w-full"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={w.url} alt={w.title} className="h-auto w-full" />
            )}
            <div className="border-t border-[#00ff41]/20 p-3">
              <p className="font-mono text-[10px] text-[#00d4ff]/80">{w.codename}</p>
              <p className="text-sm text-[#00ff41] phosphor">{w.title}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
