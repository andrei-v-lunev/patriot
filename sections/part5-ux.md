# 5. UX, Controls & Interface — THE PATRIOT / «ПАТРИОТ»

> Owner: UX Direction. Canon resolution: **480×270 logical**, integer-scaled (×2/×3/×4/×5) with letterbox. All coordinates below are in logical px from top-left (0,0). All timings in ms at a fixed 60 Hz simulation tick (16.67 ms/frame); frame counts given where snap matters.
>
> **LANGUAGE CANON: all in-game UI copy ships in RUSSIAN by default and primary.** Every string below is given as the shipping Russian string in guillemets with an English gloss in parentheses for the dev team — the gloss is **never** rendered in game. English is a later settings stub (§5.6).
>
> **FONT CONSTRAINT (blocking, art + engineering):** every font in the game — title logo, HUD numerals, 5 px hint font, 7 px score font, menu font, chalk-hand tutorial font, rank-stamp face, credits — **must include full Cyrillic coverage (U+0400–U+04FF), including Ё/ё**. Pixel fonts are authored glyph-by-glyph: budget Cyrillic from day one, do not retrofit. Latin-only pixel fonts are rejected at art review. Cyrillic strings run ~10–15 % longer than English at the same point size — all HUD and menu boxes are laid out against the **Russian** string, not the English one, and the string table budgets EN at 0.9× RU width.

---

## 5.1 UX Principles

1. **Arcade immediacy — every screen exits in ≤ 1 input.** No confirm dialogs on non-destructive actions. Title → in combat in ≤ 3 inputs (СТАРТ → character → СТАРТ). Nothing between the player and a throw except a loading bar that has a job.
2. **The 90s lives in the CONTENT, never in the FRICTION.** CRT scanlines, chunky score fonts, VS cards, slam stamps — yes. Input lag, unskippable logos, 8-frame menu cursors, «ВЫ УВЕРЕНЫ?» (ARE YOU SURE?) — no. We simulate the arcade *feeling*, not its hardware limits.
3. **Show, don't sentence.** Zero text walls. Mechanics are taught by a character doing them at the player, diegetically, inside the first level. **Max 3 Russian words per hint**, max 1 hint on screen. Russian is a longer language than English — the word cap, not a character cap, is what keeps the HUD clean.
4. **One diegetic layer, one system layer — never mixed.** Diegetic (in-world coaching, chalkboards, crowd) teaches. System layer (HUD, menus) informs. A system prompt never pretends to be a character, and a character never explains a button remap.
5. **Touch is a first-class citizen, not a port.** The touch scheme is designed first for one-handed viability and thumb-reachability, then validated against gamepad parity — not a keyboard layout with sprites glued over it. If a control is ugly on a phone, it is wrong on a gamepad too.
6. **Every state is interruptible and every interruption is reversible.** Pause is instant (≤ 1 frame), attract exits on any input, cutscene/ceremony beats each accept a skip that jumps to the next beat rather than the end.

---

## 5.2 Screen-Flow State Machine

### 5.2.1 State table

| # | State | Enter transition | Duration / exit | Skippable by |
|---|---|---|---|---|
| S0 | `BOOT` | app/page load | until engine + core atlas ready (target ≤ 800 ms) | — |
| S1 | `PRELOAD` | auto from S0 | progress bar, label «ЗАГРУЗКА» (LOADING); min display 600 ms | — |
| S2 | `LEGAL` | auto | 1200 ms fade-in 200 / hold 800 / fade-out 200 | any input → S3 |
| S3 | `TITLE` | auto | «НАЖМИ СТАРТ» (PRESS START); idle 20 000 ms → S4 | START/A/Enter/tap → S6 |
| S4 | `ATTRACT_DEMO` | idle from S3 | 30 000 ms scripted demo | any input → S3 (300 ms wipe) |
| S5 | `ATTRACT_SCORES` | auto from S4 | 8 000 ms «ЛУЧШИЕ БОЙЦЫ» (BEST FIGHTERS) table → S3 | any input → S3 |
| S6 | `SAVE_SLOT` | START from S3 | «ВЫБЕРИ СЛОТ» (CHOOSE SLOT), 3 slots | B/Esc → S3 |
| S7 | `MODE_SELECT` | slot chosen | «АРКАДА» (ARCADE) / «КООП» (CO-OP) / «ДОДЗЁ» (TRAINING) | B → S6 |
| S8 | `CHAR_TAG_SELECT` | mode chosen | «ВЫБЕРИ БОЙЦА» (CHOOSE FIGHTER); 20 s soft timer auto-picks | B → S7 |
| S9 | `WORLD_MAP` | select confirmed | «КАРТА» (MAP), node graph | START → S17 |
| S10 | `LEVEL_INTRO` | node confirmed | 1800 ms (banner slam 250 / hold 1100 / wipe 450) | any input → S11 at 400 ms min |
| S11 | `PLAY_PLATFORM` | auto | gameplay | START → S17 |
| S12 | `PLAY_ARENA` | camera lock trigger | gameplay, waves | START → S17 |
| S13 | `VS_CARD` | boss gate crossed | 2600 ms, «ПРОТИВ» (VERSUS) between portraits | any input after 900 ms → S14 |
| S14 | `BOSS_FIGHT` | auto | gameplay | START → S17 |
| S15 | `RESULTS` | level/boss cleared | ceremony (§5.7) | per-beat skip |
| S16 | `CONTINUE` | both partners KO | «ПРОДОЛЖИТЬ?» (CONTINUE?), 10 000 ms | START/tap → revive |
| S17 | `PAUSE` | START, any time in S9–S14 | «ПАУЗА» (PAUSE); audio ducked −12 dB over 120 ms | START/B → resume |
| S18 | `SETTINGS` | from S3, S17 | «НАСТРОЙКИ» (SETTINGS), nested list | B → caller state |
| S19 | `GAME_OVER` | S16 expired | «ИГРА ОКОНЧЕНА» (GAME OVER), 3000 ms → S3 | after 1500 ms |

