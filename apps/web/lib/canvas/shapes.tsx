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
import type { Icon } from "@phosphor-icons/react";
import {
  InfoIcon,
  PushPinIcon,
  QuestionIcon,
  ShieldWarningIcon,
  SirenIcon,
  SparkleIcon,
  StarIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";

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

// ─── Color Helpers (high-utility light cards) ───────────────

const CARD_BASE = {
  bg: "#FFFFFF",
  border: "rgba(15, 23, 42, 0.12)",
  borderSubtle: "rgba(15, 23, 42, 0.08)",
  iconBg: "rgba(15, 23, 42, 0.04)",
  iconBorder: "rgba(15, 23, 42, 0.10)",
  text: "#0F172A",
  textSecondary: "#475569",
  textDim: "#64748B",
  shadow:
    "0 1px 2px rgba(15, 23, 42, 0.06), 0 12px 32px rgba(15, 23, 42, 0.12)",
};

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
  accent: string;
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
  bg: CARD_BASE.bg,
  border: CARD_BASE.border,
  iconBg: CARD_BASE.iconBg,
  iconBorder: CARD_BASE.iconBorder,
  iconColor: "#F59E0B",
  label: "Question",
  labelColor: "#334155",
  dotColor: "#F59E0B",
  text: CARD_BASE.text,
};

const CATEGORY_MAP: Record<string, CategoryColor> = {
  pain_point: {
    bg: CARD_BASE.bg,
    border: CARD_BASE.border,
    iconBg: CARD_BASE.iconBg,
    iconBorder: CARD_BASE.iconBorder,
    iconColor: "#EF4444",
    label: "Pain Point",
    labelColor: "#334155",
    dotColor: "#EF4444",
    text: CARD_BASE.text,
  },
  feature_request: {
    bg: CARD_BASE.bg,
    border: CARD_BASE.border,
    iconBg: CARD_BASE.iconBg,
    iconBorder: CARD_BASE.iconBorder,
    iconColor: "#2563EB",
    label: "Feature",
    labelColor: "#334155",
    dotColor: "#2563EB",
    text: CARD_BASE.text,
  },
  praise: {
    bg: CARD_BASE.bg,
    border: CARD_BASE.border,
    iconBg: CARD_BASE.iconBg,
    iconBorder: CARD_BASE.iconBorder,
    iconColor: "#16A34A",
    label: "Praise",
    labelColor: "#334155",
    dotColor: "#16A34A",
    text: CARD_BASE.text,
  },
  question: DEFAULT_CATEGORY,
};

function getCategoryColors(key: string): CategoryColor {
  return CATEGORY_MAP[key] ?? DEFAULT_CATEGORY;
}

const CATEGORY_ICON_MAP: Record<string, Icon> = {
  pain_point: WarningCircleIcon,
  feature_request: StarIcon,
  praise: SparkleIcon,
  question: QuestionIcon,
};

const DEFAULT_PRIORITY: PriorityColor = {
  bg: CARD_BASE.bg,
  border: CARD_BASE.border,
  accent: "#2563EB",
  badgeBg: "rgba(37, 99, 235, 0.10)",
  badgeText: "#1D4ED8",
  badgeBorder: "rgba(37, 99, 235, 0.22)",
  text: CARD_BASE.text,
  descText: CARD_BASE.textSecondary,
};

const PRIORITY_MAP: Record<string, PriorityColor> = {
  critical: {
    bg: CARD_BASE.bg,
    border: CARD_BASE.border,
    accent: "#EF4444",
    badgeBg: "rgba(239, 68, 68, 0.10)",
    badgeText: "#B91C1C",
    badgeBorder: "rgba(239, 68, 68, 0.22)",
    text: CARD_BASE.text,
    descText: CARD_BASE.textSecondary,
  },
  high: {
    bg: CARD_BASE.bg,
    border: CARD_BASE.border,
    accent: "#F59E0B",
    badgeBg: "rgba(245, 158, 11, 0.14)",
    badgeText: "#92400E",
    badgeBorder: "rgba(245, 158, 11, 0.24)",
    text: CARD_BASE.text,
    descText: CARD_BASE.textSecondary,
  },
  medium: DEFAULT_PRIORITY,
  low: {
    bg: CARD_BASE.bg,
    border: CARD_BASE.border,
    accent: "#94A3B8",
    badgeBg: "rgba(148, 163, 184, 0.14)",
    badgeText: "#475569",
    badgeBorder: "rgba(148, 163, 184, 0.28)",
    text: CARD_BASE.text,
    descText: CARD_BASE.textSecondary,
  },
};

function getPriorityColors(key: string): PriorityColor {
  return PRIORITY_MAP[key] ?? DEFAULT_PRIORITY;
}

