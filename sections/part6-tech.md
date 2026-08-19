# 3. Technical Architecture

*Owner: Technical Director. Status: approved baseline. All numbers here are contractual — designers and agents implement against them, not around them.*

---

## 3.1 Architecture Overview

### 3.1.1 Why this stack

We reuse the shipped `madagaskar` architecture verbatim in shape: **vanilla JS IIFE modules loaded by `<script>` tags, a headless deterministic sim, a dumb renderer, and a Gradle WebView APK wrapper**. It is the only pattern we have *already shipped to an APK* — ES modules fail under `file:///android_asset/` because the WebView applies CORS to module fetches, and a bundler step buys us nothing a script-tag load order doesn't already give.

Second reason: the headless sim is why `test/sim.test.js` runs under plain `node` with zero DOM shims. THE PATRIOT's combat is frame-data-driven and must be unit-testable and replay-deterministic; that is only possible if the sim never touches DOM, `Date.now()`, or `Math.random()`.

### 3.1.2 Module map

| Module | Global | Owns | Never touches |
|---|---|---|---|
| `data/*.json` | — | Levels, moves, enemies, atlas manifests | — |
| `js/data.js` | `PData` | JSON load + validation + frame→tick conversion | canvas, audio |
| `js/rng.js` | `PRng` | mulberry32 seedable RNG | everything else |
| `js/sim.js` | `PSim` | World state, physics, camera, waves, save-state | DOM, Date, Math.random |
| `js/combat.js` | `PCombat` | Move instances, boxes, grips, throws, hitstop | DOM, rendering |
| `js/ai.js` | `PAI` | Enemy brains, attack tokens | DOM |
| `js/pools.js` | `PPools` | Entity/FX/projectile object pools | DOM |
| `js/input.js` | `PInput` | Devices → per-player `intent` objects | sim state |
| `js/render.js` | `PRender` | Offscreen buffer, layers, sprites, atlas | mutating sim state |
| `js/fx.js` | `PFx` | Particles/screenshake read from sim FX pool | sim logic |
| `js/ui.js` | `PUI` | HUD, menus, bitmap font (proportional Cyrillic set `font_bitmap_ru`, per-glyph width table — see Part 3 §4.6.6; all strings RU-first), glyphs | sim logic |
| `js/audio.js` | `PAudio` | Buffers, stems, event→SFX map | sim state (read-only drain) |
| `js/boot.js` | `PBoot` | Preloader, canvas sizing, platform detect | game logic |
| `js/game.js` | — | Shell: rAF loop, accumulator, wiring | any rule logic |

**Hard rule:** `sim.js`, `combat.js`, `ai.js`, `pools.js`, `rng.js`, `data.js` must all `require()` cleanly in Node. They export via `module.exports` *and* `window.PXxx`, exactly like `madagaskar/js/sim.js` does today.

### 3.1.3 Diagram

```
                    ┌──────────────────────────────────────┐
                    │            js/game.js (shell)        │
                    │  rAF → accumulator → fixed 120Hz     │
                    └───┬──────────┬───────────┬───────────┘
                        │          │           │
        intents[2]      │          │ step(dt)  │ draw(state)
   ┌────────────────────▼──┐   ┌───▼────────┐  │
   │   js/input.js         │   │  js/sim.js │  │
   │  kbd / 2×pad / touch  │──▶│  ┌────────┐│  │
   │  → {move,jump,grip,   │   │  │combat  ││  │
   │     throwDir,tag,     │   │  │ai      ││  │
   │     special,ukemi,    │   │  │pools   ││  │
   │     pause} + 6-tick   │   │  │rng     ││  │
   │     buffer            │   │  └────────┘│  │
   └───────────────────────┘   └──┬──────┬──┘  │
                                  │      │     │
                    state (read)  │      │ state.events[]  (drained)
              ┌───────────────────▼──┐   │     │
              │   js/render.js       │◀──┼─────┘
              │  480×270 offscreen   │   │
              │  layers → scale blit │   │  ┌──────────────┐
              │  + js/fx.js  js/ui.js│   └─▶│ js/audio.js  │
              └──────────┬───────────┘      │ stems + SFX  │
                         │                  └──────────────┘
                    <canvas id="game">
                         │
        ┌────────────────┴─────────────────┐
        │                                  │
   Browser (itch.io static)      Android WebView (Gradle)
```

Data flow is one-way per frame: **input → sim → (render, audio)**. Render and audio never write sim state. `data.js` loads before everything and is immutable after boot.

---

## 3.2 The Dual-Mode Sim

One sim, one entity model, one physics function with a mode branch. We do **not** build two games.

### 3.2.1 Entity position model (canonical)

Every entity carries all three axes at all times:

```js
{ x, z, d,          // world x, height above floor (0 = on floor), depth on floor band
  vx, vz, vd,
  w, h, dw,         // width, height, depth-thickness (for ±10 rule)
  mode,             // "plat" | "belt" — copied from the active segment
  grounded, facing }
```

- `z` is **height above the floor**, positive up. This replaces platformer `y` entirely.
- `d` is **depth position on the floor band**, larger `d` = further from camera (further "up" the screen).
- Screen mapping is a render concern, not a sim concern:
  `screenX = x - cam.x`, `screenY = floorY(d) - z`, where `floorY(d) = FLOOR_BASE - d * DEPTH_SCALE`, `DEPTH_SCALE = 1.0`.

Platform mode simply **pins `d` to the segment's `dLock`** (default 0) and sets `vd = 0` each tick. Belt mode allows `d ∈ [dMin, dMax]` (default `[0, 60]`).

This is the recommendation: **one 3-axis model with a per-segment mode flag**, not two entity types. Sharing `z` means jump physics, throw arcs, and juggle height are literally the same code in both modes — which is the whole point, since a knockdown that starts in a belt arena must be able to end in a platform segment during boss transitions.

### 3.2.2 Collision rules — platform mode

Identical in spirit to the shipped `sim.js` swept-AABB, with `y` renamed to `z` and sign flipped:

1. Integrate `vz -= GRAVITY * dt` with the three-band gravity from the shipped game (`RISE_G 0.88`, `APEX_G 0.55` when `|vz| < APEX_V`, `FALL_G 1.55`), clamp to `MAX_FALL`.
2. Resolve **X first**, then **Z**, both against solid AABBs in `(x, z)`. Never resolve both at once — that produces corner snagging.
3. One-way platforms: solid only when `vz <= 0` and the entity's previous-tick bottom was `>= platform.top - 1`.
4. Coyote time `0.10s`, jump buffer `0.12s` — both carried over from the shipped tuning; they proved good.
5. `d` is frozen. Depth-overlap tests are skipped (all entities share `dLock`).

