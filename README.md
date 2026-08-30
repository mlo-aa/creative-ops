# Creative Ops

An AI-native creative production workspace that turns brand context into production-ready social content.

Creative Ops combines project knowledge, brand assets, creative direction, and generative AI to help move from a campaign idea to an editable **reel production kit** — resources you can finish in CapCut, Premiere, Resolve, or any editor you already use.

---

## ElevenLabs Integration

ElevenLabs is the **generative audio layer** of the reel workflow. Voice, sound design, and music are generated on demand and persisted to the project timeline before export.

**Implemented today:**

- **Text-to-speech voiceover** — full reel script → ElevenLabs TTS with voice selection and preview
- **Voice selection and preview** — browse available voices before generating
- **Sound effect generation** — per-scene SFX from natural-language prompts
- **Per-scene sound design** — attach SFX to individual storyboard scenes
- **ElevenLabs Music integration** — architecture and UI wired; availability depends on your ElevenLabs account/plan
- **Audio persistence and timeline** — generated audio stored in Supabase and reflected in the reel editor
- **Exportable production kits** — ZIP bundles include generated voiceover, music (when ready), and SFX files

Audio generation is **explicit** — nothing calls ElevenLabs until you trigger it in the UI.

> **Note:** AI video clip generation is architected (storyboard slots, Remotion backgrounds, provider interface) but **not active** in the default configuration. The production kit exports video prompts for external tools instead.

---

## Workflow

```
Brand context + assets
        ↓
   Reel brief
        ↓
Editable storyboard
        ↓
 Voiceover script
        ↓
ElevenLabs Voice + Sound Effects (+ Music when available)
        ↓
  Production Kit
        ↓
CapCut / Premiere / Resolve / other editor
```

Creative Ops intentionally **exports production resources** rather than requiring the final edit to happen inside the app. The storyboard editor, Remotion preview, and timeline help you iterate; the kit is what you take into your NLE.

---

## Production Kit

Export a ZIP from the reel editor. Example structure:

```
offer-hub-reel/
├── storyboard.md
├── storyboard.json
├── audio/
│   ├── voiceover.mp3
│   └── music.mp3          # when music generation succeeded
├── sfx/
│   └── scene-01-transition.mp3
├── assets/
├── prompts/
│   ├── video-prompts.md
│   ├── music-prompt.txt
│   └── sound-effects.md
├── video/                 # when video clip assets are attached
└── reel-manifest.json
```

The manifest ties scenes, timing, audio paths, and prompts together for manual assembly.

---

## What has been built

| Area | Description |
| --- | --- |
| **Project & brand context** | Named colors, fonts, logos, taglines, and assets per project |
| **Social post management** | Feed ordering, drafts, variants, carousel/GIF support |
| **Static design editor** | Template-based Instagram/LinkedIn compositions with export |
| **Reel storyboard editor** | Multi-scene brief → editable scenes with timing and visual direction |
| **Voiceover pipeline** | Scene scripts, combined script, manual override, ElevenLabs TTS |
| **Sound design** | Per-scene SFX via ElevenLabs; optional background music |
| **Captions** | Caption styling and timing on the reel timeline |
| **Production kit export** | Storyboard + audio + prompts + assets as a portable ZIP |
| **Cloud persistence** | Supabase Postgres snapshots + Storage for assets and audio |
| **Remotion preview/render** | In-browser preview; optional local MP4 render when enabled |

Seeded example projects (**Senda**, **OFFER-HUB**) demonstrate the full workflow without requiring you to build brand data from scratch.

---

## Tech stack

- **Next.js 16** — App Router, API routes
- **React 19 / TypeScript**
- **ElevenLabs API** — TTS, sound effects, music
- **Supabase** — Postgres workspace snapshots, asset/audio storage
- **Remotion** — reel preview and optional local render
- **Anthropic (Claude)** — optional storyboard generation when `ANTHROPIC_API_KEY` is set; mock storyboard otherwise
- **Tailwind CSS v4**, Framer Motion, JSZip

---

## Screenshots

_Screenshots coming soon._ The repo includes seeded brand assets under `public/projects/` for local demo.

---

## Setup

**Requirements:** Node.js **22** (tested on 22.x), npm.

```bash
git clone https://github.com/mlo-aa/creative-ops.git
cd creative-ops
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` → `.env.local`. See that file for the full list.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | **Server only** | Voiceover, SFX, music |
| `ANTHROPIC_API_KEY` | **Server only** | Optional Claude storyboard generation |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Cloud sync, storage uploads |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client-side Supabase access |
| `VIDEO_RENDER_ENABLED` | Server | Set `true` to enable local Remotion MP4 export |

Without Supabase, the app runs from localStorage cache. Without ElevenLabs keys, reel editing works but audio generation is unavailable. Without Anthropic, storyboards use deterministic mock generation (no API cost).

### Cloud setup (optional)

1. Create a Supabase project and run `supabase/migrations/001_initial_schema.sql`.
2. Create Storage buckets: `brand-assets`, `project-assets`, `design-assets`, `exports` (public read).
3. Add env vars to `.env.local` and deploy (e.g. Vercel) with the same values; keep service role keys server-only.

### Verification

```bash
npm run audit:video      # Reel workflow checks (no paid API calls)
npm run build
```

Other audits: `audit:design`, `audit:persistence`, `audit:live-schema`.

---

## Status

Creative Ops is an **actively developed personal creative tooling project** — a prototype workspace for brand-consistent social production, not a commercial SaaS. Features evolve as real campaign workflows demand them.

---

## License

Private / personal project. See repository owner for usage terms.
