"use client";

import { useState, type FormEvent } from "react";
import { hasContactEndpoint, sendContact } from "@/lib/api";

export function Contact() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle"
  );
  const [detail, setDetail] = useState("");
  const configured = hasContactEndpoint();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "");
    const email = String(data.get("email") || "");
    const message = String(data.get("message") || "");

    try {
      setStatus("sending");
      const res = await sendContact({ name, email, message });
      setStatus("ok");
      setDetail(res.detail || "SIGNAL RECEIVED.");
      form.reset();
    } catch (err) {
      setStatus("error");
      setDetail(
        err instanceof Error ? err.message : "SIGNAL LOST — try again."
      );
    }
  }

  return (
    <section id="contact" className="relative px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-xl">
        <div className="mb-10 text-center">
          <p className="term-label mb-2">// section.04 · uplink</p>
          <h2 className="text-4xl font-black tracking-tight text-[#00ff41] phosphor md:text-5xl">
            PING
          </h2>
          <p className="mt-2 font-mono text-xs text-[#00ff41]/45">
            collab · commission · cipher drop
          </p>
        </div>

        <form onSubmit={onSubmit} className="terminal-panel space-y-3 p-6 md:p-8">
          <p className="mb-2 font-mono text-[10px] tracking-[0.25em] text-[#00ff41]/40 uppercase">
            &gt; compose_message.sh
          </p>

          {!configured && (
            <p className="border border-[#ffb000]/40 bg-[#ffb000]/10 px-3 py-2 font-mono text-[10px] leading-relaxed text-[#ffb000]">
              // uplink offline — set NEXT_PUBLIC_FORMSPREE_ID (free Formspree)
              for production contact, or run the local API.
            </p>
          )}

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] tracking-widest text-[#00ff41]/50 uppercase">
              name
            </span>
            <input
              id="name"
              name="name"
              required
              className="terminal-input"
              placeholder="operator_id"
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] tracking-widest text-[#00ff41]/50 uppercase">
              email
            </span>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="terminal-input"
              placeholder="reply@node.local"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] tracking-widest text-[#00ff41]/50 uppercase">
              payload
            </span>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              className="terminal-input resize-y"
              placeholder="encrypt your intent…"
            />
          </label>

          <button
            type="submit"
            disabled={status === "sending" || !configured}
            className="terminal-btn terminal-btn-filled w-full"
          >
            {status === "sending"
              ? "[ TRANSMITTING… ]"
              : status === "ok"
                ? "[ SENT ]"
                : "[ TRANSMIT ]"}
          </button>

          {status === "ok" && (
            <p className="text-center font-mono text-xs text-[#00ff41]">
              {detail}
            </p>
          )}
          {status === "error" && (
            <p className="text-center font-mono text-xs text-[#ff003c]">
              {detail}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
