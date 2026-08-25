"use client";

import { AnimatedPath, PathDot } from "@/core/canvas/AnimatedPath";
import { CoverImage } from "@/core/canvas/CoverImage";
import { BodyText, DisplayText, Kicker } from "@/core/canvas/Type";
import { photoOverlay } from "@/core/color";
import { EditableBlock } from "@/core/editor/EditableBlock";
import {
  Lines,
  PlacedLogo,
  PlacedMark,
  PlacedPath,
  usePostProgress,
} from "@/core/editor/placement";
import { pingpong, span, useLoopProgress } from "@/core/export/timing";
import { useBrand } from "@/core/project/context";
import type { PostRenderProps, TemplateControls } from "@/core/types";

export const TEMPLATE_CONTROLS: Record<string, TemplateControls> = {
  "brand-intro": { copy: ["headline", "supporting"], colors: ["background", "text", "accent"], logo: true, mark: true, image: false, path: true, animation: false },
  "brand-idea": { copy: ["headline", "supporting"], colors: ["background", "text", "accent"], logo: true, mark: false, image: false, path: true, animation: true },
  problem: { copy: ["eyebrow", "headline", "labels"], colors: ["background", "text", "accent"], logo: false, mark: false, image: false, path: true, animation: true },
  "how-it-works": { copy: ["eyebrow", "labels"], colors: ["background", "text", "accent"], logo: true, mark: false, image: false, path: true, animation: true },
  follow: { copy: ["headline"], colors: ["background", "text", "accent"], logo: true, mark: false, image: true, path: true, animation: false },
  "product-value": { copy: ["headline", "supporting"], colors: ["background", "text", "accent"], logo: true, mark: false, image: true, path: false, animation: false },
  "brand-cta": { copy: ["headline", "cta"], colors: ["background", "text", "accent"], logo: true, mark: true, image: false, path: true, animation: false },
  quote: { copy: ["headline", "supporting", "cta"], colors: ["background", "text", "accent"], logo: true, mark: false, image: false, path: false, animation: false },
  announcement: { copy: ["eyebrow", "headline", "supporting", "cta"], colors: ["background", "text", "accent"], logo: true, mark: false, image: false, path: false, animation: false },
  metric: { copy: ["eyebrow", "headline", "supporting"], colors: ["background", "text", "accent"], logo: true, mark: false, image: false, path: false, animation: false },
  "who-intro": { copy: ["headline", "supporting"], colors: ["background", "text", "accent"], logo: true, mark: true, image: false, path: false, animation: false },
  "who-why": { copy: ["headline", "supporting"], colors: ["background", "text", "accent"], logo: false, mark: false, image: false, path: true, animation: false },
  "who-believe": { copy: ["headline", "labels"], colors: ["background", "text", "accent"], logo: false, mark: false, image: false, path: false, animation: false },
  "who-team": { copy: ["eyebrow", "headline", "supporting", "labels"], colors: ["background", "text", "accent"], logo: true, mark: false, image: false, path: false, animation: false },
  "who-close": { copy: ["headline", "supporting"], colors: ["background", "text", "accent"], logo: false, mark: true, image: false, path: true, animation: false },
};

export const TEMPLATE_ALIASES: Record<string, string> = {
  "big-statement": "brand-idea",
  "photography-headline": "follow",
  "process-steps": "how-it-works",
  cta: "brand-cta",
  "carousel-cover": "who-intro",
  "editorial-statement": "who-why",
  principles: "who-believe",
  "team-intro": "who-team",
  manifesto: "who-close",
};

export const CORE_TEMPLATE_LIST = [
  { id: "brand-intro", name: "Brand introduction" },
  { id: "brand-idea", name: "Big statement" },
  { id: "problem", name: "Question / problem" },
  { id: "how-it-works", name: "Process / steps" },
  { id: "follow", name: "Photography + headline" },
  { id: "product-value", name: "Product value" },
  { id: "brand-cta", name: "CTA" },
  { id: "quote", name: "Quote" },
  { id: "announcement", name: "Announcement" },
  { id: "metric", name: "Metric" },
  { id: "who-intro", name: "Carousel cover" },
  { id: "who-why", name: "Editorial statement" },
  { id: "who-believe", name: "Principles" },
  { id: "who-team", name: "Team introduction" },
  { id: "who-close", name: "Brand manifesto" },
];

