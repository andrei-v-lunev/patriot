# THE PATRIOT («ПАТРИОТ») — project guide

16-bit SNES-style judo beat-em-up (Aladdin × Turtles in Time), vanilla JS + canvas,
Russian UI. Two real heroes — Idris (coach, white gi, clean-shaven) and Otajon
(assistant, blue gi, yellow headband, sandwich bag) — fight the Sterling Fight
Syndicate across 5 worlds. Full spec: `PRD.md` (canon; §-references below point there),
expanded parts in `sections/part1..6`.

## Run / test

- `node server.js` → http://127.0.0.1:8088/ (static server; kill old one first: `lsof -ti :8088 | xargs kill`)
- Railway uses the root `Dockerfile`/`railway.toml`, binds `HOST=0.0.0.0` to the
  injected `PORT`, and gates releases on `/health`. The server deliberately exposes
  only `index.html`, `assets/`, `css/`, `data/`, and `js/`.
- `npm test` — full Node headless suite: data/save/settings, sim, combat,
  campaign, 36k determinism, soak, animation, input/touch, audio and pixelpipe.
  It must stay green after every change.
- `npm run release:inventory` — report the PRD completion matrix; append
  `-- --strict` for the final ship gate (expected to fail while production rows
  remain pending). Update the inventory only with matching evidence.
- `npm run audio:check` — validate the schema-2 audio manifest and report mastering,
  format, loop, stem, SFX, and placeholder blockers; `-- --strict` is the ship gate.
- `npm run audio:qa` decodes all 310 runtime files with ffprobe and verifies every
  OGG/M4A pair, 48 kHz rate, mono/stereo channel contract, duration parity, loop
  bounds, and music-stem phase alignment.
- `PAudioEvents` bridges render-observed transitions (steps, jumps, landings,
  projectile lifecycle, spawn alerts, crowd response) into manifest events without
  mutating deterministic sim state. Combat, IPPON, ukemi, pickup, and UI producers
  publish named cues directly. `test/audio-coverage.test.js` proves every required
  route, layer, codec pair, music world, and ambience world exists.
- Touch uses the PRD contextual ACTION cluster: proximity selects strike vs grip,
  flick release chooses a throw, right-half swipe performs ukemi, two fingers pause,
  and SPECIAL appears only at full meter. High-contrast circular controls carry
  Cyrillic action labels, scale 80–130%, mirror for left-handed play, and hide
  actions that are unavailable in the current mode.
- W1L1 is a deterministic seven-beat dojo tutorial: walk, grip-only dummy, three
  neutral throws, forward/back chalk circles, repeatable ukemi sandbag, tag, then
  a four-second skippable throw table. `PTutorialSim` owns progression and
  `PTutorialUI` owns the code-native chalk/hint layer. The same sim module owns
  all ten PRD §5.5 contextual triggers; `PScreens` persists their seen IDs in the
  active `PSave` slot without writing render state back into deterministic sim.
- Audio production is split into cached paid generation and deterministic mastering:
  `tools/gen_music.py`/`master_music.py`, `gen_sfx.py`, and `gen_vo.py`. Never
  resubmit a failed paid task when its provider task ID can be recovered. The SFX
  manifest contains 45 logical entries / 65 physical variants; short transients use
  active-window RMS plus a measured peak ceiling because EBU R128 cannot gate them.
  Creative music sign-off is recorded through `tools/music-audition.html`.
- `npm run build:data` — rebuild the generated `data/index.js` file/WebView fallback
  after editing any canonical JSON under `data/`; `npm test` checks exact parity.
