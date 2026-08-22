# Changelog

## 2026-08-22 — release closure audit

- Completed PRD §5.5 contextual onboarding: all ten deterministic first-time
  triggers now honor per-slot `once` / per-run `always` / `off`, persist seen
  hints through the versioned save, and suppress prompts after the action is
  performed. W1L2 now opens with a readable guard lesson that only a down throw
  can break.
- Extended the deterministic world hash to cover W1L1 tutorial progress and made
  the five remaining release gates distinguish finished build artifacts from the
  human creative, protected-likeness, recording-release and physical-device
  approvals still required.
- Documented the source/runtime audio boundary so compact game exports and QA
  reports ship in Git while provider downloads and lossless mastering workspaces
  remain in production storage.

## 2026-08-21 — production audio second pass

- Added a deterministic legal-input campaign bot that now clears all 15 levels in
  two identical runs. Its hostile pass exposed and fixed two arena physics seams:
  knockdown landings could become embedded in the belt floor, and enemies could
  leave the locked arena and become unreachable.
- Added decoder-level production audio QA across all 310 runtime files and 170
  routed codec pairs, including codec/rate/channel checks, duration parity, loop
  bounds and stem phase alignment.
- Added repeatable 30-minute simulated soak and real-browser performance gates.
  The verified run replayed 216,000 ticks twice at over 226k ticks/s with a 13.1
  MiB peak heap delta; browser p99 was 9.3 ms with 10 draw calls/frame.
- Rebuilt W1L1 as the seven-beat diegetic dojo onboarding: grip-only dummy,
  repeated and directional throws, ukemi, tag, contextual Cyrillic chalk hints and
  a skippable throw-table reveal. Added a dedicated generated dojo plate with
  tatami, belt case, kids, mountain windows and helicopter foreshadowing.
- Replaced the legacy touch button farm with the contextual circular ACTION/JUMP/
  TAG cluster, meter-gated SPECIAL, flick throws, swipe ukemi, two-finger pause,
  left-handed mirroring, and 72px-minimum hit targets. Added Cyrillic/contrast/
  viewport accessibility gates and restored browser zoom after a zero-violation
  real-browser WCAG A/AA audit.
- Added an isolated reproducible browser E2E/visual gate covering the natural menu
  path, every level, all presentation screens, and six final-arena hazard states.
  Two cold runs exposed and eliminated image-cache and cosmetic-FX hash pollution.
- Closed the authored audio-event matrix: deterministic combat/IPPON/ukemi/pickup
  producers plus render-side steps, movement, alerts, melons, and crowd cues now
  resolve through validated assets; browser smoke confirms real layered OGG fetches.
- Produced the complete 45-entry / 65-file SFX library through one cached KIE
  Sounds task per physical effect. A single failed metal-slam task was replaced by
  a deterministic resonant-metal derivative of the accepted medium slam, without
  a paid retry. Added 48 kHz WAV masters, OGG/M4A runtime pairs, loop beds,
  round-robin variants, loudness/peak evidence, and a reproducible SFX manifest.
- Corrected short-VO mastering evidence: all 46 lines now publish finite final RMS
  proof when EBU R128 is inapplicable. The only remaining VO blockers are the 18
  explicitly temporary hero exertion/hurt recordings.
- Added SFX round-robin playback, layered events, surface-aware slam audio, grip and
  throw cues, menu/countdown cues, and W1–W5 ambience routing. Added a local
  four-take music audition board with persistent notes and exportable human verdicts.

All notable changes to THE PATRIOT. Newest first. Agents: append under the current
date, one line per change, cite files.

## 2026-08-21 — generation layout QA hardening

- Added production W2–W5 pixel-art master plates and 20 total runtime parallax
  layers, five deterministic 16px floor tilesets with perspective/seam gates,
  level-aware bazaar/train/port/arena dressing, rain/wind/neon/crowd motion with
  reduced-motion freezes, and five real-browser play goldens
  (`art/src/raw/w2-master.png`…`w5-master.png`, `assets/bg`, `assets/tiles`,
  `render.layers.js`, `build-world-art.js`, world-art/motion tests).
- Split deterministic foreground dressing into `render.dressing.js`, gave all 15
  levels distinct visual signatures and browser goldens, and redesigned the map
  with five world-color route bands and pixel landmarks (`ui.map.js`, map/motion
  tests, `art/gate/campaign-map.png`, `art/gate/levels/`).
