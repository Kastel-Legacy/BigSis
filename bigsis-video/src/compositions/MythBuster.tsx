import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { MythBusterProps } from "../types";
import { Background } from "../components/Background";
import { Watermark } from "../components/Watermark";
import { TextReveal } from "../components/TextReveal";
import { StampAnimation } from "../components/StampAnimation";
import { CTA } from "../components/CTA";
import { ProgressBar } from "../components/ProgressBar";

// ---------------------------------------------------------------------------
// MythBuster — 15s (450 frames @ 30fps)
//
// Scene 1 (0-45):     "VRAI ou FAUX ?" hook                  — 1.5s
// Scene 2 (45-165):   Statement zooms in                     — 4s
// Scene 3 (165-270):  Stamp animation (check/cross) + expl.  — 3.5s
// Scene 4 (270-405):  Science points                          — 4.5s
// Scene 5 (405-450):  Conseil + CTA                           — 1.5s
// ---------------------------------------------------------------------------

export const MythBuster: React.FC<MythBusterProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const s1 = interpolate(frame, [0, 5, 38, 48], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s2 = interpolate(frame, [42, 52, 157, 167], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s3 = interpolate(frame, [160, 170, 262, 272], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s4 = interpolate(frame, [265, 275, 397, 407], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s5 = interpolate(frame, [400, 410, durationInFrames - 1, durationInFrames], [0, 1, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const bgStyle =
    frame < 45 ? "pink_violet" :
    frame < 165 ? "dark_bold" :
    frame < 270 ? "dark_bold" :
    frame < 405 ? "emerald_cyan" :
    "warm_amber";

  // Statement zoom animation
  const statementScale = spring({
    frame: frame - 50,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  return (
    <AbsoluteFill style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Background style={bgStyle} />
      <Watermark />
      <ProgressBar />

      {/* ---- Scene 1: Hook ---- */}
      {s1 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
          }}
        >
          <TextReveal
            text="VRAI ou FAUX ?"
            startFrame={3}
            style={{ fontSize: 84, fontWeight: 900, letterSpacing: -2 }}
          />
          <TextReveal
            text={props.procedureName}
            startFrame={15}
            style={{ fontSize: 40, fontWeight: 600, opacity: 0.7 }}
          />
        </AbsoluteFill>
      )}

      {/* ---- Scene 2: Statement ---- */}
      {s2 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 80px",
          }}
        >
          <div
            style={{
              transform: `scale(${Math.max(0.5, Math.min(1, statementScale))})`,
              fontSize: 56,
              fontWeight: 900,
              color: "white",
              textAlign: "center",
              lineHeight: 1.3,
              maxWidth: 900,
            }}
          >
            &laquo; {props.mythStatement} &raquo;
          </div>
        </AbsoluteFill>
      )}

      {/* ---- Scene 3: Stamp + explanation ---- */}
      {s3 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
          }}
        >
          <StampAnimation isTrue={props.isTrue} startFrame={175} />
          <TextReveal
            text={props.explanation}
            startFrame={210}
            style={{
              fontSize: 32,
              fontWeight: 600,
              maxWidth: 800,
              lineHeight: 1.5,
              opacity: 0.9,
            }}
          />
        </AbsoluteFill>
      )}

      {/* ---- Scene 4: Science points ---- */}
      {s4 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s4,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
            gap: 32,
          }}
        >
          <TextReveal
            text="Ce que dit la science"
            startFrame={280}
            style={{ fontSize: 48, fontWeight: 900, marginBottom: 20 }}
          />
          {props.sciencePoints.map((point, i) => (
            <ScienceCard key={i} text={point} startFrame={300 + i * 30} index={i} />
          ))}
        </AbsoluteFill>
      )}

      {/* ---- Scene 5: Conseil + CTA ---- */}
      {s5 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextReveal
            text="Le conseil Big Sis"
            startFrame={408}
            style={{ fontSize: 36, fontWeight: 700, opacity: 0.7, marginBottom: 24 }}
          />
          <TextReveal
            text={props.conseilBigsis}
            startFrame={416}
            style={{ fontSize: 44, fontWeight: 800, maxWidth: 800, lineHeight: 1.4 }}
          />
          <CTA text={props.ctaText} startFrame={430} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Science bullet card
function ScienceCard({ text, startFrame, index }: { text: string; startFrame: number; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        opacity: progress,
        transform: `translateX(${(1 - progress) * 40}px)`,
        display: "flex",
        alignItems: "center",
        gap: 20,
        background: "rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: "24px 32px",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 24,
          color: "white",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>
      <span style={{ fontSize: 28, fontWeight: 600, color: "white", lineHeight: 1.4 }}>
        {text}
      </span>
    </div>
  );
}
