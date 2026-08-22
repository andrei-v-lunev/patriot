# Release completion matrix

This is the shipping contract for the full PRD. `PRD.md` remains canon; this file
turns its remaining production work into evidence gates. A row is complete only
when its implementation, automated check, and real-device/browser evidence all
exist. Graceful fallbacks are resilience, not completion.

Run `npm run release:inventory` for the current report. The final release gate is
`npm run release:inventory -- --strict`.

Audio has a parallel gate: `npm run audio:check` reports production blockers and
`npm run audio:check -- --strict` fails until masters, formats, loops, stems, SFX,
and final VO evidence satisfy the contract.

## Audio

| Deliverable | Required evidence |
| --- | --- |
| Production WebAudio runtime | OGG/M4A buffer loading, music/SFX/VO buses, ducking, loop regions, event routing, volume/mute settings, and oscillator fallback tests. |
| 16 music cues | Four reviewed candidates per cue; selected edit; 48 kHz/24-bit WAV master; OGG+M4A game exports; PRD duration, BPM, LUFS, peak, size, stem, and seamless-loop report. Final boss has verified A/B loop transition. |
| 45 SFX entries (~60 files) | Every ID/variant in `tasks/AUDIO_GENERATION_TASK.md`; OGG+M4A; mono except ambience; loudness/peak/duration/loop checks; round-robin non-repeat test. |
| 46 VO lines | Final—not placeholder—OGG+M4A and WAV masters; Russian/Japanese-judo pronunciation review; silence, mono, loudness, size, and release/consent records. |
| Audio integration | Every authored game/UI event maps to a real asset; all 15 levels select the correct music/ambience; missing/decode failure falls back without a crash. |

Generated music is not loop-ready. Candidate generation is followed by human
selection and a DAW/editor pass on bar lines with documented loop points. Secrets
and paid-provider credentials must never enter the repository or logs.

The repository publishes compact runtime OGG/M4A assets plus the reproducible
manifests and QA reports. Provider downloads and lossless WAV mastering workspaces
under `tools/_music_*` and `tools/_sfx_*` stay local and are intentionally ignored;
archive approved masters in the agency's production storage rather than ordinary
Git history.

## Persistence, settings, controls, and accessibility

| Deliverable | Required evidence |
| --- | --- |
| Save system | Versioned local save, autosave, campaign unlocks, records, selected options, atomic write, schema migration, corrupt/oversized/unknown-version recovery tests. |
| World map | Five worlds and 15 levels, lock/completion/record state, campaign return path, keyboard/gamepad/touch navigation, and reload persistence. |
| Settings | Music/SFX/VO volume, mute, difficulty/assist hooks, vibration, reduced motion, language presentation, reset defaults, persistence. |
| Remapping | P1/P2 keyboard and gamepad remap UI, conflict detection, defaults restore, device disconnect/reconnect, no menu ownership regression. |
| Accessibility | Reduced motion/flash behavior, readable Cyrillic, contrast/focus checks, touch target/layout checks, vibration opt-out, sub-960 responsive scaling. |

## Graphics, environments, maps, and textures

| Deliverable | Required evidence |
| --- | --- |
| World backgrounds | W1–W5 each ship sky/far/mid/ground layers (20 total), correct palette/time/weather, parallax route, no edge seams, screenshot regression. |
| Tiles and floor bands | Five 16×16 world tilesets plus belt-floor bands; collision-aligned platforms/pits/walls; palette and nearest-neighbor checks. |
| Segment dressing | All 15 levels have authored backdrop/dressing keys and visible identities: village/gym, bazaar/roofs, coach/roof/freight, docks/ship/crane, casino/backstage/cage. |
| Environmental motion | Dawn, market life, train scroll/wind/tunnel, rain/wet reflections/container warnings, neon/crowd/cage warnings; deterministic render-only animation and reduced-motion alternatives. |
| World map art | Five-world route, nodes, locked/cleared states, current-position marker, Russian labels, 960×540 and small-viewport visual checks. |

## Character, FX, and presentation art

| Deliverable | Required evidence |
| --- | --- |
| Eleven current atlas gaps | `fx-impact-large`, `fx-shockwave`, `b1-idle`, `b1-pound`, `b2-grab`, `b3-walk`, `b3-duel`, `b3-stance`, `b5-direct`, `b5-combo`, `b5-enrage`: accepted one-shot generation with canonical montage, or an explicitly designed code-native equivalent. Static fallback does not close the row. |
| Hero action coverage | Idle, walk, jump, grip, throws, hurt, ukemi, get-up, KO, victory, and specials for both heroes. Real-person likeness is protected: reference-locked/manual review only, never an unattended regeneration. |
| Enemy/boss coverage | Every live telegraph/pattern/movement/reaction selects a readable animation; no skating/static active attacks; full frame reachability tests. |
| FX coverage | Light/large impact, dust, shockwave, throw arc, KO stars, projectile and pickup routes; no panels/crops; warning art matches damaging geometry. |
| Narrative presentation | 12-panel intro, five VS exchanges/cards, boss intros/defeats, final ceremony, ending/post-credits, portraits/captions, skip/advance behavior. |
| Front/back matter | W1L1 onboarding, ten per-slot contextual hints, W1L2 down-throw guard lesson, rich results/records, credits, save indicator, complete Russian-first UI and responsive HUD. |

All generated raster work follows `tools/asset-manifest.json`, strict pixelpipe,
canonical-base comparison, visual approval, and atlas regeneration. Failed outputs
stay quarantined. Protected hero references are never regenerated.

## Automated and release verification

| Gate | Required evidence |
| --- | --- |
| Core regression | `npm test`, data validator, atlas/pixel gates, 36k determinism, natural campaign bot from W1L1 through credits. |
| Browser E2E | Every screen and all 15 levels; 120–150 ms real key holds; P1/P2, pause/continue/results/map/settings/save; console/page errors empty; browser closed. |
| Visual regression | Golden screenshots for screens, worlds, hazards, bosses, FX and viewport classes; deterministic canvas hashes plus human visual review. |
| Input/device | Keyboard, two gamepads, touch, blur/release, disconnect/reconnect, remap conflicts, small/large viewport and DPR matrix. |
| Audio QA | Decode/play/fallback, event coverage, format parity, duration/loop/LUFS/peak/size, pause/reload, mobile unlock, long-run voice/SFX pool behavior. |
| Reliability/performance | Save fuzz/migrations, malformed-state guards, duplicate-pool defenses, deterministic replays, 30-minute soak, frame/memory budgets. |
| Android | Clean debug/release build, install/launch, orientation/fullscreen, audio unlock, touch/gamepad, lifecycle pause/resume, save persistence, device screenshots. |
| Final hygiene | `CHANGELOG.md` and `CLAUDE.md`, anti-slop cleanup, comprehensive code review APPROVE/CLEAR, no dangling atlas paths or secrets, no commit/push without approval. |

Machine-readable status and probes live in `tools/release-inventory.json`. Update a
row to `complete` only in the same change that supplies its evidence.
