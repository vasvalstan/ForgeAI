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
  CheckCircleIcon,
  CircleIcon,
  FileTextIcon,
  ImageIcon,
  InfoIcon,
  ListChecksIcon,
  PencilSimpleIcon,
  PushPinIcon,
  QuestionIcon,
  ShieldWarningIcon,
  SirenIcon,
  SparkleIcon,
  StarIcon,
  WarningCircleIcon,
  WarningIcon,
  WrenchIcon,
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
    "alert_card": {
      w: number;
      h: number;
      severity: string;
      title: string;
      content: string;
      evidence: string;
      targetShapeId: string;
    };
    "comment": {
      w: number;
      h: number;
      text: string;
      author: string;
      authorColor: string;
      targetShapeId: string;
    };
    "prd-card": {
      w: number;
      h: number;
      title: string;
      prdId: string;
      status: string;
      sectionCount: number;
      insightCount: number;
    };
    "spec-card": {
      w: number;
      h: number;
      title: string;
      specId: string;
      prdId: string;
      status: string;
      complexity: string;
      taskCount: number;
    };
    "task-list": {
      w: number;
      h: number;
      specId: string;
      specTitle: string;
      tasks: string; // JSON array: [{ id, title, status, complexity }]
    };
  }
}

// ─── Types ──────────────────────────────────────────────────

type StickyNoteShape = TLShape<"sticky-note">;
type FeatureCardShape = TLShape<"feature-card">;
type RiskFlagShape = TLShape<"risk-flag">;
type AlertCardShape = TLShape<"alert_card">;
type CommentShape = TLShape<"comment">;
type PRDCardShape = TLShape<"prd-card">;
type SpecCardShape = TLShape<"spec-card">;
type TaskListShape = TLShape<"task-list">;
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

function VisualizeChip({
  onClick,
  title = "Generate visual mock",
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
        border: `1px solid rgba(124, 58, 237, 0.18)`,
        background: "rgba(124, 58, 237, 0.06)",
        color: "#7C3AED",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <ImageIcon size={12} />
    </button>
  );
}

