# 4. Combat & Movement Systems

> **Owner:** Combat Design · **Status:** Spec-locked v1.0 · **Consumers:** Sim engine, AI, Level data, Audio, VFX
> **Scope note:** Enemies are referenced as `E1–E8` / `B1–B5` with mechanical role labels only. Narrative attaches fiction to these IDs without changing a single number below.

---

## 4.0 Units, Timebase & Conventions

| Concept | Rule |
|---|---|
| Sim timestep | Fixed **120 Hz** (`dt = 1/120 s`), headless deterministic, vanilla JS |
| Frame data authoring unit | **60 fps frames** (arcade convention) |
| **Conversion rule (stated once)** | `ticks = frames60 × 2`. All frame values in this document are 60 fps frames. The engine multiplies by 2 at load time into an integer tick count. Never author odd sub-tick values. |
| Render | Decoupled, interpolated; render rate does not affect sim |
| World space | **800 × 450 px** per screen-page, origin top-left, `+X` right, `+Y` down |
| Depth axis (belt mode) | `Y` doubles as depth. Larger `Y` = closer to camera |
| Collision | Axis-aligned rectangles only (AABB). No rotation, no circles |
| Gravity/velocity units | px/s and px/s² (engine-internal), pre-converted from per-frame design values |
| RNG | Single seedable xorshift128 stream per match; AI draws from a **separate** sub-stream from VFX so cosmetics never desync gameplay |
| Rounding | All positions stored as float64, compared with epsilon `0.001`; AABB overlap is **exclusive** on max edges |
| Hitstop | Global freeze of both actors' animation clocks; physics continues at 0 velocity. Values below in 60 fps frames |

---

## 4.1 Movement Mode A — Side-View Platforming (Aladdin-style)

### 4.1.1 Physics constant table (both heroes share the model; per-character values differ)

| Constant | Idris | Otajon | Notes |
|---|---|---|---|
| Run max speed | **150 px/s** | **196 px/s** | Ground horizontal cap |
| Ground acceleration | **1200 px/s²** | **1600 px/s²** | Reaches max in 0.125 s / 0.1225 s |
| Ground friction (no input) | **1800 px/s²** | **1500 px/s²** | Idris stops harder (heavy, planted) |
| Turnaround multiplier | **2.0×** accel | **2.4×** accel | Applied when input sign ≠ velocity sign |
| Air acceleration | **600 px/s²** | **900 px/s²** | |
| Air drag (no input) | **240 px/s²** | **200 px/s²** | |
| Air max horizontal | **150 px/s** | **196 px/s** | Same as ground cap |
| Gravity (rising, button held) | **1500 px/s²** | **1560 px/s²** | |
| Gravity (rising, button released) | **2900 px/s²** | **3100 px/s²** | Variable jump cut |
| Gravity (apex, \|vy\| < 40 px/s) | **1050 px/s²** | **1080 px/s²** | Apex float window, ~0.076 s |
| Gravity (falling) | **1900 px/s²** | **2000 px/s²** | |
| Jump initial velocity | **−470 px/s** | **−505 px/s** | |
| Peak jump height | **≈73.6 px** | **≈81.7 px** | Clears 64 px block + margin |
| Rise time to apex | **≈0.313 s** | **≈0.324 s** | |
| Max fall speed | **760 px/s** | **800 px/s** | Terminal velocity clamp |
| Coyote time | **0.10 s** (12 f) | **0.10 s** (12 f) | Spec-mandated |
| Jump input buffer | **0.117 s** (7 f) | **0.117 s** (7 f) | Consumed on landing |
| Landing recovery | **4 f** (soft) / **9 f** (fall > 140 px) | **3 f** / **7 f** | Cancellable into grip after frame 2 |
| Ledge-grab reach | **10 px** above collider top, **7 px** forward | **12 px / 9 px** | Otajon has better ledge tolerance |
| Ledge climb time | **20 f** | **14 f** | |
| Corner-correct nudge | **±6 px** | **±6 px** | Ceiling bonk forgiveness |
| Collider (standing) | **34 × 62 px** | **28 × 56 px** | Feet at collider bottom-center |
| Collider (air) | **34 × 58 px** | **28 × 52 px** | |

### 4.1.2 Platforming rules

- **One-way platforms:** solid only when `vy ≥ 0` and `prevBottom ≤ platformTop + 2 px`. `Down + Jump` drops through, disabling collision with that platform ID for **18 f**.
- **Slopes:** 4 authored angles only (0°, 22.5°, 45°, −22.5°, −45°). Horizontal speed on slope is scaled by `cos(θ)`; downhill adds `+0.15 × gravity` along-slope.
- **No mid-air jump.** Vertical extension exists only via **wall-kick** (Otajon only): contact with a wall while `vy > 0` and holding toward it allows `A` within **9 f** for a `(−180, −420) px/s` kick; max **1** per airborne period.
- **Hazards in platforming runs:** pits (18 HP + respawn at last checkpoint after **0.75 s**), spikes (14 dmg + 60 px knock-back-up), crates (destructible, 1 grip-throw or 2 sweeps).
- **Enemies in platforming runs** use the same AI states but with `depthLocked = true`; their `Y` is authored, not steerable.

---

## 4.2 Movement Mode B — Belt-Scroll Arena (Turtles in Time-style)

### 4.2.1 Belt constants

| Constant | Value | Notes |
|---|---|---|
| Playfield depth band | `Y ∈ [286, 418]` → **132 px tall** walkable floor strip | Feet-Y is the depth coordinate |
| Lane quantization | **None** (free analog depth), but AI snaps targets to **11 virtual lanes** of 12 px for pathing |
| Hero X speed (belt) | Idris **150 px/s**, Otajon **196 px/s** | Same as platform run |
| Hero Y (depth) speed | **60% of X** → Idris **90 px/s**, Otajon **117.6 px/s** | Spec-mandated ratio |
| Diagonal | Normalized: X component ×0.894, Y component ×0.894×0.6 | No diagonal speed bonus |
| Depth-collision tolerance | **±10 px** Y-overlap between attacker feet-Y and target feet-Y for any hit to register | The classic rule |
| Depth tolerance — grip | **±12 px** (grip is slightly forgiving) | |
| Depth tolerance — thrown-body projectile | **±14 px** (bodies are fat) | |
| Draw order | Sort by feet-Y ascending; ties broken by entity ID for determinism | |
| Belt jump | Allowed. **Y (depth) is frozen at takeoff value**; X control retained at **75%** air accel. Jump velocity **−400 px/s** (Idris) / **−430 px/s** (Otajon), gravity **2100 / 2200 px/s²**. Airtime ≈ 0.38 s. Landing recovery **6 f**. | |
| Belt jump shadow | Blob shadow drawn at frozen feet-Y; shadow is the true collision anchor | |
| Camera | Locks X to `clamp(avgHeroX − 400, 0, levelWidth − 800)`; scroll speed cap **420 px/s**; never scrolls back during a wave | |
| Wall thickness | **16 px** invisible collider at arena bounds; used for wall-slam (4.5.4) | |

