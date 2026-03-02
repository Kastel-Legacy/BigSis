import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

interface StampAnimationProps {
  isTrue: boolean;
  startFrame: number;
}

export const StampAnimation: React.FC<StampAnimationProps> = ({
  isTrue,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 8, stiffness: 100, overshootClamping: false },
  });

  if (frame < startFrame) return null;

  const scale = 0.3 + progress * 0.7;
  const rotation = (1 - progress) * -15;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        opacity: progress,
      }}
    >
      {/* Stamp circle */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: `8px solid ${isTrue ? "#6ee7b7" : "#fca5a5"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isTrue
            ? "rgba(110, 231, 183, 0.15)"
            : "rgba(252, 165, 165, 0.15)",
        }}
      >
        <span
          style={{
            fontSize: 100,
            lineHeight: 1,
          }}
        >
          {isTrue ? "\u2713" : "\u2717"}
        </span>
      </div>
      {/* Label */}
      <span
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: isTrue ? "#6ee7b7" : "#fca5a5",
          letterSpacing: 6,
        }}
      >
        {isTrue ? "VRAI" : "FAUX"}
      </span>
    </div>
  );
};
