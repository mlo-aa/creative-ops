"use client";

import { BodyText, DisplayText } from "@/core/canvas/Type";
import { EditableBlock } from "@/core/editor/EditableBlock";
import { Lines, usePostProgress } from "@/core/editor/placement";
import { span, useLoopProgress } from "@/core/export/timing";
import { useBrand } from "@/core/project/context";
import type { DesignState, PostRenderProps, TemplateControls } from "@/core/types";
import type { CSSProperties, ReactNode } from "react";

const TEXTURE_DEFAULT = "/projects/offerhub/textures/gradient.png";

export const OFFERHUB_TEMPLATE_LIST = [
  { id: "oh-brand-intro", name: "Big statement / brand intro" },
  { id: "oh-compare", name: "Client ↔ Freelancer / compare" },
  { id: "oh-payments", name: "Marketplace feature / payments" },
  { id: "oh-escrow", name: "Escrow flow" },
  { id: "oh-editorial", name: "Editorial / why we built" },
  { id: "oh-ecosystem", name: "Ecosystem" },
  { id: "oh-cta", name: "Offer / agreement CTA" },
  { id: "oh-product", name: "Product UI" },
  { id: "oh-reputation", name: "Reputation / story" },
];

const ohControls = (
  partial: Partial<TemplateControls> & Pick<TemplateControls, "copy">,
): TemplateControls => ({
  colors: ["background", "text", "accent"],
  logo: true,
  mark: false,
  image: false,
  path: false,
  texture: true,
  animation: false,
  ...partial,
});

export const OFFERHUB_TEMPLATE_CONTROLS: Record<string, TemplateControls> = {
  "oh-brand-intro": ohControls({ copy: ["headline", "supporting", "eyebrow", "cta"], path: true }),
  "oh-compare": ohControls({ copy: ["headline", "supporting", "labels", "eyebrow"], animation: true }),
  "oh-payments": ohControls({ copy: ["headline", "supporting", "cta", "eyebrow"], image: true, path: true }),
  "oh-escrow": ohControls({ copy: ["headline", "supporting", "labels", "eyebrow"], animation: true }),
  "oh-editorial": ohControls({ copy: ["headline", "supporting", "cta", "eyebrow"], image: true }),
  "oh-ecosystem": ohControls({ copy: ["headline", "supporting", "labels", "cta", "eyebrow"], path: true }),
  "oh-cta": ohControls({ copy: ["headline", "supporting", "cta", "eyebrow"], image: true }),
  "oh-product": ohControls({ copy: ["headline", "labels", "eyebrow"], image: true, animation: true }),
  "oh-reputation": ohControls({ copy: ["headline", "supporting", "cta", "labels", "eyebrow"], animation: true }),
};

function bold(style?: CSSProperties): CSSProperties {
  return { fontWeight: 700, letterSpacing: "-0.055em", lineHeight: 0.88, ...style };
}

