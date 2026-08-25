"use client";

type AnimatedPathProps = {
  d: string;
  progress: number;
  color?: string;
  width?: number;
  opacity?: number;
};

export function AnimatedPath({
  d,
  progress,
  color = "#fff",
  width = 2.2,
  opacity = 1,
}: AnimatedPathProps) {
  const drawn = Math.max(0, Math.min(1, progress));
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - drawn}
      opacity={opacity}
    />
  );
}

export function PathDot({
  x,
  y,
  r = 7,
  fill = "#fff",
  opacity = 1,
}: {
  x: number;
  y: number;
  r?: number;
  fill?: string;
  opacity?: number;
}) {
  return <circle cx={x} cy={y} r={r} fill={fill} opacity={opacity} />;
}
