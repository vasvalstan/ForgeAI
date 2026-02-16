import {
  ShapeUtil,
  HTMLContainer,
  RecordProps,
  Rectangle2d,
  Geometry2d,
  T,
  TLResizeInfo,
  TLShape,
  resizeBox,
} from "tldraw";

// ─── Module Augmentation ────────────────────────────────────
// Register custom shapes with Tldraw's global type system

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    "sticky-note": {
      w: number;
      h: number;
      text: string;
      quote: string;
      category: string;
      sentiment: number;
      insightId: string;
      source: string; // JSON: { discoveryId, startOffset, endOffset }
    };
    "feature-card": {
      w: number;
      h: number;
      title: string;
      description: string;
      priority: string;
    };
    "risk-flag": {
      w: number;
      h: number;
      severity: string;
      reasoning: string;
      targetShapeId: string;
    };
  }
}

// ─── Types ──────────────────────────────────────────────────

type StickyNoteShape = TLShape<"sticky-note">;
type FeatureCardShape = TLShape<"feature-card">;
type RiskFlagShape = TLShape<"risk-flag">;

// ─── Color Helpers (dark-themed insight cards) ──────────────

type CategoryColor = {
  bg: string;
  border: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  label: string;
  labelColor: string;
  dotColor: string;
  text: string;
};
type PriorityColor = {
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  text: string;
  descText: string;
};
type SeverityColor = {
  bg: string;
  border: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  labelColor: string;
  dotColor: string;
  text: string;
};

const DEFAULT_CATEGORY: CategoryColor = {
  bg: "rgba(251, 191, 36, 0.1)",
  border: "rgba(253, 224, 71, 0.3)",
  iconBg: "rgba(251, 191, 36, 0.2)",
  iconBorder: "rgba(253, 224, 71, 0.3)",
  iconColor: "#FEF9C3",
  label: "Question",
  labelColor: "#FEF9C3",
  dotColor: "#FDE047",
  text: "#F1F5F9",
};

const CATEGORY_MAP: Record<string, CategoryColor> = {
  pain_point: {
    bg: "rgba(248, 113, 113, 0.1)",
    border: "rgba(248, 113, 113, 0.3)",
    iconBg: "rgba(239, 68, 68, 0.2)",
    iconBorder: "rgba(252, 165, 165, 0.3)",
    iconColor: "#FECACA",
    label: "Pain Point",
    labelColor: "#FECACA",
    dotColor: "#F87171",
    text: "#F1F5F9",
  },
  feature_request: {
    bg: "rgba(96, 165, 250, 0.1)",
    border: "rgba(96, 165, 250, 0.3)",
    iconBg: "rgba(59, 130, 246, 0.2)",
    iconBorder: "rgba(147, 197, 253, 0.3)",
    iconColor: "#BFDBFE",
    label: "Feature",
    labelColor: "#BFDBFE",
    dotColor: "#60A5FA",
    text: "#F1F5F9",
  },
  praise: {
    bg: "rgba(52, 211, 153, 0.1)",
    border: "rgba(52, 211, 153, 0.3)",
    iconBg: "rgba(16, 185, 129, 0.2)",
    iconBorder: "rgba(110, 231, 183, 0.3)",
    iconColor: "#A7F3D0",
    label: "Praise",
    labelColor: "#A7F3D0",
    dotColor: "#34D399",
    text: "#F1F5F9",
  },
  question: DEFAULT_CATEGORY,
};

function getCategoryColors(key: string): CategoryColor {
  return CATEGORY_MAP[key] ?? DEFAULT_CATEGORY;
}

const DEFAULT_PRIORITY: PriorityColor = {
  bg: "#FFFFFF",
  border: "rgba(255,255,255,0.1)",
  badgeBg: "#DBEAFE",
  badgeText: "#1E3A8A",
  badgeBorder: "#93C5FD",
  text: "#0F172A",
  descText: "#475569",
};

const PRIORITY_MAP: Record<string, PriorityColor> = {
  critical: {
    bg: "#FFFFFF",
    border: "rgba(255,255,255,0.1)",
    badgeBg: "#FEE2E2",
    badgeText: "#9F1239",
    badgeBorder: "#FCA5A5",
    text: "#0F172A",
    descText: "#475569",
  },
  high: {
    bg: "#FFFFFF",
    border: "rgba(255,255,255,0.1)",
    badgeBg: "#FEF3C7",
    badgeText: "#78350F",
    badgeBorder: "#FDE68A",
    text: "#0F172A",
    descText: "#475569",
  },
  medium: DEFAULT_PRIORITY,
  low: {
    bg: "#FFFFFF",
    border: "rgba(255,255,255,0.1)",
    badgeBg: "#F1F5F9",
    badgeText: "#475569",
    badgeBorder: "#CBD5E1",
    text: "#0F172A",
    descText: "#475569",
  },
};