### 3.2.3 Collision rules — belt mode

1. **Floor band clamp:** `d = clamp(d, seg.dMin, seg.dMax)` after integration. No gravity on `d`.
2. **Depth-overlap rule (the ±10 rule):** two entities can interact only if
   `Math.abs(a.d - b.d) <= DEPTH_TOL` where **`DEPTH_TOL = 10`** px. This gates *all* hitbox, gripbox, and body-push tests.
3. **Body push:** when two same-team entities overlap in `x` **and** pass the ±10 test **and** overlap in `z`, push apart along `x` at `PUSH_SPEED = 40 px/s` each. Cheap, no iteration.
4. **Hits** additionally require `z`-overlap of the boxes (`a.z < b.z + b.h && a.z + a.h > b.z`) so ducking under a high attack works.
5. **Walls:** arena has left/right `xMin/xMax` gates (see §3.4). Solids inside a belt arena are props only (crates, barrels), tested as AABB in `x` and depth-tested with ±10.
6. Jumping in belt mode raises `z` normally; `d` is retained during flight (you land where you left).

### 3.2.4 Camera

Two behaviours, one struct: `cam = { x, targetX, shakeX, shakeZ, locked }`.

**Belt mode.**
- On arena entry: `cam.x` snaps to `seg.arena.camX`, `cam.locked = true`, gates close (`xMin/xMax` = arena bounds).
- Camera holds absolutely still for the entire wave. No follow. This is the TMNT contract — the fight frame is stable.
- On last enemy of the final wave dying: `cam.locked = false`, right gate opens, `"GO"` arrow FX spawns at `x = xMax - 24`, blinking at 4Hz. Camera then follows the *rightmost living hero* with a dead-zone of 64px, max speed 180 px/s. Camera never scrolls left in belt mode.
- 2P: if both heroes alive, camera target is their midpoint, but each hero is hard-clamped to `[cam.x + 8, cam.x + 472]` — no player can drag the other off-screen.

**Platform mode.**
- Look-ahead: `targetX = hero.x + facing * LOOKAHEAD` where `LOOKAHEAD = 56` px.
- Damping: `cam.x += (targetX - cam.x) * (1 - Math.pow(0.001, dt))` — frame-rate independent exponential smoothing (equivalent to ~63%/100ms).
- Vertical: `cam.z` follows hero `z` only when `grounded` or `z` exceeds a 90px window, damped at half the horizontal rate. Prevents jump-bob nausea.
- Clamped to `[0, seg.width - 480]`.

Shake is additive, applied at render time only, sourced from `state.shake` (decays `shake *= 0.86` per tick). Shake never enters `cam.x` — determinism of the sim must not depend on it, and it doesn't, because shake is computed from a sim counter but only *read* by render.

---

## 3.3 Fixed Timestep, Frame Data, Determinism

### 3.3.1 The loop (contractual code)

```js
// js/game.js
var SIM_HZ   = 120;
var SIM_DT   = 1 / SIM_HZ;
var MAX_STEPS = 8;              // spiral-of-death guard
var acc = 0, last = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) { last = now; acc = 0; return; }   // never bank hidden time
  if (!last) last = now;
  var dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;     // tab-restore / breakpoint clamp
  acc += dt;

  PInput.poll();                                          // once per rendered frame
  var steps = 0;
  while (acc >= SIM_DT && steps < MAX_STEPS) {
    PSim.step(state, PInput.intents());                   // NOTE: no dt argument
    acc -= SIM_DT;
    steps++;
  }
  if (steps === MAX_STEPS) acc = 0;                       // drop the debt, don't chase it

  PAudio.consume(state.events);                           // drains the queue
  PRender.draw(state, acc / SIM_DT);                      // alpha for interpolation
}
```

**`PSim.step` takes no `dt`.** The tick length is a constant inside the sim. This is stricter than the shipped `madagaskar` sim (which accepts `dt`) and is the single most important determinism decision in the project: a replay is a seed plus a list of intent bitfields, nothing else.

### 3.3.2 Frame-data conversion rule

Designers author **all** move timing in frames at 60fps, because that is how fighting-game frame data is universally read and how the animation sheets are cut. `data.js` converts once at load:

```js
function toTicks(frames60) { return (frames60 | 0) * 2; }   // 60fps frame → 2 sim ticks
```

Applied to: `startup`, `active`, `recovery`, `hitstop`, `hitstun`, `blockstun`, `gripHold`, `throwArc`, `iFrames`, `cooldown`. Never applied twice — `data.js` sets `def._ticks = true` and throws on re-conversion. Animation playback in `render.js` reads the *original* frame numbers and advances at `tick >> 1`, so sprite and hitbox can never desync.

Odd-frame data is legal (1 frame = 2 ticks); we simply have twice the timing resolution available for internal tuning that designers don't need to see.

### 3.3.3 Determinism rules (enforced by lint + test)

1. No `Date.now()`, `performance.now()`, `new Date()` inside `sim/combat/ai/pools/rng`.
2. No `Math.random()` anywhere in those files. CI greps for it and fails the build.
3. No object-key iteration order dependence: all iteration is over arrays with stable indices. Entities are never spliced during a step — kills set `alive = false`, compaction happens once at end of tick in a fixed order.
4. No floating-point accumulation across variable dt (guaranteed by §3.3.1).
5. Sim reads *only* `state` + `intents`. It may not read `window`, `navigator`, `document`.

### 3.3.4 RNG

`js/rng.js`, mulberry32, ~10 lines:

```js
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Placement:** exactly one RNG instance, `state.rng`, created in `PSim.createGame(seed)` and stored with its current integer state in `state.rngState` so a save/replay can restore it. All AI decisions, crit rolls, spawn jitter, and drop tables pull from `state.rng`. Cosmetic-only randomness (particle jitter, screen-flake) uses a *separate* `PFx.rng` seeded from wall-clock — it lives in the render layer and is explicitly allowed to be nondeterministic, because it never feeds back into the sim.

---

## 3.4 Data Schemas

All game content is JSON in `data/`. Code contains no tuning numbers except engine constants. Files are loaded by `PBoot` via `fetch` (works from `file://` in Android WebView when `setAllowFileAccess(true)` — already set in the shipped `MainActivity.java`; we additionally ship a `data/index.js` fallback that assigns the same objects to `window.PDataRaw` for any WebView where `fetch(file://)` is blocked. Loader prefers `fetch`, falls back to the global.)