function emitVisualize(
  e: MouseEvent<HTMLButtonElement>,
  detail: { shapeId: string; title: string; description: string; x: number; y: number }
) {
  e.stopPropagation();
  globalThis.dispatchEvent(
    new CustomEvent("forge:visualize-feature", { detail })
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
              <VisualizeChip
                title="Generate UI mock"
                onClick={(e) =>
                  emitVisualize(e, {
                    shapeId: shape.id,
                    title: shape.props.title,
                    description: shape.props.description,
                    x: shape.x,
                    y: shape.y,
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

// ─── Alert Card (Consensus Risk) Shape Util ───────────────────
// High-confidence governance: only risks both Claude + Kimi agree on

export class AlertCardShapeUtil extends ShapeUtil<AlertCardShape> {
  static override readonly type = "alert_card" as const;

  static override readonly props: RecordProps<AlertCardShape> = {
    w: T.number,
    h: T.number,
    severity: T.string,
    title: T.string,
    content: T.string,
    evidence: T.string,
    targetShapeId: T.string,
  };

  getDefaultProps(): AlertCardShape["props"] {
    return {
      w: 280,
      h: 140,
      severity: "high",
      title: "Consensus Risk Identified",
      content: "",
      evidence: "",
      targetShapeId: "",
    };
  }

  getGeometry(shape: AlertCardShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override canResize() { return true; }
  override canEdit() { return true; }

  override onResize(shape: any, info: TLResizeInfo<any>) {
    return resizeBox(shape, info);
  }

  component(shape: AlertCardShape) {
    const meta = (shape.meta ?? {}) as {
      entryAnimation?: unknown;
      entryAnimationAt?: unknown;
      entryAnimationDelayMs?: unknown;
      consensusGlow?: boolean;
    };
    const hasRecentEntryAnimation =
      meta.entryAnimation === "fade-up" &&
      typeof meta.entryAnimationAt === "number" &&
      Date.now() - meta.entryAnimationAt < 4000;
    const entryDelayMs =
      typeof meta.entryAnimationDelayMs === "number"
        ? Math.max(0, Math.min(600, meta.entryAnimationDelayMs))
        : 0;
    const hasConsensusGlow = meta.consensusGlow === true;

    return (
      <HTMLContainer style={{ width: "100%", height: "100%", pointerEvents: "all" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#FFFFFF",
            border: "1px solid rgba(6, 182, 212, 0.35)",
            borderTop: "3px solid #7c3aed",
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontFamily: "var(--font-sans)",
            boxShadow: hasConsensusGlow
              ? "0 0 20px rgba(6, 182, 212, 0.25), 0 0 40px rgba(124, 58, 237, 0.15)"
              : CARD_BASE.shadow,
            animation: hasRecentEntryAnimation
              ? `fade-up 300ms ease-out ${entryDelayMs}ms both`
              : undefined,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "12px",
                background: "rgba(124, 58, 237, 0.12)",
                border: "1px solid rgba(124, 58, 237, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#7c3aed",
              }}
            >
              <ShieldWarningIcon size={16} />
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#7c3aed",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {shape.props.title}
            </span>
          </div>
          <div
            style={{
              flex: 1,
              fontSize: "13px",
              lineHeight: "1.45",
              color: CARD_BASE.text,
              overflow: "hidden",
            }}
          >
            {shape.props.content}
          </div>
          {shape.props.evidence && (
            <div
              style={{
                fontSize: "11px",
                color: CARD_BASE.textDim,
                fontStyle: "italic",
              }}
            >
              Evidence: {shape.props.evidence}
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: AlertCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}

// ─── PRD Card Shape Util ─────────────────────────────────────

const PRD_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: "rgba(100, 116, 139, 0.10)", text: "#475569", border: "rgba(100, 116, 139, 0.20)" },
  review: { bg: "rgba(245, 158, 11, 0.10)", text: "#B45309", border: "rgba(245, 158, 11, 0.25)" },
  approved: { bg: "rgba(22, 163, 74, 0.10)", text: "#15803D", border: "rgba(22, 163, 74, 0.25)" },
};

export class PRDCardShapeUtil extends ShapeUtil<PRDCardShape> {
  static override readonly type = "prd-card" as const;

  static override readonly props: RecordProps<PRDCardShape> = {
    w: T.number,
    h: T.number,
    title: T.string,
    prdId: T.string,
    status: T.string,
    sectionCount: T.number,
    insightCount: T.number,
  };

  getDefaultProps(): PRDCardShape["props"] {
    return { w: 360, h: 200, title: "Product Requirements Document", prdId: "", status: "draft", sectionCount: 0, insightCount: 0 };
  }

  getGeometry(shape: PRDCardShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override canResize() { return true; }
  override onResize(shape: PRDCardShape, info: TLResizeInfo<PRDCardShape>) { return resizeBox(shape, info); }
  override isAspectRatioLocked() { return false; }

  component(shape: PRDCardShape) {
    const statusColors = PRD_STATUS_COLORS[shape.props.status] ?? { bg: "rgba(100, 116, 139, 0.10)", text: "#475569", border: "rgba(100, 116, 139, 0.20)" };

    return (
      <HTMLContainer id={shape.id}>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            background: CARD_BASE.bg,
            border: `1.5px solid rgba(37, 99, 235, 0.25)`,
            borderRadius: "16px",
            boxShadow: CARD_BASE.shadow,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontFamily: "var(--font-sans, system-ui)",
            overflow: "hidden",
            cursor: "pointer",
          }}
          onDoubleClick={() => {
            globalThis.dispatchEvent(new CustomEvent("forge:open-prd", { detail: { prdId: shape.props.prdId } }));
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.06))",
              border: "1px solid rgba(37, 99, 235, 0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FileTextIcon size={16} style={{ color: "#2563EB" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: CARD_BASE.textDim, fontWeight: 600 }}>
                PRD
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: CARD_BASE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {shape.props.title}
              </div>
            </div>
            <span style={{
              fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
              padding: "3px 8px", borderRadius: "6px",
              background: statusColors.bg, color: statusColors.text, border: `1px solid ${statusColors.border}`,
            }}>
              {shape.props.status}
            </span>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: "16px", padding: "10px 0", borderTop: `1px solid ${CARD_BASE.borderSubtle}`, borderBottom: `1px solid ${CARD_BASE.borderSubtle}` }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#2563EB" }}>{shape.props.sectionCount}</div>
              <div style={{ fontSize: "10px", color: CARD_BASE.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sections</div>
            </div>
            <div style={{ width: "1px", background: CARD_BASE.borderSubtle }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#7C3AED" }}>{shape.props.insightCount}</div>
              <div style={{ fontSize: "10px", color: CARD_BASE.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Insights</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ fontSize: "11px", color: CARD_BASE.textDim }}>
            Double-click to open PRD
          </div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: PRDCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />;
  }
}

// ─── Spec Card Shape Util ────────────────────────────────────

const COMPLEXITY_COLORS: Record<string, { bg: string; text: string }> = {
  xs: { bg: "rgba(22, 163, 74, 0.10)", text: "#15803D" },
  s: { bg: "rgba(34, 197, 94, 0.10)", text: "#16A34A" },
  m: { bg: "rgba(245, 158, 11, 0.10)", text: "#B45309" },
  l: { bg: "rgba(239, 68, 68, 0.10)", text: "#DC2626" },
  xl: { bg: "rgba(190, 18, 60, 0.10)", text: "#BE123C" },
};

export class SpecCardShapeUtil extends ShapeUtil<SpecCardShape> {
  static override readonly type = "spec-card" as const;

  static override readonly props: RecordProps<SpecCardShape> = {
    w: T.number,
    h: T.number,
    title: T.string,
    specId: T.string,
    prdId: T.string,
    status: T.string,
    complexity: T.string,
    taskCount: T.number,
  };

  getDefaultProps(): SpecCardShape["props"] {
    return { w: 300, h: 160, title: "Technical Spec", specId: "", prdId: "", status: "draft", complexity: "m", taskCount: 0 };
  }

  getGeometry(shape: SpecCardShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override canResize() { return true; }
  override onResize(shape: SpecCardShape, info: TLResizeInfo<SpecCardShape>) { return resizeBox(shape, info); }

  component(shape: SpecCardShape) {
    const cxColors = COMPLEXITY_COLORS[shape.props.complexity] ?? { bg: "rgba(245, 158, 11, 0.10)", text: "#B45309" };
    const statusColors = PRD_STATUS_COLORS[shape.props.status] ?? { bg: "rgba(100, 116, 139, 0.10)", text: "#475569", border: "rgba(100, 116, 139, 0.20)" };

    return (
      <HTMLContainer id={shape.id}>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            background: CARD_BASE.bg,
            border: `1.5px solid rgba(124, 58, 237, 0.25)`,
            borderRadius: "14px",
            boxShadow: CARD_BASE.shadow,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontFamily: "var(--font-sans, system-ui)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "rgba(124, 58, 237, 0.10)",
              border: "1px solid rgba(124, 58, 237, 0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <WrenchIcon size={14} style={{ color: "#7C3AED" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: CARD_BASE.textDim, fontWeight: 600 }}>
                SPEC
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: CARD_BASE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {shape.props.title}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "5px",
              background: statusColors.bg, color: statusColors.text, border: `1px solid ${statusColors.border}`,
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {shape.props.status}
            </span>
            {shape.props.complexity && (
              <span style={{
                fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "5px",
                background: cxColors.bg, color: cxColors.text,
                textTransform: "uppercase",
              }}>
                {shape.props.complexity.toUpperCase()}
              </span>
            )}
            <span style={{
              fontSize: "10px", fontWeight: 500, padding: "2px 7px", borderRadius: "5px",
              background: "rgba(15, 23, 42, 0.04)", color: CARD_BASE.textDim,
            }}>
              {shape.props.taskCount} tasks
            </span>
          </div>

          {/* Footer */}
          <div style={{ marginTop: "auto", fontSize: "11px", color: CARD_BASE.textDim }}>
            Click to view spec details
          </div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: SpecCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}

// ─── Task List Shape Util ────────────────────────────────────

type TaskItem = { id: string; title: string; status: string; complexity?: string };

export class TaskListShapeUtil extends ShapeUtil<TaskListShape> {
  static override readonly type = "task-list" as const;

  static override readonly props: RecordProps<TaskListShape> = {
    w: T.number,
    h: T.number,
    specId: T.string,
    specTitle: T.string,
    tasks: T.string,
  };

  getDefaultProps(): TaskListShape["props"] {
    return { w: 280, h: 200, specId: "", specTitle: "", tasks: "[]" };
  }

  getGeometry(shape: TaskListShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override canResize() { return true; }
  override onResize(shape: TaskListShape, info: TLResizeInfo<TaskListShape>) { return resizeBox(shape, info); }

  component(shape: TaskListShape) {
    let tasks: TaskItem[] = [];
    try { tasks = JSON.parse(shape.props.tasks); } catch { /* empty */ }

    const done = tasks.filter((t) => t.status === "done").length;

    return (
      <HTMLContainer id={shape.id}>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            background: CARD_BASE.bg,
            border: `1.5px solid rgba(22, 163, 74, 0.25)`,
            borderRadius: "14px",
            boxShadow: CARD_BASE.shadow,
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontFamily: "var(--font-sans, system-ui)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ListChecksIcon size={16} style={{ color: "#16A34A" }} />
            <div style={{ fontSize: "12px", fontWeight: 600, color: CARD_BASE.text, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {shape.props.specTitle || "Tasks"}
            </div>
            <span style={{ fontSize: "10px", color: CARD_BASE.textDim, fontWeight: 500 }}>
              {done}/{tasks.length}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: "4px", borderRadius: "2px", background: "rgba(15, 23, 42, 0.06)" }}>
            <div style={{ height: "100%", borderRadius: "2px", background: "#16A34A", width: `${tasks.length > 0 ? (done / tasks.length) * 100 : 0}%`, transition: "width 0.3s" }} />
          </div>

          {/* Task list */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: "4px" }}>
            {tasks.slice(0, 8).map((task) => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", lineHeight: "1.3" }}>
                {task.status === "done"
                  ? <CheckCircleIcon size={13} style={{ color: "#16A34A", flexShrink: 0 }} />
                  : <CircleIcon size={13} style={{ color: CARD_BASE.textDim, flexShrink: 0 }} />
                }
                <span style={{
                  color: task.status === "done" ? CARD_BASE.textDim : CARD_BASE.text,
                  textDecoration: task.status === "done" ? "line-through" : "none",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
                }}>
                  {task.title}
                </span>
                {task.complexity && (
                  <span style={{ fontSize: "9px", fontWeight: 600, color: CARD_BASE.textDim, textTransform: "uppercase" }}>
                    {task.complexity}
                  </span>
                )}
              </div>
            ))}
            {tasks.length > 8 && (
              <div style={{ fontSize: "10px", color: CARD_BASE.textDim }}>
                +{tasks.length - 8} more tasks
              </div>
            )}
          </div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: TaskListShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}