export function BrandIntro(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, format, path, safe } = useBrand();
  return (
    <>
      <PlacedMark {...props} height={760} rotate="12deg" style={{ top: 70, right: -90 }} />
      <PlacedLogo {...props} />
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", left: safe, right: safe, top: 430 }}>
        <DisplayText color={hex(design.text)} size={168}><Lines text={design.headline} /></DisplayText>
      </EditableBlock>
      <EditableBlock editing={editing} exporting={exporting} x={design.supportX} y={design.supportY} onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })} style={{ position: "absolute", left: safe, bottom: safe + 24, width: 620 }}>
        <BodyText color={hex(design.text)} size={36} opacity={0.88}><Lines text={design.supporting} /></BodyText>
      </EditableBlock>
      <div style={{ position: "absolute", left: safe, bottom: safe - 4, width: format.width - safe * 2, height: 1, background: hex(design.accent), opacity: 0.85 }} />
      <svg width={format.width} height={format.height} viewBox={`0 0 ${format.width} ${format.height}`} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <PlacedPath design={design}>
          <path d={path(design.pathId || "introTick")} fill="none" stroke={hex(design.pathColor)} strokeWidth={design.pathWidth} strokeLinecap="round" />
        </PlacedPath>
      </svg>
    </>
  );
}

export function BigStatement(props: PostRenderProps) {
  const { design, progress, durationMs = 6000, editing, exporting, onDesignChange } = props;
  const { hex, format, path, safe } = useBrand();
  const duration = Math.max(400, durationMs / Math.max(0.25, design.animationSpeed || 1));
  const loop = useLoopProgress(duration, design.animationEnabled && progress === undefined);
  const p = usePostProgress(design, progress, loop);
  const draw = pingpong(p);
  const copyIn = Math.min(1, p / 0.18);
  return (
    <>
      <PlacedLogo {...props} wordSize={34} />
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", top: 280, left: safe, right: safe, opacity: copyIn }}>
        <DisplayText color={hex(design.text)} size={88}><Lines text={design.headline} /></DisplayText>
        <div style={{ marginTop: 36 }}>
          <BodyText color={hex(design.text)} size={32} opacity={0.7}><Lines text={design.supporting} /></BodyText>
        </div>
      </EditableBlock>
      <svg width={format.width} height={format.height} viewBox={`0 0 ${format.width} ${format.height}`} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <PlacedPath design={design}>
          <AnimatedPath d={path(design.pathId || "sweep")} progress={draw} color={hex(design.pathColor)} width={design.pathWidth} />
        </PlacedPath>
      </svg>
    </>
  );
}

const fragments = [
  { x: 120, y: 560, w: 220, h: 120 },
  { x: 620, y: 500, w: 280, h: 108 },
  { x: 180, y: 820, w: 200, h: 160 },
  { x: 700, y: 780, w: 230, h: 118 },
  { x: 430, y: 1080, w: 240, h: 100 },
];
const settled = [
  { x: 140, y: 540, w: 220, h: 108 },
  { x: 390, y: 660, w: 250, h: 100 },
  { x: 280, y: 820, w: 200, h: 140 },
  { x: 560, y: 930, w: 230, h: 108 },
  { x: 720, y: 1100, w: 220, h: 96 },
];

