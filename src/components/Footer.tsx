export function Footer() {
  return (
    <footer className="relative px-5 pb-10 pt-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border border-[#00ff41]/15 bg-black/60 px-5 py-3 font-mono sm:flex-row">
        <p className="text-[10px] tracking-[0.25em] text-[#00ff41]/40 uppercase">
          © {new Date().getFullYear()} NOAHWAVE · ALL RIGHTS ENCRYPTED
        </p>
        <p className="text-[10px] tracking-[0.2em] text-[#00ff41]/30">
          // cypherpunk · ecstatic · offline-first
        </p>
        <a
          href="#home"
          className="text-[10px] tracking-[0.25em] text-[#00ff41]/45 uppercase transition hover:text-[#00ff41]"
        >
          ↑ TOP
        </a>
      </div>
    </footer>
  );
}
