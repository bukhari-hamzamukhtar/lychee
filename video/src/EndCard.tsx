import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";

/**
 * The last frame: what it is, who made it, and what it runs on.
 *
 * Not a call to action. The partners are shown as their own logos on white
 * cards, the way the deck's title slide shows them, because AMD's mark is
 * black and has to sit on something light.
 */

const FONT = '"Segoe UI", Arial, sans-serif';
const MONO = 'Consolas, "Courier New", monospace';

const rise = (t: number, at: number) => {
  const p = interpolate(t, [at, at + 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return { opacity: p, transform: `translateY(${(1 - p) * 18}px)` };
};

const LOGOS = [
  { file: "logo-amd.png", w: 163, h: 47, sub: "MinerU2.5-Pro · Gemma" },
  { file: "logo-gemma.png", w: 153, h: 59, sub: "Gemma-4-31B-IT" },
  { file: "logo-evolus.png", w: 1040, h: 326, sub: "workspace lychee" },
];

export const EndCard: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: "#08090B", fontFamily: FONT, color: "#F6F7F9" }}>
    {/* the faint circles from the deck's dark slides */}
    <div style={{ position: "absolute", left: -260, top: -380, width: 760, height: 760, borderRadius: "50%", background: "#121419", border: "1px solid #1C1F25" }} />
    <div style={{ position: "absolute", right: -220, bottom: -300, width: 640, height: 640, borderRadius: "50%", background: "#121419", border: "1px solid #1C1F25" }} />

    <div style={{ position: "absolute", left: 160, top: 210, width: 1500 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, ...rise(t, 0.1) }}>
        <Img src={staticFile("assets/logo-white.png")} style={{ width: 118, height: 108 }} />
        <div style={{ fontSize: 104, fontWeight: 700, letterSpacing: -2 }}>LastBuy</div>
      </div>
      <div style={{ marginTop: 34, fontSize: 40, lineHeight: 1.3, maxWidth: 1200, ...rise(t, 0.35) }}>
        Reads a supplier&apos;s discontinuation letter and tells you{" "}
        <span style={{ color: "#FF5A3D" }}>what it breaks, and what to buy.</span>
      </div>
      <div style={{ marginTop: 44, fontSize: 28, fontWeight: 600, ...rise(t, 0.6) }}>Hamza Bukhari</div>
      <div style={{ marginTop: 8, fontSize: 24, color: "#E2B33C", ...rise(t, 0.7) }}>
        AMD Developer Hackathon: ACT III &nbsp;·&nbsp; Intelligent Industry
      </div>

      <div style={{ marginTop: 70, fontSize: 16, letterSpacing: 3, color: "#9AA3AE", fontWeight: 700, ...rise(t, 0.9) }}>
        RUNS ON
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 26 }}>
        {LOGOS.map((l, i) => {
          const lh = 52;
          const lw = Math.min((lh * l.w) / l.h, 240);
          return (
            <div
              key={l.file}
              style={{
                width: 320,
                height: 132,
                borderRadius: 14,
                background: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                ...rise(t, 1.0 + i * 0.15),
              }}
            >
              <Img src={staticFile(`assets/${l.file}`)} style={{ width: lw, height: (lw * l.h) / l.w }} />
              <div style={{ fontSize: 18, color: "#3A404A" }}>{l.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  </AbsoluteFill>
);