- UltraQA cycle 2 made pooled releases and enemy death sweeping idempotent,
  normalized corrupt solo Continue ownership, completed the six-tick
  grip/special/tag/ukemi buffer without mutating replay logs, fitted the canvas on
  sub-960×540 viewports, and made `gen-asset.js --help` side-effect-free
  (`pools.js`, `sim.js`, `combat*.js`, `sim.tag.js`, `boot.js`, generator, tests).
- Throw slams and ippon now request the authored large-impact route, while missing
  large-impact/shockwave sheets render readable pixel starburst/ring fallbacks
  instead of a light spark or 2×2 dot (`fx.js`, `test/fx.test.js`).
- The explicitly authorized final missing-art pass accepted canon-safe B1 charge
  and B3 tunnel sheets. Nine failed character attempts and both boxed/clipped FX
  attempts remain quarantined; the rebuilt atlas deliberately omits all eleven
  failures and keeps graceful runtime fallbacks (`art/src/rejected/`, generated art/atlas).
- A second independent full-atlas visual pass caught and quarantined horizontally
  severed E1/E5 attacks plus underscaled B5 direct/enrage sheets. Authorized
  replacements restored intact E1/E5 attacks; B5 direct fixed its scale but still
  lost cane shafts, and the B5 enrage retry contained boxed panels, so both remain
  unpublished. The strict backplate gate now
  applies to multi-frame character sheets as well as FX (`asset-manifest.json`,
  `pixelpipe.js`, `test/pixelpipe.test.js`, generated art/atlas, rejection evidence).
- Fresh completion QA fixed two deterministic campaign seams: a normal-combat
  COOP last-stock death now marks that fighter out instead of leaving a permanent
  GO-blocking DOWN body, and pits now deal 18 damage then respawn at the latest
  checkpoint after the authored 0.75 seconds (`sim.tag.js`, `sim.waves.js`,
  `sim.js`, `test/campaign.test.js`).
- A frame-by-frame identity/action audit quarantined eleven previously published
  sheets with boxed FX, panel seams, severe scale popping, false glide poses, or
  broken canonical props; the atlas now falls back cleanly while authorized
  replacements are gated (`art/src/rejected/2026-08-21-published-visual-audit/`,
  generated atlas).
- Strict FX processing now rejects opaque per-frame cards/backplates; the exact
  quarantined throw-arc source reproduces the new rejection (`tools/pixelpipe.js`,
  `test/pixelpipe.test.js`).
- Referenced animation generation now receives a deterministic 1536×1024 layout
  guide built from repeated canonical-model cutouts. Conservative guide scale
  recovered clean B1 walk and E7 glide sheets; the same audit also accepted a new
  B2 telegraph and unboxed throw arc. Twelve remaining identity/action failures
  stay unpublished (`tools/gen-asset.js`, `art/src/layout-guides/`, generated art/atlas).
- Re-audited every authorized `raw-v3` generation plus its latest replacement:
  quarantined B1 idle/walk/charge and B3 tunnel for panels, overlap/cropping,
  severed processed bodies, or lost canonical props; accepted B4 hammer after its
  raw and montage remained separated, complete, and identity-safe. Rebuilt the
  atlas so rejected sheets cannot ship (`art/src/rejected/`, generated art/atlas).
- Strict pixelpipe now rejects broad cross-pose bands, full-height panel dividers,
  touching/merged poses, and artwork clipped by the source canvas before slicing;
  regression coverage reproduces each failure (`tools/pixelpipe.js`,
  `test/pixelpipe.test.js`).

## 2026-08-20 — core loop completed (audit wave 2)

- Authorized art retry accepted E8 attack, B3 duel, B4 idle/telegraph/signal,
  shockwave, throw-arc, and KO-stars sheets; rejected identity/prop failures
  remain quarantined. Throw, landing, and lethal-hit events now render the new FX
  (`asset-manifest.json`, generated art/atlas, `combat.hit.js`, `combat.throw.js`, `fx.js`).
- Generated multi-frame prompts now enforce equal-width cells and full-height
  magenta gutters before pixelpipe validation (`tools/gen-asset.js`, `CLAUDE.md`).
- Referenced sheet generation now treats portrait models only as identity sources
  and explicitly requests a new wide landscape canvas (`tools/gen-asset.js`).
- The strengthened layout contract additionally recovered E3/E4 walk, B2 lash,
  B3 idle/walk/stance, and B5 combo; B1 identity/scale failures remain quarantined.
