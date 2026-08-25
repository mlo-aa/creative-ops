"use client";

import { useBrand } from "@/core/project/context";

export function MarkImage({
  src,
  height,
  color,
  opacity = 1,
}: {
  src: string;
  height: number;
  color?: string;
  opacity?: number;
}) {
  const width = Math.round(height * (242 / 321));
  if (color) {
    return (
      <div
        aria-hidden="true"
        style={{
          width,
          height,
          opacity,
          backgroundColor: color,
          WebkitMaskImage: `url(${src})`,
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskImage: `url(${src})`,
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
        }}
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={width}
      height={height}
      style={{ display: "block", width, height, opacity, objectFit: "contain" }}
    />
  );
}

export function Wordmark({ color, size = 42 }: { color: string; size?: number }) {
  const { shortName, font } = useBrand();
  return (
    <span
      style={{
        color,
        fontFamily: font.primary,
        fontSize: size,
        fontWeight: 500,
        letterSpacing: "0.01em",
        lineHeight: 1,
        textTransform: "lowercase",
      }}
    >
      {shortName}
    </span>
  );
}

export function BrandMark({
  height = 72,
  color,
  opacity = 1,
}: {
  height?: number;
  color?: string;
  opacity?: number;
}) {
  const { logo } = useBrand();
  const mark = logo("isotipo") ?? logo("primary");
  if (!mark) return <Wordmark color={color ?? "#fff"} size={Math.round(height * 0.4)} />;
  return <MarkImage src={mark.src} height={height} color={color} opacity={opacity} />;
}
