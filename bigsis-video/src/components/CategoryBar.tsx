import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface CategoryBarProps {
  label: string;
  score: number;
  maxScore: number;
  color: string;
  startFrame: number;
  endFrame: number;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  label,
  score,
  maxScore,
  color,
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const width = (score / maxScore) * 100 * progress;
  const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ marginBottom: 40, opacity }}>
      {/* Label + score */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 32, fontWeight: 700, color: "white" }}>
          {label}
        </span>
        <span style={{ fontSize: 36, fontWeight: 900, color }}>
          {score.toFixed(1)}/10
        </span>
      </div>
      {/* Bar background */}
      <div
        style={{
          height: 20,
          borderRadius: 10,
          background: "rgba(255,255,255,0.15)",
          overflow: "hidden",
        }}
      >
        {/* Bar fill */}
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            borderRadius: 10,
            background: color,
            transition: "none",
          }}
        />
      </div>
    </div>
  );
};
