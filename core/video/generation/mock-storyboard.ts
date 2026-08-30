import type { ProjectCreativeContext } from "@/core/design/creativeContext";
import type { GenerateStoryboardBrief } from "@/core/video/generation/provider";
import {
  REEL_HEIGHT,
  REEL_WIDTH,
  uid,
  type VideoElement,
  type VideoScene,
  type VideoTransition,
} from "@/core/video/document";
import { buildSuggestedClipPrompt } from "@/core/video/clip/prompt";

export type MockSceneRole = "hook" | "problem" | "solution" | "value" | "cta";

export type MockScenePlan = {
  role: MockSceneRole;
  script: string;
  onScreenText: string;
  visualDirection: string;
  suggestedShot: string;
  transitionIn: VideoTransition;
  assetCategories: string[];
  assetSuggestionLabels: string[];
};

function isOfferHub(context: ProjectCreativeContext): boolean {
  const n = context.brand.name.toLowerCase();
  return context.projectId === "offerhub" || n.includes("offer-hub") || n.includes("offerhub");
}

function offerHubScenePlans(): MockScenePlan[] {
  return [
    {
      role: "hook",
      script: "Global work. Payment friction.",
      onScreenText: "GLOBAL WORK.\nREAL FRICTION.",
      visualDirection: "Fast-cut opener — freelancer at laptop, international time zones on screen.",
      suggestedShot: "Handheld close-up, cool teal grade, subtle motion blur on city lights.",
      transitionIn: { type: "fade-up", durationMs: 400 },
      assetCategories: ["photography"],
      assetSuggestionLabels: ["Remote freelancer at desk", "International collaboration photo"],
    },
    {
      role: "problem",
      script: "Trust and coordination break down across borders.",
      onScreenText: "PAYMENTS · TRUST · COORDINATION",
      visualDirection: "Split-screen chaos — scattered messages, pending invoices, missed deadlines.",
      suggestedShot: "Quick montage of notification overlays and waiting spinners.",
      transitionIn: { type: "slide-left", durationMs: 350 },
      assetCategories: ["photography", "ui"],
      assetSuggestionLabels: ["Messy workflow UI mock", "Frustrated remote worker"],
    },
    {
      role: "solution",
      script: "Offer-Hub brings everything into one platform.",
      onScreenText: "ONE PLATFORM",
      visualDirection: "UI reveal — unified dashboard with chat, milestones, and payment status.",
      suggestedShot: "Slow push-in on clean product UI, brand navy background.",
      transitionIn: { type: "scale-in", durationMs: 450 },
      assetCategories: ["ui", "photography"],
      assetSuggestionLabels: ["Offer-Hub dashboard", "OG hero UI asset"],
    },
    {
      role: "value",
      script: "Message, track progress, and pay securely with Stellar.",
      onScreenText: "SECURE PAYMENTS · STELLAR",
      visualDirection: "Feature highlights — chat bubble, progress bar, escrow/payment confirmation.",
      suggestedShot: "Macro UI details with teal accent highlights.",
      transitionIn: { type: "fade", durationMs: 350 },
      assetCategories: ["icons", "ui"],
      assetSuggestionLabels: ["Stellar icon", "Payment confirmation UI"],
    },
    {
      role: "cta",
      script: "Discover Offer-Hub — find talent, hire smart.",
      onScreenText: "DISCOVER OFFER-HUB",
      visualDirection: "Brand close — logo lockup, confident talent + business pairing.",
      suggestedShot: "Logo center frame, soft gradient texture, end card hold.",
      transitionIn: { type: "fade", durationMs: 400 },
      assetCategories: ["photography"],
      assetSuggestionLabels: ["Brand logo wordmark", "Talent + business hero photo"],
    },
  ];
}

