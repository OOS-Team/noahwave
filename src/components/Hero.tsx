"use client";

import { useEffect, useState } from "react";

const FLOATERS = [
  {
    src: "/images/hero/hero-1.png",
    className: "left-[2%] top-[16%] w-32 opacity-50 md:w-44 md:opacity-70",
    label: "TX-01",
  },
  {
    src: "/images/hero/hero-2.png",
    className: "right-[3%] top-[20%] w-28 opacity-45 md:w-40 md:opacity-65",
    label: "TX-02",
  },
  {
    src: "/images/hero/hero-3.jpg",
    className: "bottom-[12%] left-[12%] w-36 opacity-40 md:left-[22%] md:w-52 md:opacity-60",
    label: "TX-03",
  },
];

const BOOT_LINES = [
  "> mount /dev/signal",
  "> decrypt myth.packet",
  "> render ecstatic stream…",
  "> READY",
];

export function Hero() {
  const [line, setLine] = useState(0);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const id = window.setInterval(() => {
      setLine((n) => (n < BOOT_LINES.length - 1 ? n + 1 : n));
    }, 480);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        [d.getHours(), d.getMinutes(), d.getSeconds()]
          .map((n) => String(n).padStart(2, "0"))
          .join(":")
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 pt-28 pb-20"
    >
      {/* Static art debris — atmospheric, not interactive */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
        {FLOATERS.map((f) => (
          <div
            key={f.src}
            className={`absolute ${f.className} overflow-hidden border border-[#00ff41]/25 bg-black/60`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.src}
              alt=""
              className="h-auto w-full object-cover mix-blend-screen opacity-90 contrast-125 saturate-150 hue-rotate-[70deg]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,65,0.06)_50%)] bg-[length:100%_3px]" />
            <span className="absolute bottom-1 left-1 font-mono text-[9px] tracking-widest text-[#00ff41]/70">
              [{f.label}]
            </span>
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="mb-8 inline-flex items-center gap-3 border border-[#00ff41]/30 bg-black/80 px-4 py-1.5 font-mono text-[10px] tracking-[0.35em] text-[#00ff41]/70 uppercase">
          <span className="inline-block h-1.5 w-1.5 animate-pulse bg-[#00ff41]" />
          NODE ONLINE · {clock}
        </div>

        <p className="mb-4 font-mono text-[10px] tracking-[0.4em] text-[#00ff41]/45 uppercase">
          // generative archive · encrypted channel
        </p>

        <h1 className="select-none font-black leading-[0.88] tracking-tighter">
          <span className="block text-[16vw] text-white sm:text-[12vw] md:text-[7.5rem]">
            NOISE
          </span>
          <span className="block text-[16vw] phosphor text-[#00ff41] sm:text-[12vw] md:text-[7.5rem]">
            LIGHT
          </span>
        </h1>

        <div className="mx-auto mt-8 max-w-md border border-[#00ff41]/20 bg-black/70 p-4 text-left font-mono text-[11px] leading-relaxed text-[#00ff41]/75">
          {BOOT_LINES.slice(0, line + 1).map((l, i) => (
            <p key={l} className={i === line ? "cursor-blink" : ""}>
              {l}
            </p>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-sm font-mono text-xs leading-relaxed text-[#00ff41]/50">
          Ecstatic signal from the machine underground. Stills, loops, and live
          face-matrix — raw transmissions, no chrome.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href="#gallery" className="terminal-btn terminal-btn-filled">
            [ ENTER ARCHIVE ]
          </a>
          <a href="#vision" className="terminal-btn">
            [ JACK IN ]
          </a>
        </div>
      </div>

      <a
        href="#gallery"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.4em] text-[#00ff41]/35 uppercase transition hover:text-[#00ff41]/70"
      >
        ↓ scroll
      </a>
    </section>
  );
}