### 4.2.2 Mode transition & arena gates

1. Level data is a linear list of **segments**: `{type: "run"|"arena", ...}`.
2. Entering an `arena` segment, the camera hard-locks, a **16 px wall collider** spawns at `cameraX + 800` (and `cameraX` behind if `lockBehind:true`), and the HUD plays `WAVE 1/n`.
3. Physics profile swaps: gravity/jump swap to belt values, depth movement unlocks, platform colliders in the segment are disabled.
4. **Transition blend:** 12 f. Hero input is accepted throughout; velocity is preserved and re-clamped. If the hero is airborne at the boundary, the swap is deferred until landing (max 30 f grace, then forced).
5. On final wave cleared: walls despawn over **10 f**, `GO ➜` arrow appears at `x = 740, y = 200`, blinking **0.5 s on / 0.25 s off**, plus a floor chevron trail. Camera unlocks.
6. Crossing back into a `run` segment restores platform physics and **snaps depth-Y to the segment's authored floor line over 8 f** (eased).
7. **Rule:** a hero may never be in a grip state during a mode swap. An active grip forces a **release with 6 f of recovery** at the boundary.

---

## 4.3 The Grip System (Kumi-kata) — Core Identity

> **You never punch.** There is no strike button. Offense is grip → throw. Defense is ukemi and movement. There is no block.

### 4.3.1 Buttons

| Button | Name | Function |
|---|---|---|
| `A` | Jump | Jump / drop-through / ukemi (see 4.3.7) |
| `B` | **Grip** | Kumi-kata attempt; while gripped, `B` = re-grip / lift |
| `C` | **Throw** | With direction: selects the throw. Alone: sweep poke when free |
| `D` | Tag / Special | Tap = tag swap; `Down+D` (meter ≥ 100) = Special |

### 4.3.2 States

`FREE → APPROACH → GRIPPED → THROWING → (target) THROWN_FLIGHT → KNOCKDOWN → GETUP → FREE`
Plus: `UKEMI`, `HITSTUN`, `GRIP_BROKEN`, `SPECIAL`.

| State | Description | Duration |
|---|---|---|
| `FREE` | Normal movement, can act | — |
| `APPROACH` | Grip startup; hero lunges forward **18 px** over the startup window | 7 f (Idris) / 5 f (Otajon) startup + 6 f active + 11 f whiff recovery |
| `GRIPPED` | Both actors bound; hero holds target at grip anchor offset | Max **2.5 s** (300 f) before auto-release |
| `THROWING` | Throw animation committed; hero is invulnerable frames 1→(startup+active) for throws flagged `armored` only | Per move |
| `THROWN_FLIGHT` | Target is a physics projectile (4.5) | Until landing/wall |
| `KNOCKDOWN` | Target grounded, hittable by OTG sweep only | 34 f (E) / 26 f (heroes) |
| `GETUP` | Rising, **i-frames on last 8 f** | 22 f (E) / 16 f (heroes) |
| `UKEMI` | Hero breakfall roll | 24 f total, i-frames 3→14 |
| `GRIP_BROKEN` | Both actors pushed apart 22 px | 14 f both |
| `SPECIAL` | Cinematic-lite; full invuln | Per move |

### 4.3.3 Transition table

| From | Event | To | Condition / cost |
|---|---|---|---|
| FREE | press `B` | APPROACH | not in landing recovery |
| APPROACH | grip box overlaps valid target, depth ≤ ±12 px | GRIPPED | target not `unthrowableFront` from front; target not in i-frames |
| APPROACH | active window expires | FREE | 11 f whiff recovery |
| APPROACH | target is `E6` hit from front | FREE | +**8 f** extra recovery (shield deflect), hero pushed back 14 px |
| GRIPPED | dir + `C` | THROWING | per 4.4 table |
| GRIPPED | `B` again | GRIPPED (re-grip tier ↑) | 12 f, adds **+1 grip tier** (see 4.3.5) |
| GRIPPED | target break meter fills | GRIP_BROKEN | see 4.3.6 |
| GRIPPED | 300 f timer | GRIP_BROKEN | auto |
| GRIPPED | hero takes any hit | GRIP_BROKEN + HITSTUN | grip is not armored |
| THROWING | active frame contact | target→THROWN_FLIGHT | hero enters recovery |
| THROWN_FLIGHT | ground contact | KNOCKDOWN | 4.5.3 bounce first |
| THROWN_FLIGHT | wall contact | KNOCKDOWN | +wall-slam bonus 4.5.4 |
| KNOCKDOWN | timer | GETUP | AI may delay-getup 0–20 f (RNG) |
| GETUP | timer | FREE | |
| FREE (hero) | incoming hit + `A` within window | UKEMI | 4.3.7 |
| any (hero) | `Down+D`, meter ≥ 100 | SPECIAL | consumes 100 |

### 4.3.4 Grip geometry

| Param | Idris | Otajon |
|---|---|---|
| Grip box (active) | **44 × 40 px**, front-anchored at collider edge, vertical center at `−34 px` | **34 × 36 px**, at `−30 px` |
| Effective grip reach from body edge | **44 px** | **34 px** |
| Grip anchor offset (held target position) | **+40 px** forward, `−8 px` up | **+32 px** forward, `−6 px` up |
| Grip lunge distance during startup | 18 px | 22 px |
| Multi-target priority | Nearest by `|Δx| + 2×|Δy|`, ties → lowest entity ID | same |

### 4.3.5 Grip tiers

Re-pressing `B` while `GRIPPED` performs a **grip-tightening** (12 f, hero vulnerable). Tier caps at **2**.

| Tier | Throw damage | Break resistance | Notes |
|---|---|---|---|
| 0 | ×1.00 | base | Default on grab |
| 1 | ×1.15 | +25% required break points | |
| 2 | ×1.30 | +55% required break points | Also enables `Ippon`-flagged variants (4.4.4) |

### 4.3.6 Grip break (AI mash)

- Each gripped enemy accumulates **break points** at `rate = base_mash × difficultyMul` per second.
- Break threshold: **100 pts × (1 + tierBonus) × archetypeMul**.
- `base_mash`: E1 30, E2 22, E3 34, E4 40, E5 **72**, E6 26, E7 46, E8 38 pts/s.
- `archetypeMul` (resistance): E1 1.0, E2 1.4, E3 0.8, E4 0.9, E5 **2.2**, E6 1.3, E7 0.85, E8 1.6.
- Effective hold time = `threshold / rate`. E1 ≈ 3.3 s (clamped by the 2.5 s auto-timer), E5 ≈ 3.05 s at tier 0 — **but** E5 also gains a 35% chance per 0.5 s to trigger a **reversal** (see 4.7 E5).
- On break: both enter `GRIP_BROKEN` (14 f), separation 22 px, no damage.
- **Heroes cannot be gripped** by any enemy except `E5` and `B3`; their grip on a hero is escaped by alternating `←/→` (12 inputs) or automatically after **1.4 s**, dealing damage on completion.

