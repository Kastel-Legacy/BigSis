import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface AnimatedCounterProps {
  from: number;
  to: number;
  startFrame: number;
  endFrame: number;
  suffix?: string;
  fontSize?: number;
  decimals?: number;
  color?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  from,
  to,
  startFrame,
  endFrame,
  suffix = "",
  fontSize = 200,
  decimals = 0,
  color = "white",
}) => {
  const frame = useCurrentFrame();

  const value = interpolate(frame, [startFrame, endFrame], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value);

  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "center",
        gap: 8,
        opacity,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 900,
          color,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {display}
      </span>
      {suffix && (
        <span
          style={{
            fontSize: fontSize * 0.35,
            fontWeight: 700,
            color,
            opacity: 0.7,
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
};
