"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectSubjects,
  drawMatrixHud,
  expressionBars,
  loadFaceModels,
  smoothSubjects,
  type FaceSubject,
} from "@/lib/faceMatrix";

function Bar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[10px] tracking-wider text-[#00ff41]/70 uppercase">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden border border-[#00ff41]/15 bg-black">
        <div
          className="h-full bg-[#00ff41] transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function VisionLab() {
  const [camOn, setCamOn] = useState(false);
  const [startingCam, setStartingCam] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<FaceSubject[]>([]);
  const [bootText, setBootText] = useState("");
  const [frame, setFrame] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const subjectsRef = useRef<FaceSubject[]>([]);
  const rafRef = useRef(0);
  const detectBusy = useRef(false);
  const lastDetect = useRef(0);
  const scanRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const lines = [
      "load nets…",
      "calibrate eyes…",
      "bind mood map…",
      "ready",
    ];
    let i = 0;
    const boot = window.setInterval(() => {
      if (i < lines.length) {
        setBootText(lines[i]);
        i++;
      }
    }, 320);

    loadFaceModels("/models")
      .then(() => {
        if (!cancelled) {
          setModelsReady(true);
          setBootText("ONLINE");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setModelError(
            e instanceof Error ? e.message : "Models failed to load."
          );
        }
      });

    return () => {
      cancelled = true;
      window.clearInterval(boot);
    };
  }, []);

  const stopCam = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.pause();
    }
    subjectsRef.current = [];
    setSubjects([]);
    setCamOn(false);
  }, []);

  useEffect(() => () => stopCam(), [stopCam]);

  useEffect(() => {
    if (!camOn) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    void video.play().catch(() => {});
    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [camOn]);

  useEffect(() => {
    if (!camOn || !modelsReady) return;
    let running = true;

    const tick = async (t: number) => {
      if (!running) return;
      const video = videoRef.current;
      const overlay = overlayRef.current;
      const stage = stageRef.current;

      frameRef.current += 1;
      scanRef.current = (scanRef.current + 0.01) % 1;

      if (
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        !detectBusy.current &&
        t - lastDetect.current > 200
      ) {
        detectBusy.current = true;
        lastDetect.current = t;
        try {
          const raw = await detectSubjects(video);
          const smoothed = smoothSubjects(subjectsRef.current, raw, 0.55);
          subjectsRef.current = smoothed;
          setSubjects(smoothed.map((s) => ({ ...s })));
          setFrame(frameRef.current);
        } catch {
          // keep last lock
        } finally {
          detectBusy.current = false;
        }
      }

      if (overlay && stage && video && video.videoWidth > 0) {
        const rect = stage.getBoundingClientRect();
        const dw = Math.max(1, Math.floor(rect.width));
        const dh = Math.max(1, Math.floor(rect.height));
        if (overlay.width !== dw || overlay.height !== dh) {
          overlay.width = dw;
          overlay.height = dh;
        }
        const ctx = overlay.getContext("2d");
        if (ctx) {
          drawMatrixHud(
            ctx,
            dw,
            dh,
            video.videoWidth,
            video.videoHeight,
            subjectsRef.current,
            {
              scanY: scanRef.current,
              t,
              frame: frameRef.current,
              mirrored: true,
            }
          );
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [camOn, modelsReady]);

  async function startCam() {
    setError(null);
    if (!modelsReady) {
      setError("Still booting…");
      return;
    }
    setStartingCam(true);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCamOn(true);
    } catch (e) {
      stopCam();
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera blocked."
          : e instanceof Error
            ? e.message
            : "Camera unavailable."
      );
    } finally {
      setStartingCam(false);
    }
  }

  const primary = subjects[0] ?? null;
  const exprList = primary ? expressionBars(primary.expressions) : [];

  return (
    <section id="vision" className="relative px-5 py-20 md:px-8 md:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,255,65,0.06),_transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="term-label mb-2">// section.02 · live feed</p>
            <h2 className="text-4xl font-black tracking-tight text-[#00ff41] phosphor md:text-6xl">
              MATRIX
            </h2>
            <p className="mt-2 font-mono text-xs text-[#00ff41]/45">
              Face → data. Local inference. No cloud.
            </p>
          </div>
          <button
            type="button"
            disabled={startingCam || (!modelsReady && !camOn)}
            onClick={camOn ? stopCam : startCam}
            className={
              camOn
                ? "terminal-btn border-[#ff003c] text-[#ff003c] hover:bg-[#ff003c] hover:text-black"
                : "terminal-btn terminal-btn-filled"
            }
          >
            {startingCam
              ? "[ BOOTING… ]"
              : camOn
                ? "[ ABORT ]"
                : modelsReady
                  ? "[ JACK IN ]"
                  : "[ LOADING… ]"}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="terminal-panel p-3 md:p-4">
            <div
              ref={stageRef}
              className="relative aspect-[4/3] overflow-hidden border border-[#00ff41]/25 bg-black"
            >
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className={`absolute inset-0 z-10 h-full w-full object-cover scale-x-[-1] ${
                  camOn ? "opacity-90" : "opacity-0"
                }`}
                style={{
                  filter: camOn
                    ? "contrast(1.1) saturate(0.75) hue-rotate(55deg) brightness(0.9)"
                    : undefined,
                }}
              />
              <canvas
                ref={overlayRef}
                className={`absolute inset-0 z-20 h-full w-full ${
                  camOn ? "opacity-100" : "opacity-0"
                }`}
              />

              {!camOn && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6">
                  <span className="font-mono text-3xl text-[#00ff41]/40">◎</span>
                  {modelError ? (
                    <span className="font-mono text-xs text-[#ff003c]">
                      {modelError}
                    </span>
                  ) : (
                    <span className="font-mono text-xs tracking-[0.3em] text-[#00ff41]/55 uppercase">
                      {startingCam ? "opening eye…" : bootText || "…"}
                    </span>
                  )}
                </div>
              )}

              {camOn && (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full overflow-hidden">
                  <div
                    className="absolute inset-x-0 h-px bg-[#00ff41]/50 shadow-[0_0_12px_#00ff41]"
                    style={{ animation: "scan-down 2.5s linear infinite" }}
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="mt-3 text-center font-mono text-xs text-[#ff003c]">
                {error}
              </p>
            )}
          </div>

          <div className="terminal-panel p-5 font-mono text-[#00ff41]">
            {!primary ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <p className="text-[10px] tracking-[0.25em] text-[#00ff41]/40 uppercase">
                  {camOn ? "// hunting face…" : "// no feed"}
                </p>
                <p className="mt-3 text-xs text-[#00ff41]/30">
                  {camOn ? "LOCK: NONE" : "STATUS: IDLE"}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] tracking-[0.35em] text-[#00ff41]/40 uppercase">
                      lock
                    </p>
                    <h3 className="text-2xl tracking-wide phosphor">
                      {primary.id}
                    </h3>
                  </div>
                  <span className="border border-[#00ff41]/25 px-2 py-1 text-[10px] text-[#00ff41]/60">
                    F{frame}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: "AGE", v: `${Math.round(primary.age)}` },
                    {
                      k: "SEX",
                      v: primary.gender.slice(0, 1).toUpperCase(),
                    },
                    {
                      k: "MOOD",
                      v: primary.expression.slice(0, 6).toUpperCase(),
                    },
                    {
                      k: "PTS",
                      v: primary.landmarks?.length
                        ? String(primary.landmarks.length)
                        : "—",
                    },
                  ].map((cell) => (
                    <div
                      key={cell.k}
                      className="border border-[#00ff41]/15 bg-black/50 p-3"
                    >
                      <p className="text-[9px] tracking-[0.2em] text-[#00ff41]/40">
                        {cell.k}
                      </p>
                      <p className="mt-1 truncate text-xl phosphor">{cell.v}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {exprList.map((e) => (
                    <Bar key={e.name} label={e.name} value={e.score} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