Title menu items (S3, after START on a returning save): «ИГРАТЬ» (PLAY) / «КООП НА ДВОИХ» (2P CO-OP) / «НАСТРОЙКИ» (SETTINGS) / «РЕКОРДЫ» (HIGH SCORES).

### 5.2.2 Transition timing rules

- **Standard wipe:** 300 ms, 6-slice horizontal pixel wipe, ease-out. Never cross-fade (cross-fades read as "web", not arcade).
- **Gameplay ↔ menu:** 180 ms only — the pause overlay must feel instant.
- **Hard cut** is used exactly twice: hit-stop resume, and slam-stamp landing.
- Every wipe holds input buffering: inputs pressed during a wipe are queued and applied on the first frame of the destination state (buffer window 200 ms).

### 5.2.3 Attract mode loop

```
TITLE ──idle 20s──▶ ATTRACT_DEMO (30s) ──▶ ATTRACT_SCORES (8s) ──▶ TITLE ──▶ (loop)
   ▲                      │ any input             │ any input          │
   └──────────────────────┴───────────────────────┴──────────────────◀─┘
```

- Demo plays a **recorded input replay** of W2L1 arena, not an AI bot — it must land two clean throws and one «ИППОН!» so the verb reads instantly.
- Demo HUD is live and real; a tag «ДЕМО» (ATTRACT MODE) sits at (214,10), 2 px letter-spacing, alpha 0.55, pulsing 0.55→0.85 over 1600 ms.
- High-score table header: «ЛУЧШИЕ БОЙЦЫ» (BEST FIGHTERS); columns «МЕСТО / ИМЯ / ОЧКИ / РАНГ» (RANK / NAME / SCORE / GRADE). Name entry uses a Cyrillic 3-glyph wheel (А–Я, plus `.` and backspace glyph).
- Attract audio at −6 dB vs gameplay; on APK it respects system silent mode.
- Any input (gamepad button, key, touch, or gamepad stick > 0.5 deflection) exits. Stick deflection alone does *not* exit below 0.5 magnitude (prevents drifting controllers killing the loop).

### 5.2.4 2P drop-in join (arcade-authentic)

Available in S11/S12/S14 at any moment, and in S9.

1. Second gamepad connects **or** an unassigned gamepad/keyboard-P2 key is pressed.
2. Banner appears bottom-center at (240,232): **«НАЖМИ СТАРТ — В БОЙ!»** (PRESS START TO JOIN), blinking 500 ms on / 250 ms off, lifetime 6000 ms.
3. On START: game does **not** pause. A 400 ms flash-in spawn happens off-screen edge nearest P1; P2's fighter (default = the tag partner not on point) slides in over 350 ms.
4. P2 HUD panel animates in from the right edge over 250 ms; P1's panel does not move (its coordinates are fixed).
5. P2 shares the current continue pool but has an independent 3-life stock.
6. **Drop-out:** if P2's gamepad disconnects, game freezes into `PAUSE` within 1 frame with **«ГЕЙМПАД ОТКЛЮЧЁН — ИГРОК 2»** (CONTROLLER DISCONNECTED — PLAYER 2) and a reconnect prompt; after 30 s with no reconnect it offers **«[A] ПРОДОЛЖИТЬ ОДНОМУ»** (CONTINUE AS 1P).

### 5.2.5 Continue countdown

- Trigger: both of a player's fighters at 0 HP.
- Screen dims to 55 % black over 200 ms; gameplay renders behind (0.15× time scale for 500 ms, then frozen).
- Header at (240,62): **«ПРОДОЛЖИТЬ?»** (CONTINUE?), 14 px, red-orange with 1 px black outline.
- Giant numeral at (240,110), 48 px tall, **10 → 0**, one step per 1000 ms. Each step: numeral scales 1.35 → 1.0 over 120 ms, screen shake 1 px, low drum hit; drum pitch rises +1 semitone per step from 4.
- Prompt at (240,166): **«НАЖМИ СТАРТ»** (PRESS START). Credit counter at (240,182): **«КРЕДИТЫ: 2»** (CREDITS: 2).
- Accepting: countdown freezes, 250 ms white flash, revive at last checkpoint with 2000 ms invulnerability (blink 8 Hz). Score penalty −20 %, shown as a red delta at (240,150) for 900 ms with the label **«ШТРАФ»** (PENALTY).
- On 0 → `GAME_OVER`: **«ИГРА ОКОНЧЕНА»** (GAME OVER) at (240,120), 20 px, 3000 ms.

### 5.2.6 Pause

