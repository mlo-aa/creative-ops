"use client";

import { useBrand } from "@/core/project/context";
import type {
  DesignDocument,
  DesignElement,
  GroupPrimitiveProps,
  ImagePrimitiveProps,
  LinePrimitiveProps,
  LogoPrimitiveProps,
  ShapePrimitiveProps,
  SvgPrimitiveProps,
  TextPrimitiveProps,
  TexturePrimitiveProps,
} from "@/core/design/document";
import { sortElements } from "@/core/design/document";
import type { DesignState } from "@/core/types";
import { BrandMark, Wordmark } from "@/core/canvas/Logo";
import { CoverImage } from "@/core/canvas/CoverImage";
import type { ReactNode } from "react";

export function DocumentRenderer({
  document,
  progress = 0,
  onDocumentChange,
  onDesignChange,
}: {
  document: DesignDocument;
  design?: DesignState;
  progress?: number;
  editing?: boolean;
  onDocumentChange?: (next: DesignDocument) => void;
  onDesignChange?: (patch: Partial<DesignState>) => void;
}) {
  const brandCtx = useBrand();
  const hex = brandCtx.hex;
  const byId = new Map(document.elements.map((e) => [e.id, e]));

  const groupedChildIds = new Set<string>();
  for (const el of document.elements) {
    if (el.type === "group") {
      for (const cid of (el.props as GroupPrimitiveProps).childIds) groupedChildIds.add(cid);
    }
  }

  function patchTextProps(id: string, patch: Partial<TextPrimitiveProps>) {
    const el = document.elements.find((e) => e.id === id);
    if (!el || !onDocumentChange) return;
    onDocumentChange({
      ...document,
      elements: document.elements.map((e) =>
        e.id === id ? { ...e, props: { ...e.props, ...patch } } : e,
      ),
    });
    if (patch.content !== undefined) {
      const target =
        el.name === "Headline" ? "headline" : el.name === "Supporting" ? "supporting" : el.name === "Eyebrow" ? "eyebrow" : null;
      if (target) onDesignChange?.({ [target]: patch.content });
    }
  }

  function renderElement(el: DesignElement): ReactNode {
    if (!el.visible) return null;

    const anim =
      el.animation?.enabled && progress !== undefined
        ? { opacity: 0.4 + progress * 0.6, transform: `translateY(${(1 - progress) * 12}px)` }
        : {};

    const style = {
      position: "absolute" as const,
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      opacity: el.opacity,
      transform: `rotate(${el.rotation}deg)`,
      zIndex: el.zIndex,
      ...anim,
    };

    if (el.type === "group") {
      const p = el.props as GroupPrimitiveProps;
      return (
        <div key={el.id} style={{ ...style, pointerEvents: "none" }}>
          {p.childIds.map((cid) => {
            const child = byId.get(cid);
            return child ? (
              <div key={cid} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}>
                {renderElement(child)}
              </div>
            ) : null;
          })}
        </div>
      );
    }

    if (el.type === "rectangle" || el.type === "circle") {
      const p = el.props as ShapePrimitiveProps;
      return (
        <div
          key={el.id}
          style={{
            ...style,
            background: hex(p.fillColorId),
            borderRadius: el.type === "circle" ? "9999px" : p.cornerRadius,
            border: p.strokeWidth ? `${p.strokeWidth}px solid ${hex(p.strokeColorId)}` : undefined,
          }}
        />
      );
    }

    if (el.type === "line") {
      const p = el.props as LinePrimitiveProps;
      return (
        <svg key={el.id} style={{ ...style, overflow: "visible" }} aria-hidden="true">
          <line
            x1={0}
            y1={0}
            x2={p.x2 - el.x}
            y2={p.y2 - el.y}
            stroke={hex(p.strokeColorId)}
            strokeWidth={p.strokeWidth}
          />
        </svg>
      );
    }

    if (el.type === "svg") {
      const p = el.props as SvgPrimitiveProps;
      if (!p.pathData) return null;
      return (
        <svg key={el.id} viewBox={`0 0 ${el.width} ${el.height}`} style={style} aria-hidden="true">
          <path
            d={p.pathData}
            fill={p.fillColorId ? hex(p.fillColorId) : "none"}
            stroke={hex(p.strokeColorId)}
            strokeWidth={p.strokeWidth}
          />
        </svg>
      );
    }

    if (el.type === "texture") {
      const p = el.props as TexturePrimitiveProps;
      if (!p.src) return null;
      return (
        <div key={el.id} style={{ ...style, overflow: "hidden", pointerEvents: "none" }}>
          <img
            src={p.src}
            alt=""
            className="h-full w-full object-cover"
            style={{
              transform: `scale(${p.scale}) rotate(${p.rotation}deg)`,
              opacity: p.opacity,
              filter: p.blur ? `blur(${p.blur}px)` : undefined,
            }}
          />
        </div>
      );
    }

    if (el.type === "image" || el.type === "ui_screenshot") {
      const p = el.props as ImagePrimitiveProps;
      if (!p.src) return null;
      return (
        <div key={el.id} style={style}>
          <CoverImage
            src={p.src}
            alt=""
            width={el.width}
            height={el.height}
            objectX={p.objectX}
            objectY={p.objectY}
            zoom={1}
            grayscale={p.grayscale}
            overlay={hex(p.overlayColorId)}
            opacity={1 - p.overlayOpacity}
          />
        </div>
      );
    }

    if (el.type === "logo") {
      const p = el.props as LogoPrimitiveProps;
      const mark = brandCtx.logo(p.mode === "wordmark" ? "wordmark" : "isotipo");
      return (
        <div key={el.id} style={style}>
          {p.mode === "wordmark" ? (
            <Wordmark color={hex(p.colorId)} size={36} />
          ) : mark ? (
            <BrandMark height={56} color={hex(p.colorId)} />
          ) : null}
        </div>
      );
    }

    if (el.type === "text") {
      const p = el.props as TextPrimitiveProps;
      const font =
        p.fontRole === "body" ? brandCtx.font.body : p.fontRole === "display" ? brandCtx.font.display : brandCtx.font.primary;
      return (
        <div
          key={el.id}
          contentEditable={Boolean(onDocumentChange)}
          suppressContentEditableWarning
          onBlur={(e) => patchTextProps(el.id, { content: e.currentTarget.innerText })}
          style={{
            ...style,
            fontFamily: font,
            fontSize: p.fontSize,
            fontWeight: p.fontWeight,
            lineHeight: p.lineHeight,
            letterSpacing: p.letterSpacing,
            color: hex(p.colorId),
            textAlign: p.align,
            textTransform: p.uppercase ? "uppercase" : undefined,
            whiteSpace: "pre-wrap",
            outline: onDocumentChange ? "1px dashed rgba(255,255,255,0.15)" : undefined,
          }}
        >
          {p.content}
        </div>
      );
    }

    return null;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {sortElements(document.elements)
        .filter((el) => !groupedChildIds.has(el.id))
        .map((el) => renderElement(el))}
    </div>
  );
}
