import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import timeline from "./timeline.json";
import { EndCard } from "./EndCard";

/**
 * The LastBuy demo, built from real screens.
 *
 * Every frame is a capture of the running product or one of the three
 * diagrams. Nothing moves on its own: the camera eases toward whatever the
 * narration is talking about, the rest of the frame dims, and a thin red line
 * marks the exact thing. The timings come from the voice itself (see
 * narrate.py), so a box lights up as its words are spoken.
 */

type Box = [number, number, number, number];
type Cue = { start: number; end: number; box: number[] };
type Shot = { image: string; dark: boolean; start: number; end: number; cues: Cue[] };

const W = 1920;
const H = 1080;
const FADE = 0.45; // crossfade between frames, seconds
const MOVE = 0.9; // camera move, seconds
const SPOT_IN = 0.3;
const SPOT_OUT = 0.35;
const GLIDE = 0.4; // spotlight sliding from one box to the next
const PAD = 10;

const ease = Easing.inOut(Easing.cubic);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, p: number) => a + (b - a) * p;

type Cam = { z: number; x: number; y: number };
const NEUTRAL: Cam = { z: 1, x: W / 2, y: H / 2 };

/** Where the camera wants to be for a box: closer for small things, never past the frame's edge. */
function camFor(b: Box): Cam {
  const [x, y, w, h] = b;
  const fit = Math.min((W * 0.7) / (w + PAD * 2), (H * 0.7) / (h + PAD * 2));
  const z = clamp(fit, 1, 1.28);
  const cx = mix(W / 2, x + w / 2, 0.85);
  const cy = mix(H / 2, y + h / 2, 0.85);
  const hw = W / 2 / z;
  const hh = H / 2 / z;
  return { z, x: clamp(cx, hw, W - hw), y: clamp(cy, hh, H - hh) };
}

/** Camera at time t (seconds into the video) for a shot running from `from` to `to`. */
function camAt(t: number, cues: Cue[], from: number, to: number): Cam {
  let cam = NEUTRAL;
  // Each cue pulls the camera in. When a highlight lets go and the next is
  // more than a moment away, the camera eases back out to the whole frame
  // rather than staying close on something no longer lit.
  const keys: { t: number; cam: Cam }[] = [];
  cues.forEach((c, i) => {
    keys.push({ t: c.start, cam: camFor(c.box as Box) });
    const nextStart = i + 1 < cues.length ? cues[i + 1].start : to;
    if (nextStart - c.end > 1.2) keys.push({ t: c.end, cam: NEUTRAL });
  });
  for (const k of keys) {
    if (t < k.t) break;
    const p = ease(clamp((t - k.t) / MOVE, 0, 1));
    cam = { z: mix(cam.z, k.cam.z, p), x: mix(cam.x, k.cam.x, p), y: mix(cam.y, k.cam.y, p) };
  }
  // a very slow drift, so a held frame is never quite still
  const drift = 1 + 0.018 * clamp((t - from) / Math.max(to - from, 1), 0, 1);
  return { ...cam, z: cam.z * drift };
}

/** The lit box at time t, and how strongly it is lit. */
function spotAt(t: number, cues: Cue[]): { box: Box; a: number } | null {
  let i = -1;
  for (let k = 0; k < cues.length; k++) if (cues[k].start <= t) i = k;
  if (i < 0) return null;
  const c = cues[i];
  const next = cues[i + 1];
  const prev = cues[i - 1];
  const joinedPrev = prev && c.start - prev.end < 0.05;
  const joinedNext = next && next.start - c.end < 0.05;

  let box = c.box as Box;
  if (joinedPrev) {
    const p = ease(clamp((t - c.start) / GLIDE, 0, 1));
    const a = prev.box;
    box = [mix(a[0], box[0], p), mix(a[1], box[1], p), mix(a[2], box[2], p), mix(a[3], box[3], p)];
  }
  let a = joinedPrev ? 1 : clamp((t - c.start) / SPOT_IN, 0, 1);
  if (!joinedNext) a = Math.min(a, clamp((c.end - t) / SPOT_OUT, 0, 1));
  if (t > c.end && !joinedNext) return null;
  return { box, a: ease(a) };
}

const Spotlight: React.FC<{ box: Box; a: number; dark: boolean; z: number; id: string }> = ({ box, a, dark, z, id }) => {
  const [x, y, w, h] = [box[0] - PAD, box[1] - PAD, box[2] + PAD * 2, box[3] + PAD * 2];
  const r = 12;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <mask id={id}>
          <rect width={W} height={H} fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={r} fill="black" />
        </mask>
      </defs>
      <rect width={W} height={H} fill="#000" opacity={(dark ? 0.55 : 0.42) * a} mask={`url(#${id})`} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        fill="none"
        stroke={dark ? "#FF5A3D" : "#D62D12"}
        strokeWidth={3 / z}
        opacity={a}
      />
    </svg>
  );
};

const ShotView: React.FC<{ shot: Shot; index: number }> = ({ shot, index }) => {
  const frame = useCurrentFrame();
  const t = frame / timeline.fps;
  const abs = shot.start + t;
  const opacity = interpolate(t, [0, FADE], [0, 1], { extrapolateRight: "clamp" });

  if (shot.image === "endcard") {
    return (
      <AbsoluteFill style={{ opacity }}>
        <EndCard t={t} />
      </AbsoluteFill>
    );
  }

  const cam = camAt(abs, shot.cues, shot.start, shot.end);
  const spot = spotAt(abs, shot.cues);
  // scale about the frame's centre, then move the camera's point to the middle
  const tx = W / 2 - cam.x * cam.z;
  const ty = H / 2 - cam.y * cam.z;

  return (
    <AbsoluteFill style={{ opacity, background: shot.dark ? "#08090B" : "#FFFFFF", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: W,
          height: H,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${cam.z})`,
        }}
      >
        <Img src={staticFile(`frames/${shot.image}`)} style={{ width: W, height: H, display: "block" }} />
        {spot && <Spotlight box={spot.box} a={spot.a} dark={shot.dark} z={cam.z} id={`m${index}`} />}
      </div>
    </AbsoluteFill>
  );
};

export const LastBuyVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = timeline;
  const shots = timeline.shots as Shot[];
  const tail = interpolate(frame, [durationInFrames - fps * 0.8, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#08090B" }}>
      {shots.map((s, i) => {
        const from = Math.round(s.start * fps);
        const until = Math.min(durationInFrames, Math.round((s.end + FADE) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, until - from)}>
            <ShotView shot={s} index={i} />
          </Sequence>
        );
      })}
      {timeline.parts.map((p) => (
        <Sequence key={p.id} from={Math.round(p.start * fps)}>
          {/* The voice comes in at about -23 dBFS with its peaks near -4.5; this
              lifts it about 3.5 dB for laptop speakers and stays clear of clipping. */}
          <Audio src={staticFile(p.audio)} volume={1.5} />
        </Sequence>
      ))}
      <AbsoluteFill style={{ background: "#000", opacity: tail, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
