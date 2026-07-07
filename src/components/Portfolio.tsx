"use client";

/* =====================================================================
   Portfolio.tsx — the page shell around the 3D room (ADR-0010).
   ---------------------------------------------------------------------
   Owns the React state + the imperative engine refs and all DOM input
   (scroll wheel / keyboard / focus rail), then drives the WebGL room
   (RoomScene, mounted client-only) through shared refs. Everything that
   needs to be crisp, accessible, and SEO-readable stays as HTML overlays
   here — the top bar, focus rail, the click-to-read "inspect" card, and
   the one-page résumé — all sourced from src/content/site.ts.

   The CSS-3D room, poster, desk and window from Phases 1–3 were replaced
   by the real-time 3D room; site.ts + the inspect card + résumé carried
   over unchanged.
   ===================================================================== */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { identity, stations, resumeOrder } from "@/content/site";
import { STOPS } from "./roomStops";
import LoadingScreen from "./LoadingScreen";
import MusicPlayer from "./MusicPlayer";

// the WebGL canvas is client-only — keep it off the server (Next 16 lazy-load guide)
const RoomScene = dynamic(() => import("./RoomScene"), { ssr: false });

const stById = (id: string) => stations.find((s) => s.id === id);

// one scroll = one stop; ignore further wheel events for this long (ms) so a fast
// scroll steps calmly one-by-one instead of flying through every stop
const STEP_COOLDOWN = 600;

