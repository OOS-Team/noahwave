"use client";

const TAGS = [
  "myth",
  "signal",
  "glitch",
  "divinity",
  "circuit",
  "haunt",
  "loop",
  "noise",
  "portrait",
  "dream",
  "ecstasy",
  "cipher",
];

const STATS = [
  { label: "CHAOS", value: 88 },
  { label: "SACRED", value: 72 },
  { label: "SIGNAL", value: 99 },
];

export function About() {
  return (
    <section id="about" className="relative px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="term-label mb-2">// section.03 · manifest</p>
          <h2 className="text-4xl font-black tracking-tight md:text-6xl">
            <span className="text-[#00ff41]/40">art for</span>{" "}
            <span className="phosphor text-[#00ff41]">machines</span>
            <br />
            <span className="text-white">that still dream</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md font-mono text-xs leading-relaxed text-[#00ff41]/45">
            Cypherpunk liturgy. Ecstatic noise turned image. Every frame is a
            cracked packet from a parallel net.
          </p>
        </div>

        <div className="terminal-panel p-6 md:p-8">
          <p className="mb-4 font-mono text-[10px] tracking-[0.3em] text-[#00ff41]/40 uppercase">
            // tag cloud · protocol
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {TAGS.map((tag) => (
              <span
                key={tag}
                className="border border-[#00ff41]/25 bg-black px-3 py-1.5 font-mono text-[11px] tracking-wider text-[#00ff41]/75"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="terminal-panel p-5"
            >
              <p className="font-mono text-[10px] tracking-[0.3em] text-[#00ff41]/40 uppercase">
                {stat.label}
              </p>
              <p className="mt-1 text-3xl font-black text-[#00ff41] phosphor">
                {stat.value}%
              </p>
              <div className="mt-3 h-1.5 overflow-hidden border border-[#00ff41]/20 bg-black">
                <div
                  className="h-full bg-[#00ff41]"
                  style={{ width: `${stat.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