- Opens in ≤ 1 frame. Time scale to 0 immediately; no easing on the freeze (easing reads as lag).
- Backdrop: 60 % black + 2 px pixel-dither, gameplay still visible (players use pause to read the arena — never hide it).
- Header at (240,72): **«ПАУЗА»** (PAUSE). Menu at x=240, items 16 px apart from y=96:
  - **«ПРОДОЛЖИТЬ»** (RESUME)
  - **«С КОНТРОЛЬНОЙ ТОЧКИ»** (RESTART CHECKPOINT)
  - **«НАСТРОЙКИ»** (SETTINGS)
  - **«ВЫЙТИ НА КАРТУ»** (QUIT TO MAP)
- The last two require a **600 ms hold** (radial fill on the item, hint glyph «УДЕРЖИВАЙ» / HOLD) instead of a confirm dialog — destructive intent proven by holding, not by an extra screen.

---

## 5.3 Control Schemes

### 5.3.1 Gamepad (primary)

| Action (RU HUD label) | Xbox | DualSense | Notes |
|---|---|---|---|
| Движение / глубина — move / lane | Left stick, D-pad | Left stick, D-pad | 8-way; ↑/↓ = lane depth in arenas |
| **«ПРЫЖОК»** (JUMP) | **A** | **Cross** | Hold = higher (variable, 90–220 ms window) |
| **«УДАР»** (STRIKE) | **X** | **Square** | 3-hit chain, 400 ms chain window |
| **«ЗАХВАТ»** (GRIP) | **B** | **Circle** | Tap near enemy = grab; hold sustains grip |
| **«БРОСОК»** (THROW) | **B** release + direction | **Circle** release + direction | See table below |
| **«СПЕЦПРИЁМ»** (SPECIAL) | **Y** | **Triangle** | Requires meter ≥ 100 % |
| **«СМЕНА»** (TAG) | **RB** | **R1** | 700 ms animation, i-frames 0–260 ms |
| **«УКЭМИ»** (UKEMI / breakfall) | **LB** | **L1** | 240 ms window from knockdown contact |
| **«БЛОК»** (GUARD) | **LT** (≥ 0.35) | **L2** | |
| **«РЫВОК»** (DASH) | **RT** / double-tap dir | **R2** | |
| **«ПАУЗА»** (PAUSE) | **Start / Menu** | **Options** | |
| **«ОБЗОР»** (PEEK) | **Back / View** | **Create** | Hold to show objective |

**Throw grammar (during grip)** — throw names stay in transliterated Russian judo terminology (this is canon flavor, and Russian judo culture uses these terms natively):

| Direction held | Throw | Effect |
|---|---|---|
| Neutral | **«ИППОН-СЭОЙ»** | Slam forward, hard knockdown, high score |
| Forward | **«СЭОЙ-НАГЭ»** | Long forward toss — hits other enemies in the lane |
| Back | **«ТОМОЭ-НАГЭ»** | Sacrifice throw, sends enemy behind you |
| Down | **«ОСОТО-ГАРИ»** | Ground slam, stun 900 ms, best combo extender |
| Up | **«УТИ-МАТА»** | Vertical launch → juggle / wall bounce |

- Grip has a 900 ms sustain timer, HUD ring around the gripped enemy drains; releasing with no direction at < 200 ms = a light shove (never a wasted input).
- **Vibration:** grip connect 40 ms @0.3; throw impact 90 ms @0.8; ИППОН 160 ms @1.0 + 60 ms @0.4; taking damage 70 ms @0.5.

**Two-gamepad co-op assignment UX**

- First gamepad to press any button during S3/S6 becomes P1 and owns menu navigation.
- On S8 each pad shows its own cursor tinted P1-cyan / P2-amber, labelled **«ГЕЙМПАД 1» / «ГЕЙМПАД 2»** (PAD 1 / PAD 2) on the pad glyph.
- Hot-swap: at any pause, **«НАСТРОЙКА ГЕЙМПАДОВ»** (REASSIGN CONTROLLERS) lists connected pads; pressing a face button highlights its row (identify-by-press, never by index number).
- Disconnect handling per §5.2.4.

### 5.3.2 Keyboard

**Cyrillic layout note:** all bindings read `event.code`, so physical keys are stable regardless of the active RU/EN layout. On-screen key glyphs are drawn from `navigator.keyboard.getLayoutMap()` — a player on the Russian ЙЦУКЕН layout sees **«Ц Ф Ы В»** where the English layout shows `W A S D`, and «О» / «Л» / «Д» for `J` / `K` / `L`. The key-cap glyph font must therefore also carry Cyrillic.

**P1 default (solo):**

| Action | Key (EN cap) | RU cap shown | Alt |
|---|---|---|---|
| Движение (move) | `W A S D` | Ц Ф Ы В | `↑ ← ↓ →` |
| «УДАР» (strike) | `J` | О | `Z` (Я) |
| «ПРЫЖОК» (jump) | `K` | Л | `X` (Ч) |
| «ЗАХВАТ / БРОСОК» (grip/throw) | `L` | Д | `C` (С) |
| «СПЕЦПРИЁМ» (special) | `U` | Г | `V` (М) |
| «СМЕНА» (tag) | `I` | Ш | `B` (И) |
| «УКЭМИ» (ukemi) | `O` | Щ | `N` (Т) |
| «РЫВОК» (dash) | `Left Shift` | — | `Right Shift` |
| «БЛОК» (guard) | `Space` | — | `Space` |
| «ПАУЗА» (pause) | `Esc` | — | `Enter` |

