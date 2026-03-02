import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

export const Watermark: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 60,
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(8px)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "white",
            letterSpacing: -1,
          }}
        >
          BS
        </span>
      </div>
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "white",
          opacity: 0.8,
          letterSpacing: 3,
        }}
      >
        BIG SIS
      </span>
    </div>
  );
};
