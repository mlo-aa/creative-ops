"use client";

import { AbsoluteFill, Sequence, Audio, OffthreadVideo, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type {
  VideoDocument,
  VideoElement,
  VideoElementAnimation,
  VideoScene,
  CaptionTrack,
  VideoBackground,
} from "../document";
import { getVideoBackgroundSrc } from "../clip/background";
import type {
  VideoImageProps,
  VideoLogoProps,
} from "../document";

function msToFrames(ms: number, fps: number) {
  return Math.max(1, Math.round((ms / 1000) * fps));
}

function applyAnimation(
  frame: number,
  fps: number,
  element: VideoElement,
  sceneDurationFrames: number,
): React.CSSProperties {
  const startFrame = msToFrames(element.startOffsetMs, fps);
  const durationFrames = msToFrames(element.durationMs, fps);
  const localFrame = frame - startFrame;
  if (localFrame < 0 || localFrame > durationFrames) return { opacity: 0 };

  const animIn = element.animationIn ?? { type: "fade" as const, durationMs: 400 };
  const inFrames = msToFrames(animIn.durationMs, fps);
  const progress = Math.min(1, localFrame / Math.max(inFrames, 1));

  let opacity = element.opacity * progress;
  let transform = `rotate(${element.rotation}deg)`;

  switch (animIn.type) {
    case "fade-up":
      opacity = element.opacity * progress;
      transform += ` translateY(${interpolate(progress, [0, 1], [40, 0])}px)`;
      break;
    case "fade-down":
      transform += ` translateY(${interpolate(progress, [0, 1], [-40, 0])}px)`;
      break;
    case "slide-left":
      transform += ` translateX(${interpolate(progress, [0, 1], [80, 0])}px)`;
      break;
    case "slide-right":
      transform += ` translateX(${interpolate(progress, [0, 1], [-80, 0])}px)`;
      break;
    case "scale-in": {
      const scale = spring({ frame: localFrame, fps, config: { damping: 14 } });
      transform += ` scale(${scale})`;
      break;
    }
    case "fade":
    case "none":
    default:
      opacity = element.opacity * (animIn.type === "none" ? 1 : progress);
  }

  const outStart = durationFrames - msToFrames(element.animationOut?.durationMs ?? 300, fps);
  if (localFrame > outStart) {
    const outProgress = (localFrame - outStart) / Math.max(msToFrames(element.animationOut?.durationMs ?? 300, fps), 1);
    opacity *= 1 - Math.min(1, outProgress);
  }

  return { opacity, transform };
}

function RenderElement({ element, sceneFrame }: { element: VideoElement; sceneFrame: number }) {
  const { fps } = useVideoConfig();
  const style: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: element.zIndex,
    ...applyAnimation(sceneFrame, fps, element, msToFrames(element.durationMs, fps)),
  };

  if (element.type === "text" && "content" in element.props) {
    const p = element.props;
    return (
      <div
        style={{
          ...style,
          color: p.color,
          fontSize: p.fontSize,
          fontWeight: p.fontWeight,
          textAlign: p.align,
          textTransform: p.uppercase ? "uppercase" : undefined,
          lineHeight: 1.1,
          display: "flex",
          alignItems: "center",
          justifyContent: p.align === "center" ? "center" : p.align === "right" ? "flex-end" : "flex-start",
        }}
      >
        {p.content}
      </div>
    );
  }

  if (element.type === "image") {
    const p = element.props as VideoImageProps;
    return (
      <img
        src={p.src}
        alt=""
        style={{
          ...style,
          objectFit: p.objectFit,
        }}
      />
    );
  }

  if (element.type === "logo") {
    const p = element.props as VideoLogoProps;
    return (
      <img
        src={p.src}
        alt=""
        style={{
          ...style,
          objectFit: "contain",
        }}
      />
    );
  }

  if (element.type === "rectangle" && "fill" in element.props) {
    return (
      <div
        style={{
          ...style,
          backgroundColor: element.props.fill,
          borderRadius: element.props.cornerRadius ?? 0,
          border: element.props.stroke ? `${element.props.strokeWidth ?? 1}px solid ${element.props.stroke}` : undefined,
        }}
      />
    );
  }

  if (element.type === "circle" && "fill" in element.props) {
    return (
      <div
        style={{
          ...style,
          backgroundColor: element.props.fill,
          borderRadius: "50%",
        }}
      />
    );
  }

  return null;
}

function SceneBackground({ background, sceneDurationMs }: { background: VideoBackground; sceneDurationMs: number }) {
  const { fps } = useVideoConfig();
  const sceneFrames = msToFrames(sceneDurationMs, fps);

  if (background.type === "color") {
    return <AbsoluteFill style={{ backgroundColor: background.value }} />;
  }

  if (background.type === "video") {
    const src = getVideoBackgroundSrc(background);
    if (src) {
      return (
        <AbsoluteFill>
          <OffthreadVideo
            src={src}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            endAt={sceneFrames}
          />
        </AbsoluteFill>
      );
    }
    return <AbsoluteFill style={{ backgroundColor: "#171717" }} />;
  }

  return (
    <img src={background.value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  );
}

function SceneComposition({ scene }: { scene: VideoScene }) {
  const frame = useCurrentFrame();
  const bg = scene.background ?? { type: "color" as const, value: "#171717" };

  return (
    <AbsoluteFill>
      <SceneBackground background={bg} sceneDurationMs={scene.durationMs} />
      {scene.elements
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el) => (
          <RenderElement key={el.id} element={el} sceneFrame={frame} />
        ))}
    </AbsoluteFill>
  );
}

function CaptionOverlay({ captions, currentMs }: { captions: CaptionTrack; currentMs: number }) {
  const active = captions.segments.find(
    (s) => currentMs >= s.startMs && currentMs < s.startMs + s.durationMs,
  );
  if (!active) return null;

  const positionStyle: React.CSSProperties =
    captions.position === "top"
      ? { top: 120 }
      : captions.position === "center"
        ? { top: "50%", transform: "translateY(-50%)" }
        : { bottom: 200 };

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        ...positionStyle,
        textAlign: "center",
        fontSize: captions.fontSize,
        fontFamily: captions.fontFamily,
        color: captions.activeColor ?? captions.color,
        backgroundColor: `rgba(0,0,0,${captions.backgroundOpacity})`,
        padding: "12px 20px",
        borderRadius: 8,
        fontWeight: 600,
      }}
    >
      {active.text}
    </div>
  );
}

export type VideoDocumentRendererProps = {
  document: VideoDocument;
};

export const VideoDocumentComposition: React.FC<VideoDocumentRendererProps> = ({ document: doc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {doc.voiceover?.assetUrl ? (
        <Audio src={doc.voiceover.assetUrl} volume={1} />
      ) : null}
      {doc.music?.status === "ready" && doc.music.assetUrl ? (
        <Audio src={doc.music.assetUrl} volume={doc.music.volume ?? 0.35} />
      ) : null}
      {doc.scenes.map((scene) => {
        const from = msToFrames(scene.startMs, fps);
        const dur = msToFrames(scene.durationMs, fps);
        return (
          <Sequence key={scene.id} from={from} durationInFrames={dur}>
            <SceneComposition scene={scene} />
          </Sequence>
        );
      })}
      {doc.captions ? <CaptionOverlay captions={doc.captions} currentMs={currentMs} /> : null}
    </AbsoluteFill>
  );
};

export function videoCompositionMeta(doc: VideoDocument) {
  return {
    id: "VideoDocument",
    width: doc.width,
    height: doc.height,
    fps: doc.fps,
    durationInFrames: msToFrames(doc.durationMs, doc.fps),
  };
}
