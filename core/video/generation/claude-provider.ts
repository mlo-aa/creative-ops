import Anthropic from "@anthropic-ai/sdk";
import type { ProjectCreativeContext } from "@/core/design/creativeContext";
import type { GenerateStoryboardBrief, GenerateStoryboardOptions, VideoGenerationProvider } from "./provider";
import type { VideoDocument } from "@/core/video/document";
import {
  buildRepairPrompt,
  buildStoryboardSystemPrompt,
  buildStoryboardUserPrompt,
  collectReferenceImageUrls,
} from "./context-prompt";
import {
  claudeOutputToVideoDocument,
  formatValidationErrors,
  getDefaultClaudeVideoModel,
  parseClaudeStoryboardJson,
  validateClaudeStoryboard,
} from "./validate";

type ImageBlock = Anthropic.ImageBlockParam;
type TextBlock = Anthropic.TextBlockParam;

export class ClaudeVideoGenerationProvider implements VideoGenerationProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
    this.client = new Anthropic({ apiKey: key });
    this.model = model ?? getDefaultClaudeVideoModel();
  }

  getModelId(): string {
    return this.model;
  }

  async generateStoryboard(
    brief: GenerateStoryboardBrief,
    context: ProjectCreativeContext,
    options?: GenerateStoryboardOptions & { assetBaseUrl?: string },
  ): Promise<VideoDocument> {
    const system = buildStoryboardSystemPrompt();
    const userText = buildStoryboardUserPrompt(brief, context);
    const imageUrls = collectReferenceImageUrls(context, options?.assetBaseUrl);

    const userContent: (TextBlock | ImageBlock)[] = [{ type: "text", text: userText }];
    for (const url of imageUrls) {
      userContent.push({
        type: "image",
        source: { type: "url", url },
      });
    }

    let raw = await this.callClaude(system, userContent);
    let parsed = parseClaudeStoryboardJson(raw);
    if (parsed.error) {
      throw new Error(`Claude returned invalid JSON: ${parsed.error}`);
    }

    let validated = validateClaudeStoryboard(parsed.data, brief);
    if (!validated.ok) {
      const repairContent: (TextBlock | ImageBlock)[] = [
        {
          type: "text",
          text: buildRepairPrompt(formatValidationErrors(validated.errors), raw),
        },
      ];
      raw = await this.callClaude(system, repairContent);
      parsed = parseClaudeStoryboardJson(raw);
      if (parsed.error) {
        throw new Error(`Claude repair returned invalid JSON: ${parsed.error}`);
      }
      validated = validateClaudeStoryboard(parsed.data, brief);
      if (!validated.ok) {
        throw new Error(`Storyboard validation failed: ${formatValidationErrors(validated.errors)}`);
      }
    }

    return claudeOutputToVideoDocument(validated.output, brief, context, {
      voiceId: options?.voiceId,
      modelId: this.model,
      generatedBy: "claude",
    });
  }

  private async callClaude(
    system: string,
    userContent: (TextBlock | ImageBlock)[],
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (!text.trim()) throw new Error("Claude returned an empty response");
    return text;
  }
}
