/**
 * Dry audit: compare db mapper candidate rows against live Supabase columns.
 * Run: npm run audit:live-schema
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEED_PROJECTS } from "../projects/index";
import {
  activityToDbRow,
  assetToDbRow,
  buildProjectRowCandidate,
  calendarEventToDbRow,
  campaignToDbRow,
  clientToDbRow,
  competitorToDbRow,
  contentItemToDbRow,
  decisionToDbRow,
  deliverableToDbRow,
  designTemplateToDbRow,
  designToDbRow,
  feedToDbRow,
  ideaEdgeToDbRow,
  ideaNodeToDbRow,
  ideaToDbRow,
  inspirationToDbRow,
  jsonbProjectRow,
  orphanBrandExtensionRow,
  phaseToDbRow,
  projectBrandExtensionRow,
  projectLinkToDbRow,
  proposalToDbRow,
  referenceBoardToDbRow,
  referenceToDbRow,
  sourceToDbRow,
  workspaceMetaRow,
} from "../core/repositories/db-mappers";
import {
  filterRowForLiveTable,
  getLiveTableColumns,
  preloadLiveSchemas,
  SYNC_TABLES,
} from "../core/repositories/live-schema";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local optional when vars already exported
  }
}

loadEnvLocal();

const project = SEED_PROJECTS[0];
const post = project.posts[0];
const asset = project.assets[0] ?? {
  id: "asset-sample",
  name: "Sample",
  src: "https://example.com/logo.png",
  category: "logos" as const,
  tags: [],
};

type AuditEntry = {
  table: string;
  mapper: string;
  candidate: () => Record<string, unknown>;
};

const AUDIT: AuditEntry[] = [
  {
    table: "projects",
    mapper: "buildProjectRowCandidate",
    candidate: () => buildProjectRowCandidate(project, undefined, true),
  },
  {
    table: "assets",
    mapper: "assetToDbRow",
    candidate: () => assetToDbRow(project.id, asset),
  },
  {
    table: "designs",
    mapper: "designToDbRow",
    candidate: () => designToDbRow(project.id, post),
  },
  {
    table: "design_templates",
    mapper: "designTemplateToDbRow",
    candidate: () =>
      designTemplateToDbRow({
        id: "tpl-sample",
        name: "Sample",
        description: "",
        tags: [],
        mode: "document",
        createdAt: new Date().toISOString(),
      }),
  },
  {
    table: "campaigns",
    mapper: "campaignToDbRow",
    candidate: () =>
      campaignToDbRow({
        id: "camp-sample",
        projectId: project.id,
        name: "Sample",
        objective: "",
        status: "draft",
        kpis: "",
        createdAt: new Date().toISOString(),
      }),
  },
  {
    table: "content_items",
    mapper: "contentItemToDbRow",
    candidate: () =>
      contentItemToDbRow({
        id: "ci-sample",
        projectId: project.id,
        title: "Sample",
        platform: "instagram",
        format: "post",
        status: "draft",
        caption: "",
        hashtags: "",
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "project_sources",
    mapper: "sourceToDbRow",
    candidate: () =>
      sourceToDbRow({
        id: "src-sample",
        projectId: project.id,
        title: "Sample",
        sourceType: "url",
        category: "brand",
        url: "",
        description: "",
        priority: "medium",
        status: "active",
        isSourceOfTruth: false,
        fileData: "",
        fileName: "",
        fileMime: "",
        content: "",
        tags: [],
        notes: "",
        relatedDecisionIds: [],
        relatedContentIds: [],
        relatedDeliverableIds: [],
        supersededBy: "",
        extractedText: "",
        dateAdded: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "project_references",
    mapper: "referenceToDbRow",
    candidate: () =>
      referenceToDbRow({
        id: "ref-sample",
        projectId: project.id,
        boardId: "",
        title: "Sample",
        url: "",
        notes: "",
        whatWeLike: "",
        whatNotToCopy: "",
        category: "",
        imageSrc: "",
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "reference_boards",
    mapper: "referenceBoardToDbRow",
    candidate: () =>
      referenceBoardToDbRow({
        id: "board-sample",
        projectId: project.id,
        name: "Board",
        description: "",
        createdAt: new Date().toISOString(),
      }),
  },
  {
    table: "project_intake",
    mapper: "jsonbProjectRow",
    candidate: () => jsonbProjectRow(project.id, { step: 1 }),
  },
  {
    table: "project_strategy",
    mapper: "jsonbProjectRow",
    candidate: () => jsonbProjectRow(project.id, { goals: [] }),
  },
  {
    table: "knowledge_notes",
    mapper: "jsonbProjectRow",
    candidate: () => jsonbProjectRow(project.id, { notes: [] }),
  },
  {
    table: "brand_extensions",
    mapper: "projectBrandExtensionRow",
    candidate: () => projectBrandExtensionRow(project, undefined, { types: ["other"] }),
  },
  {
    table: "project_decisions",
    mapper: "decisionToDbRow",
    candidate: () =>
      decisionToDbRow({
        id: "dec-sample",
        projectId: project.id,
        decision: "Sample",
        rationale: "",
        area: "",
        status: "active",
        date: "",
        sourceId: "",
        person: "",
        supersededBy: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "feeds",
    mapper: "feedToDbRow",
    candidate: () => feedToDbRow(project.id, `feed-${project.id}`, "feed"),
  },
  {
    table: "feed_items",
    mapper: "feed_item (inline)",
    candidate: () => ({
      feed_id: `feed-${project.id}`,
      design_id: post.id,
      position: 0,
      active: true,
    }),
  },
  {
    table: "clients",
    mapper: "clientToDbRow",
    candidate: () =>
      clientToDbRow({
        id: "client-sample",
        name: "Client",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "proposals",
    mapper: "proposalToDbRow",
    candidate: () =>
      proposalToDbRow({
        id: "prop-sample",
        clientId: "client-sample",
        title: "Proposal",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "deliverables",
    mapper: "deliverableToDbRow",
    candidate: () =>
      deliverableToDbRow({
        id: "del-sample",
        projectId: project.id,
        title: "Deliverable",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "phases",
    mapper: "phaseToDbRow",
    candidate: () =>
      phaseToDbRow({
        id: "phase-sample",
        projectId: project.id,
        name: "Phase",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "project_links",
    mapper: "projectLinkToDbRow",
    candidate: () =>
      projectLinkToDbRow({
        id: "link-sample",
        projectId: project.id,
        label: "Link",
        url: "https://example.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "inspirations",
    mapper: "inspirationToDbRow",
    candidate: () =>
      inspirationToDbRow({
        id: "insp-sample",
        title: "Inspiration",
        url: "",
        notes: "",
        createdAt: new Date().toISOString(),
      }),
  },
  {
    table: "ideas",
    mapper: "ideaToDbRow",
    candidate: () =>
      ideaToDbRow({
        id: "idea-sample",
        projectId: project.id,
        title: "Idea",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "idea_nodes",
    mapper: "ideaNodeToDbRow",
    candidate: () =>
      ideaNodeToDbRow({
        id: "node-sample",
        ideaId: "idea-sample",
        type: "note",
        label: "Node",
        x: 0,
        y: 0,
      }),
  },
  {
    table: "idea_edges",
    mapper: "ideaEdgeToDbRow",
    candidate: () =>
      ideaEdgeToDbRow({
        id: "edge-sample",
        ideaId: "idea-sample",
        sourceNodeId: "node-a",
        targetNodeId: "node-b",
      }),
  },
  {
    table: "calendar_events",
    mapper: "calendarEventToDbRow",
    candidate: () =>
      calendarEventToDbRow({
        id: "evt-sample",
        title: "Event",
        date: new Date().toISOString(),
        type: "deadline",
        projectId: project.id,
      }),
  },
  {
    table: "activities",
    mapper: "activityToDbRow",
    candidate: () =>
      activityToDbRow({
        id: "act-sample",
        projectId: project.id,
        type: "note",
        message: "Activity",
        createdAt: new Date().toISOString(),
      }),
  },
  {
    table: "competitors",
    mapper: "competitorToDbRow",
    candidate: () =>
      competitorToDbRow({
        id: "comp-sample",
        projectId: project.id,
        name: "Competitor",
        url: "",
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  {
    table: "workspace_meta",
    mapper: "workspaceMetaRow",
    candidate: () => workspaceMetaRow("project_code_counter", { count: 5 }),
  },
  {
    table: "brand_extensions",
    mapper: "orphanBrandExtensionRow",
    candidate: () => orphanBrandExtensionRow(project.id, { orphan: true }),
  },
];

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  await preloadLiveSchemas();
  console.log("Live schema audit (syncCloudPersist mappers)\n");

  const auditedTables = new Set<string>();
  let anyOmitted = false;

  for (const entry of AUDIT) {
    auditedTables.add(entry.table);
    try {
      const candidate = entry.candidate();
      const result = await filterRowForLiveTable(entry.table, candidate);
      const line =
        result.omittedKeys.length === 0
          ? `✓ ${entry.table} (${entry.mapper}): all ${result.attemptedKeys.length} keys mapped`
          : `⚠ ${entry.table} (${entry.mapper}): omitted [${result.omittedKeys.join(", ")}] → ${
              result.liveColumns.includes("metadata")
                ? "metadata"
                : result.liveColumns.includes("data")
                  ? "data"
                  : "dropped"
            }`;
      console.log(line);
      if (result.omittedKeys.length) anyOmitted = true;
      console.log(`    live: ${result.liveColumns.join(", ")}`);
      console.log(`    filtered: ${result.filteredKeys.join(", ")}`);
    } catch (err) {
      anyOmitted = true;
      console.error(`✗ ${entry.table} (${entry.mapper}): ${err instanceof Error ? err.message : err}`);
    }
  }

  for (const table of SYNC_TABLES) {
    if (auditedTables.has(table)) continue;
    if (table === "design_versions") {
      console.log(`— ${table}: not written by syncCloudPersist (runtime only)`);
      continue;
    }
    try {
      const cols = await getLiveTableColumns(table);
      console.log(`— ${table}: in SYNC_TABLES but no mapper audit sample (live: ${cols.join(", ")})`);
    } catch (err) {
      console.error(`✗ ${table}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone.${anyOmitted ? " Some fields would be omitted or merged into JSONB overflow." : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
