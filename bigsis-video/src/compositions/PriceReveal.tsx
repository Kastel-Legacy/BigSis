import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { PriceRevealProps } from "../types";
import { Background } from "../components/Background";
import { Watermark } from "../components/Watermark";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { TextReveal } from "../components/TextReveal";
import { CTA } from "../components/CTA";
import { ProgressBar } from "../components/ProgressBar";

// ---------------------------------------------------------------------------
// PriceReveal — 15s (450 frames @ 30fps)
//
// Scene 1 (0-45):     "Le vrai prix de..." + procedure name  — 1.5s
// Scene 2 (45-180):   Price counter animation (min - max EUR) — 4.5s
// Scene 3 (180-360):  Breakdown items + hidden costs           — 6s
// Scene 4 (360-450):  Verdict + CTA                            — 3s
// ---------------------------------------------------------------------------

export const PriceReveal: React.FC<PriceRevealProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const s1 = interpolate(frame, [0, 5, 38, 48], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s2 = interpolate(frame, [42, 52, 172, 182], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s3 = interpolate(frame, [175, 185, 352, 362], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s4 = interpolate(frame, [355, 365, durationInFrames - 1, durationInFrames], [0, 1, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const bgStyle = frame < 45 ? "pink_violet" : frame < 180 ? "dark_bold" : frame < 360 ? "emerald_cyan" : "warm_amber";

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
            text="Le vrai prix de..."
            startFrame={3}
            style={{ fontSize: 48, fontWeight: 700, opacity: 0.8 }}
          />
          <TextReveal
            text={props.procedureName}
            startFrame={12}
            style={{ fontSize: 72, fontWeight: 900, letterSpacing: -2 }}
          />
        </AbsoluteFill>
      )}

      {/* ---- Scene 2: Price counter ---- */}
      {s2 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          {/* Price range */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
            }}
          >
            <AnimatedCounter
              from={0}
              to={props.priceMin}
              startFrame={50}
              endFrame={100}
              fontSize={120}
              color="#a3e635"
            />
            <span
              style={{
                fontSize: 60,
                fontWeight: 300,
                color: "white",
                opacity: interpolate(frame, [98, 108], [0, 0.6], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              —
            </span>
            <AnimatedCounter
              from={0}
              to={props.priceMax}
              startFrame={105}
              endFrame={150}
              fontSize={120}
              color="#a3e635"
            />
          </div>
          {/* Currency + context */}
          <TextReveal
            text={`${props.currency} par seance`}
            startFrame={145}
            style={{ fontSize: 36, fontWeight: 600, opacity: 0.7 }}
          />
          <TextReveal
            text="en France, 2024-2025"
            startFrame={155}
            style={{ fontSize: 28, fontWeight: 500, opacity: 0.5 }}
          />
        </AbsoluteFill>
      )}

      {/* ---- Scene 3: Breakdown + hidden costs ---- */}
      {s3 > 0 && (
        <AbsoluteFill
          style={{
            opacity: s3,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
            gap: 24,
          }}
        >
          <TextReveal
            text="Le vrai budget"
            startFrame={188}
            style={{ fontSize: 48, fontWeight: 900, marginBottom: 16 }}
          />

          {/* Breakdown items */}
          {props.breakdownItems.map((item, i) => (
            <BreakdownCard
              key={i}
              label={item.label}
              value={item.value}
              startFrame={210 + i * 30}
            />
          ))}

          {/* Hidden costs header */}
          <TextReveal
            text="Ce qu'on ne te dit pas"
            startFrame={300}
            style={{ fontSize: 36, fontWeight: 800, marginTop: 24, color: "#fcd34d" }}
          />

          {/* Hidden cost items */}
          {props.hiddenCosts.map((cost, i) => (
            <HiddenCostItem key={i} text={cost} startFrame={318 + i * 16} />
          ))}
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
            text="L'avis Big Sis"
            startFrame={365}
            style={{ fontSize: 36, fontWeight: 700, opacity: 0.7, marginBottom: 24 }}
          />
          <VerdictStamp text={props.verdictText} startFrame={378} />
          <CTA text={props.ctaText} startFrame={410} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Breakdown card
function BreakdownCard({ label, value, startFrame }: { label: string; value: string; startFrame: number }) {
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
        transform: `translateX(${(1 - progress) * 60}px)`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: "24px 32px",
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 600, color: "white" }}>{label}</span>
      <span style={{ fontSize: 30, fontWeight: 900, color: "#a3e635" }}>{value}</span>
    </div>
  );
}

// Hidden cost item
function HiddenCostItem({ text, startFrame }: { text: string; startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        opacity: progress,
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingLeft: 16,
      }}
    >
      <span style={{ fontSize: 24, color: "#fcd34d" }}>!</span>
      <span style={{ fontSize: 26, fontWeight: 500, color: "white", opacity: 0.85 }}>
        {text}
      </span>
    </div>
  );
}

// Verdict stamp with spring bounce
function VerdictStamp({ text, startFrame }: { text: string; startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 8, stiffness: 100, overshootClamping: false },
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        transform: `scale(${0.3 + progress * 0.7})`,
        opacity: progress,
        padding: "24px 48px",
        border: "4px solid rgba(255,255,255,0.3)",
        borderRadius: 24,
        background: "rgba(255,255,255,0.1)",
      }}
    >
      <span
        style={{
          fontSize: 56,
          fontWeight: 900,
          color: "white",
          letterSpacing: 2,
        }}
      >
        {text}
      </span>
    </div>
  );
}