/* ---------- the one-page résumé / fast-lane view (carried over unchanged) ---------- */
function ResumeView({ onBack }: { onBack: () => void }) {
  return (
    <>
      <button className="r-back" onClick={onBack}>
        ← Back to the room
      </button>
      <div className="sheet">
        <header className="r-head">
          <h1>{identity.name}</h1>
          <div className="rt">{identity.title}</div>
          <div className="rc">
            <span>{identity.location}</span>
            <span>{identity.school}</span>
            <span>
              <a href={identity.linkedin} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>
                LinkedIn ↗
              </a>
            </span>
            <span>{identity.email}</span>
          </div>
        </header>

        {resumeOrder.map((sid) => {
          const st = stById(sid);
          if (!st) return null;
          return (
            <section className="r-sec" key={sid}>
              <h2>{st.tab}</h2>
              <div className="rbody">
                <p>{st.body}</p>
                {st.roles?.map((r, i) => (
                  <p style={{ marginTop: 14 }} key={i}>
                    <b>{r.role}</b> — {r.org} <span className="small">· {r.date}</span>
                    <br />
                    <span className="small">{r.note}</span>
                  </p>
                ))}
                {st.software && (
                  <p style={{ marginTop: 12 }} className="small">
                    {st.software.map((s, i) => (
                      <span key={i}>
                        {i > 0 && " · "}
                        <b style={{ color: "var(--ink)" }}>{s[0]}</b> — {s[1]}
                      </span>
                    ))}
                  </p>
                )}
                {st.software && st.learning && (
                  <p className="small" style={{ marginTop: 6 }}>
                    Also: {st.learning.join(", ")}
                  </p>
                )}
                {st.facts && (
                  <p className="small" style={{ marginTop: 10 }}>
                    {st.facts.map((f, i) => (
                      <span key={i}>
                        {i > 0 && " · "}
                        {f[0]}: {f[1]}
                      </span>
                    ))}
                  </p>
                )}
                {st.links && (
                  <p style={{ marginTop: 12 }}>
                    <a href={identity.linkedin} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>
                      LinkedIn ↗
                    </a>{" "}
                    · Résumé available on request
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export default function Portfolio() {
  const [resumeOpen, setResumeOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const [inspect, setInspect] = useState<number | null>(null); // stop index being inspected, or null

  /* ---- loading curtain (LoadingScreen) ----
     The room loads, compiles and warms up entirely behind an opaque curtain; input
     stays gated until the scene is genuinely interaction-ready (RoomScene onReady),
     so the first scroll feels identical to every scroll after it. */
  const [loadPct, setLoadPct] = useState(0);      // loader progress for the curtain
  const [roomReady, setRoomReady] = useState(false); // assets + shaders + warm frames done
  const [curtain, setCurtain] = useState(true);   // curtain stays mounted until its fade ends
  const readyRef = useRef(false);                 // mirror for the input handlers
  // DEV: visit /?loader to hold the curtain open for design review
  const [holdCurtain] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("loader"),
  );
  const handleReady = useCallback(() => {
    if (!holdCurtain) setRoomReady(true);
  }, [holdCurtain]);
  // DEV: while /?loader holds the curtain, cycle a fake progress so the whole
  // chase (start → gaining → caught) can be reviewed without reloading
  useEffect(() => {
    if (!holdCurtain) return;
    let p = 0;
    const id = setInterval(() => {
      p = p >= 118 ? 0 : p + 1.2;
      setLoadPct(Math.min(100, p));
    }, 50);
    return () => clearInterval(id);
  }, [holdCurtain]);
  useEffect(() => {
    if (!roomReady) return;
    readyRef.current = true;
    document.body.classList.add("ready"); // scene settle + hint/read-cue reveal (globals.css)
  }, [roomReady]);

  // imperative engine state the 3D rig reads each frame (no re-render per frame)
  const targetFRef = useRef(0);
  const curFRef = useRef(0);
  const curZoomRef = useRef(0);
  const inspectRef = useRef<number | null>(null);
  const resumeRef = useRef(false);
  const prevInspect = useRef<number | null>(null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const readBtnRef = useRef<HTMLButtonElement>(null);
  const hintGone = useRef(false);

  const N = STOPS.length;
  const clampF = (v: number) => Math.max(0, Math.min(N - 1, v));
  const hideHint = () => {
    if (hintGone.current) return;
    hintGone.current = true;
    hintRef.current?.classList.add("gone");
  };

  // keep engine mirrors + body flags in sync with React state
  useEffect(() => {
    resumeRef.current = resumeOpen;
    document.body.classList.toggle("resume-open", resumeOpen);
  }, [resumeOpen]);

  useEffect(() => {
    inspectRef.current = inspect;
    document.body.classList.toggle("inspecting", inspect != null);
  }, [inspect]);

  // a11y: move focus into the card on open, back to the "read" affordance on close
  useEffect(() => {
    if (inspect != null) {
      const el = cardRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? cardRef.current;
      el?.focus();
    } else if (prevInspect.current != null) {
      readBtnRef.current?.focus();
    }
    prevInspect.current = inspect;
  }, [inspect]);

  // intro reveal + keyboard (Esc to close; arrows / page keys to step between stops)
  useEffect(() => {
    const lit = () => document.body.classList.add("lit");
    const raf = requestAnimationFrame(() => setTimeout(lit, 80));
    // reveal even if the tab loads in the background (rAF throttled) so it never sits blank
    const litFallback = setTimeout(lit, 600);

    const onKey = (e: KeyboardEvent) => {
      if (!readyRef.current) return; // input stays gated until the curtain lifts
      if (e.key === "Escape") {
        if (inspectRef.current != null) setInspect(null);
        else if (resumeRef.current) setResumeOpen(false);
        return;
      }
      if (resumeRef.current || inspectRef.current != null) return;
      const step = (n: number) => {
        targetFRef.current = clampF(Math.round(targetFRef.current) + n);
        hideHint();
      };
      if (["ArrowDown", "ArrowRight", "PageDown"].includes(e.key)) {
        step(1);
        e.preventDefault();
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        step(-1);
        e.preventDefault();
      } else if (e.key === "Home") {
        targetFRef.current = 0;
        hideHint();
      } else if (e.key === "End") {
        targetFRef.current = N - 1;
        hideHint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(litFallback);
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the "scroll to look around" hint counts its 7 seconds from when the room is
  // actually explorable (curtain lifted), not from page mount
  useEffect(() => {
    if (!roomReady) return;
    const t = setTimeout(hideHint, 7000);
    return () => clearTimeout(t);
  }, [roomReady]);

  // scroll wheel over the canvas → step ONE stop per gesture (not continuous
  // scrubbing). A cooldown swallows the rapid burst of events a fast scroll fires,
  // so the camera advances one item at a time (with its fixed pan+zoom) instead of
  // spazzing through all of them. The rig pans at a constant speed from there.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    let lastStep = 0;
    const onWheel = (e: WheelEvent) => {
      if (!readyRef.current) return; // gated until the curtain lifts
      if (resumeRef.current || inspectRef.current != null) return;
      e.preventDefault();
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(d) < 2) return;
      const now = e.timeStamp || performance.now();
      if (now - lastStep < STEP_COOLDOWN) return;
      lastStep = now;
      targetFRef.current = clampF(Math.round(targetFRef.current) + (d > 0 ? 1 : -1));
      hideHint();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // glide the camera to a stop (focus rail + first marker click); open / close the close-up
  const goTo = (i: number) => {
    targetFRef.current = clampF(i);
    hideHint();
  };
  const openInspect = (i: number) => {
    targetFRef.current = clampF(i);
    setInspect(i);
  };
  const closeInspect = () => setInspect(null);
  // a marker click: first focuses the stop, then (when already focused) opens its card
  const onActivate = (i: number) => {
    if (focus === i) openInspect(i);
    else goTo(i);
  };

  const focusStation = stById(STOPS[focus].id);
  const inspectStation = inspect != null ? stById(STOPS[inspect].id) : null;

  // lightweight focus trap: keep Tab cycling inside the open card (a11y for the dialog)
  const onCardKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const card = cardRef.current;
    if (!card) return;
    const f = card.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  };

  return (
    <>
      <div className="grain" />

      {/* ===== top bar ===== */}
      <header className="topbar">
        <a className="brand" href="#" aria-label={identity.name}>
          <span className="mark">{identity.initials}</span>
          <span className="who">
            <b>{identity.name}</b>
            <span>{identity.title}</span>
          </span>
        </a>
        <div className="controls">
          <button className="btn-resume" onClick={() => setResumeOpen(true)}>
            Résumé
          </button>
        </div>
      </header>

      {/* ===== the 3D room ===== */}
      <div className="scene" ref={sceneRef}>
        <RoomScene
          targetFRef={targetFRef}
          curFRef={curFRef}
          curZoomRef={curZoomRef}
          inspectRef={inspectRef}
          focus={focus}
          onFocus={setFocus}
          onActivate={onActivate}
          onProgress={setLoadPct}
          onReady={handleReady}
        />
      </div>

      {/* ===== loading curtain — unmounts itself once its lift transition ends ===== */}
      {curtain && (
        <LoadingScreen progress={loadPct} ready={roomReady} onExited={() => setCurtain(false)} />
      )}

      {/* ===== "now playing" disc player — slides in after the curtain lifts ===== */}
      <MusicPlayer />

      {/* ===== focus rail ===== */}
      <nav className="focusnav" aria-label="Focus points">
        {STOPS.map((s, i) => {
          const st = stById(s.id);
          return (
            <button key={s.id} className={focus === i ? "on" : ""} onClick={() => goTo(i)} aria-current={focus === i}>
              <span className="fn-label">{st?.tab ?? s.id}</span>
              <span className="fn-dot" />
            </button>
          );
        })}
      </nav>

      {/* ===== scroll hint ===== */}
      <div className="hint" ref={hintRef}>
        <span>Scroll to look around</span>
        <span className="wheel" aria-hidden="true" />
      </div>

      {/* ===== keyboard-friendly "open the focused stop" affordance ===== */}
      {!resumeOpen && (
        <button
          ref={readBtnRef}
          className="read-cue"
          onClick={() => openInspect(focus)}
          aria-label={`Read ${focusStation?.tab ?? "section"}`}
        >
          Read {focusStation?.tab ?? "section"} →
        </button>
      )}

      {/* ===== résumé fast-lane ===== */}
      <section className={"resume" + (resumeOpen ? " show" : "")} aria-label="Résumé view" aria-hidden={!resumeOpen}>
        {resumeOpen && <ResumeView onBack={() => setResumeOpen(false)} />}
      </section>

      {/* ===== inspect / click-to-read card (carried over unchanged) ===== */}
      {inspect != null && inspectStation && (
        <div className="inspect-layer">
          <div className="inspect-scrim" aria-hidden="true" onClick={closeInspect} />
          <div
            className="inspect-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspect-title"
            ref={cardRef}
            onKeyDown={onCardKey}
          >
            <button className="inspect-close" onClick={closeInspect} data-autofocus>
              ← Back to the room
            </button>
            <p className="ic-kick">{inspectStation.kicker}</p>
            <h2 className="ic-title" id="inspect-title">
              {inspectStation.title}
            </h2>
            <p className="ic-body">{inspectStation.body}</p>

            {inspectStation.roles && (
              <div className="ic-roles">
                {inspectStation.roles.map((r, i) => (
                  <div className="ic-role" key={i}>
                    <p className="ic-role-head">
                      <b>{r.role}</b> — {r.org}
                    </p>
                    <p className="ic-role-date">{r.date}</p>
                    <p className="ic-role-note">{r.note}</p>
                  </div>
                ))}
              </div>
            )}

            {inspectStation.software && (
              <div className="ic-soft">
                {inspectStation.software.map((s, i) => (
                  <div className="ic-soft-row" key={i}>
                    <span className="ic-soft-name">{s[0]}</span>
                    <span className="ic-soft-desc">{s[1]}</span>
                  </div>
                ))}
              </div>
            )}

            {inspectStation.learning && (
              <div className="ic-tags">
                {inspectStation.learning.map((t, i) => (
                  <span className="ic-tag" key={i}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            {inspectStation.facts && (
              <dl className="ic-facts">
                {inspectStation.facts.map(([k, v], i) => (
                  <div className="ic-fact" key={i}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {inspectStation.links && (
              <div className="ic-links">
                <a href={identity.linkedin} target="_blank" rel="noopener">
                  LinkedIn ↗
                </a>
                <a href={`mailto:${identity.email}`}>{identity.email}</a>
                <span className="ic-link-note">Résumé available on request</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
