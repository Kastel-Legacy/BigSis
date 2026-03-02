import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ScoreRevealProps } from "../types";
import { Background } from "../components/Background";
import { Watermark } from "../components/Watermark";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { TextReveal } from "../components/TextReveal";
import { CategoryBar } from "../components/CategoryBar";
import { CTA } from "../components/CTA";
import { ProgressBar } from "../components/ProgressBar";

// ---------------------------------------------------------------------------
// ScoreReveal — 15s (450 frames @ 30fps)
//
// Scene 1 (0-45):     Logo + procedure name          — 1.5s
// Scene 2 (45-180):   Score counter 0->N + SVG ring  — 4.5s
// Scene 3 (180-360):  Category breakdown bars         — 6s
// Scene 4 (360-450):  Verdict + CTA                   — 3s
// ---------------------------------------------------------------------------

export const ScoreReveal: React.FC<ScoreRevealProps> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Scene visibility (crossfade transitions)
  const s1 = interpolate(frame, [0, 5, 38, 48], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s2 = interpolate(frame, [42, 52, 172, 182], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s3 = interpolate(frame, [175, 185, 352, 362], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s4 = interpolate(frame, [355, 365, durationInFrames - 1, durationInFrames], [0, 1, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Background style based on active scene
  const bgStyle = frame < 45 ? "pink_violet" : frame < 180 ? "dark_bold" : frame < 360 ? "emerald_cyan" : "warm_amber";

  // SVG ring animation for Scene 2
  const ringProgress = interpolate(frame, [55, 165], [0, props.scoreGlobal / 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const circumference = 2 * Math.PI * 130;
  const strokeDashoffset = circumference * (1 - ringProgress);

  return (
    <AbsoluteFill style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Background style={bgStyle} />
      <Watermark />
      <ProgressBar />

      {/* ---- Scene 1: Intro ---- */}
      {s1 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <TextReveal
            text={props.procedureName}
            startFrame={5}
            style={{ fontSize: 80, fontWeight: 900, letterSpacing: -2 }}
          />
          <TextReveal
            text="Score BigSIS"
            startFrame={18}
            style={{ fontSize: 36, fontWeight: 600, opacity: 0.7 }}
          />
        </AbsoluteFill>
      )}

      {/* ---- Scene 2: Score counter ---- */}
      {s2 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* SVG ring */}
          <div style={{ position: "relative", width: 360, height: 360 }}>
            <svg
              width={360}
              height={360}
              style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}
            >
              {/* Background ring */}
              <circle
                cx={180}
                cy={180}
                r={130}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={16}
              />
              {/* Animated ring */}
              <circle
                cx={180}
                cy={180}
                r={130}
                fill="none"
                stroke={props.scoreGlobal >= 70 ? "#6ee7b7" : props.scoreGlobal >= 50 ? "#fcd34d" : "#fca5a5"}
                strokeWidth={16}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            {/* Counter in center */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 360,
                height: 360,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AnimatedCounter
                from={0}
                to={props.scoreGlobal}
                startFrame={55}
                endFrame={155}
                suffix="/100"
                fontSize={120}
              />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ---- Scene 3: Category breakdown ---- */}
      {s3 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s3,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
          }}
        >
          <TextReveal
            text="Le Detail"
            startFrame={185}
            style={{ fontSize: 52, fontWeight: 900, marginBottom: 60 }}
          />
          <CategoryBar
            label="Efficacite"
            score={props.scoreEfficacite}
            maxScore={10}
            color="#10b981"
            startFrame={205}
            endFrame={270}
          />
          <CategoryBar
            label="Securite"
            score={props.scoreSecurite}
            maxScore={10}
            color="#3b82f6"
            startFrame={235}
            endFrame={300}
          />
          <CategoryBar
            label="Satisfaction"
            score={props.scoreSatisfaction}
            maxScore={10}
            color="#f59e0b"
            startFrame={265}
            endFrame={330}
          />
        </AbsoluteFill>
      )}

      {/* ---- Scene 4: Verdict + CTA ---- */}
      {s4 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextReveal
            text="Le Verdict Big Sis"
            startFrame={365}
            style={{ fontSize: 40, fontWeight: 700, opacity: 0.7, marginBottom: 24 }}
          />
          <TextReveal
            text={props.verdictText}
            startFrame={375}
            style={{ fontSize: 56, fontWeight: 900, maxWidth: 800, lineHeight: 1.3 }}
          />
          <CTA text={props.ctaText} startFrame={400} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
