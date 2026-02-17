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
import type { MouseEvent } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  ChatCircleDotsIcon,
  InfoIcon,
  PencilSimpleIcon,
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
      comments?: string; // JSON array of inline comments
    };
    "feature-card": {
      w: number;
      h: number;
      title: string;
      description: string;
      priority: string;
      comments?: string; // JSON array of inline comments
    };
    "risk-flag": {
      w: number;
      h: number;
      severity: string;
      reasoning: string;
      targetShapeId: string;
      comments?: string; // JSON array of inline comments
    };
    "comment": {
      w: number;
      h: number;
      text: string;
      author: string;
      authorColor: string;
      targetShapeId: string;
    };
  }
}

// ─── Types ──────────────────────────────────────────────────

type StickyNoteShape = TLShape<"sticky-note">;
type FeatureCardShape = TLShape<"feature-card">;
type RiskFlagShape = TLShape<"risk-flag">;
type CommentShape = TLShape<"comment">;
type InlineComment = {
  id: string;
  text: string;
  author: string;
  authorColor: string;
};

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

type SourcePayload = {
  discoveryId: string;
  startOffset: number;
  endOffset: number;
};

function parseSourcePayload(source: string): SourcePayload | null {
  if (!source) return null;
  try {
    const parsed = JSON.parse(source) as {
      discoveryId?: unknown;
      startOffset?: unknown;
      endOffset?: unknown;
    };
    if (typeof parsed.discoveryId !== "string" || !parsed.discoveryId) {
      return null;
    }
    const start =
      typeof parsed.startOffset === "number" && Number.isFinite(parsed.startOffset)
        ? Math.max(0, Math.floor(parsed.startOffset))
        : 0;
    const end =
      typeof parsed.endOffset === "number" && Number.isFinite(parsed.endOffset)
        ? Math.max(start, Math.floor(parsed.endOffset))
        : start;
    return {
      discoveryId: parsed.discoveryId,
      startOffset: start,
      endOffset: end,
    };
  } catch {
    return null;
  }
}

function parseInlineComments(raw: string): InlineComment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.text === "string")
      .map((c) => ({
        id: typeof c.id === "string" ? c.id : `c-${Date.now()}`,
        text: String(c.text),
        author: typeof c.author === "string" && c.author ? c.author : "Anonymous",
        authorColor:
          typeof c.authorColor === "string" && c.authorColor ? c.authorColor : "#7C3AED",
      }));
  } catch {
    return [];
  }
}

function promptForTextUpdate(currentValue: string, title: string): string | null {
  const next = globalThis.prompt(title, currentValue);
  if (next === null) return null;
  return next.trim();
}

type ShapeEditEventDetail = {
  shapeId: string;
  shapeType: string;
  mode: "insight" | "feature" | "risk" | "comment";
  value: string;
  anchorX: number;
  anchorY: number;
};

type ShapeCommentEventDetail = {
  shapeId: string;
  shapeType: string;
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
};

function emitOpenShapeEditor(
  e: MouseEvent<HTMLButtonElement>,
  detail: Omit<ShapeEditEventDetail, "anchorX" | "anchorY">
) {
  const rect = e.currentTarget.getBoundingClientRect();
  globalThis.dispatchEvent(
    new CustomEvent<ShapeEditEventDetail>("forge:open-shape-editor", {
      detail: {
        ...detail,
        anchorX: rect.right + 10,
        anchorY: rect.top,
      },
    })
  );
}

function emitAddShapeComment(
  e: MouseEvent<HTMLButtonElement>,
  detail: Omit<ShapeCommentEventDetail, "anchorX" | "anchorY">
) {
  const rect = e.currentTarget.getBoundingClientRect();
  globalThis.dispatchEvent(
    new CustomEvent<ShapeCommentEventDetail>("forge:add-shape-comment", {
      detail: {
        ...detail,
        anchorX: rect.right + 10,
        anchorY: rect.top,
      },
    })
  );
}

