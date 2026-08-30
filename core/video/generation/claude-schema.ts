/** Structured JSON shape returned by Claude for storyboard generation. */

import type { VideoAnimationType, VideoElementType } from "@/core/video/document";

export type ClaudeStoryboardElement = {
  type: VideoElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  content?: string;
  fontSize?: number;
  color?: string;
  colorId?: string;
  align?: "left" | "center" | "right";
  assetId?: string;
  logoId?: string;
  fill?: string;
  fillColorId?: string;
  objectFit?: "cover" | "contain";
  animationIn?: VideoAnimationType;
  opacity?: number;
};

export type ClaudeStoryboardScene = {
  durationMs: number;
  script: string;
  visualDirection?: string;
  background?: {
    type: "color" | "image";
    value?: string;
    colorId?: string;
    assetId?: string;
  };
  elements: ClaudeStoryboardElement[];
};

export type ClaudeStoryboardOutput = {
  title: string;
  voiceoverScript?: string;
  scenes: ClaudeStoryboardScene[];
};

export const CLAUDE_STORYBOARD_JSON_SCHEMA = `{
  "title": "string — reel title",
  "voiceoverScript": "string — full voiceover narration combining all scenes",
  "scenes": [
    {
      "durationMs": "number — scene duration in milliseconds",
      "script": "string — voiceover line for this scene",
      "visualDirection": "string — optional layout/visual notes",
      "background": { "type": "color|image", "value": "#hex for color", "colorId": "brand color id", "assetId": "project asset id" },
      "elements": [
        {
          "type": "text|image|logo|rectangle|circle",
          "name": "string",
          "x": 0, "y": 0, "width": 920, "height": 160,
          "content": "on-screen copy for text elements",
          "fontSize": 64,
          "color": "#hex or colorId",
          "colorId": "brand color id",
          "align": "center",
          "assetId": "for image — must exist in project assets",
          "logoId": "for logo — must exist in brand logos",
          "fill": "#hex for shapes",
          "animationIn": "fade|fade-up|fade-down|slide-left|slide-right|scale-in|none",
          "zIndex": 1
        }
      ]
    }
  ]
}`;
