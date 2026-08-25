"use client";

import { useEffect, useState } from "react";

export function pingpong(progress: number) {
  return progress < 0.5 ? progress * 2 : (1 - progress) * 2;
}

export function span(progress: number, start: number, end: number) {
  if (end === start) return progress >= start ? 1 : 0;
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}

export function useLoopProgress(durationMs: number, enabled: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled || durationMs <= 0) return;
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      setProgress(((now - start) % durationMs) / durationMs);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs, enabled]);

  return progress;
}
