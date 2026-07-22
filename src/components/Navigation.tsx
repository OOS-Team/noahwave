"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "#home", label: "HOME" },
  { href: "#gallery", label: "ARCHIVE" },
  { href: "#vision", label: "MATRIX" },
  { href: "#about", label: "MANIFEST" },
  { href: "#contact", label: "PING" },
];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-7 z-50 px-3 md:px-6">
      <nav
        className={`mx-auto flex max-w-5xl items-center justify-between border px-4 py-2.5 font-mono transition-colors duration-300 md:px-5 ${
          scrolled
            ? "border-[#00ff41]/35 bg-black/90 shadow-[0_0_30px_rgba(0,255,65,0.08)]"
            : "border-[#00ff41]/20 bg-black/70"
        }`}
      >
        <a href="#home" className="group flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center border border-[#00ff41]/60 text-[10px] text-[#00ff41]">
            ▣
          </span>
          <span className="text-xs tracking-[0.28em] uppercase">
            <span className="text-[#00ff41]/55">NOAH</span>
            <span className="phosphor text-[#00ff41]">WAVE</span>
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="px-3 py-1.5 text-[10px] tracking-[0.2em] text-[#00ff41]/55 uppercase transition hover:bg-[#00ff41]/10 hover:text-[#00ff41]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#gallery"
          className="hidden border border-[#00ff41] bg-[#00ff41] px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-black uppercase transition hover:bg-[#00ff41cc] md:inline-flex"
        >
          OPEN_//
        </a>

        <button
          type="button"
          className="relative z-10 flex h-9 w-9 items-center justify-center border border-[#00ff41]/30 text-[#00ff41] md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span className="font-mono text-xs">{open ? "×" : "≡"}</span>
        </button>
      </nav>

      {open && (
        <ul className="mx-auto mt-2 max-w-5xl border border-[#00ff41]/25 bg-black/95 p-2 md:hidden">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-[0.2em] text-[#00ff41]/70 uppercase transition hover:bg-[#00ff41]/10 hover:text-[#00ff41]"
              >
                <span className="text-[#00ff41]/35">&gt;</span>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
