"use client";

import { useBrand } from "@/core/project/context";
import type { CSSProperties, ReactNode } from "react";

export function DisplayText({
  children,
  color,
  size = 92,
  opacity = 1,
  align = "left",
  style,
}: {
  children: ReactNode;
  color: string;
  size?: number;
  opacity?: number;
  align?: "left" | "center" | "right";
  style?: CSSProperties;
}) {
  const { font } = useBrand();
  return (
    <p
      style={{
        margin: 0,
        color,
        fontFamily: font.display,
        fontSize: size,
        fontWeight: 450,
        letterSpacing: "-0.04em",
        lineHeight: 0.95,
        textAlign: align,
        opacity,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function Kicker({
  children,
  color,
  opacity = 1,
}: {
  children: ReactNode;
  color: string;
  opacity?: number;
}) {
  const { font } = useBrand();
  return (
    <p
      style={{
        margin: 0,
        color,
        fontFamily: font.body,
        fontSize: 18,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        opacity,
      }}
    >
      {children}
    </p>
  );
}

export function BodyText({
  children,
  color,
  size = 28,
  opacity = 0.8,
  style,
}: {
  children: ReactNode;
  color: string;
  size?: number;
  opacity?: number;
  style?: CSSProperties;
}) {
  const { font } = useBrand();
  return (
    <p
      style={{
        margin: 0,
        color,
        fontFamily: font.body,
        fontSize: size,
        lineHeight: 1.35,
        letterSpacing: "-0.02em",
        opacity,
        ...style,
      }}
    >
      {children}
    </p>
  );
}