- Fifth-pass seams: generated browser data now has a reproducible parity-checked
  bake, B5 directing invulnerability is enforced, exhausted COOP players stay out
  across levels, and directional throws can hit both cage depth walls
  (`tools/build-data-index.js`, `combat.hit.js`, `combat.throw.js`, `game.js`, tests).
  W3 roof/freight backdrops, live cage-wall indicators, B5 guard feedback, and a
  persistent zero-stock P2 HUD state make those contracts visible; E7 airborne
  states temporarily use its readable leap sheet instead of the failed glide (`render.*`, `ui.js`).
  Boss stagger now cancels queued patterns and suspends AI through grip, flight,
  knockdown, and getup so earned punish throws cannot be interrupted (`ai.boss.js`).
- First-generation B3/B4 core art accepted the canon-safe six-frame B4 walk;
  B3 idle/walk and B4 idle failed prop/scale identity gates and remain quarantined
  with raw evidence, absent from the generated atlas (`asset-manifest.json`, art gates).
- UltraQA malformed-level probes now fall back to W1L1 instead of creating an
  endless blank `playing` world with no waves or exit (`sim.js`, `test/sim.test.js`).
- UltraQA malformed-state rendering now ignores null hero entries instead of
  aborting the HUD frame (`ui.js`).

- Audit wave 3: repaired COOP menu-arrow ownership and canonical hold-L/release
  throw input; verified controls, pause, continue, and console in two independent
  real-browser passes (`input.js`, `combat.grip.js`).
- Boss/campaign solvability: natural damage now fills boss stagger without losing
  `STAGGERED`; B1/B2/B4 supply required adds, thrown bodies break B2 awnings and
  B4's cab, gates respect despawn timing, and Continue retains the latest checkpoint
  while restarting only the active wave (`ai.boss.js`, `combat.*`, `sim.*`).
- Browser continues are unlimited, preserve prior wave clears, carry both players'
  lives between levels, and apply the score/rank penalty; low-health wave clears
  now produce collectible tea (`sim.js`, `sim.waves.js`, `sim.pickups.js`).
- Full Easy/Normal/Hard table and selector implemented (HP, damage, speed,
  telegraph floor, tokens, maxAlive, lives, mash, meter, score, enrage); DOJO is a
  distinct non-campaign training run (`ui.screens.js`, `game.js`, `sim.js`, `ai.*`).
- Authored late-world flags are live: W3 wind/tunnel and continuous scroll, W4
  slippery/chase/container drops, and W5 electrified cage-wall contact
  (`sim.plat.js`, `sim.camera.js`, `sim.waves.js`).
- Third-pass campaign seams closed: W3 now scrolls through all three levels,
  slippery floors preserve thrown-body momentum, and all four alternating cage
  walls have physical X/depth collision and regression coverage (`data/levels`,
  `combat.throw.js`, `sim.waves.js`, `test/campaign.test.js`).
- Fourth-pass campaign seams: train falls consume exactly one life and relocate the
  team before another hazard tick; locked W3 arenas continuously scroll their
  backdrop; B4 cab adds are Gold Jackets; B5 directs an opening E8 wave, replenishes
  throwable E8s in phase three, and crowd shoves now deal their telegraphed damage
  and inward knockdown (`sim.tag.js`, `sim.camera.js`, `render.layers.js`,
  `ai.boss.js`, campaign tests).
- Belt knockdowns now land on the authored 16 px floor plane, preventing ground
  solids from swallowing horizontal knockback as a false side collision
  (`combat.hit.js`, B5 shove regression).
- B5's phase-two rigged weight now has a seeded 0.7 s warning, 24-damage impact,
  knockdown, and render tell; crowd-edge warnings are visible; throwing B5 into a
  live cage wall grants the authored +90 stagger (`ai.boss.js`, `combat.throw.js`,
  `render.js`, campaign tests).
- Co-op train falls debit only the falling player's life pool; exhausted players
  remain out until both pools reach Continue, and Continue clears exhaustion state
  on both revived heroes (`sim.tag.js`, `sim.js`, campaign/determinism tests).
- Boss-tagged waves now spawn on the arena floor instead of inheriting the generic
  120 px goon drop-in that clipped large directing sprites above the viewport
  (`sim.waves.js`, B5 browser/campaign regression).
- B5 crowd and weight warnings now cover the same X/depth regions as their damage
  producers, eliminating invisible edge and marker-overrun hits (`render.js`,
  browser geometry audit).
- Art pipeline now rejects wrong pose counts, duplicate frames, stale palette-
  violating outputs, and broken dimensions; preserves detached props; and omits
  failed outputs from the generated atlas. E1/E2 received gated model, idle, walk,
  telegraph, and attack sheets; hit spark regenerated at 8 colors. Hero references
  and portraits were not changed (`tools/*`, `assets/enemies`, `assets/fx`, `art/gate`).