**Simultaneous 2P keyboard fallback** (auto-enabled when «КООП» is chosen with < 2 gamepads). Zero overlap with the P1 map:

| Action | P1 | P2 |
|---|---|---|
| Движение | `W A S D` | `↑ ← ↓ →` |
| «УДАР» | `J` | `Numpad 1` / alt `.` |
| «ПРЫЖОК» | `K` | `Numpad 2` / alt `/` |
| «ЗАХВАТ / БРОСОК» | `L` | `Numpad 3` / alt `Right Shift` |
| «СПЕЦПРИЁМ» | `U` | `Numpad 5` / alt `;` |
| «СМЕНА» | `I` | `Numpad 6` / alt `'` |
| «УКЭМИ» | `O` | `Numpad 0` / alt `,` |
| «БЛОК» | `Space` | `Numpad Enter` / alt `Right Ctrl` |
| «ПАУЗА» | `Esc` (either player) | `Esc` |

- Alt column auto-selected when a numpad-less keyboard is detected (first `Numpad*` press within 10 s of the prompt, else alt).
- P1's alt mapping is disabled while 2P keyboard mode is active — surfaced in S7 as one line, **«РАСКЛАДКА 2 ИГРОКОВ АКТИВНА»** (2P LAYOUT ACTIVE), not as an error.

### 5.3.3 Touch — "modern, not ugly"

**Design thesis:** three buttons, not six. The button farm exists because ports map 1:1. We merge *strike + grip + throw* into one **contextual action button** driven by proximity and gesture — fewer pixels, truer to the core verb, and it sidesteps the problem that Russian action labels («ЗАХВАТ», «СПЕЦПРИЁМ») do not fit inside small circular buttons. **Touch buttons use icons, never text**; the Russian label appears only in the remap screen and in first-time hints.

**Left — floating drift stick**

- Invisible touch region: left 45 % of screen, full height, minus top 40 px (pause zone).
- Stick **anchors where the thumb lands** (no fixed position). Base ring 128 px Ø, knob 56 px Ø.
- Dead zone: 8 px. Full deflection at 48 px from anchor.
- **Drift re-anchor:** if the thumb travels beyond 64 px from the anchor, the anchor slides to maintain a 64 px max radius — prevents the thumb walking off the glass during long runs.
- Lane depth (↑/↓) requires ≥ 22 px vertical with < 30° from vertical, so lateral runs never accidentally change lane.
- Visual: base ring 3 px stroke, white @ 0.18; knob white @ 0.32 with 1 px dark outline for contrast on bright arenas. Fades to 0 alpha 500 ms after release (200 ms fade).

**Right — action cluster**

| Control (icon) | Position (from bottom-right safe corner) | Size | Behavior |
|---|---|---|---|
| **ACTION — «ЗАХВАТ / УДАР»** (fist→grip icon) | −96, −96 | **112 px** Ø | Tap = удар. Tap in grip range = захват. Hold = sustain. |
| **JUMP — «ПРЫЖОК»** (arc icon) | −200, −72 | **88 px** Ø | Tap = jump; hold = higher jump |
| **TAG — «СМЕНА»** (partner portrait chip) | −72, −204 | **76 px** Ø | Portrait + cooldown radial |
| **SPECIAL — «СПЕЦПРИЁМ»** (kanji-star icon) | −188, −186 | **96 px** Ø | Hidden until meter = 100 % |

- Opacity states: idle **0.28**, finger-down **0.62** (60 ms in / 120 ms out), disabled **0.12**, unavailable-but-relevant **0.20 + 1 px dashed ring**.
- All hit targets ≥ **72 px**, extended 12 px beyond their visual radius (invisible generosity).
- SPECIAL entrance: scale 0.6 → 1.0 with 8 % overshoot over 220 ms + 2-frame white flash + 900 ms breathing glow (alpha 0.35 ↔ 0.6), with the one-time hint **«СПЕЦПРИЁМ ГОТОВ»** (SPECIAL READY). Exit on use: scale to 0.6 + fade over 160 ms.

**Gesture layer (this is what replaces the button farm)**

| Gesture | Condition | Result | Threshold |
|---|---|---|---|
| Flick from ACTION button | while gripping | Directional throw matching flick vector | ≥ **56 px** travel within **220 ms**, sampled over the last 80 ms |
| Flick ↑ | gripping | «УТИ-МАТА» | vector within ±35° of up |
| Flick ↓ | gripping | «ОСОТО-ГАРИ» | ±35° of down |
| Flick ← (behind you) | gripping | «ТОМОЭ-НАГЭ» | ±35° |
| Flick → (facing) | gripping | «СЭОЙ-НАГЭ» | ±35° |
| Release, no flick | gripping | «ИППОН-СЭОЙ» | travel < 24 px |
| Swipe down, right half | during knockdown window | **«УКЭМИ»** | ≥ 48 px in ≤ 200 ms |
| Two-finger tap | any gameplay | «ПАУЗА» | — |

- During a grip, a **throw compass** appears around the ACTION button: 4 chevrons at 64 px radius, alpha 0.35, the one nearest the current flick vector lighting to 0.9. Disappears on release. This is the entire throw tutorial, permanently on-screen, and it is **language-free** — no Cyrillic width problems.
- Ambiguity rule: a gesture resolving to two throws (vector between two 35° cones) resolves to the *last unambiguous* direction sampled; never a random pick.

