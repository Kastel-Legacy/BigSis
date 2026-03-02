import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

interface TextRevealProps {
  text: string;
  startFrame: number;
  style?: React.CSSProperties;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  startFrame,
  style = {},
}) => {
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
        transform: `scale(${0.92 + 0.08 * progress})`,
        color: "white",
        fontWeight: 800,
        textAlign: "center",
        ...style,
      }}
    >
      {text}
    </div>
  );
};