- Art expansion: dedicated pickup/melon sprites; complete gated E3–E8 model rigs
  with accepted idle/walk/telegraph/attack/special sheets where generation passed;
  and canonical B1–B5 boss models plus readable B1/B2/B3/B5 telegraphs. Failed
  overlapping sheets are recoverably quarantined and omitted from the atlas.
  Renderer fallbacks now use clean model plates and special E7 glide/E8 counter/
  boss-pattern routes (`tools/asset-manifest.json`, `render.sprites.js`, `art/gate`).
- Final gated boss/FX batch added B2 spin/grab, B4 crane-cab, B5 direction/counter/
  enrage, and throw-slam dust animation. B2 lash, B3 duel/tunnel/stance, B4 signal/
  hammer, B5 combo, and four broader FX sheets failed strict or visual identity
  gates; their raws were preserved, processed artifacts quarantined, and atlas
  entries omitted so runtime fallbacks remain clean (`assets/bosses`, `assets/fx`,
  `art/src/rejected`, `fx.js`).
- Boss and goon attack producers now publish phase maxima; the renderer advances
  telegraphs from their own start and distributes every accepted action strip over
  active plus recovery instead of freezing tells or sampling two frames
  (`ai.js`, `ai.boss.js`, `render.sprites.js`, campaign regression test).
- Pixel pipeline now flood-cleans JPEG magenta backgrounds, separates X-overlapping
  connected poses, rejects truncated frame fragments, and retains strict palette,
  dimension, pose-count, and duplicate gates (`tools/pixelpipe.js`, tests).
- Determinism replay now runs the PRD-length 36,000 ticks and hashes campaign,
  lives, waves, projectiles, pickups, AI/combat timers, boss state, camera gates,
  and scoring rather than only live actor positions (`sim.js`, determinism test).
- Determinism hashing now records the actual AI `recoverT` field plus published
  telegraph/active/recovery maxima, closing a false-equality hole in replay checks
  (`sim.js`, `test/determinism.test.js`).

- Combat unlocked in browser: combat.js frozen-module refs → lazy getters; special
  move (U, meter 100) wired; E5 hold + mash-escape per PRD §4.3.6 (combat.*).
- Enemies now deal damage: melee active-phase hits, boss pattern damage per PRD
  §4.11 table, E3 melon projectiles ticked/collided (ai.js, ai.boss.js, sim.js).
- Death pipeline: hero death → lives → CONTINUE (10s, PSim.useContinue revive) →
  GAME OVER; sim-side lifeState contract wired to screens (sim.js, sim.tag.js,
  ui.screens.js). Double-pause freeze removed (single pause authority).
- Level flow: last-segment clear emits state.results → RESULTS → next level from
  campaign.json (PGame.nextLevel, score/lives carried); boss levels set state.vs.
- Solo tag bench hero spawns (KeyI works); benched entity hidden from HUD; HUD
  panels follow ACTIVE heroes; score display = base + IPPON total (ippon fields
  NaN-guarded); pit hazards single-hit with i-frames; difficultyMul mapped.
- Enemies-never-spawned root cause fixed (UI mode string leaked into sim mode +
  missing levelId); enemy AI chased empty P2 snapshot slot (pool-id vs playerIndex);
  hero clamped to level bounds, segment exits fire (game.js, sim.js, ai.js,
  sim.plat.js, sim.belt.js).
- Art: painted seamless W1 dirt-road ground strip replaces grid floor
  (render.layers.js, assets/bg/w1-ground.png); training DUMMY gets a real sprite
  (assets/enemies/dummy-idle.sheet.png) instead of a tan rectangle; hero walk 7fps /
  idle 5fps (fps values live in tools/asset-manifest.json — atlas.json is generated).
- Docs: CLAUDE.md (system map + contracts + refactoring roadmap), AGENTS.md,
  this changelog. Git repo pushed to github.com/andrei-v-lunev/patriot.

## 2026-08-19 — от «сломано» до играбельного W1 (multi-agent overhaul)

### Fixed — controls & core loop
- Sim frozen in browser: `sim.js` cached module refs at eval time before dependents
  loaded → whole sim inert. Converted to lazy `window.X` getters (+ regression test
  `test/sim.lazy.test.js`). Same fix later applied to `combat.js` (grip/throw/sweep/
  IPPON were all dead in browser while Node tests passed).