export function Problem(props: PostRenderProps) {
  const { design, progress, durationMs = 6500, editing, exporting, onDesignChange } = props;
  const { hex, format, path, safe, project } = useBrand();
  const duration = Math.max(400, durationMs / Math.max(0.25, design.animationSpeed || 1));
  const loop = useLoopProgress(duration, design.animationEnabled && progress === undefined);
  const p = usePostProgress(design, progress, loop);
  const scatter = span(p, 0.04, 0.22);
  const connect = span(p, 0.28, 0.72);
  const settle = span(p, 0.36, 0.7);
  const fadeOut = 1 - span(p, 0.88, 1);
  const labels = design.labels.length ? design.labels : ["Item one", "Item two", "Item three", "Item four", "Item five"];
  const cardBorder = hex(project.brand.colors.find((c) => c.id !== design.background)?.id ?? design.text);
  return (
    <div style={{ opacity: fadeOut }}>
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", top: safe, left: safe, right: safe }}>
        {design.eyebrow ? <Kicker color={hex(design.text)} opacity={0.55}>{design.eyebrow}</Kicker> : null}
        <div style={{ marginTop: design.eyebrow ? 28 : 0 }}>
          <DisplayText color={hex(design.text)} size={72}><Lines text={design.headline} /></DisplayText>
        </div>
      </EditableBlock>
      {fragments.map((item, i) => {
        const target = settled[i];
        const label = labels[i];
        if (!label) return null;
        const x = item.x + (target.x - item.x) * settle;
        const y = item.y + (target.y - item.y) * settle;
        const appear = Math.min(1, scatter / (0.18 + i * 0.12));
        return (
          <div key={`${label}-${i}`} style={{ position: "absolute", left: x, top: y, width: target.w, height: target.h, border: `1px solid ${cardBorder}66`, display: "flex", alignItems: "flex-end", padding: "16px 18px", opacity: appear, transform: `translateY(${(1 - appear) * 16}px)` }}>
            <span style={{ fontSize: 18, letterSpacing: "-0.02em", color: hex(design.text) }}>{label}</span>
          </div>
        );
      })}
      <svg width={format.width} height={format.height} viewBox={`0 0 ${format.width} ${format.height}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
        <PlacedPath design={design}>
          <AnimatedPath d={path(design.pathId || "connect")} progress={connect} color={hex(design.pathColor)} width={design.pathWidth} />
          <PathDot x={160} y={420} r={5} fill={hex(design.pathColor)} opacity={connect > 0.05 ? 1 : 0} />
        </PlacedPath>
      </svg>
    </div>
  );
}

const stageY = [220, 460, 700, 940, 1180];

export function ProcessSteps(props: PostRenderProps) {
  const { design, progress, durationMs = 7000, editing, exporting, onDesignChange } = props;
  const { hex, format, path, safe } = useBrand();
  const duration = Math.max(400, durationMs / Math.max(0.25, design.animationSpeed || 1));
  const loop = useLoopProgress(duration, design.animationEnabled && progress === undefined);
  const p = usePostProgress(design, progress, loop);
  const draw = span(p, 0.08, 0.78);
  const hold = 1 - span(p, 0.9, 1);
  const labels = design.labels.length ? design.labels : ["One", "Two", "Three", "Four", "Five"];
  return (
    <div style={{ opacity: hold }}>
      {design.eyebrow ? (
        <div style={{ position: "absolute", top: safe, left: safe }}>
          <Kicker color={hex(design.accent)} opacity={0.85}>{design.eyebrow}</Kicker>
        </div>
      ) : null}
      <PlacedLogo {...props} wordSize={32} />
      <svg width={format.width} height={format.height} viewBox={`0 0 ${format.width} ${format.height}`} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <PlacedPath design={design}>
          <AnimatedPath d={path(design.pathId || "spine")} progress={draw} color={hex(design.pathColor)} width={design.pathWidth} />
          {labels.map((label, i) => (
            <PathDot key={label} x={format.width / 2} y={stageY[i] ?? 220 + i * 240} r={6} fill={hex(design.pathColor)} opacity={draw > i / labels.length + 0.04 ? 1 : 0} />
          ))}
        </PlacedPath>
      </svg>
      {labels.map((label, i) => {
        const visible = span(p, 0.1 + i * 0.13, 0.18 + i * 0.13);
        const side = i % 2 === 0 ? "left" : "right";
        const y = stageY[i] ?? 220 + i * 240;
        return (
          <div key={label} style={{ position: "absolute", top: y - 28, left: side === "left" ? safe : undefined, right: side === "right" ? safe : undefined, width: 360, opacity: visible, transform: `translateY(${(1 - visible) * 18}px)`, textAlign: side }}>
            <DisplayText color={hex(design.text)} size={52} align={side}>{label}</DisplayText>
          </div>
        );
      })}
    </div>
  );
}

export function PhotoHeadline(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, format, path, safe, project } = useBrand();
  const src = design.imageSrc || project.assets.find((a) => a.category === "photography")?.src || "";
  return (
    <>
      {src ? (
        <CoverImage src={src} width={format.width} height={format.height} overlay={photoOverlay(hex(design.overlayColor), design.overlayIntensity)} objectX={design.imageObjectX} objectY={design.imageObjectY} zoom={design.imageZoom} grayscale={design.imageGrayscale} opacity={design.imageOpacity} />
      ) : null}
      <svg width={format.width} height={format.height} viewBox={`0 0 ${format.width} ${format.height}`} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <PlacedPath design={design}>
          <AnimatedPath d={path(design.pathId || "photo")} progress={1} color={hex(design.pathColor)} width={design.pathWidth} opacity={0.7} />
        </PlacedPath>
      </svg>
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", left: safe, right: safe, top: 180 }}>
        <DisplayText color={hex(design.text)} size={108}><Lines text={design.headline} /></DisplayText>
      </EditableBlock>
      <PlacedLogo {...props} wordSize={30} />
    </>
  );
}

export function ProductValue(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, safe, format, project } = useBrand();
  const src = design.imageSrc || project.assets.find((a) => a.category === "ui")?.src;
  return (
    <>
      <PlacedLogo {...props} height={48} />
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", top: 200, left: safe, right: safe }}>
        <DisplayText color={hex(design.text)} size={86}><Lines text={design.headline} /></DisplayText>
        <div style={{ marginTop: 40, maxWidth: 640 }}>
          <BodyText color={hex(design.text)} size={28} opacity={0.72}><Lines text={design.supporting} /></BodyText>
        </div>
      </EditableBlock>
      {src ? (
        <img src={src} alt="" style={{ position: "absolute", left: safe, right: safe, bottom: safe, width: format.width - safe * 2, height: 420, objectFit: "cover" }} />
      ) : null}
    </>
  );
}

export function BrandCta(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, format, path, safe } = useBrand();
  return (
    <>
      <PlacedMark {...props} height={980} opacity={0.14} rotate="-18deg" style={{ top: -180, left: -160 }} />
      <svg width={format.width} height={format.height} viewBox={`0 0 ${format.width} ${format.height}`} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <PlacedPath design={design}>
          <AnimatedPath d={path(design.pathId || "cta")} progress={1} color={hex(design.pathColor)} width={design.pathWidth} opacity={0.85} />
        </PlacedPath>
      </svg>
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", left: safe, right: safe, top: 430 }}>
        <DisplayText color={hex(design.text)} size={72}><Lines text={design.headline} /></DisplayText>
      </EditableBlock>
      <PlacedLogo {...props} wordSize={36} />
      {design.cta ? (
        <EditableBlock editing={editing} exporting={exporting} x={design.supportX} y={design.supportY} onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })} style={{ position: "absolute", right: safe, bottom: safe }}>
          <BodyText color={hex(design.accent)} size={24} opacity={1}>{design.cta}</BodyText>
        </EditableBlock>
      ) : null}
    </>
  );
}

export function Quote(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, safe } = useBrand();
  return (
    <>
      <PlacedLogo {...props} />
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", left: safe, right: safe, top: 360 }}>
        <DisplayText color={hex(design.text)} size={72}><Lines text={design.headline} /></DisplayText>
        <div style={{ marginTop: 36 }}>
          <BodyText color={hex(design.text)} size={28} opacity={0.7}><Lines text={design.supporting} /></BodyText>
        </div>
      </EditableBlock>
      {design.cta ? (
        <div style={{ position: "absolute", left: safe, bottom: safe }}>
          <BodyText color={hex(design.accent)} size={22}>{design.cta}</BodyText>
        </div>
      ) : null}
    </>
  );
}

export function Announcement(props: PostRenderProps) {
  const { design } = props;
  const { hex, safe } = useBrand();
  return (
    <>
      <PlacedLogo {...props} />
      <div style={{ position: "absolute", left: safe, right: safe, top: 280 }}>
        {design.eyebrow ? <Kicker color={hex(design.accent)}>{design.eyebrow}</Kicker> : null}
        <div style={{ marginTop: 24 }}>
          <DisplayText color={hex(design.text)} size={84}><Lines text={design.headline} /></DisplayText>
        </div>
        <div style={{ marginTop: 32, maxWidth: 720 }}>
          <BodyText color={hex(design.text)} size={30} opacity={0.75}><Lines text={design.supporting} /></BodyText>
        </div>
      </div>
    </>
  );
}

export function Metric(props: PostRenderProps) {
  const { design } = props;
  const { hex, safe } = useBrand();
  return (
    <>
      <PlacedLogo {...props} />
      <div style={{ position: "absolute", left: safe, right: safe, top: 360 }}>
        {design.eyebrow ? <Kicker color={hex(design.accent)}>{design.eyebrow}</Kicker> : null}
        <div style={{ marginTop: 28 }}>
          <DisplayText color={hex(design.text)} size={140}><Lines text={design.headline} /></DisplayText>
        </div>
        <div style={{ marginTop: 28, maxWidth: 680 }}>
          <BodyText color={hex(design.text)} size={30} opacity={0.72}><Lines text={design.supporting} /></BodyText>
        </div>
      </div>
    </>
  );
}

export function CarouselCover(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, safe } = useBrand();
  return (
    <>
      <PlacedMark {...props} height={920} opacity={0.12} style={{ top: 240, right: -220 }} />
      <PlacedLogo {...props} height={48} />
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", left: safe, right: safe, top: 520 }}>
        <DisplayText color={hex(design.text)} size={118}><Lines text={design.headline} /></DisplayText>
      </EditableBlock>
      <EditableBlock editing={editing} exporting={exporting} x={design.supportX} y={design.supportY} onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })} style={{ position: "absolute", left: safe, right: safe + 80, bottom: safe + 28, maxWidth: 720 }}>
        <BodyText color={hex(design.text)} size={32} opacity={0.78}><Lines text={design.supporting} /></BodyText>
      </EditableBlock>
    </>
  );
}

export function Editorial(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, format, path, safe } = useBrand();
  return (
    <>
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", top: 160, left: safe, right: safe }}>
        <DisplayText color={hex(design.text)} size={78}><Lines text={design.headline} /></DisplayText>
      </EditableBlock>
      <EditableBlock editing={editing} exporting={exporting} x={design.supportX} y={design.supportY} onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })} style={{ position: "absolute", top: 620, left: safe, right: safe, maxWidth: 780 }}>
        <BodyText color={hex(design.text)} size={30} opacity={0.78}><Lines text={design.supporting} /></BodyText>
      </EditableBlock>
      <svg width={format.width} height={format.height} viewBox={`0 0 ${format.width} ${format.height}`} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <PlacedPath design={design}>
          <AnimatedPath d={path(design.pathId || "sweep")} progress={1} color={hex(design.pathColor)} width={design.pathWidth} opacity={0.45} />
        </PlacedPath>
      </svg>
    </>
  );
}

export function Principles(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, safe } = useBrand();
  const items = [0, 1, 2].map((i) => ({ title: design.labels[i * 2] ?? "", body: design.labels[i * 2 + 1] ?? "" }));
  return (
    <>
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", top: 140, left: safe, right: safe }}>
        <DisplayText color={hex(design.text)} size={56}><Lines text={design.headline} /></DisplayText>
      </EditableBlock>
      <div style={{ position: "absolute", left: safe, right: safe, top: 560, display: "flex", flexDirection: "column", gap: 56 }}>
        {items.map((item) =>
          item.title ? (
            <div key={item.title}>
              <p style={{ margin: 0, fontSize: 22, letterSpacing: "0.16em", textTransform: "uppercase", color: hex(design.accent) }}>{item.title}</p>
              <BodyText color={hex(design.text)} size={28} opacity={0.78} style={{ marginTop: 12, maxWidth: 780 }}>{item.body}</BodyText>
            </div>
          ) : null,
        )}
      </div>
    </>
  );
}

export function TeamIntro(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, safe } = useBrand();
  const people = [0, 1, 2].map((i) => ({ name: design.labels[i * 2] ?? "", role: design.labels[i * 2 + 1] ?? "" })).filter((p) => p.name);
  return (
    <>
      <PlacedLogo {...props} wordSize={30} />
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", top: safe, left: safe, right: 220 }}>
        {design.eyebrow ? <Kicker color={hex(design.accent)} opacity={0.8}>{design.eyebrow}</Kicker> : null}
        <div style={{ marginTop: 28 }}>
          <DisplayText color={hex(design.text)} size={64}><Lines text={design.headline} /></DisplayText>
        </div>
      </EditableBlock>
      <div style={{ position: "absolute", left: safe, right: safe, top: 560, display: "flex", flexDirection: "column", gap: 56 }}>
        {people.map((person) => (
          <div key={person.name}>
            <span style={{ display: "flex", width: 72, height: 72, alignItems: "center", justifyContent: "center", border: `1px solid ${hex(design.accent)}55`, color: hex(design.accent), fontSize: 20, letterSpacing: "0.08em", marginBottom: 18 }}>
              {person.name.split(" ").filter(Boolean).map((part) => part[0]).join("")}
            </span>
            <DisplayText color={hex(design.text)} size={48}>{person.name}</DisplayText>
            <BodyText color={hex(design.text)} size={24} opacity={0.62} style={{ marginTop: 8 }}>{person.role}</BodyText>
          </div>
        ))}
      </div>
      {design.supporting ? (
        <EditableBlock editing={editing} exporting={exporting} x={design.supportX} y={design.supportY} onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })} style={{ position: "absolute", left: safe, bottom: safe }}>
          <BodyText color={hex(design.text)} size={22} opacity={0.55}>{design.supporting}</BodyText>
        </EditableBlock>
      ) : null}
    </>
  );
}

export function Manifesto(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, format, path, safe } = useBrand();
  return (
    <>
      <PlacedMark {...props} height={1100} opacity={0.13} rotate="-12deg" style={{ top: -80, left: -200 }} />
      <svg width={format.width} height={format.height} viewBox={`0 0 ${format.width} ${format.height}`} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <PlacedPath design={design}>
          <AnimatedPath d={path(design.pathId || "cta")} progress={1} color={hex(design.pathColor)} width={design.pathWidth} opacity={0.7} />
        </PlacedPath>
      </svg>
      <EditableBlock editing={editing} exporting={exporting} x={design.headlineX} y={design.headlineY} onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })} style={{ position: "absolute", left: safe, right: safe, top: 560 }}>
        <DisplayText color={hex(design.text)} size={84}><Lines text={design.headline} /></DisplayText>
      </EditableBlock>
      <EditableBlock editing={editing} exporting={exporting} x={design.supportX} y={design.supportY} onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })} style={{ position: "absolute", left: safe, bottom: safe + 20 }}>
        <BodyText color={hex(design.text)} size={32} opacity={0.82}><Lines text={design.supporting} /></BodyText>
      </EditableBlock>
    </>
  );
}