### 4.3.7 Ukemi (breakfall) — the defense

- Input: `A` while in `HITSTUN` from a launching/slamming hit, or while in `THROWN_FLIGHT` (heroes only), or on landing from a knockdown.
- **Window:** the first **12 f** of hitstun, or the last **10 f** of flight before ground contact.
- Result: `UKEMI` state — 24 f, **i-frames frames 3–14 (12 f)**, travels **56 px** in the held direction (default: away from attacker), cancellable into `FREE` on frame 20.
- Failing ukemi → `KNOCKDOWN` 26 f + `GETUP` 16 f (total 42 f vulnerable except the last 8 f of getup).
- **Ukemi cooldown:** 30 f (Idris) / 22 f (Otajon). A second ukemi inside the cooldown yields only 6 i-frames.
- Ukemi grants **+4 meter**.

---

## 4.4 Move Lists

**Legend:** `S/A/R` = startup / active / recovery in 60 fps frames. `KB` = knockback vector `(x, y)` in px/s applied to the target, `x` signed by facing. Range box is the hitbox `w × h` px anchored front-of-collider at the listed vertical offset. Hitstop applies to both actors.

### 4.4.1 Shared entries & universals

| Move | Input | S/A/R | Dmg | Range box | KB | Flags |
|---|---|---|---|---|---|---|
| **Kumi-kata (grip)** | `B` | 7/6/11 (Idris) · 5/6/11 (Otajon) | 0 | 44×40 @ −34 · 34×36 @ −30 | — | Entry. +2 meter on success |
| **Running grip (rush-kumi)** | `B` at ≥ 85% max speed | 5/8/14 | 0 | 52×40 @ −34 | — | Lunge **62 px**; auto-enters GRIPPED at tier 1 |
| **Aerial grip** | `B` airborne | 6/10/— (until land, min 8 f land-rec) | 0 | 40×44 @ −24 | — | Only vs airborne or ≤ 40 px-tall targets; enables *Tomoe-nage* |
| **Foot sweep poke** | `C` (no grip) | Idris 9/4/16 · Otajon 6/4/12 | Idris 7 · Otajon 5 | 40×18 @ −10 · 44×16 @ −10 | (170, 0) | Sweeps: forces KNOCKDOWN if target HP-tier ≤ mid; low-profile frames 8–12 (Otajon only). Hitstop 4 f. +3 meter |
| **OTG sweep** | `C` vs KNOCKDOWN target | same | 60% dmg | same | (90, 0) | Once per knockdown; does **not** extend the IPPON chain |
| **Ukemi** | `A` in window | 0/—/24 | 0 | — | self +56 px | i-frames 3–14. +4 meter |
| **Tag swap** | `D` | 8 f exit + entrance move | see 4.9 | — | — | 12 s cooldown |

### 4.4.2 IDRIS — 40, judo coach from Dagestan; heavy, long grip, power throws

**HP 120. Weight class HEAVY (knockback taken ×0.75, hitstun ×0.9).**

| # | Move | Input (while GRIPPED) | Judo name | S/A/R | Dmg | Release box | KB imparted to thrown body | Flags |
|---|---|---|---|---|---|---|---|---|
| I1 | **Forward hip throw** | `→ + C` | *O-goshi* | 12/6/20 | **18** | `+46 px, −30 px` | `(340, −190)` | Baseline projectile. Chain-starter. +8 meter |
| I2 | **Inner reap slam** | `↓ + C` | *O-uchi-gari* | 14/5/22 | **22** | `+30 px, −6 px` | `(120, −60)` + hard ground impact | **SLAM**: 1.5× ground-impact dmg, no bounce, splash 34 px radius for 8 dmg. Hitstop 8 f |
| I3 | **Shoulder throw (launch)** | `↑ + C` | *Ippon-seoi-nage* | 16/6/24 | **20** | `+40 px, −52 px` | `(260, −420)` | **LAUNCH**. Juggle-legal. Peak ≈ 95 px |
| I4 | **Back-carry drop** | `← + C` | *Ura-nage* | 15/6/26 | **26** | behind hero, `−44 px, −40 px` | `(−300, −250)` | Reverses body direction — fires enemies backwards into a pack. Hero armored frames 1–15 |
| I5 | **Sacrifice sweep** | `↓↘→ + C` (or `→→ + C`) | *Uchi-mata* | 18/7/28 | **30** | `+56 px, −64 px` | `(430, −330)` | **UNIQUE.** Longest-range projectile. Hitstop 10 f. Requires grip tier ≥ 1 |
| I6 | **Screen slam** | `→ + C` in ARENA at grip tier 2, target ≤ 25% HP | *Seoi-otoshi* | 20/8/30 | **34** | — | see 4.5.5 | **UNIQUE / cosmetic "throw at screen"**. Instakill vs E1/E3/E7 |
| I7 | **Aerial counter throw** | `↑ + C` from aerial grip | *Tomoe-nage* | 8/6/18 (air) | **24** | `−20 px, 0 px` (behind, downward) | `(−380, +260)` | Counter-style: performed within **10 f** of an incoming attack's active frames → damage ×1.5 and **+15 meter** |
| I8 | **Ground-and-pound hold** | `B` on a KNOCKDOWN target, adjacent | *Kesa-gatame* | 10/—/24 | **8 per tick, 3 ticks (24)** | 34×26 @ −8 | none | Pins for 42 f. Interruptible. **Not** IPPON-chain-legal. +6 meter |
| **SPECIAL** | **IPPON RUSH** | `↓ + D`, meter = 100 | — | 14 f invuln startup / 96 f active / 24 f rec | see notes | dash 300 px @ 520 px/s | — | Full invuln. Auto-grips up to **4** targets in a 300×120 px sweep corridor; each is thrown in sequence with *Uchi-mata* values at **26 dmg**; final target is thrown at `(500, −300)` and counts as a **wall-slam regardless of wall**. Screen flash + `IPPON!` banner. Camera locked 0.5 s |

### 4.4.3 OTAJON — 25, helper; fast, sweeps, counters

**HP 90. Weight class LIGHT (knockback taken ×1.15, hitstun ×1.0, ukemi cooldown 22 f).**