- Keybindings aligned to PRD §5.3.2 (J strike / K jump / L grip / I tag / O ukemi /
  U special; arrows = P1 alt-move outside COOP; P2 numpad map fixed).
- No enemies: UI passed `mode:"ARCADE"` + no levelId into `createGame` → bare
  fallback world. Normalized mode/levelId (sim.js) + proper plumbing (game.js).
- Enemies fled the hero: AI read the empty P2 snapshot slot due to pool-id vs
  playerIndex confusion (`ai.js near()`).
- Right screen edge dead: mode-string bug gated `platExit`; added hero x-clamp to
  level bounds (`sim.plat.js`).
- Special move wired (meter 100 → AoE launch per moves.json); E5 hero-grab hold +
  mash-escape per PRD §4.3.6 (`combat.hit.js`, `combat.grip.js`).
- Screens contract: PLAY now reacts to `state.lifeState`/`results`/`vs`; CONTINUE
  calls `PSim.useContinue`; RESULTS chains to next level via campaign.json
  (`ui.screens.js`, `game.js`). Pause menu trimmed to real items.

### Fixed — presentation
- Magenta sprite boxes: chroma-key + full-size atlas rendering (`render.sprites.js`,
  new `render.anim.js` with deterministic tick-driven animation).
- Procedural flat-band background replaced by painted W1 parallax (sky/far/mid slices
  from w1-dawn art) + painted seamless dirt-road ground strip (`render.layers.js`).
- PRD §4.2.2 dual-buffer implemented: 480×270 world ×2 → 960×540 UI layer (portraits/
  HUD/text at 2× density) → DPR-aware integer scale to screen (`boot.js`, `render.js`).
- Arcade title screen, character select with 192px portraits, HUD portrait chips +
  chase health bars (`ui.title.js`, `ui.js`).
- Hero/enemy animation sheets generated via grok pipeline with identity gating
  (idle/walk/throw for both heroes; E1/E2 walk+attack; hit-spark FX). Walk 7 fps,
  idle 5 fps.

### Added — tooling & docs
- Added a PRD-grounded release completion matrix and machine-readable inventory
  gate (`docs/RELEASE-COMPLETION.md`, `tools/release-inventory.json`). The normal
  check reports open production work; `--strict` is the final ship gate.
- Replaced the dummy-only audio seam with a lazy manifest-driven WebAudio runtime:
  decoded OGG/M4A buffers, music/SFX/VO buses, volume/duck controls, world routing,
  caching, and oscillator fallback. Added structural and production audio gates.
- Added three-slot versioned persistence with migration/corruption recovery,
  records and campaign unlocks; a functional five-world/15-level map; validated
  keyboard/gamepad remapping with conflict blocking; persisted audio/assist/touch/
  vibration/reduced-motion settings; and their browser menu flows.
- Art pipeline: `tools/pixelpipe.js` (chroma-key, island slicing, component cleanup,
  montage gate), `tools/gen-asset.js` + `asset-manifest.json` (data-driven, atlas
  generator). pngjs devDependency.
- Test suite grown to ~170 assertions (anim math, sim lazy-resolution, pixelpipe,
  input bindings).
- `tasks/AUDIO_GENERATION_TASK.md` — complete music/SFX/VO brief for external audio
  system (16 tracks, 45 SFX, 46 RU voice lines).
- Git repo + GitHub remote (andrei-v-lunev/patriot), `.gitignore`.
- `CLAUDE.md` / `AGENTS.md` — system map, contracts, pipeline rules, refactoring
  roadmap.

## 2026-08-21 — world art, safe animation closure and arcade presentation

- Added painted W2–W5 parallax masters, five deterministic tilesets, fifteen
  level-specific dressing passes, reduced-motion environment behavior, and browser
  visual gates for every level.
- Closed eleven rejected-generation gaps without publishing failed art: a decision
  registry names every accepted animation alias or code-native FX implementation;
  the generated atlas now matches the 99-entry manifest exactly.
- Added level-intro banners, portrait-led boss VS cards, boss-defeat ceremony,
  staged results/rank board, ending, scrolling credits and the Russian post-credit
  gag. Presentation timing is elapsed-time based, so 60/120/144 Hz displays keep
  the same durations.

### Known gaps (audit 2026-08-19)
Pickups never spawn; props/crates inert (B1 chain gimmick needs E1 adds); W3–W5
hazards & level flags unimplemented; DOJO = ARCADE; no difficulty selector; no
records persistence; W2–W5 art/bosses/E3–E8 sprites pending; audio pending.