function Meta({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color: string;
  style?: CSSProperties;
}) {
  const { font } = useBrand();
  return (
    <p
      style={{
        margin: 0,
        color,
        fontFamily: font.body,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        opacity: 0.72,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function Grain({ opacity = 0.12 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        mixBlendMode: "overlay",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        backgroundSize: "180px 180px",
      }}
    />
  );
}

function TextureLayer({
  design,
  mode = "cover",
  mask,
  style,
}: {
  design: DesignState;
  mode?: "cover" | "strip" | "circle" | "block";
  mask?: string;
  style?: CSSProperties;
}) {
  const { project, format } = useBrand();
  if (!design.textureVisible) return null;
  const src =
    design.textureSrc ||
    project.assets.find((a) => a.id === "texture" || a.id === "gradient")?.src ||
    TEXTURE_DEFAULT;
  const common: CSSProperties = {
    position: "absolute",
    opacity: design.textureOpacity,
    filter: design.textureBlur > 0 ? `blur(${design.textureBlur}px)` : undefined,
    transform: `translate(${design.textureX}px, ${design.textureY}px) rotate(${design.textureRotation}deg) scale(${design.textureScale})`,
    transformOrigin: "center center",
    backgroundImage: `url(${src})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    ...style,
  };
  if (mode === "circle") {
    return (
      <div
        aria-hidden
        style={{
          ...common,
          width: 720,
          height: 720,
          borderRadius: "50%",
          left: "50%",
          top: "50%",
          marginLeft: -360,
          marginTop: -360,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
    );
  }
  if (mode === "strip") {
    return <div aria-hidden style={{ ...common, left: -80, right: -80, height: 280, top: 520 }} />;
  }
  if (mode === "block") {
    return <div aria-hidden style={{ ...common, width: 520, height: 640, right: -80, top: 180 }} />;
  }
  return (
    <div
      aria-hidden
      style={{
        ...common,
        inset: -40,
        width: format.width + 80,
        height: format.height + 80,
      }}
    />
  );
}

function OfferLogo({
  design,
  editing,
  exporting,
  onDesignChange,
  height = 36,
  light = false,
}: PostRenderProps & { height?: number; light?: boolean }) {
  const { project, safe, font, hex } = useBrand();
  if (!design.showLogo) return null;
  const dark = light || design.background === "navy" || design.background === "teal";
  const top = design.logoPosition.startsWith("top");
  const left = design.logoPosition.endsWith("left");
  const wrap: CSSProperties = {
    position: "absolute",
    top: top ? safe : undefined,
    bottom: top ? undefined : safe,
    left: left ? safe : undefined,
    right: left ? undefined : safe,
    zIndex: 5,
  };

  if (!dark || design.logoMode === "wordmark") {
    return (
      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.logoX}
        y={design.logoY}
        onChange={(logoX, logoY) => onDesignChange?.({ logoX, logoY })}
        style={wrap}
      >
        <span
          style={{
            display: "inline-flex",
            fontFamily: font.primary,
            fontWeight: 700,
            fontSize: Math.round(height * 0.5),
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          <span style={{ color: dark ? hex("white") : hex("navy") }}>OFFER</span>
          <span style={{ color: hex("teal") }}>-HUB</span>
        </span>
      </EditableBlock>
    );
  }

  const src =
    project.assets.find((a) => a.id === "mark-light")?.src ||
    project.brand.logos.find((l) => l.role === "light")?.src;
  if (!src) return null;
  return (
    <EditableBlock
      editing={editing}
      exporting={exporting}
      x={design.logoX}
      y={design.logoY}
      onChange={(logoX, logoY) => onDesignChange?.({ logoX, logoY })}
      style={wrap}
    >
      <img
        src={src}
        alt=""
        height={height}
        style={{ display: "block", height, width: "auto", objectFit: "contain", mixBlendMode: "screen" }}
      />
    </EditableBlock>
  );
}

function PhotoLayer({
  design,
  opacity = 1,
  style,
}: {
  design: DesignState;
  opacity?: number;
  style?: CSSProperties;
}) {
  const { project, format, hex } = useBrand();
  const src =
    design.imageSrc ||
    project.assets.find((a) => a.category === "photography")?.src ||
    "";
  if (!src) return null;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <img
        src={src}
        alt=""
        style={{
          width: "120%",
          height: "120%",
          objectFit: "cover",
          objectPosition: `${design.imageObjectX}% ${design.imageObjectY}%`,
          transform: `scale(${design.imageZoom})`,
          filter: design.imageGrayscale ? "grayscale(1) contrast(1.15)" : "contrast(1.08)",
          opacity: opacity * design.imageOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, ${hex(design.overlayColor)}f2 0%, ${hex(design.overlayColor)}88 42%, ${hex(design.overlayColor)}d9 100%)`,
          opacity: Math.max(0.35, design.overlayIntensity),
          mixBlendMode: "multiply",
        }}
      />
      <span style={{ display: "none" }}>{format.width}</span>
    </div>
  );
}