| # | Move | Input (while GRIPPED) | Judo name | S/A/R | Dmg | Release box | KB imparted | Flags |
|---|---|---|---|---|---|---|---|---|
| O1 | **Foot-sweep throw** | `→ + C` | *De-ashi-barai* | 8/5/14 | **12** | `+38 px, −12 px` | `(300, −90)` | Fast, low arc — skims the floor, covers the whole lane. Chain-starter. +8 meter |
| O2 | **Body drop** | `↓ + C` | *Tai-otoshi* | 11/5/17 | **16** | `+36 px, −20 px` | `(280, −140)` | Baseline |
| O3 | **Lift launcher** | `↑ + C` | *Sumi-gaeshi* | 13/6/20 | **15** | `+30 px, −46 px` | `(180, −430)` | **LAUNCH**. Juggle-legal; higher and more vertical than I3 |
| O4 | **Back-step reap** | `← + C` | *Ko-soto-gari* | 10/5/18 | **14** | `−36 px, −16 px` | `(−280, −150)` | Repositions Otajon 26 px backwards |
| O5 | **Spinning sweep-throw** | `↓↘→ + C` | *Harai-goshi* | 15/6/22 | **23** | `+48 px, −40 px` | `(390, −280)` | **UNIQUE.** Hitbox `52×44` also strikes a second nearby enemy for **9** during active frames |
| O6 | **Whirl reap (multi)** | `←→ + C` (halfcircle) | *Uki-otoshi → tomoe* | 17/8/26 | **19** | `+34 px, −30 px` | `(330, −220)` | **UNIQUE.** Releases the body **spinning**: friendly-fire damage ×1.4 for the first 0.5 s |
| O7 | **Aerial counter throw** | `↑ + C` from aerial grip | *Tomoe-nage* | 6/6/15 (air) | **20** | `−18 px, 0 px` | `(−400, +240)` | Same counter rule as I7 (+15 meter, ×1.5 on counter) |
| O8 | **Low-profile slide sweep** | `↓ + C` while running ≥ 85% | *Sutemi barai* | 7/6/16 | **10** | 54×14 @ −8 | `(210, −40)` | Travels **72 px**, low-profile frames 5–13 (passes under E3 knives, B2 sweeps). Forces KNOCKDOWN |
| **SPECIAL** | **KAITEN-BARAI (Whirlwind Sweep)** | `↓ + D`, meter = 100 | — | 10 f invuln startup / 80 f active / 20 f rec | see notes | — | — | Spins in place then in an expanding orbit: **4 sweep pulses** at frames 12/30/48/66, each a **160 px radius ring, ±16 px depth**, **14 dmg**, forcing KNOCKDOWN on all non-`E2/E6/E8`. Any enemy already in `THROWN_FLIGHT` inside the ring is **re-launched** at `(±360, −300)` away from Otajon, and each re-launch **extends the IPPON chain by 1**. Full invuln during active |

### 4.4.4 Juggle rules

- Each enemy has a **juggle counter** starting at 0 when it leaves the ground via LAUNCH.
- Every airborne hit increments it; **damage scaling** = `max(0.35, 1 − 0.15 × juggleCount)`.
- Max juggle count **4**; beyond that the enemy enters an untechable fall and takes only ground-impact damage.
- Airborne targets **can be aerial-gripped** (enables I7/O7 loops), but an aerial grip **adds +2** to the juggle count.
- Launch height decays: each subsequent launch on the same airborne target imparts `vy × 0.7`.
- **No infinite:** after juggle count 4, the enemy has 24 f of i-frames on landing.

### 4.4.5 Meter

| Source | Gain |
|---|---|
| Successful grip | +2 |
| Any completed throw | +8 |
| Foot-sweep poke hit | +3 |
| Ukemi | +4 |
| Counter-throw (I7/O7 within 10 f) | +15 |
| Thrown body hits another enemy | +5 per victim (max +15 per throw) |
| Wall slam | +6 |
| Damage taken | +1 per 4 HP lost |
| Ground-and-pound (I8) | +6 |
| **Cost of Special** | **100** (meter cap 100; no stock, no partial spends) |
| Decay | **−4/s** after 8 s with no meter gain and no enemies within 200 px |
| Carry-over | Persists across waves; **resets to 0** at level start and on death |

---

## 4.5 Thrown-Enemy Projectile Physics

A thrown body becomes a first-class physics entity for the duration of `THROWN_FLIGHT`.

### 4.5.1 Projectile body

| Param | Value |
|---|---|
| Collider | `30 × 30 px` for E1/E3/E7; `40 × 38 px` for E2/E5/E6/E8; centered on body |
| Gravity in flight | **1700 px/s²** |
| Max fall in flight | **900 px/s** |
| Depth (`Y` band) | Frozen at release feet-Y ± the arc; **depth tolerance ±14 px** for friendly fire |
| Air drag | **0.985× horizontal velocity per 1/60 s** |
| Lifetime cap | **2.5 s**, then forced KNOCKDOWN |
| Team | Neutral — damages **enemies only** (never heroes, never the thrower) |

### 4.5.2 Velocity by throw type (initial `(vx, vy)`)

| Type | Example | vx | vy | Profile |
|---|---|---|---|---|
| Skim | O1, O8 | 300 | −90 | Low, long, floor-hugging |
| Standard | I1, O2, O4 | 280–340 | −140…−190 | The workhorse arc |
| Launch | I3, O3 | 180–260 | −420…−430 | High, for juggles; poor as a projectile |
| Power | I5, O5, O6 | 330–430 | −220…−330 | Best friendly-fire coverage |
| Slam | I2 | 120 | −60 | Vertical smash, no real flight |
| Reverse | I4 | −300 | −250 | Fires backwards |
| Aerial counter | I7, O7 | −380…−400 | +240…+260 | Spikes downward-behind |
| Special final | Ippon Rush | 500 | −300 | Always counts as wall-slam |

### 4.5.3 Ground bounce

- On first ground contact: `vy_new = −vy × 0.42`, `vx_new = vx × 0.70`. **Max 2 bounces.**
- A bounce below `|vy| = 120 px/s` is suppressed → immediate KNOCKDOWN.
- Each bounce deals **4 self-damage** to the thrown body and can still friendly-fire.
- Slam-type (I2) has **restitution 0** — no bounce, instant impact.

### 4.5.4 Friendly fire & wall slam

| Event | Damage to victim | Damage to thrown body | Notes |
|---|---|---|---|
| Thrown body strikes another enemy | **base throw dmg × 0.75**, min 8 | **6** | Victim enters KNOCKDOWN (HITSTUN if `E2/E6/E8`). Hitstop 6 f |
| ...each subsequent enemy in the same flight | ×0.75 cumulative (0.75, 0.56, 0.42…) | +4 each | Max **4 victims** per flight |
| Thrown body strikes a **wall** at `|vx| ≥ 200 px/s` | — | **+14 bonus**, forced KNOCKDOWN | **Wall slam**: shake 6 px / 12 f, `+6 meter`, +1 IPPON chain |
| Thrown body strikes a **hazard** (spikes, B5 cage wall) | — | **+25** | Chain +1 |
| Thrown body strikes a **boss** | **base × 0.4** | 6 | Never staggers a boss on its own |
| Thrown body vs thrown body | **10** each | — | Both drop to KNOCKDOWN, chain +1 |

