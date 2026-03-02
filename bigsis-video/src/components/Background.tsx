import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const GRADIENTS: Record<string, string[]> = {
  pink_violet: ["#db2777", "#9333ea", "#6d28d9"],
  emerald_cyan: ["#10b981", "#0d9488", "#0e7490"],
  dark_bold: ["#0a0a0f", "#1a1a2e", "#16213e"],
  warm_amber: ["#f59e0b", "#ea580c", "#dc2626"],
};

interface BackgroundProps {
  style: keyof typeof GRADIENTS;
}

export const Background: React.FC<BackgroundProps> = ({ style }) => {
  const frame = useCurrentFrame();
  const angle = interpolate(frame, [0, 300], [135, 155], {
    extrapolateRight: "clamp",
  });
  const colors = GRADIENTS[style] || GRADIENTS.dark_bold;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
      }}
    />
  );
};