function genericScenePlans(context: ProjectCreativeContext): MockScenePlan[] {
  const name = context.brand.name;
  const tagline = context.brand.tagline?.trim();
  return [
    {
      role: "hook",
      script: tagline ? `${name}. ${tagline}` : `Meet ${name}.`,
      onScreenText: name.toUpperCase(),
      visualDirection: `Opening hook for ${name} — bold brand moment.`,
      suggestedShot: "Hero brand frame with logo and primary color field.",
      transitionIn: { type: "fade-up", durationMs: 400 },
      assetCategories: ["photography", "backgrounds"],
      assetSuggestionLabels: ["Brand hero photography", "Primary logo"],
    },
    {
      role: "problem",
      script: "The old way slows teams down.",
      onScreenText: "THE OLD WAY",
      visualDirection: "Contrast problem state — friction, delays, disconnected tools.",
      suggestedShot: "Muted tones, quick cuts of busywork.",
      transitionIn: { type: "slide-left", durationMs: 350 },
      assetCategories: ["photography"],
      assetSuggestionLabels: ["Problem-state lifestyle photo"],
    },
    {
      role: "solution",
      script: `${name} brings the workflow together.`,
      onScreenText: "ONE WORKFLOW",
      visualDirection: "Product or service reveal — clarity and focus.",
      suggestedShot: "Clean product frame, centered composition.",
      transitionIn: { type: "scale-in", durationMs: 450 },
      assetCategories: ["ui", "photography"],
      assetSuggestionLabels: ["Product UI or hero asset"],
    },
    {
      role: "value",
      script: "Built for how you work.",
      onScreenText: "BUILT FOR YOU",
      visualDirection: "Value props — core benefits without invented stats.",
      suggestedShot: "Feature montage with brand accent color.",
      transitionIn: { type: "fade", durationMs: 350 },
      assetCategories: ["photography"],
      assetSuggestionLabels: ["Feature highlight photography"],
    },
    {
      role: "cta",
      script: `Explore ${name} today.`,
      onScreenText: `EXPLORE ${name.toUpperCase()}`,
      visualDirection: "Closing CTA — logo, invitation to act.",
      suggestedShot: "End card with logo and swipe-up cue.",
      transitionIn: { type: "fade", durationMs: 400 },
      assetCategories: ["photography"],
      assetSuggestionLabels: ["Logo lockup", "CTA background"],
    },
  ];
}

export function buildMockScenePlans(
  brief: GenerateStoryboardBrief,
  context: ProjectCreativeContext,
): MockScenePlan[] {
  const base = isOfferHub(context) ? offerHubScenePlans() : genericScenePlans(context);
  const sceneCount =
    brief.creativeFreedom === "high" ? 6 : brief.creativeFreedom === "low" ? 4 : 5;

  if (sceneCount === base.length) return base;
  if (sceneCount === 4) return base.filter((p) => p.role !== "value");
  // high — insert extra value beat before CTA
  const extra: MockScenePlan = {
    role: "value",
    script: "Everything you need, in one place.",
    onScreenText: "ALL-IN-ONE",
    visualDirection: "Secondary value beat — supporting feature glance.",
    suggestedShot: "B-roll detail shot, shallow depth of field.",
    transitionIn: { type: "fade", durationMs: 300 },
    assetCategories: ["textures", "photography"],
    assetSuggestionLabels: ["Texture overlay", "Detail b-roll"],
  };
  const ctaIndex = base.findIndex((p) => p.role === "cta");
  return [...base.slice(0, ctaIndex), extra, ...base.slice(ctaIndex)];
}

function pickAsset(context: ProjectCreativeContext, categories: string[], index: number) {
  const pool = context.assets.filter((a) => categories.includes(a.category));
  return pool[index % Math.max(pool.length, 1)];
}

function textEl(
  content: string,
  y: number,
  color: string,
  size: number,
  sceneDuration: number,
  anim: VideoElement["animationIn"],
): VideoElement {
  return {
    id: uid("el"),
    type: "text",
    name: "On-screen copy",
    x: 80,
    y,
    width: 920,
    height: 200,
    opacity: 1,
    rotation: 0,
    zIndex: 2,
    startOffsetMs: 200,
    durationMs: sceneDuration - 400,
    animationIn: anim,
    animationOut: { type: "fade", durationMs: 300 },
    props: { content, fontSize: size, fontWeight: 700, color, align: "center" },
  };
}

