"use client";

import { EditableBlock } from "@/core/editor/EditableBlock";
import { BrandMark, Wordmark } from "@/core/canvas/Logo";
import { useBrand } from "@/core/project/context";
import type { DesignState, PostRenderProps } from "@/core/types";
import { Fragment, type CSSProperties, type ReactNode } from "react";

export function Lines({ text }: { text: string }) {
  return text.split("\n").map((line, index) => (
    <Fragment key={`${index}-${line}`}>
      {index > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

export function PlacedLogo({
  design,
  editing,
  exporting,
  onDesignChange,
  height = 54,
  wordSize = 32,
}: PostRenderProps & { height?: number; wordSize?: number }) {
  const { hex, safe } = useBrand();
  if (!design.showLogo) return null;
  const top = design.logoPosition.startsWith("top");
  const left = design.logoPosition.endsWith("left");
  const color = hex(design.logoColor);
  const style: CSSProperties = {
    position: "absolute",
    top: top ? safe : undefined,
    bottom: top ? undefined : safe,
    left: left ? safe : undefined,
    right: left ? undefined : safe,
  };
  return (
    <EditableBlock
      editing={editing}
      exporting={exporting}
      x={design.logoX}
      y={design.logoY}
      onChange={(logoX, logoY) => onDesignChange?.({ logoX, logoY })}
      style={style}
    >
      {design.logoMode === "wordmark" ? (
        <Wordmark color={color} size={wordSize} />
      ) : (
        <BrandMark height={height} color={color} />
      )}
    </EditableBlock>
  );
}

export function PlacedMark({
  design,
  editing,
  exporting,
  onDesignChange,
  height,
  style,
  opacity = 0.16,
  rotate = "0deg",
}: PostRenderProps & {
  height: number;
  style?: CSSProperties;
  opacity?: number;
  rotate?: string;
}) {
  const { hex } = useBrand();
  if (!design.showMark) return null;
  return (
    <EditableBlock
      editing={editing}
      exporting={exporting}
      x={design.markX}
      y={design.markY}
      onChange={(markX, markY) => onDesignChange?.({ markX, markY })}
      style={{ position: "absolute", opacity, ...style }}
    >
      <div style={{ transform: `scale(${design.markScale}) rotate(${rotate})`, transformOrigin: "center" }}>
        <BrandMark height={height} color={hex(design.logoColor)} />
      </div>
    </EditableBlock>
  );
}

export function PlacedPath({
  design,
  children,
}: {
  design: DesignState;
  children: ReactNode;
}) {
  if (!design.pathVisible) return null;
  return (
    <g transform={`translate(${design.pathX} ${design.pathY}) scale(${design.pathScale})`}>
      {children}
    </g>
  );
}

export function usePostProgress(
  design: DesignState,
  progress: number | undefined,
  loop: number,
) {
  if (!design.animationEnabled && progress === undefined) return 1;
  return progress ?? loop;
}