**Haptics map (Android Vibration API / `navigator.vibrate`)**

| Event | Pattern (ms) |
|---|---|
| Button press (any) | `8` |
| Grip connect / «ЗАХВАТ» | `[14, 20, 14]` |
| Throw commit / «БРОСОК» | `28` |
| Impact / slam landing | `55` |
| **«ИППОН!»** | `[40, 40, 90]` |
| Damage taken | `22` |
| Special ready | `[10, 60, 10]` |
| Menu confirm / cancel | `6` / `[4,30,4]` |
| Rank stamp | `70` |

All haptics scale by the **«ВИБРАЦИЯ»** (HAPTICS) setting — «ВЫКЛ / СЛАБАЯ / ПОЛНАЯ» (Off / Light 0.5× / Full 1.0×) — and are suppressed entirely under «МЕНЬШЕ ДВИЖЕНИЯ» (reduced motion).

**Landscape lock & safe area**

- Landscape-primary requested via `screen.orientation.lock('landscape')` (APK: `android:screenOrientation="sensorLandscape"`).
- Browser fallback (lock unavailable): full-screen rotate prompt — 64 px rotating phone glyph + **«ПОВЕРНИ УСТРОЙСТВО»** (ROTATE YOUR DEVICE), game paused, no gameplay behind.
- All touch controls inset by `max(env(safe-area-inset-*), 16px)`; notch side gets +8 px. The 480×270 canvas is centered and never covered by controls — controls live in the letterbox bars whenever the aspect ratio allows, and only overlay the play field when it does not.

---

## 5.4 HUD Design (480×270 grid)

All HUD boxes are sized against the **Russian** string. Where the Russian word does not fit, the HUD uses an icon and moves the word to a tooltip/remap screen — it never abbreviates Cyrillic with a period.

### 5.4.1 Arena / combat mode

| Element | Position (x,y) | Size | Behavior / RU string |
|---|---|---|---|
| P1 portrait chip | 8,8 | 28×28 | Pixel portrait, 2 px frame; flashes red 2 frames on damage |
| P1 health bar | 40,10 | 116×8 | Front layer drains instantly; **chase layer** (dark red) drains 240 ms later over 300 ms |
| P1 name / lives | 40,22 | — | **«ИДРИС ×2»**, 5 px font |
| P1 special meter | 40,32 | 116×4 | Segmented 4×29 px; при 100 % — gold sweep every 1400 ms + label **«ГОТОВ»** (READY) |
| P1 tag partner chip | 8,40 | 20×20 | Desaturated while cooling; **cooldown radial** sweeps clockwise |
| P2 mirror set | 472,8 anchored right | mirrored | **«ОТАЖОН ×2»**; only when P2 active |
| Score | 240,6 (centered) | 7 px font | **«ОЧКИ 128 400»** (SCORE); rolls up ≤ 240 pts/frame, never snaps |
| Wave indicator | 240,20 | — | **«ВОЛНА 2 / 3»** (WAVE 2 / 3) |
| Boss health bar | 240,244 (centered) | 320×10 | Portrait chip 32×32 at 92,238; boss name in RU caps below-left |
| Boss stagger pips | 240,256 | 3 × 8×4 | Fill as stagger accrues |
| Combo counter | 96,88 | scaling | **«×7 КОМБО»** — see §5.4.3 |
| **«ВПЕРЁД ➜»** arrow (GO) | 448,136 | 40×16 | See §5.4.4 — box widened from 24 px for the Cyrillic word |
| Damage direction | screen edges | 40 px arc | See §5.4.5 |

### 5.4.2 Platforming mode

Combat HUD minus boss bar, minus wave indicator. Health/meter cluster shrinks: tag chip and meter collapse into a 116×4 strip, and the whole P1 block **auto-fades to alpha 0.35** after 4000 ms with no damage taken and no enemy on screen; returns to 1.0 in 120 ms on any combat event. Collectible counter at 240,20 (`◈ 12`, icon-only — no word needed).

### 5.4.3 Combo / «ИППОН!»

- Combo counter appears at hit 2 as **«×N КОМБО»** — the numeral 24 px tall, the word «КОМБО» 7 px beneath it (so Cyrillic length never fights the big numeral).
- Scale punch 1.4 → 1.0 over 100 ms per increment, +2° random rotation per hit (max ±6°).
- Tiers: ×2–4 white, ×5–9 cyan, ×10–19 amber, ×20+ animated gradient.
- Drops after 1400 ms without a hit: shrinks to 0 over 180 ms with a 6 px downward drift.
- **«ИППОН!»** (clean, unbroken throw finish): full-screen 2-frame white flash, 180 ms hit-stop, **«ИППОН!»** slams in at 240,120 at 36 px tall from scale 3.0 → 1.0 over 160 ms, holds 700 ms, exits up over 200 ms. Kanji stamp 一本 renders behind at alpha 0.25 (the kanji is decoration; the Cyrillic word is the readable layer).
- Session counter on the results screen is labelled **«ИППОНЫ»** (IPPONS) — plural forms handled by the string table: 1 «ИППОН», 2–4 «ИППОНА», 5+ «ИППОНОВ».

