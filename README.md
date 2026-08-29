# Content Studio

A standalone, brand-agnostic social content studio. Plan Instagram (and other) feeds, edit compositions against an approved brand system, and export JPG, PNG, GIF, and carousel slides.

Senda and **OFFER-HUB** ship as seeded example projects. The application itself has no brand-specific assumptions — colors, logos, copy, photography, and path graphics all live in project data.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

## How projects work

The home screen lists projects. Each project has its own brand, assets, posts, drafts, feed order, and export prefix.

Seeded projects (currently **Senda** and **OFFER-HUB**) live in `projects/<id>/` and `public/projects/<id>/`.

Projects you create in the UI are stored in `localStorage` (`scs:v1`). Editor changes to seeded projects are stored as overlays on top of the repo defaults, so **Reset project changes** can restore the original seed feed.

## Brand configuration

Open **Brand** inside a project.

- Name, short name, tagline, website, description
- Named colors (any number; the editor shows whatever the project defines)
- Display / body / primary / secondary font stacks
- Logo assets by role (primary, wordmark, isotipo, light, dark, …)

Short name is used for the text wordmark. Marks are never redrawn — they are masked or placed as provided.

## Assets

**Assets** is a per-project library: logos, photography, illustrations, icons, backgrounds, textures, UI, miscellaneous.

Uploads are stored in the browser (data URLs). Repo assets for Senda are files under `public/projects/senda/`.

## Templates

**Core templates** (`core/templates/`) define layout only:

Brand introduction, big statement, question/problem, process/steps, photography + headline, product value, quote, announcement, metric, CTA, carousel cover, editorial statement, principles, team introduction, manifesto.

**Project templates** can override a core id. Senda overrides `product-value` with its product fragment and supplies distinctive path graphics in `projects/senda/index.ts`.

To add a custom project template:

1. Create a client component in `projects/<id>/templates.tsx`.
2. Register it in `core/templates/registry.tsx` under `PROJECT_TEMPLATES`.
3. Reference that template id from a post in the project.

## Posts and the feed

- **Feed** — 3-column Instagram-style preview or full 3:4 board. Drag to reorder. Active / Draft. Variants (`01A`). Carousel and GIF badges.
- **Posts** — list + create from a template.
- Click a post to edit copy, approved colors, logo, crop, path, and animation. Drag major blocks on the canvas. Editor chrome never appears in exports.

Only one variant in a family should sit in the active feed; activating one drafts the others.

## Formats

Default: **Instagram Portrait** 1080 × 1440.

Presets also include square, story, LinkedIn portrait, and X landscape (`core/formats.ts`). Existing Senda posts were designed at 1080 × 1440.

## Export

On a post: **Export JPG**, **Export PNG**, **Export GIF** (animated posts), **Export all slides** (carousels).

Filenames use the project export prefix and optional post `exportSlug`, e.g. `senda-post-01.jpg`, `offerhub-01-brand.jpg`, `senda-07-01.jpg`.

Exports match the selected format dimensions. GIF capture is frame-by-frame — keep the tab in the foreground.

## Import / export project

**Settings → Export project** writes JSON (brand, posts, feed, template ids). Asset paths are kept; data-URL uploads are omitted.

**Import project** reads a compatible JSON file into localStorage as a new (or replaced) user project.

## Storage

| What | Where |
| --- | --- |
| Seeded brand, posts, graphics | `projects/` + `public/projects/` |
| **Primary (cloud)** | Supabase Postgres + Storage |
| Local safety cache | `localStorage` key `scs:cache:v1` |
| Legacy local (migration) | `localStorage` key `scs:v1` |

When Supabase is configured, all mutable Creative Ops data syncs to Postgres. Edits are optimistic (instant UI) with debounced cloud writes (~1.2s). A local cache preserves unsynced changes if cloud is unavailable.

### Cloud setup (Vercel + Supabase)

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL Editor.
3. Create Storage buckets: `brand-assets`, `project-assets`, `design-assets`, `exports` (public read).
4. Copy `.env.example` → `.env.local` and fill:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Deploy to Vercel with the same env vars (`SUPABASE_SERVICE_ROLE_KEY` as server-only).

On first load with existing `scs:v1` local data, you'll be prompted to **Import to cloud** or **Skip**.

### Audits

```bash
npm run audit:design        # DesignDocument workflow
npm run audit:persistence   # Cloud + primitives (+ live DB if env configured)
```

No user auth. Single personal workspace. Optional deployment protection via Vercel.

## Migrating a brand into Content Studio

1. Copy `projects/senda/` to `projects/<brand>/` (or **New project** and fill Brand setup).
2. Put logos and photography in `public/projects/<brand>/` and list them in the project `assets` array.
3. Define named colors and fonts. Do not add those names to application code.
4. Create posts from core templates, or register project-specific templates for distinctive graphics.
5. Set export prefix and default format in Settings.
6. Plan the active feed, keep explorations as drafts/variants.
7. Export JPG/GIF/slides as needed.

## Stack

Next.js 16, TypeScript, Tailwind CSS v4, Framer Motion, `html-to-image`, `gifenc`, Supabase (Postgres + Storage).