### 4.5.5 "Throw at the screen" (cosmetic special case)

- **Applies only to I6 (Screen Slam)** and only inside `arena` segments.
- The body is removed from the sim on release and replaced by a **cosmetic entity** scaling `1.0× → 3.4×` over **26 f** while translating toward screen center, then a **glass-crack overlay** (18 f) and a **9 px / 14 f** screen shake.
- Sim-side it resolves immediately as: `34 dmg + guaranteed kill if target HP ≤ 25% max`, `+1 IPPON chain`, `+10 meter`. **No physics, no friendly fire** — a deterministic, side-effect-free finisher flourish.
- Rate limit: once per **8 s** per player; disabled during boss phases.

---

## 4.6 Combos, IPPON Chain & Scoring

### 4.6.1 IPPON chain

- A **chain** begins on any completed throw, sweep-knockdown, or special hit.
- **Chain timer: 2.5 s (300 f)**, refreshed to full on any chain-extending event.
- Chain-extending: completed throw (+1), thrown body hitting an enemy (+1 per victim), wall slam (+1), hazard slam (+1), sweep poke that knocks down (+1), Kaiten-Barai re-launch (+1), Screen Slam (+1).
- Non-extending: OTG sweep, ground-and-pound (I8), chip/environmental damage.
- Chain breaks on: timer expiry, **hero taking damage**, hero death, wave clear.
- **Damage multiplier by chain length:** `1 + 0.04 × (chain − 1)`, capped at **×1.60** (chain 16).
- Banner text: 3 `NICE`, 5 `WAZA-ARI`, 8 `IPPON!`, 12 `IPPON GACHI!`, 16+ `KODOKAN`.

### 4.6.2 Score

```
throwScore   = baseDamage × 10
chainBonus   = throwScore × 0.04 × (chain − 1)
ffBonus      = 150 per enemy killed by a thrown body (not by the hero directly)
wallBonus    = 120 per wall slam
waveScore    = Σ(throwScore + chainBonus) + ffBonus + wallBonus
```

| Style bonus | Condition | Award |
|---|---|---|
| **No-Damage Wave** | Wave cleared without any hero taking damage | **+2000** |
| **Throw Variety** | ≥ 5 distinct throw IDs used in one wave | **+250 × (distinct − 4)**, max +1500 |
| **Perfect Ukemi** | 3+ successful ukemi in a wave, 0 failed | **+800** |
| **Pacifist Projectile** | ≥ 50% of a wave's kills dealt by thrown bodies | **+1200** |
| **Speed Clear** | Wave cleared under `enemyCount × 3.0 s` | **+1000** |
| **Tag Flow** | ≥ 2 tag swaps in a wave, both entrance attacks connect | **+600** |

### 4.6.3 Rank

```
par(level)   = Σ over waves of (Σ enemy.maxHP × 12)
raw          = totalScore
timePenalty  = max(0, (clearTime − parTime) × 25)     // points per second over par
deathPenalty = 3000 × deaths
final        = max(0, raw − timePenalty − deathPenalty)
ratio        = final / par(level)
```

| Rank | Threshold |
|---|---|
| **S** | `ratio ≥ 2.00` **and** deaths = 0 |
| **A** | `ratio ≥ 1.45` |
| **B** | `ratio ≥ 1.00` |
| **C** | `ratio ≥ 0.55` |
| **D** | below |

`parTime` per level is authored in level data (default `enemyCount × 4.0 s + platformingLength / 140 px/s`).

---

## 4.7 Enemy AI — E1 to E8

### 4.7.1 Global AI rules

- **Attack token system:** the arena holds **2 attack tokens** (3 in 2P co-op, 2 on Easy). An enemy must hold a token to enter `ATTACK`. Token held max **2.5 s**, then forcibly returned with a **0.6 s** cooldown before the same enemy can re-request.
- Non-token holders run `CIRCLE` — orbit the nearest hero at radius **90–150 px**, matching depth ±20 px, re-evaluating every **0.5 s**.
- **Minimum telegraph: 0.4 s (24 f)** on every attack, with a mandatory tell (color flash + wind-up pose + audio cue at telegraph start).
- **Off-screen leash:** enemies beyond `cameraX − 60` or `cameraX + 860` walk inward at 1.3× speed and cannot attack.
- **Reaction delay:** AI perceives world state on a **0.1 s (12 f)** delay, quantized, to keep it beatable and deterministic.
- **Shared skeleton:** `SPAWN → IDLE → APPROACH → (token?) ATTACK : CIRCLE → RECOVER → IDLE`, with interrupts `HITSTUN`, `GRIPPED`, `THROWN_FLIGHT`, `KNOCKDOWN`, `GETUP`, `FLEE`.
- **Delay-getup:** RNG `0–20 f` added to `KNOCKDOWN` before `GETUP`, drawn from the AI sub-stream.

### 4.7.2 Archetype table

| ID | Role | HP | Speed X / Y | Attacks (telegraph / active / recovery, dmg) | Throw quirk | Behavior loop |
|---|---|---|---|---|---|---|
| **E1** | Basic goon | **24** | 78 / 47 | Swing: 24/4/22, **8 dmg**, box 34×30 @ −34 | Mash 30, resist ×1.0 | `APPROACH → ATTACK → RECOVER`. 20% chance to `CIRCLE` for 1 s after recovery |
| **E2** | Heavy | **60** | 52 / 31 | Overhead: 34/6/30, **16 dmg**, box 44×44 @ −40, **armored frames 1–34** (absorbs 1 sweep) | Mash 22, resist **×1.4**; **cannot be launched** (I3/O3 convert to standard arc) | `APPROACH (slow) → ATTACK → RECOVER (long)`. Never circles. Takes friendly-fire ×0.7 |
| **E3** | Ranged melon-lobber | **20** | 84 / 50 | Lob melon: 26/2/28, **10 dmg**, projectile 12×12 @ 300 px/s, straight, ±10 px depth | Mash 34, resist ×0.8 | `KITE`: hold 220–320 px, back-pedal if hero < 180 px, fire every 1.6 s. `FLEE` if hero < 90 px |
| **E4** | Rushdown | **30** | **132** / 79 | Dash-tackle: 24/10/34, **12 dmg**, box 40×36 @ −30, travels 150 px | Mash 40, resist ×0.9 | `CHARGE → TACKLE → long RECOVER (34 f punish)`. Repeats every 2.2 s. Ignores token 25% of the time on Hard |
| **E5** | Grappler (throw-resistant) | **55** | 92 / 55 | Bear-grab: 28/6/26 → holds hero, **6 dmg/0.5 s**, max 1.4 s | **Mash 72, resist ×2.2.** 35% per 0.5 s **reversal**: escapes and throws the hero for **14 dmg**. Needs grip tier ≥1 to hold reliably | `STALK (mirror hero depth) → GRAB`. Prefers heroes already in recovery |
| **E6** | Shield / unthrowable-from-front | **50** | 66 / 40 | Shield bash: 30/5/26, **11 dmg**, box 38×40 @ −34 | **Front grip fails** (hero +8 f recovery). Grippable from **rear ±60° arc**, after a sweep-knockdown, or during bash recovery. Mash 26, resist ×1.3 | `ADVANCE facing hero → BASH`. Turn rate **180°/s** — flank with Otajon's speed |
| **E7** | Agile jumper | **26** | 110 / 66 | Jump-kick: 24/8/24, **10 dmg**, box 32×34, arc 200 px, jump vy −380 | Mash 46, resist ×0.85. **Aerial-grippable**; aerial grip on E7 deals ×1.25 | `HOP-CIRCLE (repositions every 1.2 s) → JUMP-KICK`. Landing recovery 20 f = punish window |
| **E8** | Elite | **80** | 96 / 58 | (a) Combo swing 26/4/18 ×2 chained, **11+13 dmg**; (b) Counter-stance 30 f: any grip attempt during stance is **reversed** for 15 dmg (blue flash) | Mash 38, resist ×1.6. Counter-stance is the only true grip deny — bait it | `READ`: hero grip-whiffed in last 1 s → `ATTACK`; hero approaching → 40% `COUNTER_STANCE`; else `COMBO`. Consumes 2 tokens |