### 5.4.4 «ВПЕРЁД ➜» arrow (GO)

- Appears 600 ms after the last enemy of a wave is defeated and the camera unlocks.
- Bobs horizontally ±4 px on a 700 ms sine; alpha pulses 0.6 ↔ 1.0 on the same period.
- After 8000 ms of the player not advancing: grows 1.25× and adds a 1 px trailing ghost — nudge, never nag. Never blocks input, never spawns a sentence.

### 5.4.5 Damage direction indicators

- On off-screen or behind-lane damage: a 40 px arc at the nearest screen edge, 3 px thick, red @0.8, fading over 500 ms. Lane-depth attacks tint the arc amber and add a 2 px vertical tick, so "behind you" reads distinctly from "above/below your lane". Fully language-free.

---

## 5.5 Onboarding — W1L1 «ДОДЗЁ» (THE DOJO)

**Policy:** zero text walls, zero modal tutorials, zero «НАЖМИ A ЧТОБЫ ПРОДОЛЖИТЬ» pages. Idris coaches the player *as a character*, in Russian, in-world, while the player is already moving.

**Diegetic staging:** the level is Idris's dojo. Training dummies (**«МАНЕКЕНЫ»**) stand on tatami squares. Neighborhood kids sit along the wall and react (cheer on «ИППОН!», groan on a whiffed grip). Chalkboard signs carry the *only* written instruction in the game, hand-drawn as **Cyrillic chalk pixel-lettering** with a controller glyph — set dressing that happens to be readable. The chalk font is a bespoke Cyrillic face; it must cover Ё and the soft/hard signs.

**Progression:**

| Beat | Teaches | Gate / chalk sign |
|---|---|---|
| 1. Tatami walk | Движение | Kids wave from the far end — pure attraction |
| 2. First dummy | **«ЗАХВАТ»** (grip; neutral throw only) | Dummy is unstrikeable — only grip works. Chalkboard: **«ЗАХВАТ»** + button glyph |
| 3. Three dummies | Neutral throw scored | Idris (voice + 3-word barks): **«Иппон. Ещё раз.»** |
| 4. Chalk circles on floor | **Forward + back throws** — dummy must land in the circle | Chalkboard: **«БРОСЬ ВПЕРЁД»** / **«БРОСЬ НАЗАД»** |
| 5. Falling sandbag | **«УКЭМИ»** — sandbag knocks you down; kids laugh once, then cheer | Chalkboard: **«ПАДАЙ ПРАВИЛЬНО»** (fall correctly); repeats until one clean breakfall |
| 6. Sparring partner (Otajon) | **«СМЕНА»** (tag) | Otajon taps out mid-round: **«Меняемся!»** |
| 7. Chalkboard wall reveal | **Full throw table** (5 throws) unlocked | End-of-level chalk diagram, header **«ПРИЁМЫ»** (THROWS), 4 s, skippable |

Down/Up throws are *not* taught in W1L1 — they unlock on the chalkboard at level end and get their first forced use in W1L2 (a wave requiring a ground slam to break guard).

**Contextual first-time hints** — once per save slot, at 240,214, 5 px Cyrillic font, alpha 0 → 1 over 150 ms, hold **2600 ms** (raised from 2200 ms: Russian takes marginally longer to read), out over 200 ms. Suppressed if the player already performed the action. **Hard cap 3 Russian words.**

| Trigger | RU copy (≤ 3 words) | EN gloss |
|---|---|---|
| First enemy in grip range | **«ХВАТАЙ ЕГО»** | GRIP HIM |
| Grip held > 400 ms, no direction | **«СМАХНИ — БРОСОК»** | FLICK TO THROW |
| First knockdown | **«ЖМИ — УКЭМИ»** | TAP TO BREAKFALL |
| Meter reaches 100 % first time | **«СПЕЦПРИЁМ ГОТОВ»** | SPECIAL READY |
| Partner health < 30 % | **«СМЕНИ БОЙЦА»** | TAG OUT |
| First ledge over 48 px | **«ДЕРЖИ ПРЫЖОК»** | HOLD JUMP |
| First guarding enemy | **«БРОСЬ ВНИЗ»** | SLAM DOWN |
| First wave cleared | **«ВПЕРЁД, НЕ СТОЙ»** | GO, KEEP MOVING |
| Second death on same checkpoint | **«ПОПРОБУЙ БРОСОК»** | TRY A THROW |
| 2P pad detected | **«НАЖМИ СТАРТ»** | PRESS START |

---

## 5.6 Menus & Settings

Settings header **«НАСТРОЙКИ»** (SETTINGS); identical from title and pause. Category headers are Russian caps; every row shows its value in Russian.

