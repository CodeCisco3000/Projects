"use client";

/* =====================================================================
   Portfolio.tsx — PHASE 1: the perspective room shell + camera.
   ---------------------------------------------------------------------
   A real CSS-3D corner of a room (walls + floor + ceiling under one
   shared perspective). A fixed camera glides between named focus
   anchors as you scroll — these anchors are PLACEHOLDERS standing in
   for the objects (poster, desk, shelf…) that get furnished in later
   phases. Content/labels still come from src/content/site.ts.
   ===================================================================== */

import { useEffect, useRef, useState } from "react";
import { identity, stations, resumeOrder } from "@/content/site";

/* ---- the placeholder focus anchors, pinned onto the room's surfaces ----
   `face`  = which surface the marker lives on
   `x`/`y` = its position on that surface (CSS %)
   `cam`   = where the camera glides to when this anchor is focused:
             x/y/z  — px translate of the room
             ry/rx  — small camera turn
             rry    — the ROOM's base turn (deg). The real lever for facing a
                      wall: turning the room brings a side wall forward so its
                      objects read square-on instead of edge-on.
             pox    — the perspective "eye" x-position (%), a finer framing nudge.
   The six stops are arranged LEFT→RIGHT across the room so scrolling A→F
   sweeps the camera smoothly across it with no backtracking:
     about (A)            → left wall
     education/experience/skills (B,C,D) → back wall, left→right
     involvement/contact (E,F)           → right wall, back→front
   rry — the ROOM's base turn. Back-wall and right-wall stops keep the resting
   three-quarter turn (-14°); the left-wall stop (about) turns the room FURTHER
   the same way (to -55°) so the left wall swings around to face us head-on.
   Turning it the other way (toward +deg) instead shows the wall's BACK face —
   mirrored and filling the screen (the original "glitch through the wall" bug).
   All values glide smoothly between stops. */
type Face = "back" | "left" | "right" | "floor";
type Cam = { x: number; y: number; z: number; ry: number; rx: number; pox: number; rry: number };
type Anchor = { id: string; face: Face; x: string; y: string; cam: Cam };

const ANCHORS: Anchor[] = [
  // left wall — the head-on stop the page lands on
  { id: "about",       face: "left",  x: "44%", y: "44%", cam: { x: 420, y: 50, z: 240, ry: 0, rx: 0, pox: 43, rry: -55 } },
  // back wall, swept left → right
  { id: "education",   face: "back",  x: "24%", y: "34%", cam: { x: 250, y: 55, z: 190, ry: 0, rx: 0, pox: 43, rry: -14 } },
  { id: "experience",  face: "back",  x: "55%", y: "34%", cam: { x: -30, y: 55, z: 195, ry: 0, rx: 0, pox: 43, rry: -14 } },
  { id: "skills",      face: "back",  x: "78%", y: "40%", cam: { x: -250, y: 35, z: 190, ry: 0, rx: 0, pox: 43, rry: -14 } },
  // right wall, back corner → front
  { id: "involvement", face: "right", x: "38%", y: "40%", cam: { x: -90, y: 26, z: -110, ry: 54, rx: 0, pox: 43, rry: -14 } },
  { id: "contact",     face: "right", x: "52%", y: "44%", cam: { x: -150, y: 28, z: -110, ry: 54, rx: 0, pox: 43, rry: -14 } },
];

const stById = (id: string) => stations.find((s) => s.id === id);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ---------- the one-page résumé / fast-lane view ---------- */
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

/* ---------- a single placeholder marker on a wall/floor ---------- */
function AnchorMarker({ a, active, onClick }: { a: Anchor; active: boolean; onClick: () => void }) {
  const st = stById(a.id);
  return (
    <button
      className={"anchor" + (a.face === "floor" ? " on-floor" : "") + (active ? " is-focus" : "")}
      style={{ left: a.x, top: a.y }}
      data-id={a.id}
      onClick={onClick}
      aria-label={`Focus ${st?.tab ?? a.id}`}
    >
      <span className="a-kick">{st?.kicker ?? ""}</span>
      <span className="a-name">{st?.tab ?? a.id}</span>
      <span className="a-tag">object · phase 2</span>
    </button>
  );
}