### 4.7.3 Spawn-wave grammar (level data)

```js
{ type: "arena", id: "A2_bazaar", lockBehind: true, parTime: 42,
  waves: [
    { spawns: [
        { id: "E1", count: 3, side: "R", depth: "mid",  delay: 0.0, stagger: 0.35 },
        { id: "E3", count: 1, side: "L", depth: "far",  delay: 1.2 }
      ],
      clear: "all",              // "all" | "count:N" | "timer:S"
      maxAlive: 5, tokens: 2 },
    { spawns: [ { id: "E2", count: 1, side: "R", depth: "near", delay: 0.0 },
                { id: "E4", count: 2, side: "B", depth: "rand", delay: 0.8, stagger: 0.4 } ],
      clear: "all", maxAlive: 5, tokens: 2, modifier: "hurry" }
  ],
  onClear: { gate: "right", arrow: true } }
```

| Field | Meaning |
|---|---|
| `side` | `"L"`, `"R"`, `"B"` (behind camera-lock wall), `"T"` (drop-in, 0.5 s fall) |
| `depth` | `"near"` (Y 380–418), `"mid"` (Y 330–380), `"far"` (Y 286–330), `"rand"` (seeded) |
| `delay` / `stagger` | Seconds after wave start / seconds between each unit of the same group |
| `maxAlive` | Hard cap on concurrent enemies; queued spawns wait for a slot. **Cap: 6 (1P), 8 (2P)** |
| `tokens` | Attack tokens for this wave (overrides global) |
| `modifier` | `"hurry"` (+15% enemy speed after 20 s), `"elite"` (+25% HP), `"noRanged"` |

---

## 4.8 Bosses B1–B5

### 4.8.1 Universal boss rules

- Bosses are **never grippable in normal state**. Each has a **stagger meter** (`STAG`), filled by sweep pokes, thrown-body impacts, and phase-specific punish windows. At `STAG = max` the boss enters `STAGGERED` for **2.0 s**, during which it is **fully grippable** and every throw does **×1.35** damage.
- `STAG` decays at **8%/s** after 3 s without a contribution, and resets to 0 after a stagger.
- Bosses cannot be launched or juggled (LAUNCH throws convert to standard arcs). They **can** be wall-slammed (+18 bonus).
- **Enrage:** at each phase's HP threshold and again on a per-boss timer, the boss gains **+20% speed, −20% recovery frames** for the rest of the fight (stacking max ×2).
- Phase transitions grant **1.0 s of invulnerability** and clear hero juggle state; the IPPON chain timer is **paused**, not broken.

### 4.8.2 Boss overview

| Boss | Role | HP | Arena gimmick | Stagger max |
|---|---|---|---|---|
| **B1** | Gatekeeper brawler | **420** | Flat arena, 2 breakable crates respawning every 20 s (throwable objects) | 100 |
| **B2** | Chain-whip zoner | **480** | Two raised platforms (Y 300, height 40 px) that ranged attacks pass under | 120 |
| **B3** | Rival grappler | **520** | Slick floor: hero friction ×0.55 in the center 300 px | 140 |
| **B4** | Armored bruiser + adds | **600** | Conveyor floor pushing 40 px/s toward a hazard wall (16 dmg) | 160 |
| **B5** | **Final — cage match** | **760** | Electrified cage (contact 12 dmg + knockdown), rigged crowd | 180 |

#### B1 — Gatekeeper brawler
| Phase | HP band | Patterns | Punish window |
|---|---|---|---|
| 1 | 100–66% | `Charge` 30/12/40 (18 dmg, 240 px) · `Double swing` 26/4/16 ×2 (12+14) | 40 f after Charge |
| 2 | 66–33% | Adds: 2× E1 every 12 s · `Ground pound` 34/6/34, shockwave 200×20, **14 dmg**, jumpable | 34 f after pound |
| 3 | 33–0% | `Charge ×3` chained (20 f between) · Enrage on entry | 46 f after 3rd charge |
| Stagger fill | Sweep +18 · thrown body +30 · punish-window throw +40 | | |

#### B2 — Chain-whip zoner
| Phase | HP band | Patterns | Punish window |
|---|---|---|---|
| 1 | 100–70% | `Whip lash` 34/5/30 (15 dmg, 180×16 line) · `Retreat hop` 90 px | 30 f after lash |
| 2 | 70–35% | `Spin whip` 40/22/36 (12 dmg/tick, 0.25 s cadence, 140 px radius) — **duck via Otajon O8 low-profile** | 36 f after spin |
| 3 | 35–0% | `Chain grab`: 44 f telegraph, pulls hero 200 px, 16 dmg — **ukemi-able**. `Whip lash ×2` | 44 f after grab whiff |
| Stagger fill | Sweep +14 · thrown body +24 · low-profile-dodge-then-grip +50 | | |

#### B3 — Rival grappler
| Phase | HP band | Patterns | Punish window |
|---|---|---|---|
| 1 | 100–65% | `Kumi-kata duel`: 28 f telegraph grab. If the hero grips within the same 10 f window → **clash minigame** (6 alternating inputs in 1.2 s; winner throws for 30) | Losing the clash = 20 dmg |
| 2 | 65–30% | `Counter-stance` 40 f (any grip reversed, 22 dmg) · `Uchi-mata` 32/6/28 (24 dmg) | 28 f after uchi-mata |
| 3 | 30–0% | Alternates stance ↔ grab every 1.5 s; **only sweeps and thrown bodies build STAG** | 34 f after each grab |
| Special | B3 is the **only boss that can grip a hero** outside scripted moments | | |