- **«ЗВУК»** (AUDIO) — «ОБЩАЯ ГРОМКОСТЬ» (Master) / «МУЗЫКА» (Music) / «ЭФФЕКТЫ» (SFX) / «ГОЛОС» (Voice), 0–10 sliders, each step audibly previewed.
- **«ЭКРАН»** (VIDEO) — «МАСШТАБ» (Scale: «ЦЕЛЫЙ» Integer / «ПО ЭКРАНУ» Fit), **«ЭФФЕКТ CRT»** (CRT filter: «ВЫКЛ» / «СКАНЛАЙНЫ» / «ПОЛНЫЙ CRT»), «ТРЯСКА ЭКРАНА» (Screen shake: «ВЫКЛ / 50 % / 100 %»), **«МЕНЬШЕ ВСПЫШЕК»** (Flash reduction — caps full-screen flashes at 25 % opacity, ≥ 200 ms apart), «ПОКАЗЫВАТЬ FPS».
- **«УПРАВЛЕНИЕ»** (CONTROLS) — **«ПЕРЕНАЗНАЧИТЬ (ИГРОК 1)»** (Remap P1: all actions, gamepad + keyboard, live conflict detection, «СБРОСИТЬ» (RESET) on a 600 ms hold), «МЁРТВАЯ ЗОНА СТИКА» 0–30 %, «СЕНСОРНОЕ УПРАВЛЕНИЕ» (Touch layout: «СПРАВА» / **«ЗЕРКАЛЬНО (ЛЕВША)»** / «РАЗМЕР 80–130 %»), **«ВИБРАЦИЯ»** («ВЫКЛ / СЛАБАЯ / ПОЛНАЯ»), «ПОМОЩЬ С УКЭМИ» (auto-ukemi assist: «ВЫКЛ / ВКЛ» — widens window 240 → 400 ms).
- **«ДОСТУПНОСТЬ»** (ACCESSIBILITY) — **«МЕНЬШЕ ДВИЖЕНИЯ»** (Reduced motion), **«ВСПЫШКА ДЛЯ ДАЛЬТОНИКОВ»** (Colorblind-safe hit flash — replaces the red flash with white + a 2 px outline pulse; palettes «ДЕЙТАН / ПРОТАН / ТРИТАН»), «ЗАХВАТ: УДЕРЖАНИЕ / ПЕРЕКЛЮЧЕНИЕ» (hold vs toggle grip), «ПОДСКАЗКИ» (Hints: «ОДИН РАЗ / ВСЕГДА / ВЫКЛ»), «РАЗМЕР СУБТИТРОВ» (S/M/L — L is mandatory-tested, since Russian subtitles are the longest strings in the build).
- **«ЯЗЫК»** (LANGUAGE) — **«РУССКИЙ» (default, primary, fully localized)** / **«ENGLISH» (stub)**. All strings route through the string table from day one; **RU is the reference string and EN is budgeted at 0.9× RU width**. Language switch is live (no restart) and re-lays out menus on the next frame.
- **«ДАННЫЕ»** (DATA) — save-slot management, **«СТЕРЕТЬ СЛОТ»** (ERASE SLOT, 600 ms hold).

**Save slots:** 3, header **«ВЫБЕРИ СЛОТ»** (CHOOSE SLOT), shown as arcade-cabinet marquee cards with fighter portraits and: «МИР 2-3» (world progress), «ИППОНОВ: 214», «ВРЕМЯ: 3:42», «ЛУЧШИЙ РАНГ: S». Empty slot reads **«ПУСТО»** (EMPTY). Autosave on every level complete and every map-node entry; save icon at 464,258 spins 600 ms with the tooltip **«СОХРАНЕНИЕ»** (SAVING).

**APK vs browser:**

| Concern | Browser | APK (WebView) |
|---|---|---|
| Fullscreen | `requestFullscreen()` on first user gesture; corner prompt **«ВО ВЕСЬ ЭКРАН»** (FULLSCREEN) if declined | Immersive sticky by default, no prompt |
| Back button | — | In gameplay → `PAUSE`; in a menu → up one level; at title → 600 ms hold-to-exit toast **«УДЕРЖИ, ЧТОБЫ ВЫЙТИ»** (HOLD TO EXIT); single press ignored |
| Resize / address bar | Listen to `visualViewport.resize` + `scroll`; recompute canvas from `visualViewport.width/height/scale` (never `window.innerHeight`); debounce 120 ms; re-lock integer scale after | Fixed viewport, one resize on orientation |
| URL-bar collapse jump | `interactive-widget=resizes-content` in the viewport meta + canvas positioned from `visualViewport.offsetTop`, so touch controls never drift | n/a |
| Audio unlock | Resume `AudioContext` on first pointerdown/keydown; the title screen doubles as the unlock gesture | Same, but silent mode respected |
| Fonts | Cyrillic pixel fonts embedded as bitmap atlases (no webfont fetch, no FOUT, no CDN dependency) | Same atlases bundled in the APK |
| Persistence | `localStorage` + IndexedDB blob for slots | Same + optional file-backed backup |

---

## 5.7 Results / Rank Ceremony — «РЕЗУЛЬТАТ»

Total ~7.2 s if unskipped. Every beat accepts a skip that **completes that beat instantly and moves to the next** (never jumps to the end).

