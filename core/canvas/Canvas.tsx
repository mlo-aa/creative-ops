"use client";

import { cn } from "@/core/cn";
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";

type StudioCanvasProps = {
  children: ReactNode;
  background?: string;
  width: number;
  height: number;
  fontFamily: string;
  className?: string;
  exporting?: boolean;
};

export const StudioCanvas = forwardRef<HTMLDivElement, StudioCanvasProps>(
  function StudioCanvas(
    { children, background = "#111", width, height, fontFamily, className, exporting = false },
    ref,
  ) {
    return (
      <div
        ref={ref}
        data-studio-canvas="true"
        data-exporting={exporting ? "true" : undefined}
        data-canvas-width={width}
        data-canvas-height={height}
        className={cn("relative overflow-hidden", className)}
        style={{
          width,
          height,
          background,
          color: "#f4f1ea",
          fontFamily,
          fontFeatureSettings: '"ss01" on, "cv11" on',
        }}
      >
        {children}
      </div>
    );
  },
);

export function StudioStage({
  children,
  scale,
  width,
  height,
}: {
  children: ReactNode;
  scale: number;
  width: number;
  height: number;
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: width * scale, height: height * scale }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width, height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

export function FluidStage({
  children,
  width,
  height,
}: {
  children: ReactNode;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={ref} style={{ width: "100%", aspectRatio: `${width} / ${height}` }}>
      <StudioStage scale={scale} width={width} height={height}>
        {children}
      </StudioStage>
    </div>
  );
}