#### B4 — Armored bruiser + adds
| Phase | HP band | Patterns | Punish window |
|---|---|---|---|
| 1 | 100–70% | `Armor walk` (super-armor, absorbs 40 dmg before flinch) · `Hammer` 36/6/34 (20 dmg) | 34 f after hammer |
| 2 | 70–35% | Spawns 1× E6 + 1× E3 every 15 s · `Charge into conveyor` — **can be positioned into the hazard wall for 60 dmg** | Positional |
| 3 | 35–0% | Armor drops (flinches normally) · `Hammer ×2` + `Sweep` 30/5/26 (16 dmg) | 40 f after hammer ×2 |
| Stagger fill | Only thrown bodies (+40) and hazard-wall hits (+80). Sweeps give +6 | | |

#### B5 — Final cage match
| Phase | HP band | Patterns & gimmick |
|---|---|---|
| 1 | 100–70% | Clean fight. `Combo 3-hit` 26/4/14 ×3 (10/12/16) · `Shoot` 32/8/30 (18 dmg, 160 px lunge). Punish: 40 f after Shoot |
| 2 | 70–35% | **Crowd interference:** every 6.0 s a crowd member shoves the hero from a random cage edge (0.5 s telegraph — red arm silhouette — **14 dmg**, knockdown, ukemi-able). Cage becomes **electrified on 2 of 4 walls**, alternating every 8 s (12 dmg + knockdown). **Rigged hazard:** a floor panel at a seeded position drops a 40×40 weight every 10 s (24 dmg, 0.7 s telegraph shadow) |
| 3 | 35–0% | Enrage. All 4 cage walls electrified in 1.5 s bursts every 5 s. Crowd shove cadence 4.0 s. B5 gains `Counter-stance` (E8-style) with 30% entry chance. **Win-condition twist:** the last 10% HP must be removed by a **throw** — chip damage floors at 10% |
| Stagger | Max 180. Sweep +12 · thrown body +30 · **electrified-wall slam +90** (the intended solve: grip B5 in a punish window, throw him into a live wall) |
| Enrage timer | Hard enrage at **240 s** regardless of HP: +30% speed, crowd cadence 3.0 s |

---

## 4.9 Tag-Team & Co-op

### 4.9.1 Single-player tag

| Rule | Value |
|---|---|
| Swap input | `D` (tap) |
| Swap cooldown | **12.0 s**, shown as a HUD ring |
| Swap exit frames | **8 f** — outgoing character invulnerable, slides off-screen |
| **Entrance attack** | **Idris** — falling *Ura-nage* slam, 12 f startup, box 60×70, **18 dmg**, knockdown, 90 px radius. **Otajon** — sliding *De-ashi-barai*, 8 f startup, travels 110 px, box 60×20, **12 dmg**, knockdown |
| Entrance i-frames | **20 f** from arrival |
| Swap while gripped | Allowed — the grip **transfers**; incoming character inherits GRIPPED at **tier 0**, entrance attack skipped, cooldown becomes **8 s** |
| Emergency tag | Swapping during hitstun costs the full cooldown **+6 s** and grants no entrance attack |
| HP model | **Separate HP pools.** Benched character regenerates **2 HP/s**, capped at 50% of max |
| Death | Active character at 0 HP → forced free swap with 30 f i-frames. **Both** at 0 → life lost, both revive at 60% HP |
| Meter | **Shared single meter**; specials are per active character |

### 4.9.2 Local 2P co-op

| Rule | Value |
|---|---|
| Characters | P1 and P2 pick independently; duplicates allowed (palette swap) |
| Friendly fire | **OFF.** Hero throws pass through the other hero; a thrown enemy never damages heroes |
| Hero-vs-hero collision | Soft push only, **60 px/s** separation force, no blocking |
| Lives | **Split** — each player has their own stock (4.10.3) |
| Revive | Downed player enters `DOWN` for **10 s**. Partner holds `B` within 60 px for **5.0 s** uninterrupted (any damage resets the hold to 0) → revive at **50% HP** with 90 f i-frames. Otherwise a life is consumed and the player respawns after 3 s at 60% HP |
| Camera leash | Follows the **midpoint**. If `|P1.x − P2.x| > 560 px`, the trailing player is pulled by an invisible **soft wall** at `cameraX + 20` / `cameraX + 780` |
| Advance gates | `GO ➜` transitions require **both players** within the right-most **180 px** (or one player downed/dead) |
| Difficulty scaling | Enemy HP ×1.35, `maxAlive` cap 8, attack tokens 3 |
| Meter | **Independent** 100-point meters |
| Assist synergy | Both players gripping the **same** enemy within 0.5 s triggers **DOUBLE IPPON**: combined damage ×2.2, chain +3, both gain +20 meter. Cooldown 15 s |

---

## 4.10 Health, Lives & Difficulty

### 4.10.1 Health

| Entity | Max HP | Notes |
|---|---|---|
| Idris | **120** | Heavy: knockback ×0.75, hitstun ×0.9 |
| Otajon | **90** | Light: knockback ×1.15, ukemi cooldown 22 f |
| HUD | 1 heart icon = 20 HP; partial hearts render in quarters (5 HP) | |
| Regen | None in combat. Benched tag character: **2 HP/s** to a 50% cap | |
| Chip floor | A single hit can never reduce a hero from > 1 HP to 0 within the first **2.0 s** of a wave (anti-ambush rule) | |

### 4.10.2 Pickups

| Pickup | Effect | Drop rule |
|---|---|---|
| **Tea thermos** (small) | **+30 HP** | Guaranteed from breakable crates at 25%; drops from the last enemy of a wave if active hero HP < 40% (max 1/wave) |
| **Plov** (full) | **Full heal**, both characters in tag mode (benched to 100%) | Mid-boss only: appears at boss phase 2 entry, once per boss, once per credit |
| **Meter charm** | **+50 meter** | 10% drop from E8; 100% from boss phase transitions in 2P |
| **Score medal** | +500 score | 15% from any enemy |
| Pickup collision | 24×24 px, `±14 px` depth tolerance, auto-collect on touch, lifetime **12 s** (blinks last 3 s) | |

### 4.10.3 Lives & continues (arcade)

- **Lives: 3** per credit (Normal). Death = respawn in place after **3.0 s** with **120 f i-frames** at 60% HP.
- Lives exhausted → **Continue** screen: **10 s** countdown, retains level progress with a rank penalty (`−1 rank grade` per continue, floor D).
- Continues: **unlimited in browser build**; APK build defaults to unlimited with an optional "Arcade Purist" toggle (3 continues).
- Wave progress is retained on continue; the current wave restarts from spawn.

### 4.10.4 Difficulty multipliers

