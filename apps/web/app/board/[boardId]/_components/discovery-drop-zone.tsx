"use client";

import { CloudArrowUp } from "@phosphor-icons/react";

export function DiscoveryDropZone() {
  return (
    <div className="drop-zone-overlay">
      <div className="drop-zone-inner">
        <div className="mb-4 flex justify-center">
          <CloudArrowUp size={56} style={{ color: "var(--color-brand-500)" }} />
        </div>
        <h3
          className="text-2xl font-bold mb-2 font-display"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--color-brand-500), var(--color-primary-500))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Drop to Explode
        </h3>
        <p style={{ color: "#64748B", fontSize: "14px", maxWidth: "280px" }}>
          Drop a <strong>.txt</strong>, <strong>.md</strong>, or <strong>.vtt</strong> transcript and
          the Discovery Agent will cluster it into spatial insights.
        </p>
      </div>
    </div>
  );
}
