"use client";

export function CoverImage({
  src,
  alt = "",
  overlay,
  objectX = 50,
  objectY = 50,
  zoom = 1,
  grayscale = false,
  opacity = 1,
  width,
  height,
}: {
  src: string;
  alt?: string;
  overlay?: string;
  objectX?: number;
  objectY?: number;
  zoom?: number;
  grayscale?: boolean;
  opacity?: number;
  width: number;
  height: number;
}) {
  const scale = Math.max(1, zoom);
  return (
    <>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          width,
          height,
          objectFit: "cover",
          objectPosition: `${objectX}% ${objectY}%`,
          transform: `scale(${scale})`,
          transformOrigin: `${objectX}% ${objectY}%`,
          filter: grayscale ? "grayscale(1)" : undefined,
          opacity,
        }}
      />
      {overlay ? (
        <div style={{ position: "absolute", inset: 0, background: overlay }} />
      ) : null}
    </>
  );
}