| Parameter | Easy (*Shodan*) | Normal (*Nidan*) | Hard (*Yondan*) |
|---|---|---|---|
| Enemy HP | ×0.75 | ×1.00 | ×1.30 |
| Enemy damage | ×0.70 | ×1.00 | ×1.35 |
| Enemy move speed | ×0.90 | ×1.00 | ×1.12 |
| Telegraph duration | ×1.30 (never below 0.4 s) | ×1.00 | ×0.85 (never below 0.4 s) |
| Attack tokens | 2 | 2 | 3 |
| Grip-break mash rate | ×0.75 | ×1.00 | ×1.30 |
| `maxAlive` cap | 4 | 6 | 7 |
| Starting lives | 5 | 3 | 2 |
| Meter gain | ×1.25 | ×1.00 | ×0.85 |
| Score multiplier (rank `ratio`) | ×0.80 | ×1.00 | ×1.25 |
| Boss enrage timer | 360 s | 240 s | 180 s |

### 4.10.5 Assist option hooks

All toggleable, flagged in save data; `assistUsed` caps level rank at **A**.

| Hook | Effect |
|---|---|
| `assist.autoUkemi` | Ukemi triggers automatically on the 6th frame of the window |
| `assist.gripAssist` | Grip range +12 px, grip-break threshold ×1.5 |
| `assist.slowTelegraph` | All telegraphs ×1.5 |
| `assist.noPitDeath` | Pits deal 10 damage and return the hero to the ledge instead of respawning |
| `assist.infiniteMeter` | Meter regenerates 10/s |
| `assist.holdToGrip` | Holding `B` auto-attempts grip every 20 f |
| `assist.damageTaken` | 0.25 / 0.5 / 0.75 / 1.0 multiplier slider |

---

## 4.11 Developer Test List (unit tests — headless sim, seeded RNG)

1. `frames60 × 2 == ticks`: a 12 f move resolves in exactly 24 sim ticks at 120 Hz.
2. Idris reaches exactly 150 px/s in 0.125 s from standstill on flat ground (±0.5 px/s).
3. Coyote time: a jump input 0.099 s after leaving a ledge succeeds; at 0.101 s it fails.
4. Jump buffer: `A` pressed 0.100 s before landing produces a jump on the landing tick.
5. Variable jump: releasing `A` at frame 6 yields peak height between 55% and 70% of full jump.
6. Max fall speed clamps at 760 px/s (Idris) after a 600 px drop and never exceeds it.
7. Apex gravity applies only while `|vy| < 40 px/s` and for no more than 0.08 s.
8. Belt mode: Y speed equals exactly 60% of X speed for both heroes.
9. Belt mode: an attack at `Δfeet-Y = 10 px` connects; at `11 px` it does not.
10. Belt jump freezes depth-Y for the whole airtime and restores control on landing.
11. Mode transition while airborne defers the physics swap until landing, max 30 f.
12. Arena gate walls spawn on entry and despawn within 10 f of the final wave clearing.
13. Grip on `E6` from the front fails and adds exactly 8 f of recovery; from the rear ±60° it succeeds.
14. Grip auto-releases at exactly 300 f (2.5 s) with no damage dealt.
15. Grip tier 2 multiplies throw damage by exactly 1.30 and raises the break threshold by 55%.
16. E5 grip-break: with seed X, escape occurs on a reproducible tick across 100 identical runs.
17. A hero taking damage while `GRIPPED` transitions to `GRIP_BROKEN` + `HITSTUN` on the same tick.
18. `I5 Uchi-mata` is rejected at grip tier 0 and accepted at tier ≥ 1.
19. A thrown body damages other enemies at 0.75× and never damages any hero or the thrower.
20. Friendly-fire scaling across 4 victims in one flight is 0.75 / 0.5625 / 0.4219 / 0.3164 and stops at victim 5.
21. Ground bounce: restitution 0.42 vertical / 0.70 horizontal, capped at 2 bounces, suppressed below 120 px/s.
22. Slam throw (I2) has restitution 0 and produces zero bounces.
23. Wall slam triggers only at `|vx| ≥ 200 px/s` and awards exactly +14 damage, +6 meter, +1 chain.
24. Screen Slam (I6) deals no physics damage, respects its 8 s cooldown, and is blocked outside arenas and during bosses.
25. The IPPON chain timer resets to 300 f on every extending event and breaks on hero damage.
26. Chain damage multiplier caps at ×1.60 at chain 16 and does not grow at chain 17+.
27. OTG sweep and I8 do **not** increment the chain counter.
28. Rank formula: a fixture scoring `ratio = 2.00` with 1 death produces **A**, not S.
29. Juggle scaling produces 1.00 / 0.85 / 0.70 / 0.55 / 0.40 and floors at 0.35.
30. A launched enemy at juggle count 4 receives 24 f of landing i-frames.
31. Attack tokens never exceed the wave's `tokens` value across 60 s of simulation with 8 enemies.
32. A token is forcibly returned after 2.5 s and its holder cannot re-request for 0.6 s.
33. Every enemy attack's telegraph is ≥ 24 f at all three difficulties, including Hard's ×0.85.
34. `E2` cannot be launched: `I3` on E2 produces a standard arc, not a launch arc.
35. `E8` counter-stance reverses a grip attempt for exactly 15 damage and only during its 30 f window.
36. `maxAlive` is never exceeded; queued spawns enter within 1 tick of a slot opening.
37. Wave `clear: "all"` fires `onClear` on the same tick the last enemy's HP reaches 0.
38. Boss grip attempts fail unless `STAGGERED`; staggered throws deal ×1.35.
39. The boss stagger meter decays at 8%/s after exactly 3 s of no contribution.
40. B5 phase 3: chip damage cannot reduce HP below 10%; a throw can.
41. B5 electrified-wall slam adds exactly +90 stagger.
42. Tag swap cooldown is 12.0 s; a swap during hitstun costs 18.0 s and grants no entrance attack.
43. Tag swap while gripped transfers the grip at tier 0 and sets an 8 s cooldown.
44. The benched character regenerates 2 HP/s and stops at exactly 50% max HP.
45. Co-op: a hero's thrown enemy passes through the partner with zero damage events.
46. Co-op revive requires an uninterrupted 5.0 s hold; damage at 4.9 s resets progress to 0.
47. The co-op camera soft-wall engages at `|Δx| > 560 px` and never traps a player off-screen.
48. The `GO ➜` gate does not open in 2P until both live players are in the right-most 180 px.
49. Determinism: identical seed + identical input log produce byte-identical world hashes at tick 36000 (5 min).
50. AI perception delay is exactly 12 ticks and never reads same-tick hero state.
51. The difficulty table applies multiplicatively and never lowers any telegraph below 24 f.
52. `assist.*` flags set `assistUsed`, which caps the level rank at A even with `ratio ≥ 2.0`.
53. Pickup collision honours the ±14 px depth tolerance and despawns at 12.0 s.
54. Plov drops exactly once per boss per credit.
55. Hitstop freezes both actors' animation clocks for the specified frames while camera shake continues.
