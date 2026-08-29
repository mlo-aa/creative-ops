# OFFER-HUB logos

Place official logo files here. Do not recreate or reinterpret the mark.

## Preferred slots (used by the campaign)

- `mark-color.png` — teal + navy mark for light backgrounds (**transparent PNG**)
- `mark-light.png` — teal + light mark for navy backgrounds (**transparent PNG**)
- `wordmark-color.png` — horizontal lockup for light backgrounds
- `wordmark-light.png` — horizontal lockup for navy backgrounds

## Alternate / archival

- `logo-primary.png` / `logo-light.png` — alternate marks from product repos

## Current Studio behavior

Until transparent masters replace black-plate files:

- **Navy posts** use `mark-light` / `wordmark-light` with screen blend
- **Light posts** use a typeset `OFFER` + `-HUB` lockup in official navy/teal (not a rebuilt OH mark)

Drop transparent PNGs into the filenames above (or update `projects/offerhub/index.ts`) and the campaign will pick them up. Preserve proportions and clear space; never recolor, rotate, distort, or rebuild the mark in CSS.
