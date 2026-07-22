"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Sparse matrix rain — decorative only, no pointer capture */
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const glyphs =
      "01アイウエオカキクケコサシスセソタチツテトナニヌネノﾊﾋﾌﾍﾎABCDEF<>/$#@%&*";
    const fontSize = 13;
    let columns = 0;
    let drops: number[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }, () =>
        Math.floor(Math.random() * -40)
      );
    };
    resize();
    window.addEventListener("resize", resize);

    let last = 0;
    const draw = (t: number) => {
      if (!running) return;
      // ~24fps — cheap
      if (t - last > 42) {
        last = t;
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${fontSize}px ui-monospace, monospace`;

        for (let i = 0; i < drops.length; i++) {
          // sparse columns
          if (i % 3 !== 0) continue;
          const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;
          ctx.fillStyle =
            Math.random() > 0.96
              ? "rgba(200, 255, 210, 0.9)"
              : "rgba(0, 255, 65, 0.18)";
          ctx.fillText(ch, x, y);
          if (y > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-40"
    />
  );
}

export function Playfield({ children }: { children: ReactNode }) {
  return (
    <div className="crt relative min-h-screen overflow-x-hidden bg-black text-[#00ff41]">
      <MatrixRain />
      {/* Top status bar chrome */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[40] border-b border-[#00ff41]/15 bg-black/80 px-3 py-1 font-mono text-[10px] tracking-widest text-[#00ff41]/50 uppercase backdrop-blur-sm">
        <span className="hidden sm:inline">NOAHWAVE://ARCHIVE · SECURE CHANNEL · </span>
        <span className="text-[#00ff41]/80">ENCRYPTED</span>
        <span className="float-right text-[#00ff41]/40">v0.9.4-cypher</span>
      </div>
      <div className="relative z-10 pt-7">{children}</div>
    </div>
  );
}
