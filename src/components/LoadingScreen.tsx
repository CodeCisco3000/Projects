"use client";

/* =====================================================================
   LoadingScreen.tsx — the entry curtain (title screen) over the 3D room.
   ---------------------------------------------------------------------
   A warm, near-black curtain in the site's own design language (same
   tokens, type and grain as globals.css) that hides ALL asset loading:
   the room loads, compiles its shaders and warms its shadow maps behind
   it (RoomScene's LoadGate), so nothing ever pops in view. The progress
   line + counter ease smoothly instead of jumping with the loader.

   Choreography: staged type entrance → line fills as assets arrive →
   on `ready` the status flips to "Step inside." and the line completes →
   a short beat → the curtain lifts (opacity + soft blur) and Portfolio
   unmounts it after the transition (onExited).
   ===================================================================== */

import { useEffect, useRef, useState } from "react";
import { identity } from "@/content/site";
import PixelChase from "./PixelChase";

export type LoadingScreenProps = {
  progress: number; // raw loader progress 0–100 (jumps in chunks)
  ready: boolean;   // room fully loaded + compiled + warmed → begin the exit
  onExited: () => void; // curtain finished fading — safe to unmount
};

export default function LoadingScreen({ progress, ready, onExited }: LoadingScreenProps) {
  // "done" is just the `ready` prop; only the lift (a beat later) needs state
  const [lifting, setLifting] = useState(false);
  const [shown, setShown] = useState(0); // eased display value for the counter

  // ease the displayed percentage toward the real one (the loader jumps in
  // chunks; a counted-up number reads as crafted, not mechanical)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setShown((cur) => {
        const target = ready ? 100 : progress;
        const next = cur + (target - cur) * 0.12;
        return target - next < 0.1 ? target : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress, ready]);

  // exit choreography: the line completes + "Step inside." lands the moment `ready`
  // flips; one beat later the curtain lifts
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setLifting(true), 700);
    return () => clearTimeout(t);
  }, [ready]);

  const pct = Math.min(100, Math.round(shown));
  const lifted = useRef(false);

  return (
    <div
      className={"loader" + (lifting ? " lift" : "")}
      role="status"
      aria-live="polite"
      aria-label={ready ? "Entering the room" : "Preparing the room"}
      onTransitionEnd={(e) => {
        if (lifting && e.target === e.currentTarget && !lifted.current) {
          lifted.current = true;
          onExited();
        }
      }}
    >
      {/* slow-breathing warm glow + floating dust — the room's mood before the room */}
      <div className="ld-glow" aria-hidden="true" />
      <div className="ld-dust" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} />
        ))}
      </div>

      <div className="ld-center">
        <p className="ld-kick">Welcome</p>
        <h1 className="ld-name">{identity.name}</h1>
        <p className="ld-sub">{identity.title}</p>

        <div className="ld-progress">
          {/* the progress "bar": an 8-bit Spinosaurus gaining on a dodo,
              caught exactly at 100% — the hairline below is the ground they run on.
              `shown` (not a raw 100 on ready) so the final sprint to the catch is
              animated by the eased counter during the "Step inside." beat. */}
          <PixelChase progress={shown} caught={ready} />
          <div className="ld-line" aria-hidden="true">
            <span style={{ transform: `scaleX(${(ready ? 100 : Math.max(shown, progress)) / 100})` }} />
          </div>
          <div className="ld-meta">
            <span className="ld-status">{ready ? "Step inside." : "Preparing the room"}</span>
            <span className="ld-pct">{pct}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