/** POST 01 — Brand / texture poster */
export function OhBrandIntro(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, format, safe } = useBrand();
  const text = hex(design.text);
  const accent = hex(design.accent);
  return (
    <>
      <TextureLayer design={design} mode="cover" />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(160deg, ${hex("navy")}55 0%, transparent 45%, ${hex("navy")}aa 100%)`,
        }}
      />
      <Grain opacity={0.16} />
      <OfferLogo {...props} height={40} light />
      <Meta color={text} style={{ position: "absolute", top: safe + 56, right: safe }}>
        {design.eyebrow || "01 / GLOBAL WORK"}
      </Meta>

      {/* Oversized O fragment */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -180,
          top: 180,
          width: 520,
          height: 520,
          borderRadius: "50%",
          border: `28px solid ${accent}`,
          opacity: 0.35,
          transform: `scale(${design.pathScale || 1}) translate(${design.pathX}px, ${design.pathY}px)`,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 40,
          bottom: 220,
          width: 28,
          height: 220,
          background: accent,
          opacity: 0.85,
          transform: `translate(${design.pathX}px, ${design.pathY}px)`,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 90,
          bottom: 220,
          width: 28,
          height: 220,
          background: text,
          opacity: 0.35,
        }}
      />

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.headlineX}
        y={design.headlineY}
        onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })}
        style={{ position: "absolute", left: safe - 8, right: 40, top: 260 }}
      >
        <DisplayText color={text} size={128} style={bold({ fontSize: 128 })}>
          <Lines text={design.headline} />
        </DisplayText>
      </EditableBlock>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.supportX}
        y={design.supportY}
        onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })}
        style={{ position: "absolute", left: safe, right: safe + 160, bottom: safe + 72, maxWidth: 620 }}
      >
        <BodyText color={text} size={26} opacity={0.82} style={{ fontWeight: 300 }}>
          <Lines text={design.supporting} />
        </BodyText>
        {design.cta ? (
          <p style={{ margin: "28px 0 0", color: accent, fontSize: 16, letterSpacing: "0.14em", fontWeight: 600 }}>
            {design.cta}
          </p>
        ) : null}
      </EditableBlock>
      <Meta color={text} style={{ position: "absolute", left: safe, bottom: safe }}>
        OFFER-HUB / 2026
      </Meta>
      <span style={{ display: "none" }}>{format.width}</span>
    </>
  );
}

/** POST 02 — Fragmented → connected */
export function OhCompare(props: PostRenderProps) {
  const { design, progress, durationMs = 5500, editing, exporting, onDesignChange } = props;
  const { hex, format, safe } = useBrand();
  const duration = Math.max(400, durationMs / Math.max(0.25, design.animationSpeed || 1));
  const loop = useLoopProgress(duration, design.animationEnabled && progress === undefined);
  const p = usePostProgress(design, progress, loop);
  const connect = span(p, 0.25, 0.72);
  const hold = 1 - span(p, 0.92, 1);
  const text = hex(design.text);
  const accent = hex(design.accent);
  const slate = hex("slate");
  const navy = hex("navy");
  const rights = design.labels.slice(0, 3);

  return (
    <div style={{ opacity: hold }}>
      <div style={{ position: "absolute", inset: 0, background: hex(design.background) }} />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${42 + connect * 18}%`,
          background: navy,
          transition: "none",
        }}
      />
      <TextureLayer
        design={design}
        mode="block"
        style={{
          right: -120 + connect * 40,
          top: 120,
          opacity: 0.25 + connect * 0.75,
          clipPath: `inset(0 ${Math.max(0, 70 - connect * 70)}% 0 0)`,
        }}
      />
      <Grain opacity={0.1} />
      <OfferLogo {...props} height={34} />
      <Meta color={text} style={{ position: "absolute", top: safe + 48, right: safe }}>
        {design.eyebrow || "02 / FREELANCING"}
      </Meta>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.headlineX}
        y={design.headlineY}
        onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })}
        style={{ position: "absolute", left: safe, right: safe, top: 220 }}
      >
        <DisplayText color={text} size={96} style={bold({ fontSize: 96 })}>
          <Lines text={design.headline} />
        </DisplayText>
      </EditableBlock>

      {/* Fragmented left glyphs */}
      {["FRICTION", "FEES", "BORDERS"].map((word, i) => {
        const scatter = 1 - connect;
        return (
          <p
            key={word}
            style={{
              position: "absolute",
              left: safe + i * 18,
              top: 720 + i * 70,
              margin: 0,
              color: slate,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.08em",
              opacity: 0.35 + scatter * 0.45,
              transform: `translate(${(-40 - i * 24) * scatter}px, ${(i - 1) * 18 * scatter}px) rotate(${(-8 + i * 5) * scatter}deg)`,
            }}
          >
            {word}
          </p>
        );
      })}

      <div style={{ position: "absolute", right: safe, top: 780, width: 360, textAlign: "right" }}>
        {(rights.length ? rights : ["Global collaboration", "Secure payments", "Direct communication"]).map(
          (label, i) => (
            <p
              key={label}
              style={{
                margin: `0 0 18px`,
                color: navy,
                fontSize: 22,
                fontWeight: 600,
                opacity: span(p, 0.4 + i * 0.08, 0.55 + i * 0.08),
                transform: `translateX(${(1 - span(p, 0.4 + i * 0.08, 0.55 + i * 0.08)) * 40}px)`,
              }}
            >
              {label}
            </p>
          ),
        )}
      </div>

      <svg width={format.width} height={format.height} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <line
          x1={180}
          y1={1100}
          x2={180 + 700 * connect}
          y2={1100}
          stroke={accent}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={180 + 700 * connect} cy={1100} r={8} fill={accent} opacity={connect > 0.2 ? 1 : 0} />
      </svg>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.supportX}
        y={design.supportY}
        onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })}
        style={{ position: "absolute", left: safe, bottom: safe + 36, maxWidth: 480 }}
      >
        <BodyText color={text} size={22} opacity={0.7} style={{ fontWeight: 300 }}>
          <Lines text={design.supporting} />
        </BodyText>
      </EditableBlock>
    </div>
  );
}