- Browser verification: `npx agent-browser open http://127.0.0.1:8088/`. Synthetic keys need real hold times (~120–150 ms keydown→keyup via eval'd KeyboardEvent) — instant `press` is too fast for the rAF input poll. **Always `npx agent-browser close` when done** (game audio annoys the user).
- `npm run qa:browser` runs an isolated real-browser gate: natural menu entry,
  all 15 levels, 18 presentation screens, six W5 hazard states, empty diagnostics,
  and exact deterministic canvas hashes. Background layers preload before capture;
  transient FX are cleared so cache timing and cosmetic RNG cannot taint baselines.
- `npm run botfight` drives all 15 levels with legal deterministic inputs only.
  It exercises boss-specific throw routes, checkpoints, Continue, gates and results;
  two identical runs must report `campaign_bot=PASS cleared=15/15`.
- `npm run qa:soak` replays two deterministic 30-minute simulated sessions with
  pool/heap/throughput budgets. `npm run qa:perf` samples 360 live browser frames
  and enforces the 220-draw cap plus local p99/heap smoke budgets; the Android row
  still requires the separate reference-device verification.

## Architecture map

Plain `<script>` files, global namespaces, no bundler. Load order = `index.html` order.

| Global | Files | Role |
|---|---|---|
| `PData` | data/index.js, data.js | level/enemy/move/string data (JSON baked into data/index.js) |
| `PSim` | sim.js (+ sim.plat, sim.belt, sim.waves, sim.camera) | deterministic 120 Hz sim: platforming + belt-scroll arena, waves, camera |
| `PCombat` | combat.js (+ combat.grip, combat.throw, combat.ippon, combat.hit) | grip/throw system (PRD §4.3–4.6), sweeps, special, IPPON scoring |
| `PAI` | ai.js, ai.boss.js | goon archetypes E1–E8, bosses B1–B5 |
| `PTag`, `PPickups` | sim.tag.js, sim.pickups.js | tag/bench system §4.9, pickups, lives/continues |
| `PInput` | input.js, input.touch.js | PRD §5.3.2 bindings: WASD/arrows move, J strike, K jump, L grip/throw, I tag, O ukemi, U special; P2 numpad |
| `PSettings`, `PSave` | settings.js, save.js | validated remaps/options; three-slot versioned local persistence, migrations, records/progression |
| `PRender` | render.js | frame composite (see resolution model below) |
| `PAnim`, `PSprites`, `PLayers`, `PFx` | render.anim/sprites/layers.js, fx.js | atlas animation, entity draw, parallax bg, particles |
| `PFont`, `PUI`, `PUITitle`, `PScreens`, `PMap` | ui.font/ui/ui.title/ui.screens/ui.map.js | Cyrillic bitmap font, HUD, title/menus, settings and 15-node world-map state machine |
| `PPlatform` | platform.js | optional Yandex SDK readiness/gameplay events plus browser visibility/audio pause lifecycle |
| `PBoot`, `PGame` | boot.js, game.js | canvas/DPR setup, preload, fixed-step main loop |

### ⚠️ THE #1 BUG CLASS in this codebase: frozen module refs

Never cache a cross-module global at IIFE-eval time (`var X = window.PFoo || ...`) —
script load order means it freezes as `null` in the browser while Node `require`
masks it (tests stay green). This silently killed the ENTIRE sim and ENTIRE combat
system twice. **Always use lazy getters resolving `window.X` at call time** — see the
pattern at the top of `js/sim.js` and `js/combat.js`. `test/sim.lazy.test.js` is the
regression test.

### Resolution model (PRD §4.2)

480×270 world buffer (chunky 16-bit grid, smoothing off) → blitted ×2 into a
960×540 UI buffer (HUD/portraits/menus draw here via a ctx.scale(2,2) wrapper —
same 480×270 coordinates, double pixel density) → visible canvas at integer k in
**device pixels** when the viewport fits the native UI buffer (DPR-aware,
boot.js `fit()`). Below 960×540 CSS pixels, keep a native backing buffer and use a
fractional CSS fit so no edge is clipped. Never draw world entities on the UI layer.

### Determinism

Sim is deterministic and Node-testable: no wall-clock, no Math.random in sim paths
(seeded `PRng`), animation driven off `state.tick`. Render-side state (ghost HP bar,
anim phase) must never write into sim state.

### Web/mobile platform contract

The browser build is already HTML5: static HTML, Canvas 2D, Web Audio and plain
JavaScript. Do not introduce a framework or engine merely to publish on Yandex.
`PPlatform` is an optional adapter: localhost and ordinary web hosts remain fully
standalone, while a Yandex host loads `/sdk.js`, reports loading/gameplay state,
and maps host pause/resume events to the existing pause screen and audio graph.
The primary phone layout is landscape; portrait shows a safe-area-aware rotate
screen. See `docs/WEB-PORT.md` for packaging and device QA.

### Sim/UI contracts

- `state.lifeState` ∈ `"playing" | "continue" | "gameover"`, `state.continueT` countdown; `PSim.useContinue(state)` revives. `PScreens` reads these — keep both sides in sync.
- Level complete → `state.results`; boss levels set `state.vs` at start. Campaign order: `data/campaign.json`.
- Save data uses `PSave` schema v1 and three isolated local slots. Level results
  update records/unlocks before returning to `PMap`; settings are validated by
  `PSettings` before they reach input, touch, rendering, or audio. Per-slot
  onboarding history lives at `onboarding.seenHints`; `once` records IDs there,
  `always` repeats once per run, and `off` suppresses contextual hints.
- Enemy melee damage: AI applies `e.atkDmg` in attack active phase via `PCombat.applyDamage`.
- The PRD six-tick action buffer applies to grip, special, tag, and ukemi. Consumers
  record the consumed press tick on sim state/entities; never mutate the caller's
  intent object, because recorded intent logs must replay byte-identically.

## Art pipeline (tools/)

Assets are AI-generated via the local `grok` CLI, then processed:

- `tools/asset-manifest.json` — **single source of truth** ({id, prompt, ref, outPath, cells, fps}). `assets/atlas/atlas.json` is **GENERATED** from it (`node tools/gen-asset.js --atlas-only`) — never hand-edit atlas.json.
- `node tools/gen-asset.js --only <id>` (delete or archive the non-reference raw in `art/src/raw/` first to force regen) → grok gen → `tools/pixelpipe.js` (JPEG-edge background flood key, connected-pose/column slicing, sparse-island cleanup, NN scale, strict pose/fragment/duplicate/palette gates). Strict sheets also reject panel dividers, broad cross-pose bands, touching/merged poses, source-edge clipping, and opaque rectangular character/FX backplates before publication. Atlas generation omits missing or palette-invalid outputs instead of publishing broken references.
- Hard-learned generation rules: ONE generation per animation (identity stays consistent within a single image; per-frame gens drift — mustaches appear); poses in a row separated by magenta gaps; pass the base image path as reference ("edit this exact character"); demand FULL BODY per pose. Gate every sheet with a montage vs the canonical base (`art/gate/*-cmp.png`): same face/hair/outfit, no new accessories, one figure, all limbs.
- `gen-asset.js` treats model refs as identity sources rather than canvas templates and prepends an equal-cell layout contract for every multi-frame generated sheet: a new wide landscape canvas, one horizontal row, full-height magenta gutters, and no body/prop/smear crossing cell boundaries. Keep this producer-side contract aligned with pixelpipe's strict segment gate.
- For referenced multi-frame sheets, `gen-asset.js` also builds a deterministic 1536×1024 guide under `art/src/layout-guides/` from repeated transparent canonical-model cutouts. The guide supplies aspect ratio, conservative pose scale, outer margins, and cell centers; it is layout evidence, never a runtime asset or alternate identity source.
- Style canon: PRD §4.1 hard rules (1px selective outlines, cluster shading, no dithering/AA; heroes never caricatured — likeness is P0). Character canon: PRD §3.2 (Otajon's headband/bag ARE canon).
- World art uses generated master plates preserved as `art/src/raw/wN-master.png`.
  Manifest `crop` entries derive the 480×270 sky and 960px far/mid bands;
  `tools/build-world-art.js` deterministically builds W2–W5 960×96 perspective
  ground strips and all five 3×4 16px tilesets. `test/world-art.test.js` enforces
  dimensions, variants, atlas publication, and seams; real-play goldens live at
  `art/gate/world-wN-play.png`. W1 keeps its authored imagegen dirt strip.

## Conventions

- `var`/function globals, no modules/frameworks; match existing style.
- Graceful-degradation fallbacks everywhere (missing asset → procedural draw); keep them.
- Files ≲300 lines; no mock data outside tests; never commit without the user's say-so.
- Multi-agent work: assign exclusive file ownership per agent; verify claims against actual files/PRD before accepting.

## Refactoring roadmap (incremental — no big-bang rewrites)

The script-order/global-namespace architecture works but caused two P0 outages
(frozen module refs). Evolve it stepwise, keeping tests green at each step:

1. **Module access discipline (done/enforce):** every cross-module reference goes
   through a lazy getter. New code must never `var X = window.Y` at top level.
2. **Contracts over flags:** sim↔UI communication is converging on named contracts
   (`lifeState`, `results`, `vs`, `useContinue`). Next: collect them in one place
   (`js/contracts.js` doc-object or JSDoc typedefs) so both sides cite a single
   definition instead of grep-archaeology.
3. **Split oversized files by function:** `sim.js` (~16 KB) → extract death/lives
   into `sim.life.js`, projectiles into `sim.projectiles.js`; `ai.js` → per-archetype
   think functions grouped in `ai.goons.js` once E3–E8 gain real behavior. One
   extraction per PR, with the lazy-getter pattern from day one.
4. **ES modules migration (when Android wrapper allows):** convert leaf modules first
   (rng, pools, ui.font), then data, then render, sim last; a tiny esbuild step can
   emit the same single-file script for the WebView. This permanently kills the
   frozen-ref bug class. Do NOT start this mid-feature.
5. **Data out of code:** keybindings, palettes, and HUD layout constants belong in
   `data/` JSON next to moves/enemies — the pattern already exists, extend it.
6. **Test the seams:** every new public API (like `PSim.useContinue`) gets a Node
   test the same day; browser-only wiring gets an agent-browser smoke script.

## Current state & roadmap

See `CHANGELOG.md` for what's done. Known open work (audit 2026-08-22):
likeness-safe dedicated hero reaction sheets, replacement
recordings/releases for 18 temporary hero exertion clips, human music audition,
and Android device verification.
Rejected character/FX generations are recorded in `tools/rejected-assets.json`;
their accepted animated aliases or code-native implementations are tested and the
rejected IDs are intentionally absent from both manifest and atlas. The remaining
remaining VO recording contract is briefed in `tasks/AUDIO_GENERATION_TASK.md`.