function getPriorityColors(key: string): PriorityColor {
  return PRIORITY_MAP[key] ?? DEFAULT_PRIORITY;
}

const DEFAULT_SEVERITY: SeverityColor = {
  bg: "rgba(96, 165, 250, 0.1)",
  border: "rgba(96, 165, 250, 0.3)",
  iconBg: "rgba(59, 130, 246, 0.2)",
  iconBorder: "rgba(147, 197, 253, 0.3)",
  iconColor: "#BFDBFE",
  labelColor: "#BFDBFE",
  dotColor: "#60A5FA",
  text: "#F1F5F9",
};

const SEVERITY_MAP: Record<string, SeverityColor> = {
  critical: {
    bg: "rgba(248, 113, 113, 0.1)",
    border: "rgba(248, 113, 113, 0.3)",
    iconBg: "rgba(239, 68, 68, 0.2)",
    iconBorder: "rgba(252, 165, 165, 0.3)",
    iconColor: "#FECACA",
    labelColor: "#FECACA",
    dotColor: "#F87171",
    text: "#F1F5F9",
  },
  high: {
    bg: "rgba(251, 191, 36, 0.1)",
    border: "rgba(251, 191, 36, 0.35)",
    iconBg: "rgba(245, 158, 11, 0.2)",
    iconBorder: "rgba(252, 211, 77, 0.3)",
    iconColor: "#FDE68A",
    labelColor: "#FDE68A",
    dotColor: "#FBBF24",
    text: "#F1F5F9",
  },
  medium: DEFAULT_SEVERITY,
  low: {
    bg: "rgba(148, 163, 184, 0.1)",
    border: "rgba(148, 163, 184, 0.3)",
    iconBg: "rgba(148, 163, 184, 0.15)",
    iconBorder: "rgba(203, 213, 225, 0.3)",
    iconColor: "#E2E8F0",
    labelColor: "#E2E8F0",
    dotColor: "#94A3B8",
    text: "#F1F5F9",
  },
};

function getSeverityColors(key: string): SeverityColor {
  return SEVERITY_MAP[key] ?? DEFAULT_SEVERITY;
}

// ─── Sticky Note Shape Util (Dark-themed Insight Card) ──────

export class StickyNoteShapeUtil extends ShapeUtil<StickyNoteShape> {
  static override type = "sticky-note" as const;

  static override props: RecordProps<StickyNoteShape> = {
    w: T.number,
    h: T.number,
    text: T.string,
    quote: T.string,
    category: T.string,
    sentiment: T.number,
    insightId: T.string,
    source: T.string,
  };

  getDefaultProps(): StickyNoteShape["props"] {
    return {
      w: 240,
      h: 200,
      text: "",
      quote: "",
      category: "pain_point",
      sentiment: 0,
      insightId: "",
      source: "",
    };
  }