### 3.4.1 Level file — `data/levels/w1_docks.json`

```json
{
  "schema": 1,
  "id": "w1_docks",
  "name": "Vladivostok Docks",
  "world": 1,
  "music": { "stem": "w1_docks", "intensity": "auto" },
  "palette": "docks",
  "segments": [
    {
      "id": "s1",
      "mode": "plat",
      "width": 1440,
      "dLock": 24,
      "floorZ": 0,
      "solids": [
        { "x": 0,   "z": 0,  "w": 640, "h": 32, "type": "solid" },
        { "x": 704, "z": 0,  "w": 320, "h": 32, "type": "solid" },
        { "x": 400, "z": 64, "w": 96,  "h": 12, "type": "oneway" }
      ],
      "hazards": [
        { "type": "pit",   "x": 640, "w": 64, "damage": 1, "respawn": "checkpoint" },
        { "type": "steam", "x": 900, "z": 32, "w": 24, "h": 48,
          "damage": 1, "cycleFrames": 90, "onFrames": 36, "phase": 0 }
      ],
      "props": [
        { "type": "crate", "x": 520, "d": 24, "hp": 2, "drop": "health_small" }
      ],
      "checkpoints": [{ "x": 700, "d": 24 }],
      "exit": { "type": "next" }
    },
    {
      "id": "s2",
      "mode": "belt",
      "arena": {
        "camX": 1440,
        "xMin": 1448, "xMax": 1912,
        "dMin": 0, "dMax": 60,
        "backdrop": "docks_yard"
      },
      "props": [
        { "type": "barrel", "x": 1600, "d": 48, "hp": 1, "throwable": true, "drop": "none" }
      ],
      "hazards": [
        { "type": "edge_water", "x": 1880, "w": 32, "dMin": 0, "dMax": 60,
          "ringout": true, "damage": 2 }
      ],
      "waves": [
        {
          "id": "w1",
          "trigger": { "type": "enter" },
          "spawns": [
            { "archetype": "goon_dock", "palette": 0, "x": 1900, "d": 20, "delayFrames": 0 },
            { "archetype": "goon_dock", "palette": 1, "x": 1920, "d": 44, "delayFrames": 30 }
          ]
        },
        {
          "id": "w2",
          "trigger": { "type": "cleared", "of": "w1" },
          "spawns": [
            { "archetype": "goon_dock",  "palette": 2, "x": 1430, "d": 10, "delayFrames": 0 },
            { "archetype": "goon_dock",  "palette": 0, "x": 1930, "d": 52, "delayFrames": 20 },
            { "archetype": "brute_dock", "palette": 0, "x": 1930, "d": 30, "delayFrames": 90 }
          ]
        },
        {
          "id": "w3",
          "trigger": { "type": "cleared", "of": "w2", "delayFrames": 60 },
          "boss": true,
          "spawns": [
            { "archetype": "boss_kaban", "palette": 0, "x": 1900, "d": 30, "delayFrames": 0 }
          ]
        }
      ],
      "gate": { "openOn": "allWavesCleared", "side": "right", "goArrow": true },
      "exit": { "type": "next" }
    }
  ]
}
```

**Wave grammar.** `trigger` is one of:
- `{"type":"enter"}` — fires when a hero crosses `xMin`.
- `{"type":"cleared","of":"<waveId>","delayFrames":N}` — fires N frames after the named wave hits zero living enemies.
- `{"type":"xpast","x":N}` — platform-segment ambush.
- `{"type":"timer","frames":N}` — from arena entry.

`spawns[].delayFrames` staggers entrances so twelve bodies never pop in on one tick. Spawn `x` outside `[xMin,xMax]` means "walk in from off-screen"; inside means "drop in from above" (`z = 120`, falls).

### 3.4.2 Move data — `data/moves.json`

Frame data is **data, never code**. One full example:

```json
{
  "schema": 1,
  "moves": {
    "hero_jab": {
      "name": "Jab",
      "anim": "hero/jab",
      "input": { "button": "grip", "tap": true, "onGround": true },
      "startup": 4, "active": 3, "recovery": 9,
      "cancelWindow": { "from": 5, "to": 12, "into": ["hero_jab2", "hero_grip", "hero_special"] },
      "hitboxes": [
        { "fromFrame": 4, "toFrame": 6,
          "x": 14, "z": 20, "w": 22, "h": 14, "dw": 14,
          "damage": 4, "hitstop": 3, "hitstun": 12, "blockstun": 6,
          "knockback": { "vx": 90, "vz": 0 },
          "launch": false, "juggleCost": 0,
          "hitSfx": "hit_light", "hitFx": "spark_s",
          "hitsGrounded": true, "hitsAirborne": true, "hitsDowned": false }
      ],
      "hurtboxOverride": null,
      "meterGain": 4,
      "cooldown": 0,
      "cancelOnWhiff": false
    },
    "hero_ippon_seoi": {
      "name": "Ippon Seoi Nage",
      "anim": "hero/seoi",
      "input": { "button": "throwDir", "requires": "gripped" },
      "startup": 6, "active": 1, "recovery": 16,
      "gripConsume": true,
      "throw": {
        "arcFrames": 26,
        "peakZ": 78,
        "distX": 96,
        "dirFromInput": true,
        "becomesProjectile": true,
        "projDamage": 6,
        "projRadius": 12,
        "landDamage": 10,
        "landStun": 90,
        "bounceCount": 1,
        "bounceDamp": 0.45
      },
      "iFrames": { "from": 6, "to": 14 },
      "meterGain": 12,
      "hitSfx": "throw_slam",
      "hitFx": "dust_burst"
    }
  }
}
```

### 3.4.3 Enemy archetype — `data/enemies.json`