function imageEl(src: string, assetId: string | undefined, sceneDuration: number): VideoElement {
  return {
    id: uid("el"),
    type: "image",
    name: "Photo",
    x: 0,
    y: 0,
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
    opacity: 1,
    rotation: 0,
    zIndex: 0,
    startOffsetMs: 0,
    durationMs: sceneDuration,
    animationIn: { type: "fade", durationMs: 500 },
    props: { src, assetId, objectFit: "cover" },
  };
}

function logoEl(context: ProjectCreativeContext, sceneDuration: number): VideoElement | null {
  const logo = context.brand.logos[0];
  if (!logo?.src) return null;
  return {
    id: uid("el"),
    type: "logo",
    name: "Logo",
    x: 80,
    y: 120,
    width: 120,
    height: 120,
    opacity: 1,
    rotation: 0,
    zIndex: 3,
    startOffsetMs: 0,
    durationMs: sceneDuration,
    animationIn: { type: "scale-in", durationMs: 500 },
    props: { logoId: logo.id, src: logo.src, mode: "isotipo" },
  };
}

export function mockPlansToScenes(
  plans: MockScenePlan[],
  brief: GenerateStoryboardBrief,
  context: ProjectCreativeContext,
): VideoScene[] {
  const brand = context.brand;
  const bg = brand.colors[0]?.hex ?? "#19213D";
  const text = brand.defaultText ?? "#F1F3F7";
  const accent = brand.defaultAccent ?? brand.colors[1]?.hex ?? "#149A9B";
  const total = brief.durationMs;
  const sceneCount = plans.length;
  const sceneDur = Math.floor(total / sceneCount);
  const scenes: VideoScene[] = [];
  let startMs = 0;

  for (let i = 0; i < sceneCount; i += 1) {
    const plan = plans[i]!;
    const dur = i === sceneCount - 1 ? total - startMs : sceneDur;
    const elements: VideoElement[] = [];
    const photo = pickAsset(context, plan.assetCategories, i);

    if (photo && (plan.role === "solution" || plan.role === "value" || i % 2 === 1)) {
      elements.push(imageEl(photo.src, photo.id, dur));
    }

    const logo = plan.role === "cta" || plan.role === "hook" ? logoEl(context, dur) : null;
    if (logo) elements.push(logo);

    elements.push(
      textEl(
        plan.onScreenText,
        plan.role === "cta" ? 1400 : 820,
        plan.role === "cta" ? accent : text,
        plan.role === "hook" ? 64 : 52,
        dur,
        { type: plan.transitionIn.type === "none" ? "fade-up" : plan.transitionIn.type, durationMs: 500 },
      ),
    );

    if (plan.role === "cta") {
      elements.push(textEl("SWIPE UP", 1580, text, 32, dur, { type: "fade", durationMs: 400 }));
    }

    scenes.push({
      id: uid("scene"),
      startMs,
      durationMs: dur,
      script: plan.script,
      visualDirection: `${plan.visualDirection} Shot: ${plan.suggestedShot}. Assets: ${plan.assetSuggestionLabels.join("; ")}.`,
      background: { type: "color", value: i % 2 === 0 ? bg : accent },
      elements,
      transitionIn: plan.transitionIn,
      transitionOut: { type: "fade", durationMs: 300 },
    });
    startMs += dur;
  }

  return scenes;
}

export function sceneVideoPrompt(scene: VideoScene, context: ProjectCreativeContext, brief: GenerateStoryboardBrief) {
  return buildSuggestedClipPrompt({
    scene,
    brand: {
      name: context.brand.name,
      shortName: context.brand.name,
      description: context.brand.description,
      tagline: context.brand.tagline,
      website: "",
      colors: context.brand.colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex })),
      logos: context.brand.logos.map((l) => ({ id: l.id, name: l.name, src: l.src, role: "primary" as const })),
      fonts: {
        primary: context.brand.fonts.primary ?? "Inter",
        secondary: context.brand.fonts.secondary ?? "Inter",
        display: context.brand.fonts.display ?? "Inter",
        body: context.brand.fonts.body ?? "Inter",
      },
      defaultBackground: context.brand.defaultBackground,
      defaultText: context.brand.defaultText,
      defaultAccent: context.brand.defaultAccent,
    },
    metadata: {
      brief: brief.brief,
      platform: brief.platform,
      format: brief.format,
      style: brief.style,
    },
  });
}
