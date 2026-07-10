"use client";

/* =====================================================================
   MusicPlayer.tsx — the "Now Playing" disc player (top-right HUD).
   ---------------------------------------------------------------------
   A Persona 5-inspired turntable card in the room's warm palette: a
   spinning vinyl on the left (pure CSS — layered gradients for grooves,
   a fixed specular sheen, a rotating label with a jagged red star; a
   second WebGL context for a 90px HUD disc would be a perf smell), and
   the track block on the right — bold condensed title, muted-red
   accents, an animated equalizer, and a hover-expanded drawer with the
   progress line, time and transport controls.

   No audio ships (the actual track is copyrighted — this is a visual
   player): play/pause drives the disc spin, EQ and simulated progress.
   Drop a file into AUDIO_SRC later and the same state wires up for real.
   ===================================================================== */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const TRACK = {
  title: "Heartbreak",
  artist: "Persona 5",
  length: 268, // 4:28, per the design reference
};
const AUDIO_SRC = ""; // intentionally empty — see the header note

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/* how long the full card stays up after sliding in, and after the pointer
   leaves it, before tucking into the mini waveform chip */
const COLLAPSE_AFTER_INTRO_MS = 3200; // ≈1.35s slide-in + ~1.8s on show
const COLLAPSE_AFTER_LEAVE_MS = 1400;

/* the chip waveform's dome envelope: each bar's MAX height (%), swelling
   through the middle and easing off at the ends — the crest that rolls
   across them is globals.css's mp-wave keyframe */
const WAVE_ENVELOPE = [38, 55, 72, 86, 96, 100, 96, 86, 72, 55, 38];

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(84); // start mid-song like a room you walked into
  // mini = tucked into just the spinning disc; hover/focus expands it again
  const [mini, setMini] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const armCollapse = (ms: number) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setMini(true), ms);
  };
  const cancelCollapse = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
    setMini(false);
  };

  // simulated playback clock (becomes the real audio clock if AUDIO_SRC is set)
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((cur) => (cur + 0.25) % TRACK.length), 250);
    return () => clearInterval(id);
  }, [playing]);

  // the card slides in when the loading curtain lifts (body gains .ready);
  // a beat later it tucks itself into the mini disc
  useEffect(() => {
    let mo: MutationObserver | null = null;
    if (document.body.classList.contains("ready")) {
      armCollapse(COLLAPSE_AFTER_INTRO_MS);
    } else {
      mo = new MutationObserver(() => {
        if (document.body.classList.contains("ready")) {
          armCollapse(COLLAPSE_AFTER_INTRO_MS);
          mo?.disconnect();
          mo = null;
        }
      });
      mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }
    return () => {
      mo?.disconnect();
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <aside
      className={"mp" + (playing ? " playing" : "") + (mini ? " mini" : "")}
      aria-label="Now playing"
      onPointerEnter={cancelCollapse}
      onPointerLeave={() => armCollapse(COLLAPSE_AFTER_LEAVE_MS)}
      onFocusCapture={cancelCollapse}
      onBlurCapture={() => armCollapse(COLLAPSE_AFTER_LEAVE_MS)}
    >
      <div className="mp-card">
      {/* the deck: plinth + platter + vinyl (rotating, Phantom Thieves label) under a
          fixed specular sheen, with a tonearm that lifts off the record on pause */}
      <button
        className="mp-deck"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? `Pause ${TRACK.title}` : `Play ${TRACK.title}`}
        title={playing ? "Pause" : "Play"}
      >
        <span className="mp-vinyl" aria-hidden="true">
          <span className="mp-label">
            {/* unoptimized: a 21px decorative webp doesn't need the image pipeline */}
            <Image className="mp-logo" src="/phantom-logo.webp" alt="" width={16} height={16} unoptimized draggable={false} />
          </span>
        </span>
        <span className="mp-sheen" aria-hidden="true" />
        <span className="mp-arm" aria-hidden="true">
          <i />
        </span>
        <span className="mp-screw" aria-hidden="true" />
      </button>

      <div className="mp-body">
        <p className="mp-kick">Now playing</p>
        <p className="mp-title">{TRACK.title}</p>
        <p className="mp-artist">{TRACK.artist}</p>

        {/* equalizer — pauses with the disc */}
        <div className="mp-eq" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>

      {/* hover-expanded drawer: spans the full card under deck + track block */}
      <div className="mp-more">
        <div className="mp-more-inner">
          <div className="mp-progress" aria-hidden="true">
            <span style={{ width: `${(t / TRACK.length) * 100}%` }} />
          </div>
          <div className="mp-row">
            <span className="mp-time">
              {fmt(t)} / {fmt(TRACK.length)}
            </span>
            <span className="mp-ctrl">
              <button onClick={() => setT(0)} aria-label="Restart track">
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h1.6v10H2zM11 1v10L4.4 6z" fill="currentColor" /></svg>
              </button>
              <button
                className="mp-play"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /></svg>
                ) : (
                  <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1 11 6l-8.5 5z" fill="currentColor" /></svg>
                )}
              </button>
              <button onClick={() => setT(0)} aria-label="Next track">
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M8.4 1H10v10H8.4zM1 1l6.6 5L1 11z" fill="currentColor" /></svg>
              </button>
            </span>
          </div>
        </div>
      </div>
      </div>

      {/* the tucked state: a little WAVEFORM — eleven slim bars under a
         dome envelope (tall in the middle, short at the ends) with one
         shared crest rolling across them each two-beat cycle, so it swells
         "oo… oo…" on the groove instead of bouncing randomly. Per-bar
         height = the envelope; per-bar negative delay = the travel. On
         pause the wave drops dead to its envelope stubs. If AUDIO_SRC ever
         ships a real file, replace this with an AnalyserNode's bins. */}
      <button
        className="mp-chip"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? `Pause ${TRACK.title}` : `Play ${TRACK.title}`}
        title={`${TRACK.title} — ${TRACK.artist}`}
        tabIndex={mini ? 0 : -1}
      >
        <span className="mp-chip-eq" aria-hidden="true">
          {WAVE_ENVELOPE.map((h, i) => (
            <i
              key={i}
              style={{
                height: `${h}%`,
                animationDelay: `calc(${-i} * var(--mp-beat) * 2 / ${WAVE_ENVELOPE.length})`,
              }}
            />
          ))}
        </span>
      </button>

      {AUDIO_SRC && <audio src={AUDIO_SRC} />}
    </aside>
  );
}