```json
{
  "schema": 1,
  "archetypes": {
    "goon_dock": {
      "name": "Dock Goon",
      "sprite": "goon_a",
      "palettes": [
        { "id": 0, "map": { "#3a2a1e": "#4a2f22", "#8a6a4a": "#a07a52" } },
        { "id": 1, "map": { "#3a2a1e": "#1e2a3a", "#8a6a4a": "#4a6a8a" } },
        { "id": 2, "map": { "#3a2a1e": "#2a3a1e", "#8a6a4a": "#6a8a4a" } }
      ],
      "hp": 20, "w": 20, "h": 40, "dw": 12,
      "speed": 52, "approachDist": 30, "retreatChance": 0.15,
      "moves": ["goon_swing", "goon_grab"],
      "grippable": true, "throwWeight": 1.0,
      "ukemi": false,
      "ai": { "profile": "rusher", "reactionFrames": 14, "aggression": 0.7,
              "tokenCost": 1, "spacingJitter": 8 },
      "drops": [{ "item": "none", "weight": 80 }, { "item": "health_small", "weight": 20 }],
      "score": 100
    }
  }
}
```

### 3.4.4 Save file v1 — `localStorage["patriot.save.v1"]`

```json
{
  "v": 1,
  "progress": { "world": 1, "level": "w1_docks", "segment": "s2",
                "levelsCleared": ["w1_docks"], "checkpoint": { "x": 700, "d": 24 } },
  "scores": { "w1_docks": { "best": 41250, "bestTimeFrames": 7420, "rank": "A", "noHit": false } },
  "unlockedThrows": ["hero_ippon_seoi", "hero_osoto_gari"],
  "unlockedHeroes": ["patriot", "sestra"],
  "settings": {
    "masterVol": 0.8, "musicVol": 0.7, "sfxVol": 1.0,
    "crt": false, "scaleMode": "integer", "screenShake": 1.0,
    "lang": "en", "showGlyphs": "auto",
    "bindings": { "p1": null, "p2": null }
  },
  "stats": { "throwsLanded": 214, "playtimeFrames": 182400 },
  "rngSeed": 1337
}
```

### 3.4.5 Validation rules (`PData.validate`, runs in CI and on dev boot)

1. `schema` must equal the loader's expected version; unknown → hard fail with file+field path.
2. Every `spawns[].archetype` must exist in `enemies.json`; every `archetype.moves[]` in `moves.json`.
3. Every wave `trigger.of` must name an *earlier* wave in the same arena (no cycles).
4. `startup + active + recovery >= 1`; every hitbox `fromFrame/toFrame` must fall inside `[startup, startup+active-1]`.
5. `arena.xMax - arena.xMin >= 464` (one screen + margin) and `dMax - dMin >= 2 * DEPTH_TOL`.
6. Palette maps: every key must be a 6-digit hex present in the source sprite's palette (checked by `tools/pack.js`, warning not fail).
7. Total spawns alive in any single wave ≤ **12**. Hard fail — it is the pool ceiling.
8. Save file: unknown `v` → discard and start fresh, never crash. Missing `settings` keys → filled from defaults (same defensive `migrateProgress` pattern as the shipped game).

---

## 3.5 Combat Engine

### 3.5.1 Move instances

A move in flight is a small pooled struct — never a closure, never a class instance created per swing:

```js
{ defId, def, tick, phase, ownerId, hitIds, cancelled }
// phase: 0 startup | 1 active | 2 recovery | 3 done
```

`tick` counts sim ticks; `phase` is derived each tick from `def.startupT / activeT / recoveryT`. `hitIds` is a small fixed array (len 8) of entity ids already struck by this instance — prevents multi-hit on a single active window without allocating a Set.

### 3.5.2 Per-tick resolution order

Strict, and identical every tick. This ordering is the spec:

