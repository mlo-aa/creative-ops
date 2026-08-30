"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { PlayerRef } from "@remotion/player";
import type { VideoDocument } from "@/core/video/document";
import { videoCompositionMeta } from "@/core/video/remotion/VideoDocumentRenderer";

const Player = dynamic(() => import("@remotion/player").then((m) => m.Player), { ssr: false });
const VideoDocumentComposition = dynamic(
  () => import("@/core/video/remotion/VideoDocumentRenderer").then((m) => m.VideoDocumentComposition),
  { ssr: false },
);

export function VideoPreviewPlayer({
  document: doc,
  playing,
  onPlayingChange,
  seekMs,
}: {
  document: VideoDocument;
  playing: boolean;
  onPlayingChange: (v: boolean) => void;
  seekMs?: number;
}) {
  const playerRef = useRef<PlayerRef>(null);
  const meta = useMemo(() => videoCompositionMeta(doc), [doc]);

  useEffect(() => {
    if (seekMs === undefined || !playerRef.current) return;
    playerRef.current.seekTo(Math.round((seekMs / 1000) * doc.fps));
  }, [seekMs, doc.fps]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (playing) playerRef.current.play();
    else playerRef.current.pause();
  }, [playing]);

  return (
    <Player
      ref={playerRef}
      component={VideoDocumentComposition as ComponentType<Record<string, unknown>>}
      inputProps={{ document: doc }}
      durationInFrames={meta.durationInFrames}
      compositionWidth={meta.width}
      compositionHeight={meta.height}
      fps={meta.fps}
      style={{ width: "100%", height: "100%" }}
      controls={false}
      loop
      clickToPlay={false}
    />
  );
}

export function usePlaybackClock(doc: VideoDocument) {
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  const tick = useCallback(
    (now: number) => {
      if (lastRef.current !== null) {
        const delta = now - lastRef.current;
        setCurrentMs((prev) => {
          const next = prev + delta;
          if (next >= doc.durationMs) return 0;
          return next;
        });
      }
      lastRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    },
    [doc.durationMs],
  );

  useEffect(() => {
    if (playing) {
      lastRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, tick]);

  return { currentMs, setCurrentMs, playing, setPlaying };
}