function EditChip({
  onClick,
  title = "Edit",
}: Readonly<{
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
}>) {
  return (
    <button
      type="button"
      title={title}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      style={{
        width: "22px",
        height: "22px",
        borderRadius: "8px",
        border: `1px solid ${CARD_BASE.borderSubtle}`,
        background: "rgba(15, 23, 42, 0.03)",
        color: CARD_BASE.textDim,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <PencilSimpleIcon size={12} />
    </button>
  );
}

function CommentChip({
  onClick,
  title = "Add comment",
}: Readonly<{
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
}>) {
  return (
    <button
      type="button"
      title={title}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      style={{
        width: "22px",
        height: "22px",
        borderRadius: "8px",
        border: `1px solid ${CARD_BASE.borderSubtle}`,
        background: "rgba(15, 23, 42, 0.03)",
        color: CARD_BASE.textDim,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <ChatCircleDotsIcon size={12} />
    </button>
  );
}

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
    comments: T.optional(T.string),
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
      comments: "[]",
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
    const sourcePayload = parseSourcePayload(shape.props.source);
    const inlineComments = parseInlineComments(shape.props.comments ?? "[]");
    const editInsightText = () => {
      const next = promptForTextUpdate(shape.props.text, "Edit insight");
      if (next === null) return;
      this.editor.updateShape({
        id: shape.id,
        type: shape.type,
        props: { ...shape.props, text: next },
      });
    };

    return (
      <HTMLContainer
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "all",
        }}
      >
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            editInsightText();
          }}
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: colors.dotColor,
                }}
              />
              <CommentChip
                title="Comment on this insight"
                onClick={(e) =>
                  emitAddShapeComment(e, {
                    shapeId: shape.id,
                    shapeType: shape.type,
                    x: shape.x,
                    y: shape.y,
                    w: shape.props.w,
                    h: shape.props.h,
                  })
                }
              />
              <EditChip
                title="Edit insight text"
                onClick={(e) =>
                  emitOpenShapeEditor(e, {
                    shapeId: shape.id,
                    shapeType: shape.type,
                    mode: "insight",
                    value: shape.props.text,
                  })
                }
              />
            </div>
          </div>

          {/* Body text */}
          <div
            onDoubleClickCapture={(e) => {
              // Capture on the text node itself so Tldraw selection handling
              // does not swallow the edit interaction.
              e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              editInsightText();
            }}
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
            <div
              style={{
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.03)",
                border: `1px solid ${CARD_BASE.border}`,
                padding: "8px 12px",
                fontSize: "12px",
                color: CARD_BASE.textSecondary,
                lineHeight: "1.4",
                textAlign: "left",
                width: "100%",
              }}
            >
              &ldquo;{shape.props.quote}&rdquo;
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  disabled={!sourcePayload}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!sourcePayload) return;
                    globalThis.dispatchEvent(
                      new CustomEvent("forge:open-source", {
                        detail: {
                          discoveryId: sourcePayload.discoveryId,
                          startOffset: sourcePayload.startOffset,
                          endOffset: sourcePayload.endOffset,
                        },
                      })
                    );
                  }}
                  style={{
                    fontSize: "11px",
                    color: sourcePayload ? "#1D4ED8" : CARD_BASE.textDim,
                    border: "none",
                    background: "transparent",
                    cursor: sourcePayload ? "pointer" : "default",
                    padding: 0,
                  }}
                >
                  View source
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) =>
                    emitAddShapeComment(e, {
                      shapeId: shape.id,
                      shapeType: shape.type,
                      x: shape.x,
                      y: shape.y,
                      w: shape.props.w,
                      h: shape.props.h,
                    })
                  }
                  style={{
                    fontSize: "11px",
                    color: "#1D4ED8",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  Add comment below
                </button>
              </div>
            </div>
          )}

          {inlineComments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {inlineComments.slice(-2).map((c) => (
                <div
                  key={c.id}
                  style={{
                    borderRadius: "10px",
                    border: `1px solid ${CARD_BASE.borderSubtle}`,
                    background: "rgba(15, 23, 42, 0.02)",
                    padding: "6px 8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: c.authorColor,
                      marginBottom: "2px",
                    }}
                  >
                    {c.author}
                  </div>
                  <div style={{ fontSize: "11px", color: CARD_BASE.textSecondary, lineHeight: 1.35 }}>
                    {c.text}
                  </div>
                </div>
              ))}
              {inlineComments.length > 2 && (
                <div style={{ fontSize: "10px", color: CARD_BASE.textDim }}>
                  +{inlineComments.length - 2} more comments
                </div>
              )}
            </div>
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
    comments: T.optional(T.string),
  };

  getDefaultProps(): FeatureCardShape["props"] {
    return {
      w: 280,
      h: 180,
      title: "New Feature",
      description: "",
      priority: "medium",
      comments: "[]",
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
    const inlineComments = parseInlineComments(shape.props.comments ?? "[]");
    const editFeatureCard = () => {
      const initial = `${shape.props.title}\n\n${shape.props.description}`;
      const updated = promptForTextUpdate(initial, "Edit feature card (title + blank line + description)");
      if (updated === null) return;
      const [nextTitle, ...rest] = updated.split("\n");
      const nextDescription = rest.join("\n").trim();
      this.editor.updateShape({
        id: shape.id,
        type: shape.type,
        props: {
          ...shape.props,
          title: (nextTitle || shape.props.title).trim(),
          description: nextDescription,
        },
      });
    };

    return (
      <HTMLContainer style={{ width: "100%", height: "100%", pointerEvents: "all" }}>
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            editFeatureCard();
          }}
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: CARD_BASE.textDim }}>
                <PushPinIcon size={16} />
              </span>
              <CommentChip
                title="Comment on this feature"
                onClick={(e) =>
                  emitAddShapeComment(e, {
                    shapeId: shape.id,
                    shapeType: shape.type,
                    x: shape.x,
                    y: shape.y,
                    w: shape.props.w,
                    h: shape.props.h,
                  })
                }
              />
              <EditChip
                title="Edit feature card"
                onClick={(e) =>
                  emitOpenShapeEditor(e, {
                    shapeId: shape.id,
                    shapeType: shape.type,
                    mode: "feature",
                    value: `${shape.props.title}\n\n${shape.props.description}`,
                  })
                }
              />
            </div>
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

          {inlineComments.length > 0 && (
            <div
              style={{
                borderTop: `1px solid ${CARD_BASE.borderSubtle}`,
                paddingTop: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              {inlineComments.slice(-2).map((c) => (
                <div key={c.id} style={{ fontSize: "11px", color: colors.descText, lineHeight: 1.35 }}>
                  <span style={{ color: c.authorColor, fontWeight: 600 }}>{c.author}: </span>
                  {c.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: FeatureCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}

// ─── Comment Shape Util (Lightweight pinned discussion bubble) ───────

export class CommentShapeUtil extends ShapeUtil<CommentShape> {
  static override readonly type = "comment" as const;

  static override readonly props: RecordProps<CommentShape> = {
    w: T.number,
    h: T.number,
    text: T.string,
    author: T.string,
    authorColor: T.string,
    targetShapeId: T.string,
  };

  getDefaultProps(): CommentShape["props"] {
    return {
      w: 220,
      h: 120,
      text: "",
      author: "Anonymous",
      authorColor: "#7C3AED",
      targetShapeId: "",
    };
  }

  getGeometry(shape: CommentShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override canEdit() { return true; }
  override canResize() { return true; }

  override onResize(shape: any, info: TLResizeInfo<any>) {
    return resizeBox(shape, info);
  }

  component(shape: CommentShape) {
    const editComment = () => {
      const next = promptForTextUpdate(shape.props.text, "Edit comment");
      if (next === null) return;
      this.editor.updateShape({
        id: shape.id,
        type: shape.type,
        props: { ...shape.props, text: next },
      });
    };

    return (
      <HTMLContainer style={{ width: "100%", height: "100%", pointerEvents: "all" }}>
        <div
          className="glass animate-fade-up"
          onDoubleClick={(e) => {
            e.stopPropagation();
            editComment();
          }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "12px",
            border: `1px solid ${CARD_BASE.border}`,
            borderLeft: `4px solid ${shape.props.authorColor || "#7C3AED"}`,
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ChatCircleDotsIcon size={14} style={{ color: shape.props.authorColor || "#7C3AED" }} />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {shape.props.author || "Anonymous"}
              </span>
            </div>
            <EditChip
              title="Edit comment"
              onClick={(e) =>
                emitOpenShapeEditor(e, {
                  shapeId: shape.id,
                  shapeType: shape.type,
                  mode: "comment",
                  value: shape.props.text,
                })
              }
            />
          </div>
          <div
            style={{
              flex: 1,
              fontSize: "12px",
              color: "#0F172A",
              lineHeight: "1.4",
              overflow: "hidden",
            }}
          >
            {shape.props.text || "Type feedback..."}
          </div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: CommentShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />;
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
    comments: T.optional(T.string),
  };

  getDefaultProps(): RiskFlagShape["props"] {
    return {
      w: 240,
      h: 160,
      severity: "medium",
      reasoning: "",
      targetShapeId: "",
      comments: "[]",
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
    const meta = (shape.meta ?? {}) as {
      entryAnimation?: unknown;
      entryAnimationAt?: unknown;
      entryAnimationDelayMs?: unknown;
    };
    const hasRecentEntryAnimation =
      meta.entryAnimation === "fade-up" &&
      typeof meta.entryAnimationAt === "number" &&
      Date.now() - meta.entryAnimationAt < 4000;
    const entryDelayMs =
      typeof meta.entryAnimationDelayMs === "number"
        ? Math.max(0, Math.min(600, meta.entryAnimationDelayMs))
        : 0;
    const inlineComments = parseInlineComments(shape.props.comments ?? "[]");
    const editRiskReasoning = () => {
      const next = promptForTextUpdate(shape.props.reasoning, "Edit risk reasoning");
      if (next === null) return;
      this.editor.updateShape({
        id: shape.id,
        type: shape.type,
        props: { ...shape.props, reasoning: next },
      });
    };

    return (
      <HTMLContainer style={{ width: "100%", height: "100%", pointerEvents: "all" }}>
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            editRiskReasoning();
          }}
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
            animation: hasRecentEntryAnimation
              ? `fade-up 300ms ease-out ${entryDelayMs}ms both`
              : undefined,
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: colors.dotColor,
                }}
              />
              <CommentChip
                title="Comment on this risk"
                onClick={(e) =>
                  emitAddShapeComment(e, {
                    shapeId: shape.id,
                    shapeType: shape.type,
                    x: shape.x,
                    y: shape.y,
                    w: shape.props.w,
                    h: shape.props.h,
                  })
                }
              />
              <EditChip
                title="Edit risk reasoning"
                onClick={(e) =>
                  emitOpenShapeEditor(e, {
                    shapeId: shape.id,
                    shapeType: shape.type,
                    mode: "risk",
                    value: shape.props.reasoning,
                  })
                }
              />
            </div>
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

          {inlineComments.length > 0 && (
            <div
              style={{
                borderTop: `1px solid ${CARD_BASE.borderSubtle}`,
                paddingTop: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              {inlineComments.slice(-2).map((c) => (
                <div key={c.id} style={{ fontSize: "11px", color: CARD_BASE.textSecondary, lineHeight: 1.35 }}>
                  <span style={{ color: c.authorColor, fontWeight: 600 }}>{c.author}: </span>
                  {c.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: RiskFlagShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}