1. **Hitstop check.** If `state.hitstop > 0`, decrement it and *skip steps 2–8 for entities flagged frozen*. Camera shake and FX still advance (they're render-side).
2. **Intents → state.** Buffered inputs consumed, moves started, cancels applied.
3. **AI think** (only for entities whose `reactionTick` is due).
4. **Physics integrate** (x, z, d) and collide per §3.2.
5. **Gripbox resolution.** Gripboxes beat hitboxes: an active gripbox that passes ±10 depth + AABB on a *grippable, non-invulnerable, non-airborne* target converts both entities into `gripper/grippee` linked state immediately, and any in-flight hitbox on the grabbed entity is cancelled.
6. **Hitbox × hurtbox resolution.** Iterate attackers in fixed id order. For each active hitbox: depth test (±10) → z-overlap → x/AABB → `hitIds` dedupe → team filter → `hitsDowned/hitsAirborne` flags. On hit: apply damage, set `hitstun`, apply knockback, push `hit` event, set `state.hitstop = def.hitstop`.
7. **Throw/projectile advance.** Thrown bodies step their arc.
8. **Death sweep + pool release.** `alive=false` entities released at end of tick, in ascending id order.

Trades (both connect same tick) are allowed and resolve both — this is a beat-'em-up, not a fighter; simultaneity reads as chaotic and good.

### 3.5.3 Hit-stop

Global `state.hitstop` in ticks. While `> 0`, entities involved in the exchange have their physics and move `tick` frozen; everything else runs. This is a *global* freeze in practice (the arena stops), which is the 16-bit feel we want. Values: light 3 frames (6 ticks), heavy 6 (12), throw impact 10 (20). Hitstop never blocks input polling or buffering — buffered inputs land the instant it ends, which is what makes combos feel responsive.

### 3.5.4 Juggle & knockdown

**The victim owns its own state**, always. `entity.combatState` is one of `idle | hitstun | blockstun | launched | downed | getup | gripped | thrown`. The attacker only *requests* a transition by delivering a hit; the victim's tick function decides. This prevents the classic bug where two attackers both write knockdown and the victim gets two get-up timers.

- `juggleBudget` starts at **6** on launch and each hit subtracts `hitbox.juggleCost` (default 1) and scales knockback by `0.85^hitsSoFar`. At `0`, further hits deal damage but no knockback and the victim falls to `downed`.
- `downed` lasts `getupFrames` (default 40), during which `hitsDowned:false` boxes pass through. Last 12 frames are `getup` with i-frames.
- **Ukemi:** pressing `ukemi` within a 10-frame window after entering `launched` converts to a 20-frame roll with i-frames and no `downed` phase. Heroes always have it; enemies only if `archetype.ukemi:true` (elites and bosses).

### 3.5.5 Thrown body as projectile

On throw release the grippee becomes a live projectile *without changing entity type*:

- `combatState = "thrown"`, `team = "neutral"`, `vx`/`vz` set from `def.throw.distX/peakZ/arcFrames` solved as a parabola over the arc, `vd` from thrower's `throwDir` depth component.
- Each tick while thrown, the body carries an implicit hitbox equal to its own AABB inflated by `projRadius`, dealing `projDamage` to *anyone* it passes the ±10 test with, including the thrower's former allies. `hitIds` prevents re-hits on the same body.
- On floor contact: `landDamage` to itself, `landStun` frames, one bounce at `bounceDamp`, then `downed`.
- On wall/prop contact: extra `landDamage`, no bounce, `wall_slam` event.
- Ring-out hazards (`hazard.ringout`) instantly kill a thrown body that enters them — this is a scoring move and gets its own event and 2× score.

### 3.5.6 AI attack tokens

`state.attackTokens = 2`. An enemy may only *commit* to an attack move if it can claim a token (`tokenCost`, brutes cost 2). Token is held from move start until recovery ends or the enemy is hit. Non-holders run "approach / circle / bait" behaviours. This is what keeps twelve on-screen enemies from becoming a blender. 2P co-op raises the pool to **3**, not 4 — two heroes should still feel pressured, not swarmed. Tokens are claimed in ascending entity id order for determinism.

### 3.5.7 Pooling (REQUIRED — no per-frame allocation in the sim)

`js/pools.js` pre-allocates at boot and never grows. `alloc()` returns `null` when exhausted; callers must handle `null` by skipping (FX) or refusing to spawn (enemies).

| Pool | Size | Rationale |
|---|---|---|
| Heroes | 2 | fixed |
| Enemies | 12 | arena ceiling, matches validation rule 7 |
| Move instances | 24 | 14 bodies × ~1.7 concurrent |
| Hitbox records | 48 | 2 per move instance |
| Projectiles | 20 | thrown bodies reuse enemy slots; this is for knives/bottles |
| FX / particles | 96 | render-side, but pooled by the same module |
| Damage numbers | 16 | UI |
| Audio event records | 32 | ring buffer, drained every frame |

The sim's steady-state allocation target is **zero objects per tick**. A CI test asserts this by snapshotting object counts over 600 ticks of a scripted fight.

---

## 3.6 Renderer

### 3.6.1 Buffer & scaling

One offscreen `<canvas>` at exactly **480×270**, `imageSmoothingEnabled = false` on both contexts. Every draw goes there. Once per frame it is blitted to the visible canvas at an **integer scale** `s = max(1, floor(min(vw/480, vh/270)))`, centred, with letterbox bars painted in `#000`. `scaleMode:"fit"` in settings allows non-integer for people who hate bars; default is integer.

### 3.6.2 Layer stack (drawn in this order, every frame)

| # | Layer | Content | Parallax |
|---|---|---|---|
| 0 | sky | gradient or sky sprite | 0.0 |
| 1 | far | skyline, mountains | 0.25 |
| 2 | mid | buildings, fences | 0.55 |
| 3 | play | **all entities, props, floor decals** | 1.0 |
| 4 | foreground | pillars, crowd silhouettes | 1.25 |
| 5 | lighting | `globalCompositeOperation` overlays, tints | 1.0 |
| 6 | UI | HUD, portraits, text | fixed |

Layers 0–2 and 4 are drawn from a small set of wide sprites with `drawImage` tiling — typically 6–10 calls total.

### 3.6.3 Depth sort in belt mode

Layer 3 is painter-sorted by `d` ascending (far entities first). Approach:

- Maintain a persistent `sortBuf` array (pre-sized 64) of `{d, kind, idx}`; refill it each frame rather than allocating.
- Sort with **insertion sort**, not `Array.prototype.sort`. Entity depth changes very little frame to frame, so the array is nearly sorted — insertion sort is O(n) in practice at n≤34 and allocates nothing. `Array.sort` on a 34-element array of objects is ~4–8µs and allocates a comparator frame; insertion sort measures ~1µs on the target device.
- Ties (equal `d`) break by entity id for stable, deterministic-looking output.
- In platform mode the sort is skipped entirely (fixed draw order: props → enemies → heroes → FX).

Budget for the sort: **≤ 0.15ms**.

### 3.6.4 Atlas pipeline

`tools/pack.js` — a plain Node script, no deps, run manually via `npm run pack`:

1. Walks `art/src/**/*.png` (one file per frame, named `<actor>_<anim>_<NN>.png`).
2. Bin-packs into power-of-two atlases, max **2048×2048** (safe floor for 2019 WebViews), one atlas per actor group (`hero`, `goons`, `props`, `fx`, `ui`).
3. Emits `assets/atlas/<group>.png` + `assets/atlas/<group>.json`:

```json
{ "image": "hero.png", "size": [1024, 1024],
  "frames": {
    "hero/jab_00": { "x": 0, "y": 0, "w": 48, "h": 48, "ox": -16, "oy": -44 }
  },
  "anims": { "hero/jab": { "frames": ["hero/jab_00","hero/jab_01"], "fps": 15, "loop": false } } }
```

`ox/oy` are the draw offsets from the entity's feet-centre origin, computed from a 1px magenta origin marker in the source PNG. Renderer never hardcodes offsets.

### 3.6.5 Palette swap

At load, `PRender` decodes each palettable atlas once into an `ImageData`, then for each variant in `enemies.json` builds a new `ImageData` by remapping exact RGB triples (hash on `(r<<16)|(g<<8)|b`) and bakes it to an offscreen canvas. Cost is ~8ms per variant on a 1024² atlas; done during the preloader, never at runtime. Three palettes per goon type × 5 goon types = 15 baked canvases ≈ 15 × 1MB VRAM — acceptable, and it makes variant rendering exactly as cheap as the base.

### 3.6.6 CRT filter — **canvas post-pass** (decision)

We use a canvas post-pass, not CSS. Reason: CSS filters/shadow tricks over a scaled canvas are unpredictable across WebView versions and can force a slow compositing path on Mali GPUs; a canvas pass is deterministic and measurable.

Implementation: a pre-rendered 1×4px scanline tile (alpha 0.0/0.12/0.0/0.06) is `createPattern`-repeated and drawn over the **scaled** output with `globalAlpha = 0.5`, plus a single radial vignette gradient drawn once into a cached offscreen and blitted. Two draw calls, ~0.4ms at 1080p. Aperture-grille tint is a third optional pattern. Off by default on Android (auto-detected low-tier), toggle in settings. No shaders, no WebGL.

### 3.6.7 Text

Bitmap font only. Two faces: `font_5x7` (HUD, small) and `font_10x14` (titles, damage numbers), each a single-row atlas with a JSON width table for proportional spacing. `PUI.text(ctx, str, x, y, face, color)` draws per-glyph `drawImage`; colour variants are pre-baked (white, yellow, red, black-outline) rather than tinted at runtime. No `ctx.fillText` anywhere in the project — it kills pixel fidelity and costs a font raster per unique string.

---

## 3.7 Input System

### 3.7.1 The intent object

`PInput.intents()` returns a stable 2-element array, mutated in place:

```js
{ moveX: -1..1, moveD: -1..1,        // analog-normalized, quantized to 1/8 for determinism
  jump: bool, jumpPressed: bool,
  grip: bool, gripPressed: bool,
  throwDir: 0|1|2|3|4|5|6|7|-1,      // 8-way from stick/dpad at release, -1 = none
  tag: bool, tagPressed: bool,
  special: bool, specialPressed: bool,
  ukemi: bool, ukemiPressed: bool,
  pause: bool, pausePressed: bool }
```

`moveX/moveD` are quantized to 1/8 steps before entering the sim so analog drift can't desync a replay.

### 3.7.2 Gamepad

Polled once per rendered frame (never per tick) via `navigator.getGamepads()`. Standard mapping assumed; `gamepad.mapping !== "standard"` falls back to a defaults table keyed by a normalized `id` substring (Xbox / DualShock / generic).

- Buttons: `0`=jump, `2`=grip, `1`=special, `3`=tag, `4/5`=ukemi, `9`=pause.
- **2-pad assignment:** on `gamepadconnected`, the pad is assigned to the lowest free player slot. Player 1 keeps its pad index across disconnects for 30s (grace reconnect by `gamepad.id + index`). A pad pressing Start on the "PRESS START" screen claims a slot explicitly. Slot assignment is stored in `settings.bindings`.
- Deadzone 0.25 radial (matching the shipped input module's 0.25 axis threshold), then rescaled so the usable range is full 0–1.

### 3.7.3 Keyboard (double map)

P1: `WASD` + `J` grip / `K` special / `L` tag / `Space` jump / `Shift` ukemi.
P2: arrows + `Numpad1/2/3/0/.`.
Both maps are always live so a solo player on keyboard can use either. `Esc`/`P` = pause. Same `preventDefault` guard list as the shipped `input.js`.

### 3.7.4 Touch

Pointer Events only (no touch events — pointer works in every target WebView ≥ Android 6).

- **Floating joystick:** first pointer-down in the left 45% of the screen sets `origin = (px, py)`. Each move: `dx = px - ox, dy = py - oy`, `len = hypot`, `moveX = clamp(dx / 40, -1, 1)`, `moveD = clamp(-dy / 40, -1, 1)` (screen-up = increasing depth). If `len > 40` the origin slides to keep the knob at radius 40 (classic re-centring). Released → zero.
- **Buttons:** right 55% carries GRIP / JUMP / SPECIAL / TAG as touch targets ≥ 48 CSS px, drawn in the UI layer, hit-tested in CSS pixels, `touch-action: none` on the container.
- **Flick gesture (throw direction):** every pointer sample on the joystick is pushed into a ring buffer of `{x, y, t}` capped at **100ms** of history. On GRIP release, compute velocity from oldest to newest sample in the buffer: `speed = dist / dtMs`. If `speed >= 0.45 px/ms` **and** `dist >= 24 px`, emit `throwDir` = the 8-way octant of that vector; otherwise `throwDir` = the octant of the current stick position, or `-1` if centred. This lets a player throw by flicking without lifting into a menu-y gesture.

### 3.7.5 Buffering

A **6-tick** (50ms at 120Hz) buffer per action per player. `PInput` records `pressedAtTick`; the sim consumes a buffered press if `state.tick - pressedAtTick <= 6` and clears it on consume. Applies to jump, grip, special, tag, ukemi. This is what makes cancels feel forgiving; combined with hitstop-immune buffering (§3.5.3) it is the core of combat feel.

### 3.7.6 `lastDevice`

`PInput.lastDevice()` returns `"keyboard" | "pad" | "touch"` (same idea as the shipped module) and drives which button glyphs `PUI` renders. Updated only on an actual press, never on noise, so a plugged-in idle controller doesn't flip the HUD.

---

## 3.8 Audio Engine

`js/audio.js`, Web Audio, one `AudioContext`.

- **Loading.** `PAudio.load(manifest)` fetches → `decodeAudioData` → cached in `buffers[name]`. SFX are short OGG (with M4A fallback array for any WebView that refuses OGG — feature-detect via `canPlayType`).
- **Stem sync-start.** Each track is a pair `base.ogg` + `drums.ogg`, identical length and sample rate. Both are created as `AudioBufferSourceNode`s and started with the **same** `startTime = ctx.currentTime + 0.08` so they are sample-locked. Each feeds its own `GainNode`. Intensity automation is `gain.linearRampToValueAtTime(target, ctx.currentTime + 0.5)` on the drums node — drums ride in when a wave spawns, ride out on `wave_cleared`. Never stop/restart a stem to change intensity; that resyncs badly.
- **Looping.** `src.loop = true`, `src.loopStart` / `src.loopEnd` in seconds from the track manifest (`data/audio.json`), so we get a proper intro-then-loop without gaps. Both stems share identical loop points.
- **Event → SFX map** lives in `data/audio.json` (`"events": { "hit_light": {"sfx":["hit_a","hit_b","hit_c"], "vol":0.8, "pitchVar":0.06} }`), **not** in code. Multiple samples per event are chosen round-robin (not random — determinism-friendly and avoids audible repeats). Pitch variance uses `playbackRate`.
- **Drain.** `PAudio.consume(state.events)` copies then clears the queue every rendered frame, exactly as the shipped game does. Max 32 events per frame; overflow drops oldest. Same event name fired 3+ times in one frame collapses to one play at +2dB (prevents phasing on multi-hits).
- **Per-world lazy loading.** Only `common` SFX (~400KB) plus the current world's music load at boot. `PAudio.preloadWorld(n)` is called during the level-complete screen for world n+1. Music is never in the initial 8MB budget.
- **Unlock.** `ctx.resume()` is called from a one-shot listener on `pointerdown`, `keydown`, and `gamepadconnected`. Additionally a silent 1-sample buffer is played on that first gesture — required to unlock iOS Safari. Until unlocked, `PAudio` swallows all calls silently. The Android WebView already sets `setMediaPlaybackRequiresUserGesture(false)`, which we keep.

---

## 3.9 Platform Shells

**One codebase, zero forks.** `index.html` is byte-identical in both builds. Anything platform-specific is a runtime feature-detect (`navigator.getGamepads`, `window.visualViewport`, `location.href.indexOf("android_asset")`).

### 3.9.1 Browser (itch.io)

- Static build: `index.html`, `css/`, `js/`, `data/`, `assets/`. Zip and upload; no server, no build step, works from `file://`.
- Sizing: `resize` + `orientationchange` + `visualViewport.resize` all call `PBoot.fit()`, which sets the visible canvas's CSS size to the integer-scaled dimensions and centres it. Debounced to one call per rAF.
- Fullscreen: a UI button calls `el.requestFullscreen()` with the `webkitRequestFullscreen` fallback. Failure is silent (itch iframes sometimes block it).
- `visualViewport` is used rather than `innerHeight` so mobile browser chrome collapsing doesn't leave a dead band.
- Pause on `visibilitychange` and `blur`, exactly as the shipped `game.js` does.

### 3.9.2 Android APK

Copy `madagaskar/android/` wholesale. Exact changes:

1. `settings.gradle.kts`: `rootProject.name = "ThePatriot"`.
2. `app/build.gradle.kts`: `namespace` and `applicationId` → `com.tegra.thepatriot`; `versionCode 1`, `versionName "1.0"`; keep `compileSdk 36 / minSdk 23 / targetSdk 36`.
3. `copyWebAssets` task: extend `include` list with `data/**/*.json`, `assets/atlas/**`, `assets/audio/**/*.ogg`; drop the zebra-specific `exclude` lines.
4. `AndroidManifest.xml`: `android:label` → `@string/app_name` (= "THE PATRIOT"); `android:screenOrientation="sensorLandscape"` — **already correct**, keep it; add `android:resizeableActivity="false"`.
5. `res/mipmap-*/ic_launcher.png` + `ic_launcher_round.png` → new icon set; `res/values/themes.xml` theme rename to `Theme.ThePatriot`; `strings.xml` app name.
6. `MainActivity.java`: keep `FLAG_KEEP_SCREEN_ON` and the immersive-sticky flags (already present). **Add** `onBackPressed()` → `web.evaluateJavascript("window.PGame&&PGame.pause()", null)` instead of finishing the activity; a second back press within 2s while already paused exits. **Add** `settings.setCacheMode(WebSettings.LOAD_NO_CACHE)` for dev builds only.
7. `res/values/styles`: `windowBackground` `#000000` to kill the white flash on cold start.

Build: `npm run android` → `cd android && ./gradlew assembleDebug && cp app/build/outputs/apk/debug/app-debug.apk ../dist/ThePatriot.apk`. Install: `adb install -r dist/ThePatriot.apk`. Release adds `assembleRelease` plus a signing config in `~/.gradle/gradle.properties` (never committed).

---

## 3.10 Performance Budget & Pipeline

Target: **60fps sustained on a 2019 mid-range Android WebView** (Snapdragon 665 / Mali-G52 class). 16.67ms frame.

| Stage | Budget | Notes |
|---|---|---|
| Input poll | 0.20 ms | once per frame, not per tick |
| Sim step ×2 | 3.60 ms | 1.8ms/tick worst case at 14 bodies |
| Depth sort | 0.15 ms | insertion sort, §3.6.3 |
| Render layers 0–2,4 | 1.20 ms | ~10 wide blits |
| Render layer 3 | 5.50 ms | ~150 sprite blits |
| FX + lighting | 1.20 ms | |
| UI | 0.60 ms | bitmap font |
| Scale blit + CRT | 1.00 ms | CRT adds ~0.4ms |
| Audio drain | 0.20 ms | |
| **Total** | **13.65 ms** | **3.0 ms headroom (18%)** |

**Entity ceilings:** 12 enemies + 2 heroes + 20 projectiles + 96 FX. Enforced by pool sizes (§3.5.7) and by level validation rule 7.

**Draw-call strategy.** Hard cap **220 `drawImage` calls/frame**, asserted by a dev-build counter that turns the HUD red on breach. Every entity is one call (pre-baked palettes mean no per-draw tinting). No `save/restore` in hot loops — horizontal flip uses a pre-flipped atlas variant baked at load rather than `scale(-1,1)`, which is measurably cheaper on Mali. No `shadowBlur`, no per-frame gradients (all cached), no `globalCompositeOperation` changes more than twice per frame.

**Asset budget.** Initial download **≤ 8MB**: atlases ≤ 5.5MB (5 groups, PNG-8 where the palette allows), common SFX ≤ 0.4MB, code+data ≤ 0.3MB, boot art ≤ 0.3MB, slack 1.5MB. Music is **not** in this budget — lazy per world, ~1.5MB/world.

**Boot preloader.** `PBoot.run()`: (1) draw an immediate static logo frame so the screen is never white; (2) fetch `data/*.json` and validate; (3) load atlases with a progress bar driven by `Image.onload` count; (4) bake palette variants and flipped atlases; (5) load common SFX; (6) show "PRESS START". Target cold boot **≤ 3.5s** on the reference device. Any single asset failure shows a retry button rather than a blank screen.

---

## 3.11 File Structure, Standards, Test Plan

### 3.11.1 Target tree

```
the-patriot/
  index.html
  css/style.css
  js/  boot.js  rng.js  data.js  pools.js
       sim.js  sim.plat.js  sim.belt.js  sim.waves.js
       combat.js  combat.throw.js  ai.js
       input.js  input.touch.js
       render.js  render.layers.js  render.sprites.js  fx.js  ui.js  ui.font.js
       audio.js  game.js
  data/ levels/*.json  moves.json  enemies.json  audio.json  settings.default.json
  assets/ atlas/*.png|json  audio/**  font/*.png
  art/src/**            (source PNGs, not shipped)
  tools/ pack.js  validate.js  botfight.js
  test/ sim.test.js  combat.test.js  data.test.js  determinism.test.js
  android/              (Gradle WebView wrapper)
  dist/
```

### 3.11.2 Coding standards

- **≤ 300 lines per file.** The split above is the plan, not a suggestion — `sim.js` owns state + dispatch and delegates mode physics to `sim.plat.js`/`sim.belt.js`; `render.js` owns the buffer and delegates.
- IIFE + `var`, ES5-compatible syntax (2019 WebViews handle ES6 but ES5 removes all doubt). No transpiler, no bundler, no `npm` runtime deps.
- Every sim-side module exports both `window.PXxx` and `module.exports`.
- No magic numbers in `sim/combat/ai` — constants at file top or in JSON.
- Script order in `index.html` is the dependency order; a comment block documents it.

### 3.11.3 Unit tests (headless `node test/*.js`, zero DOM)

1. `createGame(seed)` returns a valid playable state with 1 hero, correct pools.
2. Platform gravity: hero falls, lands on solid, `grounded === true`, `z === solid.top`.
3. Coyote time: hero leaving a ledge can jump for exactly 12 ticks after.
4. Jump buffer: jump pressed 6 ticks before landing fires on the landing tick.
5. One-way platform: passed through from below, landed on from above.
6. Belt depth: entity clamped to `[dMin, dMax]`; `vd` zeroed at the clamp.
7. **±10 rule:** attack at `d=20` misses target at `d=31`, hits target at `d=30`.
8. Frame conversion: a move with `startup:4` becomes active on tick 8, not 4.
9. Hitbox activates only inside `[startup, startup+active-1]`, verified tick by tick.
10. `hitIds` dedupe: a 3-tick active window hits a stationary target exactly once.
11. Hitstop: on hit, both bodies' move `tick` freezes for exactly `hitstop*2` ticks.
12. Gripbox beats hitbox: simultaneous grip and jab on the same tick → grip wins, jab cancels.
13. Throw arc: thrown body peaks within ±1px of `peakZ` and lands at `distX` ± 2px.
14. Thrown body damages a third party it passes through, and only once.
15. Ring-out: thrown body entering a `ringout` hazard dies and awards 2× score.
16. Juggle budget: 7th juggle hit produces zero knockback and forces `downed`.
17. Ukemi inside the 10-frame window skips `downed`; outside it does not.
18. Attack tokens: with 5 enemies in range, at most 2 are in an attack move on any tick (3 in 2P).
19. Wave trigger `cleared` fires only after the last enemy of the named wave dies.
20. Gate opens and `GO` event is pushed exactly once on final wave clear.
21. Camera locked during a wave: `cam.x` unchanged across 600 ticks of combat.
22. Save migrate: `v:0` and garbage strings both yield a valid default save, no throw.
23. Data validation rejects a wave with 13 spawns, a hitbox outside its active window, and an unknown archetype.
24. **Determinism replay:** run 3600 ticks with seed 1337 and a recorded intent stream, hash the state (positions, hp, rng state); re-run from scratch and assert an identical hash. Also assert the hash is unchanged after the same run split across a different rAF pattern.
25. Zero-allocation: object count stable across 600 ticks of a scripted fight.

### 3.11.4 CI smoke test

`tools/botfight.js` — headless Node, no canvas. Loads real `data/levels/w1_docks.json`, spawns a scripted bot hero whose intents are generated by a trivial policy (approach nearest enemy, jab ×3, grip, throw toward screen centre, ukemi on launch). Runs wave 1 of `s2` with seed 1337 for a max of 7200 ticks and asserts: wave cleared, hero alive, no exception, no pool exhaustion, tick budget under wall-clock 2s. Wired into `npm test`; the GitHub Action runs `npm test` plus `node tools/validate.js data/` plus the `Math.random`/`Date.now` grep on every push.

---

## 3.12 Milestones

Sized for one solo developer working with AI agents. Each milestone ends with a runnable build (browser **and** APK) — we never let the Android path rot.

### M1 — Foundation & Feel *(target: 4 weeks)*
Shell, fixed 120Hz loop, RNG, pools, dual-mode sim, input (keyboard + 1 pad + touch), combat core with frame data, placeholder art, one platform segment and one belt arena, one goon archetype, three hero moves + one throw, APK builds.

**Acceptance:**
- 60fps on the reference Android device with 12 goons on screen (measured, HUD frame graph).
- Determinism replay test (#24) green.
- A jab→jab→grip→ippon seoi chain lands and reads correctly at 480×270.
- Every combat number lives in `moves.json` — zero tuning constants in `combat.js`.
- Test suite ≥ 15 of the 25 cases green; botfight smoke passes.

### M2 — Presentation *(target: 4 weeks)*
Atlas pipeline (`tools/pack.js`), real hero + goon sprites, palette swaps, layer stack with parallax, depth sort, FX, bitmap font, HUD, CRT filter, full audio engine with stems and lazy loading, menus and settings, save v1.

**Acceptance:**
- Draw-call counter ≤ 220 in the busiest arena; total frame ≤ 13.7ms.
- Stems provably sample-locked (drums ride in/out on wave events with no phasing).
- Palette-swapped goons cost the same per-draw as base (measured).
- Initial payload ≤ 8MB; cold boot ≤ 3.5s on reference device.
- Save/load round-trips through a corrupted file without a crash.

### M3 — Content *(target: 6 weeks)*
Worlds 1–3: 3 levels each, alternating platform/arena. Full move list per hero, 2 heroes + tag-team, 6 goon archetypes + 3 elites + 3 bosses, hazards and props, 2P local co-op, score/rank system.

**Acceptance:**
- Every level passes `tools/validate.js` with zero warnings.
- 2P co-op playable end-to-end on two pads with correct camera clamping and 3-token AI.
- Tag-team swap works mid-combo without losing juggle state.
- All 25 unit tests green; botfight extended to clear a full level.
- Full playthrough of world 1–3 with no soft-locks (gate always opens).

### M4 — Polish & Release *(target: 4 weeks)*
World 4 + final boss, balance pass driven by playtest telemetry, accessibility (shake toggle, remappable bindings, glyph swapping), localisation hooks, itch.io page, signed release APK, store assets.

**Acceptance:**
- No frame over 16.67ms across a full recorded playthrough on the reference device (99th percentile).
- Zero console errors/warnings in a full playthrough, browser and WebView.
- Release APK installs and runs on Android 6 (minSdk 23) and Android 14.
- itch.io build runs in an iframe with fullscreen, gamepad, and touch all functional.
- Back button pauses (does not exit) on Android; screen never sleeps mid-fight.