/** POST 03 — Global payments poster */
export function OhPayments(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, format, safe } = useBrand();
  const text = hex(design.text);
  const accent = hex(design.accent);
  const navy = hex("navy");
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: hex(design.background) }} />
      <PhotoLayer design={design} opacity={0.35} />
      <TextureLayer
        design={design}
        mode="circle"
        style={{
          left: "auto",
          right: -160,
          top: 380,
          marginLeft: 0,
          marginTop: 0,
          width: 780,
          height: 780,
        }}
      />
      <Grain opacity={0.12} />
      <OfferLogo {...props} height={34} />
      <Meta color={navy} style={{ position: "absolute", top: safe + 48, right: safe }}>
        {design.eyebrow || "03 / PAYMENTS"}
      </Meta>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.headlineX}
        y={design.headlineY}
        onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })}
        style={{ position: "absolute", left: safe - 4, right: 60, top: 200 }}
      >
        <DisplayText color={navy} size={92} style={bold({ fontSize: 92 })}>
          <Lines text={design.headline} />
        </DisplayText>
      </EditableBlock>

      <Meta color={navy} style={{ position: "absolute", left: safe, top: 980 }}>
        CLIENT
      </Meta>
      <Meta color={navy} style={{ position: "absolute", right: safe, top: 1180 }}>
        FREELANCER
      </Meta>
      <svg width={format.width} height={format.height} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <path
          d={`M ${safe + 40} 1000 C 360 960, 620 1220, ${format.width - safe - 40} 1200`}
          fill="none"
          stroke={accent}
          strokeWidth={3}
          strokeDasharray="10 12"
          opacity={0.85}
          transform={`translate(${design.pathX} ${design.pathY}) scale(${design.pathScale})`}
        />
      </svg>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.supportX}
        y={design.supportY}
        onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })}
        style={{ position: "absolute", left: safe, bottom: safe + 48, maxWidth: 560 }}
      >
        <BodyText color={navy} size={24} opacity={0.75} style={{ fontWeight: 300 }}>
          <Lines text={design.supporting} />
        </BodyText>
        {design.cta ? (
          <p style={{ margin: "20px 0 0", color: accent, fontSize: 15, letterSpacing: "0.16em", fontWeight: 600 }}>
            {design.cta}
          </p>
        ) : null}
      </EditableBlock>
      <span style={{ display: "none" }}>{text}</span>
    </>
  );
}