| t (ms) | Beat |
|---|---|
| 0 | Freeze frame of the final blow; desaturate to 20 % over 200 ms |
| 200 | Wipe to results board (300 ms); crowd ambience fades in |
| 500 | **«УРОВЕНЬ ПРОЙДЕН»** (STAGE CLEAR) slams in at 240,44, scale 2.5 → 1.0 over 180 ms, 1 px shake |
| 900 | Row 1 **«ОЧКИ»** (SCORE) counts up, 40 ms per tick, tick SFX every 3rd tick, max 1400 ms |
| 2300 | Row 2 **«РАЗНООБРАЗИЕ БРОСКОВ ×N/5»** (THROW VARIETY) — each unique throw icon stamps in 90 ms apart with a gold flash; bonus value counts up 500 ms |
| 3100 | Row 3 **«ИППОНОВ»** (IPPONS) — counts up 400 ms (plural forms per §5.4.3) |
| 3500 | Row 4 **«ВРЕМЯ»** (TIME) and Row 5 **«БЕЗ УРОНА»** (NO-DAMAGE BONUS) — 300 ms each, staggered 150 ms |
| 4100 | **«ИТОГО»** (TOTAL) line sweeps in from the left, 250 ms, with a rising whoosh |
| 4500 | 400 ms silence (the tension beat — do not fill it) |
| 4900 | **RANK STAMP:** letter drops from scale 6.0 → 1.0 over 140 ms with 12 % overshoot, lands at 240,150; label above reads **«РАНГ»** (RANK) |
| 5040 | Impact: 3-frame screen shake 3 px, 120 ms hit-stop, dust ring VFX, ink-splat mask reveal, haptic 70 ms |
| 5200 | S-rank only: gold particle burst + 900 ms fanfare + 200 ms victory-pose portrait swap, banner **«ИППОН! ИДЕАЛЬНО»** (IPPON! PERFECT) |
| 5600 | Options fade in at y=210: **«[A] ДАЛЬШЕ»** (NEXT) / **«[X] ЗАНОВО»** (RETRY) / **«[B] КАРТА»** (MAP) |
| 5600+ | Rank letter idles with a 2 s breathing scale of ±1.5 % |

**Rank letters:** C / B / A / S are kept as **Latin letters** — they are a globally-read arcade convention, they are visually distinct at 48 px, and the Cyrillic С/В/А collide with them in shape and meaning. The word next to them is Russian («РАНГ»), the letter is not localized. This is a deliberate, one-off exception to the RU-only rule and is documented in the string table as `LOCKED_GLYPH`.

**Rank thresholds:** C = clear; B = ≥ 60 % score par; A = ≥ 85 % par + ≥ 3 throw varieties; **S** = ≥ 100 % par + all 5 varieties + no continues.

**Boss-defeat slow-mo ceremony** (precedes results on boss levels):

1. Final throw connects → time scale 1.0 → **0.15** over 120 ms, hold 900 ms.
2. Camera pushes in 1.2× toward the impact point over the same 900 ms; CRT bloom +30 %.
3. Music cuts to a single held note; 2-frame white flash on the boss's ground contact.
4. **«ИППОН!»** stamps at 240,110 for 700 ms; boss sprite flashes white 4× at 12 Hz, then dissolves into 24 pixel shards over 600 ms.
5. Time scale returns to 1.0 over 200 ms; hero holds a 700 ms victory pose while the crowd sample plays.
6. 500 ms → `RESULTS`.

---

## 5.8 Accessibility & Feel Checklist (QA, every milestone)

1. **Touch-to-action latency ≤ 50 ms** measured pointerdown → first animation frame; gamepad ≤ 33 ms (2 frames); keyboard ≤ 33 ms. Measured on the lowest-spec target device, not desktop.
2. **Input buffering verified**: jump, grip, and throw inputs pressed up to 200 ms before their valid window still register.
3. **Every screen exits with one input** — audited state by state against §5.2, including all nested settings pages.
4. **Full remap works** for gamepad and keyboard, conflicts are detected and blocked, `«СБРОСИТЬ»` restores exactly the §5.3 tables, and key-cap glyphs render correctly on the ЙЦУКЕН layout.
5. **One-handed touch viability**: all of W1L1 and one arena completable with the left-handed mirror layout on a 6.1" device; no control needs a second hand or a reach beyond a 72 mm thumb arc.
6. **All touch targets ≥ 72 px** including invisible padding; verified at 80 % and 130 % touch scale.
7. **Contrast**: all HUD text and bars ≥ 4.5:1 against the worst-case background frame of each world (one bright and one dark frame per level).
8. **Colorblind-safe hit feedback**: with each of the 3 palettes, damage, guard-break, and grip states are distinguishable without hue (shape / outline / flash-duration cues verified).
9. **Reduced motion**: disables screen shake, camera push-in, parallax jitter, rank-stamp overshoot, and caps flashes at 25 % / ≥ 200 ms apart — the game stays fully readable and winnable.
10. **No flashing above 3 Hz** anywhere with flash reduction OFF; verified by an automated frame-luminance-delta pass across attract, ИППОН, boss defeat, and results.
11. **Audio-free playability**: every mechanic-critical audio cue (grip connect, guard break, boss tell, meter full) has a visual twin; the game is completable at 0 % volume.
12. **Resize/rotation resilience**: address-bar collapse, on-screen keyboard, orientation change, and the APK back button never corrupt canvas scale, never lose input focus, never push touch controls outside the safe area. Verified via `visualViewport` on iOS Safari, Chrome Android, and the WebView APK.
13. **Cyrillic integrity pass** *(new, blocking)*: every font renders А–Я, а–я, **Ё/ё**, and «guillemets» with no missing-glyph boxes at every scale factor; no Russian string overflows, clips, or wraps in any HUD box, menu row, results row, or touch tooltip; RU→EN language switch re-lays out with no clipping in either direction.
14. *(Standing check)* **Zero text walls**: no on-screen instructional string exceeds **3 Russian words** outside the settings menu, subtitles, and the end-of-level chalkboard.
