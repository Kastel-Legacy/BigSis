import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

interface CTAProps {
  text?: string;
  startFrame: number;
}

export const CTA: React.FC<CTAProps> = ({
  text = "Lien en bio pour la fiche complete",
  startFrame,
}) => {
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
        position: "absolute",
        bottom: 120,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        opacity: progress,
        transform: `translateY(${(1 - progress) * 20}px)`,
      }}
    >
      <div
        style={{
          width: "80%",
          height: 1,
          background: "rgba(255,255,255,0.2)",
        }}
      />
      <span
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "white",
          opacity: 0.6,
        }}
      >
        {text}
      </span>
      <span
        style={{
          fontSize: 40,
          fontWeight: 900,
          color: "white",
        }}
      >
        @bigsis.app
      </span>
      <span
        style={{
          fontSize: 16,
          fontWeight: 400,
          color: "white",
          opacity: 0.4,
          marginTop: 8,
          maxWidth: "80%",
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        Information educative. Consultez un professionnel qualifie.
      </span>
    </div>
  );
};