export default function Portfolio() {
  const [resumeOpen, setResumeOpen] = useState(false);
  const [focus, setFocus] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  // imperative engine state the React tree shouldn't re-render on
  const targetF = useRef(0);
  const curF = useRef(0);
  const resumeRef = useRef(false);

  // jump the camera to an anchor (used by the focus rail + marker clicks)
  const goToRef = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    resumeRef.current = resumeOpen;
    document.body.classList.toggle("resume-open", resumeOpen);
  }, [resumeOpen]);

  /* intro reveal + escape-to-close */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setTimeout(() => document.body.classList.add("lit"), 80));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setResumeOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  /* the scroll-to-focus camera engine (runs once) */
  useEffect(() => {
    const stage = stageRef.current!;
    const camera = cameraRef.current!;
    const room = roomRef.current!;
    const N = ANCHORS.length;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clampF = (v: number) => Math.max(0, Math.min(N - 1, v));

    const goTo = (i: number) => {
      targetF.current = clampF(i);
      hideHint();
    };
    goToRef.current = goTo;

    // wheel → glide between anchors
    const onWheel = (e: WheelEvent) => {
      if (resumeRef.current) return;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      targetF.current = clampF(targetF.current + d * 0.0045);
      hideHint();
      e.preventDefault();
    };
    stage.addEventListener("wheel", onWheel, { passive: false });

    // keys → step between anchors
    const onKey = (e: KeyboardEvent) => {
      if (resumeRef.current) return;
      const step = (n: number) => { targetF.current = clampF(Math.round(targetF.current) + n); hideHint(); };
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) { step(1); e.preventDefault(); }
      else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { step(-1); e.preventDefault(); }
      else if (e.key === "Home") { targetF.current = 0; }
      else if (e.key === "End") { targetF.current = N - 1; }
    };
    window.addEventListener("keydown", onKey);

    // drag (pointer / touch) → vertical drag scrubs focus
    let dragging = false, startY = 0, startF = 0, moved = 0;
    const onDown = (e: PointerEvent) => {
      if (resumeRef.current) return;
      if ((e.target as HTMLElement).closest(".anchor, .topbar, .focusnav")) return;
      dragging = true; moved = 0; startY = e.clientY; startF = targetF.current;
      stage.classList.add("dragging");
      stage.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      moved += Math.abs(e.movementY || 0);
      targetF.current = clampF(startF + (startY - e.clientY) * 0.006);
      if (moved > 6) hideHint();
    };
    const endDrag = () => { dragging = false; stage.classList.remove("dragging"); };
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);

    // render loop
    let lastNearest = -1;
    let raf = 0;
    const apply = () => {
      if (reduce) curF.current = targetF.current;
      else {
        curF.current += (targetF.current - curF.current) * 0.09;
        if (Math.abs(targetF.current - curF.current) < 0.001) curF.current = targetF.current;
      }
      const f = curF.current;
      const i0 = Math.floor(f), i1 = Math.min(N - 1, i0 + 1), t = f - i0;
      const a = ANCHORS[i0].cam, b = ANCHORS[i1].cam;
      camera.style.setProperty("--cam-x", lerp(a.x, b.x, t).toFixed(2) + "px");
      camera.style.setProperty("--cam-y", lerp(a.y, b.y, t).toFixed(2) + "px");
      camera.style.setProperty("--cam-z", lerp(a.z, b.z, t).toFixed(2) + "px");
      camera.style.setProperty("--cam-ry", lerp(a.ry, b.ry, t).toFixed(3) + "deg");
      camera.style.setProperty("--cam-rx", lerp(a.rx, b.rx, t).toFixed(3) + "deg");
      stage.style.setProperty("--po-x", lerp(a.pox, b.pox, t).toFixed(2) + "%"); // glide the eye too
      room.style.setProperty("--room-ry", lerp(a.rry, b.rry, t).toFixed(3) + "deg"); // turn the room to face the wall

      const nearest = Math.round(f);
      if (nearest !== lastNearest) { lastNearest = nearest; setFocus(nearest); }
      raf = requestAnimationFrame(apply);
    };
    apply();

    // auto-hide the scroll hint
    let hintGone = false;
    function hideHint() {
      if (hintGone) return;
      hintGone = true;
      hintRef.current?.classList.add("gone");
    }
    const hintTimer = setTimeout(hideHint, 7000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hintTimer);
      stage.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", endDrag);
      stage.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  const anchorsOn = (face: Face) => ANCHORS.filter((a) => a.face === face);
  const renderAnchors = (face: Face) =>
    anchorsOn(face).map((a) => {
      const idx = ANCHORS.indexOf(a);
      return (
        <AnchorMarker key={a.id} a={a} active={focus === idx} onClick={() => goToRef.current(idx)} />
      );
    });

  const init = ANCHORS[0].cam;

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

      {/* ===== the room ===== */}
      <main
        className="stage"
        ref={stageRef}
        style={{ "--po-x": init.pox + "%" } as React.CSSProperties}
      >
        <div
          className="camera"
          ref={cameraRef}
          style={
            {
              "--cam-x": init.x + "px",
              "--cam-y": init.y + "px",
              "--cam-z": init.z + "px",
              "--cam-ry": init.ry + "deg",
              "--cam-rx": init.rx + "deg",
            } as React.CSSProperties
          }
        >
          <div
            className="room"
            ref={roomRef}
            style={{ "--room-ry": init.rry + "deg" } as React.CSSProperties}
          >
            <div className="face face--ceil" aria-hidden="true" />
            <div className="face face--floor">{renderAnchors("floor")}</div>
            <div className="face face--left">{renderAnchors("left")}</div>
            <div className="face face--right">{renderAnchors("right")}</div>
            <div className="face face--back">{renderAnchors("back")}</div>
          </div>
        </div>
      </main>

      {/* ===== focus rail ===== */}
      <nav className="focusnav" aria-label="Focus points">
        {ANCHORS.map((a, i) => {
          const st = stById(a.id);
          return (
            <button
              key={a.id}
              className={focus === i ? "on" : ""}
              onClick={() => goToRef.current(i)}
              aria-current={focus === i}
            >
              <span className="fn-label">{st?.tab ?? a.id}</span>
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

      {/* ===== résumé fast-lane ===== */}
      <section
        className={"resume" + (resumeOpen ? " show" : "")}
        aria-label="Résumé view"
        aria-hidden={!resumeOpen}
      >
        {resumeOpen && <ResumeView onBack={() => setResumeOpen(false)} />}
      </section>
    </>
  );
}