const DEFAULT_SEVERITY: SeverityColor = {
  bg: CARD_BASE.bg,
  border: CARD_BASE.border,
  iconBg: CARD_BASE.iconBg,
  iconBorder: CARD_BASE.iconBorder,
  iconColor: "#2563EB",
  labelColor: "#334155",
  dotColor: "#2563EB",
  text: CARD_BASE.text,
};

const SEVERITY_MAP: Record<string, SeverityColor> = {
  critical: {
    bg: CARD_BASE.bg,
    border: CARD_BASE.border,
    iconBg: CARD_BASE.iconBg,
    iconBorder: CARD_BASE.iconBorder,
    iconColor: "#EF4444",
    labelColor: "#334155",
    dotColor: "#EF4444",
    text: CARD_BASE.text,
  },
  high: {
    bg: CARD_BASE.bg,
    border: CARD_BASE.border,
    iconBg: CARD_BASE.iconBg,
    iconBorder: CARD_BASE.iconBorder,
    iconColor: "#F59E0B",
    labelColor: "#334155",
    dotColor: "#F59E0B",
    text: CARD_BASE.text,
  },
  medium: DEFAULT_SEVERITY,
  low: {
    bg: CARD_BASE.bg,
    border: CARD_BASE.border,
    iconBg: CARD_BASE.iconBg,
    iconBorder: CARD_BASE.iconBorder,
    iconColor: "#64748B",
    labelColor: "#334155",
    dotColor: "#94A3B8",
    text: CARD_BASE.text,
  },
};

function getSeverityColors(key: string): SeverityColor {
  return SEVERITY_MAP[key] ?? DEFAULT_SEVERITY;
}

const SEVERITY_ICON_MAP: Record<string, Icon> = {
  critical: SirenIcon,
  high: WarningIcon,
  medium: ShieldWarningIcon,
  low: InfoIcon,
};

// ─── Sticky Note Shape Util (White card + status dot) ───────

export class StickyNoteShapeUtil extends ShapeUtil<StickyNoteShape> {
  static override readonly type = "sticky-note" as const;

  static override readonly props: RecordProps<StickyNoteShape> = {
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
    const CategoryIcon = CATEGORY_ICON_MAP[shape.props.category] ?? QuestionIcon;

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
            borderTop: `3px solid ${colors.dotColor}`,
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontFamily: "var(--font-sans)",
            overflow: "hidden",
            boxShadow: CARD_BASE.shadow,
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
                  color: colors.iconColor,
                }}
              >
                <CategoryIcon size={16} />
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: colors.labelColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
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
              fontSize: "13px",
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
            <button
              type="button"
              disabled={!shape.props.source}
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
                background: "rgba(15, 23, 42, 0.03)",
                border: `1px solid ${CARD_BASE.border}`,
                padding: "8px 12px",
                fontSize: "12px",
                color: CARD_BASE.textSecondary,
                lineHeight: "1.4",
                cursor: shape.props.source ? "pointer" : "default",
                textAlign: "left",
                width: "100%",
                opacity: shape.props.source ? 1 : 0.7,
              }}
              title={shape.props.source ? "Click to view source transcript" : undefined}
            >
              &ldquo;{shape.props.quote}&rdquo;
            </button>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: StickyNoteShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}

// ─── Feature Card (Recommendation Card — Light Background) ──

export class FeatureCardShapeUtil extends ShapeUtil<FeatureCardShape> {
  static override readonly type = "feature-card" as const;

  static override readonly props: RecordProps<FeatureCardShape> = {
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
            borderTop: `3px solid ${colors.accent}`,
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontFamily: "var(--font-sans)",
            boxShadow: CARD_BASE.shadow,
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
            <span style={{ color: CARD_BASE.textDim }}>
              <PushPinIcon size={16} />
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: colors.text,
              lineHeight: 1.3,
              fontFamily: "var(--font-sans)",
            }}
          >
            {shape.props.title}
          </div>

          {/* Description */}
          <div
            style={{
              flex: 1,
              fontSize: "13px",
              color: colors.descText,
              lineHeight: 1.5,
              overflow: "hidden",
            }}
          >
            {shape.props.description}
          </div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: FeatureCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}

// ─── Risk Flag Shape Util (White card + severity dot) ───────

export class RiskFlagShapeUtil extends ShapeUtil<RiskFlagShape> {
  static override readonly type = "risk-flag" as const;

  static override readonly props: RecordProps<RiskFlagShape> = {
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
    const SeverityIcon = SEVERITY_ICON_MAP[shape.props.severity] ?? ShieldWarningIcon;

    return (
      <HTMLContainer style={{ width: "100%", height: "100%", pointerEvents: "all" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderTop: `3px solid ${colors.dotColor}`,
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontFamily: "var(--font-sans)",
            boxShadow: CARD_BASE.shadow,
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
                  color: colors.iconColor,
                }}
              >
                <SeverityIcon size={16} />
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: colors.labelColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
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
              fontSize: "13px",
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
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}