/** POST 04 — Escrow motion metaphor */
export function OhEscrow(props: PostRenderProps) {
  const { design, progress, durationMs = 6500, editing, exporting, onDesignChange } = props;
  const { hex, format, safe } = useBrand();
  const duration = Math.max(400, durationMs / Math.max(0.25, design.animationSpeed || 1));
  const loop = useLoopProgress(duration, design.animationEnabled && progress === undefined);
  const p = usePostProgress(design, progress, loop);
  const into = span(p, 0.08, 0.35);
  const holdEscrow = span(p, 0.35, 0.62);
  const release = span(p, 0.62, 0.88);
  const pulse = span(p, 0.55, 0.7);
  const fade = 1 - span(p, 0.93, 1);
  const text = hex(design.text);
  const accent = hex(design.accent);
  const slate = hex("slate");
  const dotX = 180 + into * 360 + release * 360;

  return (
    <div style={{ opacity: fade }}>
      <div style={{ position: "absolute", inset: 0, background: hex(design.background) }} />
      <TextureLayer design={design} mode="strip" style={{ top: 640, height: 320, opacity: 0.45 + holdEscrow * 0.35 }} />
      <Grain opacity={0.14} />
      <OfferLogo {...props} height={34} light />
      <Meta color={text} style={{ position: "absolute", top: safe + 48, right: safe }}>
        {design.eyebrow || "04 / ESCROW"}
      </Meta>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.headlineX}
        y={design.headlineY}
        onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })}
        style={{ position: "absolute", left: safe - 4, right: safe, top: 200 }}
      >
        <DisplayText color={text} size={110} style={bold({ fontSize: 110 })}>
          <Lines text={design.headline} />
        </DisplayText>
      </EditableBlock>

      <Meta color={slate} style={{ position: "absolute", left: safe, top: 760 }}>
        CLIENT
      </Meta>
      <Meta color={slate} style={{ position: "absolute", right: safe, top: 760 }}>
        FREELANCER
      </Meta>

      {/* Escrow vessel */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 820,
          width: 220 + pulse * 24,
          height: 220 + pulse * 24,
          marginLeft: -(110 + pulse * 12),
          borderRadius: "50%",
          border: `3px solid ${accent}`,
          background: `${accent}${Math.round(20 + holdEscrow * 40)
            .toString(16)
            .padStart(2, "0")}`,
          boxShadow: pulse > 0 ? `0 0 ${40 * pulse}px ${accent}66` : undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: accent, fontSize: 22, fontWeight: 700, letterSpacing: "0.2em" }}>ESCROW</span>
      </div>

      <svg width={format.width} height={format.height} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <line x1={160} y1={930} x2={920} y2={930} stroke={slate} strokeWidth={2} opacity={0.35} />
        <circle cx={dotX} cy={930} r={14} fill={accent} />
      </svg>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.supportX}
        y={design.supportY}
        onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })}
        style={{ position: "absolute", left: safe, bottom: safe + 40, maxWidth: 640 }}
      >
        <BodyText color={text} size={26} opacity={0.75} style={{ fontWeight: 300 }}>
          <Lines text={design.supporting} />
        </BodyText>
      </EditableBlock>
      <Meta color={text} style={{ position: "absolute", right: safe, bottom: safe }}>
        SECURED BY ESCROW
      </Meta>
    </div>
  );
}

/** POST 05 — Human / editorial photo */
export function OhEditorial(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, safe } = useBrand();
  const text = hex(design.text);
  const accent = hex(design.accent);
  return (
    <>
      <PhotoLayer design={design} opacity={1} />
      <TextureLayer
        design={design}
        mode="block"
        style={{ left: -100, top: -40, width: 480, height: 420, opacity: 0.55, mixBlendMode: "screen" }}
      />
      <Grain opacity={0.18} />
      <OfferLogo {...props} height={34} light />
      <Meta color={text} style={{ position: "absolute", top: safe + 48, right: safe }}>
        {design.eyebrow || "05 / WHY WE BUILD"}
      </Meta>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.headlineX}
        y={design.headlineY}
        onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })}
        style={{ position: "absolute", left: safe - 4, right: 40, top: 420 }}
      >
        <DisplayText color={text} size={100} style={bold({ fontSize: 100 })}>
          <Lines text={design.headline} />
        </DisplayText>
      </EditableBlock>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.supportX}
        y={design.supportY}
        onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })}
        style={{ position: "absolute", left: safe, right: safe + 40, bottom: safe + 64, maxWidth: 720 }}
      >
        <BodyText color={text} size={24} opacity={0.84} style={{ fontWeight: 300 }}>
          <Lines text={design.supporting} />
        </BodyText>
        {design.cta ? (
          <p style={{ margin: "24px 0 0", color: accent, fontSize: 15, letterSpacing: "0.16em", fontWeight: 600 }}>
            {design.cta}
          </p>
        ) : null}
      </EditableBlock>
    </>
  );
}

