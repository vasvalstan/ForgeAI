"use client";

export function DiscoveryDropZone() {
  return (
    <div className="drop-zone-overlay">
      <div className="drop-zone-inner">
        <div className="mb-4">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00D9FF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: "0 auto" }}
          >
            <path d="M12 2v6M12 8l-3-3M12 8l3-3" />
            <path d="M4.93 10.93a10 10 0 1 0 14.14 0" />
            <circle cx="12" cy="16" r="2" />
          </svg>
        </div>
        <h3
          className="text-2xl font-bold mb-2 font-display"
          style={{
            backgroundImage: "linear-gradient(135deg, #00D9FF, #52F6E1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Drop to Explode
        </h3>
        <p style={{ color: "#94A3B8", fontSize: "14px", maxWidth: "280px" }}>
          Drop a <strong>.txt</strong>, <strong>.md</strong>, or <strong>.vtt</strong> transcript and
          the Discovery Agent will cluster it into spatial insights.
        </p>
      </div>
    </div>
  );
}
