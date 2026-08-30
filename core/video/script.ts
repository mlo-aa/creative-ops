import type { VideoDocument, VideoScene } from "@/core/video/document";

/**
 * Combine per-scene spoken narration into the full voiceover script.
 * ONLY uses scene.script — never brief, metadata, on-screen copy, or prompts.
 */
export function buildVoiceoverScript(scenes: VideoScene[]): string {
  return scenes
    .map((s) => s.script?.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasManualVoiceoverOverride(doc: VideoDocument): boolean {
  return doc.voiceoverScriptOverride !== undefined;
}

export function getEffectiveVoiceoverScript(doc: VideoDocument): string {
  if (hasManualVoiceoverOverride(doc)) {
    return doc.voiceoverScriptOverride!.trim();
  }
  return buildVoiceoverScript(doc.scenes);
}

export function hashSceneScripts(scenes: VideoScene[]): string {
  return scenes.map((s) => `${s.id}\0${s.script ?? ""}`).join("\n");
}

export function sceneScriptsChangedSinceManualOverride(doc: VideoDocument): boolean {
  if (!hasManualVoiceoverOverride(doc) || !doc.voiceoverSceneScriptHash) return false;
  return hashSceneScripts(doc.scenes) !== doc.voiceoverSceneScriptHash;
}

export function isVoiceoverAudioStale(doc: VideoDocument): boolean {
  if (!doc.voiceover?.assetUrl) return false;
  const current = getEffectiveVoiceoverScript(doc);
  const generatedFrom = doc.voiceover.script ?? "";
  return generatedFrom.trim() !== current.trim();
}

export function setVoiceoverManualOverride(doc: VideoDocument, text: string): VideoDocument {
  const trimmed = text;
  return {
    ...doc,
    voiceoverScriptOverride: trimmed,
    voiceoverSceneScriptHash: hashSceneScripts(doc.scenes),
    script: trimmed,
  };
}

export function resetVoiceoverToSceneScripts(doc: VideoDocument): VideoDocument {
  const script = buildVoiceoverScript(doc.scenes);
  return {
    ...doc,
    voiceoverScriptOverride: undefined,
    voiceoverSceneScriptHash: undefined,
    script,
  };
}

/** Sync doc.script from scenes unless a manual voiceover override is active. */
export function applyScriptToDocument(doc: VideoDocument): VideoDocument {
  if (hasManualVoiceoverOverride(doc)) {
    return {
      ...doc,
      script: doc.voiceoverScriptOverride,
    };
  }
  const script = buildVoiceoverScript(doc.scenes);
  return { ...doc, script };
}

export function scriptCharacterCount(text: string): number {
  return text.trim().length;
}
