# Agent guide — THE PATRIOT

**Read `CLAUDE.md` first** — it is the canonical project guide (system map, run/test
commands, architecture contracts, art pipeline, refactoring roadmap). This file adds
the rules of engagement for any coding agent (Claude, grok, codex, …).

## Non-negotiables

1. `npm test` green before AND after your change (~170 assertions). Node tests mask
   browser script-order bugs — see the frozen-module-refs warning in CLAUDE.md; use
   lazy `window.X` getters for all cross-module references.
2. Verify in the real browser: `node server.js` → http://127.0.0.1:8088/ →
   `npx agent-browser open …`. Synthetic keys need 120–150 ms keydown→keyup holds
   (eval'd KeyboardEvent). **Always `npx agent-browser close` afterwards.**
3. Sim stays deterministic: no wall-clock / Math.random in sim paths; render-side
   state never writes into sim state.
4. Match existing style (`var`, function globals, no frameworks). Keep the
   graceful-fallback pattern. Files ≲300 lines.
5. Never hand-edit `assets/atlas/atlas.json` — edit `tools/asset-manifest.json` and
   regenerate (`node tools/gen-asset.js --atlas-only`).
6. Art: generate via `node tools/gen-asset.js --only <id>` (grok-backed). One
   generation per animation, base image as reference, montage identity gate vs the
   canonical base (details + character canon in CLAUDE.md). Heroes are real people —
   likeness is P0, never caricature.
7. Multi-agent sessions: exclusive file ownership per agent; state your changed
   files in your report; never edit outside your assignment.
8. Never commit/push without explicit user approval. PRD.md is canon — when code
   and PRD disagree, PRD wins (or flag the conflict, don't improvise).

## Update the docs

After a substantive change: append a line to `CHANGELOG.md`; if you changed
architecture, contracts, or pipeline behavior, update `CLAUDE.md` in the same change.
