"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useRef } from "react";

export function EditableBlock({
  editing,
  exporting,
  x,
  y,
  onChange,
  children,
  style,
}: {
  editing?: boolean;
  exporting?: boolean;
  x: number;
  y: number;
  onChange?: (x: number, y: number) => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const start = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const active = Boolean(editing && !exporting && onChange);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!active) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY, cx: x, cy: y };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!active || !start.current || !onChange) return;
    const canvas = event.currentTarget.closest("[data-studio-canvas]") as HTMLElement | null;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Number(canvas.dataset.canvasWidth || 1080);
    const height = Number(canvas.dataset.canvasHeight || 1440);
    const nextX = Math.max(
      -420,
      Math.min(420, start.current.cx + (event.clientX - start.current.x) / (rect.width / width)),
    );
    const nextY = Math.max(
      -420,
      Math.min(420, start.current.cy + (event.clientY - start.current.y) / (rect.height / height)),
    );
    onChange(nextX, nextY);
  }

  return (
    <div
      data-edit-box={active ? "true" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => {
        start.current = null;
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
      style={{
        ...style,
        transform: `translate(${x}px, ${y}px)`,
        outline: active ? "1px dashed rgba(244,241,232,0.4)" : undefined,
        outlineOffset: 10,
        cursor: active ? "move" : undefined,
      }}
    >
      {children}
    </div>
  );
}