/** POST 06 — Why Stellar / infrastructure */
export function OhEcosystem(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, format, safe } = useBrand();
  const text = hex(design.text);
  const accent = hex(design.accent);
  const slate = hex("slate");
  const points =
    design.labels.length >= 3
      ? design.labels.slice(0, 3)
      : ["Fast settlement", "Low-cost transactions", "Built for cross-border value"];

  return (
    <>
      <TextureLayer design={design} mode="cover" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 70% 30%, transparent 0%, ${hex("navy")}cc 70%)`,
        }}
      />
      <Grain opacity={0.15} />
      <OfferLogo {...props} height={34} light />
      <Meta color={text} style={{ position: "absolute", top: safe + 48, right: safe }}>
        {design.eyebrow || "06 / INFRASTRUCTURE"}
      </Meta>

      <svg width={format.width} height={format.height} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <g transform={`translate(${design.pathX} ${design.pathY}) scale(${design.pathScale})`}>
          <circle cx={820} cy={280} r={210} fill="none" stroke={accent} strokeWidth={2} opacity={0.55} />
          <circle cx={820} cy={280} r={340} fill="none" stroke={text} strokeWidth={1.5} opacity={0.2} />
          <circle cx={820} cy={280} r={470} fill="none" stroke={accent} strokeWidth={1} opacity={0.15} />
          <circle cx={980} cy={180} r={8} fill={accent} />
          <circle cx={640} cy={420} r={6} fill={slate} />
        </g>
      </svg>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.headlineX}
        y={design.headlineY}
        onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })}
        style={{ position: "absolute", left: safe - 4, right: 80, top: 260 }}
      >
        <DisplayText color={text} size={88} style={bold({ fontSize: 88 })}>
          <Lines text={design.headline} />
        </DisplayText>
      </EditableBlock>

      <p
        style={{
          position: "absolute",
          left: safe,
          top: 780,
          margin: 0,
          color: accent,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.03em",
        }}
      >
        {design.supporting || "Why Stellar?"}
      </p>

      <div style={{ position: "absolute", left: safe, right: safe, bottom: safe + 72 }}>
        {points.map((point) => (
          <p
            key={point}
            style={{
              margin: "0 0 14px",
              color: text,
              fontSize: 20,
              fontWeight: 400,
              opacity: 0.7,
              letterSpacing: "-0.01em",
            }}
          >
            — {point}
          </p>
        ))}
      </div>
      <Meta color={accent} style={{ position: "absolute", right: safe, bottom: safe }}>
        {design.cta || "BUILT ON STELLAR"}
      </Meta>
    </>
  );
}

/** POST 07 — CTA poster */
export function OhCta(props: PostRenderProps) {
  const { design, editing, exporting, onDesignChange } = props;
  const { hex, safe } = useBrand();
  const text = hex(design.text);
  const accent = hex(design.accent);
  const navy = hex("navy");
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: hex(design.background) }} />
      <PhotoLayer design={design} opacity={0.55} />
      <TextureLayer
        design={design}
        mode="cover"
        style={{ mixBlendMode: "multiply", opacity: design.textureOpacity }}
      />
      <Grain opacity={0.14} />
      <OfferLogo {...props} height={36} />
      <Meta color={navy} style={{ position: "absolute", top: safe + 48, right: safe }}>
        {design.eyebrow || "07 / START"}
      </Meta>

      {/* Oversized mark fragment leaving frame */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -220,
          bottom: -160,
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: accent,
          opacity: 0.9,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 40,
          bottom: 80,
          width: 36,
          height: 260,
          background: navy,
          opacity: 0.85,
        }}
      />

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.headlineX}
        y={design.headlineY}
        onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })}
        style={{ position: "absolute", left: safe - 4, right: 120, top: 240 }}
      >
        <DisplayText color={navy} size={100} style={bold({ fontSize: 100 })}>
          <Lines text={design.headline} />
        </DisplayText>
      </EditableBlock>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.supportX}
        y={design.supportY}
        onChange={(supportX, supportY) => onDesignChange?.({ supportX, supportY })}
        style={{ position: "absolute", left: safe, bottom: safe + 120, maxWidth: 520 }}
      >
        <BodyText color={navy} size={24} opacity={0.72} style={{ fontWeight: 300 }}>
          <Lines text={design.supporting} />
        </BodyText>
        {design.cta ? (
          <p style={{ margin: "28px 0 0", color: accent, fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>
            {design.cta}
          </p>
        ) : null}
        <p style={{ margin: "10px 0 0", color: navy, fontSize: 16, letterSpacing: "0.12em", opacity: 0.6 }}>
          offer-hub.org
        </p>
      </EditableBlock>
      <span style={{ display: "none" }}>{text}</span>
    </>
  );
}

/** POST 08 — Product collage in motion */
export function OhProduct(props: PostRenderProps) {
  const { design, progress, durationMs = 5500, editing, exporting, onDesignChange } = props;
  const { hex, format, safe, project } = useBrand();
  const duration = Math.max(400, durationMs / Math.max(0.25, design.animationSpeed || 1));
  const loop = useLoopProgress(duration, design.animationEnabled && progress === undefined);
  const p = usePostProgress(design, progress, loop);
  const stages =
    design.labels.length >= 4
      ? design.labels.slice(0, 4)
      : ["Browse talent", "Review offer", "Collaborate", "Secure payment"];
  const stage = Math.min(stages.length - 1, Math.floor(span(p, 0.05, 0.9) * stages.length));
  const text = hex(design.text);
  const accent = hex(design.accent);
  const navy = hex("navy");
  const src =
    design.imageSrc ||
    project.assets.find((a) => a.id === "og-hero")?.src ||
    project.assets.find((a) => a.category === "ui")?.src ||
    "";
  const hold = 1 - span(p, 0.94, 1);
  const crops = [
    { x: 8, y: 12, z: 1.15 },
    { x: 42, y: 30, z: 1.35 },
    { x: 62, y: 48, z: 1.45 },
    { x: 28, y: 58, z: 1.25 },
  ];
  const crop = crops[stage] ?? crops[0];
  const slide = span(p, 0.05 + stage * 0.2, 0.18 + stage * 0.2);

  return (
    <div style={{ opacity: hold }}>
      <div style={{ position: "absolute", inset: 0, background: hex(design.background) }} />
      <TextureLayer design={design} mode="strip" style={{ top: -40, height: 260, opacity: 0.7 }} />
      <Grain opacity={0.1} />
      <OfferLogo {...props} height={34} />
      <Meta color={navy} style={{ position: "absolute", top: safe + 48, right: safe }}>
        {design.eyebrow || "08 / PRODUCT"}
      </Meta>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.headlineX}
        y={design.headlineY}
        onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })}
        style={{ position: "absolute", left: safe - 4, right: 40, top: 160 }}
      >
        <DisplayText color={navy} size={84} style={bold({ fontSize: 84 })}>
          <Lines text={design.headline} />
        </DisplayText>
      </EditableBlock>

      {/* Overlapping UI fragments leaving canvas */}
      {[0, 1, 2].map((i) => {
        const active = i === stage % 3;
        const y = 520 + i * 40;
        const x = 40 + i * 70 + (active ? slide * 20 : 0);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: format.width - 80,
              height: 520,
              overflow: "hidden",
              border: `1px solid ${active ? accent : `${navy}22`}`,
              transform: `rotate(${-2 + i}deg) scale(${active ? 1 : 0.96})`,
              opacity: active ? 1 : 0.45,
              zIndex: active ? 3 : 1,
              background: navy,
            }}
          >
            {src ? (
              <img
                src={src}
                alt=""
                style={{
                  width: "140%",
                  height: "140%",
                  objectFit: "cover",
                  objectPosition: `${design.imageObjectX || crop.x}% ${design.imageObjectY || crop.y}%`,
                  transform: `scale(${(design.imageZoom || 1) * crop.z})`,
                  opacity: 0.95,
                }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                left: 18,
                bottom: 18,
                padding: "8px 12px",
                background: `${navy}cc`,
                color: accent,
                fontSize: 14,
                letterSpacing: "0.12em",
                fontWeight: 600,
              }}
            >
              {stages[i] ?? stages[0]}
            </div>
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: safe,
          bottom: safe,
          display: "flex",
          gap: 16,
          zIndex: 5,
        }}
      >
        {stages.map((label, i) => (
          <span
            key={label}
            style={{
              color: i === stage ? accent : navy,
              fontSize: 12,
              letterSpacing: "0.14em",
              fontWeight: 600,
              opacity: i === stage ? 1 : 0.4,
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
        ))}
      </div>
      <span style={{ display: "none" }}>{text}</span>
    </div>
  );
}

/** POST 09 — Reputation / story forming */
export function OhReputation(props: PostRenderProps) {
  const { design, progress, durationMs = 6000, editing, exporting, onDesignChange } = props;
  const { hex, format, safe, font } = useBrand();
  const duration = Math.max(400, durationMs / Math.max(0.25, design.animationSpeed || 1));
  const loop = useLoopProgress(duration, design.animationEnabled && progress === undefined);
  const p = usePostProgress(design, progress, loop);
  const text = hex(design.text);
  const accent = hex(design.accent);
  const slate = hex("slate");
  const cards =
    design.labels.length >= 3
      ? design.labels.slice(0, 5)
      : ["Identity", "Launch", "Systems", "Growth", "Delivery"];
  const form = span(p, 0.15, 0.7);
  const seal = span(p, 0.65, 0.88);
  const hold = 1 - span(p, 0.94, 1);
  const phase = p < 0.4 ? design.headline : p < 0.7 ? design.supporting : design.cta || design.headline;

  return (
    <div style={{ opacity: hold }}>
      <div style={{ position: "absolute", inset: 0, background: hex(design.background) }} />
      <TextureLayer design={design} mode="circle" style={{ top: 520, opacity: 0.35 + seal * 0.4 }} />
      <Grain opacity={0.16} />
      <OfferLogo {...props} height={34} light />
      <Meta color={text} style={{ position: "absolute", top: safe + 48, right: safe }}>
        {design.eyebrow || "09 / STORY"}
      </Meta>

      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.headlineX}
        y={design.headlineY}
        onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })}
        style={{ position: "absolute", left: safe - 4, right: safe, top: 180 }}
      >
        <DisplayText color={text} size={88} style={bold({ fontSize: 88 })}>
          <Lines text={phase} />
        </DisplayText>
      </EditableBlock>

      {/* Fragments accumulate into a circular O */}
      <svg width={format.width} height={format.height} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <circle
          cx={540}
          cy={980}
          r={210}
          fill="none"
          stroke={accent}
          strokeWidth={18}
          strokeDasharray={`${1320 * seal} 1320`}
          opacity={0.85}
          transform="rotate(-90 540 980)"
        />
      </svg>

      {cards.map((card, i) => {
        const angle = -90 + i * (360 / cards.length);
        const rad = ((angle - 90) * Math.PI) / 180;
        const radius = 210 * form;
        const cx = 540 + Math.cos(rad) * radius;
        const cy = 980 + Math.sin(rad) * radius;
        const t = Math.max(0, Math.min(1, (form - i * 0.08) / 0.35));
        const scatterX = (1 - form) * (i % 2 === 0 ? -160 : 180);
        const scatterY = (1 - form) * (120 - i * 40);
        return (
          <div
            key={card}
            style={{
              position: "absolute",
              left: cx - 70 + scatterX,
              top: cy - 28 + scatterY,
              width: 140,
              padding: "14px 12px",
              borderLeft: `3px solid ${t > 0.7 ? accent : slate}`,
              background: `${hex("navy")}ee`,
              opacity: t,
              transform: `scale(${0.85 + t * 0.15})`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: font.body,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: slate,
              }}
            >
              Project
            </p>
            <p style={{ margin: "6px 0 0", color: text, fontSize: 18, fontWeight: 700 }}>{card}</p>
          </div>
        );
      })}

      <Meta color={accent} style={{ position: "absolute", left: safe, bottom: safe }}>
        CLIENT → FREELANCER
      </Meta>
    </div>
  );
}