  getGeometry(shape: StickyNoteShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override canResize() { return true; }
  override canEdit() { return true; }

  override onResize(shape: any, info: TLResizeInfo<any>) {
    return resizeBox(shape, info);
  }

  component(shape: StickyNoteShape) {
    const colors = getCategoryColors(shape.props.category);

    return (
      <HTMLContainer
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "all",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: "16px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontFamily: "Satoshi, Inter, sans-serif",
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 18px 50px rgba(0,0,0,0.55)",
            transition: "box-shadow 150ms ease",
          }}
        >
          {/* Header row: icon badge + label + dot */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "12px",
                  background: colors.iconBg,
                  border: `1px solid ${colors.iconBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: colors.iconColor,
                }}
              >
                {shape.props.category === "pain_point"
                  ? "⚠"
                  : shape.props.category === "feature_request"
                    ? "★"
                    : shape.props.category === "praise"
                      ? "✦"
                      : "?"}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: colors.labelColor,
                }}
              >
                {colors.label}
              </span>
            </div>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: colors.dotColor,
              }}
            />
          </div>

          {/* Body text */}
          <div
            style={{
              flex: 1,
              fontSize: "14px",
              lineHeight: "1.45",
              color: colors.text,
              fontWeight: 400,
              overflow: "hidden",
            }}
          >
            {shape.props.text}
          </div>

          {/* Quote block */}
          {shape.props.quote && (
            <div
              onClick={() => {
                if (shape.props.source) {
                  try {
                    const sourceData = JSON.parse(shape.props.source);
                    globalThis.dispatchEvent(
                      new CustomEvent("forge:open-source", {
                        detail: {
                          discoveryId: sourceData.discoveryId,
                          startOffset: sourceData.startOffset,
                          endOffset: sourceData.endOffset,
                        },
                      })
                    );
                  } catch {
                    // Invalid source JSON — ignore
                  }
                }
              }}
              style={{
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "8px 12px",
                fontSize: "12px",
                fontStyle: "italic",
                color: "#CBD5E1",
                lineHeight: "1.4",
                cursor: shape.props.source ? "pointer" : "default",
              }}
              title={shape.props.source ? "Click to view source transcript" : undefined}
            >
              &ldquo;{shape.props.quote}&rdquo;
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: StickyNoteShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />;
  }
}

// ─── Feature Card (Recommendation Card — Light Background) ──

export class FeatureCardShapeUtil extends ShapeUtil<FeatureCardShape> {
  static override type = "feature-card" as const;

  static override props: RecordProps<FeatureCardShape> = {
    w: T.number,
    h: T.number,
    title: T.string,
    description: T.string,
    priority: T.string,
  };

  getDefaultProps(): FeatureCardShape["props"] {
    return {
      w: 280,
      h: 180,
      title: "New Feature",
      description: "",
      priority: "medium",
    };
  }

  getGeometry(shape: FeatureCardShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override canResize() { return true; }
  override canEdit() { return true; }

  override onResize(shape: any, info: TLResizeInfo<any>) {
    return resizeBox(shape, info);
  }

  component(shape: FeatureCardShape) {
    const colors = getPriorityColors(shape.props.priority);

    return (
      <HTMLContainer style={{ width: "100%", height: "100%", pointerEvents: "all" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: "16px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontFamily: "Satoshi, Inter, sans-serif",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.16), 0 18px 50px rgba(0,0,0,0.55)",
          }}
        >
          {/* Priority badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                padding: "4px 10px",
                borderRadius: "9999px",
                background: colors.badgeBg,
                color: colors.badgeText,
                border: `1px solid ${colors.badgeBorder}`,
              }}
            >
              {shape.props.priority}
            </span>
            <span style={{ fontSize: "16px", color: "#94A3B8" }}>📌</span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: colors.text,
              lineHeight: 1.3,
              fontFamily: "Clash Grotesk, Outfit, sans-serif",
            }}
          >
            {shape.props.title}
          </div>

          {/* Description */}
          <div
            style={{
              flex: 1,
              fontSize: "14px",
              color: colors.descText,
              lineHeight: 1.5,
              overflow: "hidden",
            }}
          >
            {shape.props.description}
          </div>

          {/* Action row */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                borderRadius: "12px",
                background: "#0F172A",
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#FFFFFF",
              }}
            >
              ✓ Convert to ticket
            </span>
          </div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: FeatureCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />;
  }
}

// ─── Risk Flag Shape Util (Dark-themed) ─────────────────────

export class RiskFlagShapeUtil extends ShapeUtil<RiskFlagShape> {
  static override type = "risk-flag" as const;

  static override props: RecordProps<RiskFlagShape> = {
    w: T.number,
    h: T.number,
    severity: T.string,
    reasoning: T.string,
    targetShapeId: T.string,
  };

  getDefaultProps(): RiskFlagShape["props"] {
    return {
      w: 240,
      h: 160,
      severity: "medium",
      reasoning: "",
      targetShapeId: "",
    };
  }

  getGeometry(shape: RiskFlagShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override canResize() { return true; }
  override canEdit() { return true; }

  override onResize(shape: any, info: TLResizeInfo<any>) {
    return resizeBox(shape, info);
  }

  component(shape: RiskFlagShape) {
    const colors = getSeverityColors(shape.props.severity);

    return (
      <HTMLContainer style={{ width: "100%", height: "100%", pointerEvents: "all" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: "16px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontFamily: "Satoshi, Inter, sans-serif",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 18px 50px rgba(0,0,0,0.55)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "12px",
                  background: colors.iconBg,
                  border: `1px solid ${colors.iconBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: colors.iconColor,
                }}
              >
                {shape.props.severity === "critical"
                  ? "🚨"
                  : shape.props.severity === "high"
                    ? "⚠"
                    : "🛡"}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: colors.labelColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {shape.props.severity} Risk
              </span>
            </div>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: colors.dotColor,
              }}
            />
          </div>

          {/* Reasoning */}
          <div
            style={{
              flex: 1,
              fontSize: "14px",
              lineHeight: "1.45",
              color: colors.text,
              overflow: "hidden",
            }}
          >
            {shape.props.reasoning}
          </div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: RiskFlagShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />;
  }
}
