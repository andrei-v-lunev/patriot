# AUDIO GENERATION TASK — «ПАТРИОТ» (THE PATRIOT)

**Deliverable:** the complete audio package (music, SFX, voice) for a browser-based canvas judo beat-em-up. This document is self-contained — everything needed to produce every file is below. No access to the game's design docs is required or assumed.

---

## 1. Project Context & Hard Style Rules

**The game:** «ПАТРИОТ» is a Russian-language 2-player belt-scroll beat-em-up in a 16-bit SNES arcade style (Turtles in Time / Aladdin-SNES era). Two judo coaches from a mountain village in Dagestan — **Idris** (40, head coach) and **Otajon** (25, assistant) — travel through 5 worlds (dawn village → daytime bazaar → night train → rainy port → Las Vegas-style casino-arena) to recover their club's stolen championship belt and 30 student medals from a pay-per-view fight syndicate. No blood, no weapons; enemies are thrown with real judo throws and bounce comically.

**Audio direction statement (canon):** *THE PATRIOT sounds like a 1993 arcade cabinet that somehow got shipped to a mountain village in Dagestan.*

### Hard style rules — every music track

1. **The spine is 16-bit arcade funk:** slap bass, gated snares, breakbeat loops, brass stabs, DX-style electric piano.
2. **The lead voice is Caucasus folk** (never decoration): lezginka's driving 6/8 pulse, doli hand-drum and hand-clap patterns, garmon accordion riffs, zurna for piercing melodic leads.
3. **Fusion rule:** the groove is American funk, the melody is Caucasian. Too "generic retro-game"? Push accordion/zurna forward, let the lezginka clap pattern drive. Too "folk recording"? Add slap bass and a gated snare.
4. **Bosses break the contract deliberately:** 90s action-movie synth-metal (palm-muted saw guitar, orchestra-hit stabs, minor-key arpeggios) — the villains are outsiders with no folk DNA. Only the final boss's second half reclaims the lezginka motif.
5. **Motif discipline — "the Patriot cell":** one 5-note melodic cell appears in exactly these places: title theme, W1 theme, victory jingle, final boss B-section, W5 arena intro, and credits. Nowhere else.
6. **Era register:** 1993. Sample-based/FM timbres, gated reverb, orchestra hits. Nothing that sounds post-2000 (no modern EDM sound design, no supersaws, no trap hats).

### Hard style rules — voice

- **Every spoken line is Russian.** Russian is the source language, not a translation. English never appears in audio.
- **Exception:** judo referee vocabulary stays Japanese in its standard Russian-judo transliteration (иппон, ваза-ари, осаэкоми, токэта, матэ, сорэ-мадэ, хадзимэ) — exactly as a real referee in Makhachkala says it.
- No comedy accents, no stereotyped "mountain" speech. Clean, confident, natural Russian.

### Mix targets (per bus)

| Bus | Loudness | Ceiling | Notes |
|---|---|---|---|
| Music | −16 LUFS integrated | −1.0 dBTP | Plus a permanent −3 dB shelf @ 200–450 Hz (carves room for slam SFX) |
| SFX | −14 LUFS integrated | −1.0 dBTP | Must read over music without limiting |
| Announcer VO | −12 LUFS integrated | −1.0 dBTP | Loudest element in the game, by design |
| Character VO | −14 LUFS integrated | −1.0 dBTP | |
| Ambience loops | −24 LUFS | −1.0 dBTP | Bed only |

Normalize every clip on a bus to the same **integrated** target (not peak) — otherwise short grunts vanish under long lines. Ducking/sidechain is implemented in-engine; deliver files unducked.

### Delivery formats (all deliverables)

- **Game files:** OGG Vorbis **and** M4A/AAC fallback (Safari) — every file ships in both formats, same basename. Server MIME support: `.ogg`, `.m4a`, `.mp3` (use ogg+m4a).
- **Sample rate:** 48 kHz source; encode at 48 kHz (44.1 acceptable if the pipeline requires).
- **Master archive:** 48 kHz / 24-bit WAV, one file per asset, named by asset ID.
- **Music stems:** stereo OGG ~q3–q5 (≤ 500 KB per stem, ≤ 1 MB per track). Encode stems mono where the source allows (drums stems are near-mono) — engine pans in WebAudio.
- **SFX:** OGG q5 mono unless inherently stereo (ambience loops may be stereo).
- **VO:** OGG q4 **mono** + M4A/AAC 96 kbps mono. Announcer set ≤ 1 MB total; each character set ≤ 400 KB.
- **Loop points:** every looping music file is a single buffer containing intro + loop; deliver explicit `loopStart` / `loopEnd` in **seconds** per file (derived from bar/BPM at export, not guessed). Both stems of one track must have **identical** length, sample rate, and loop points. Do NOT ship separate intro files.
- **VO trimming:** ≤ 30 ms silence head, ≤ 80 ms tail.

---

## 2. Music Deliverables (16 tracks)

Every track ships as **two stems** — `base` (harmony, bass, melody, pads) and `drums` (kit, claps, doli, percussion fills) — except `mus_victory` and `mus_gameover`, which are single mono one-shot/loop files (no drums stem).

**File paths** (proposed scheme — see §5 for manifest wiring): `assets/audio/music/<track_id>_base.ogg` + `_drums.ogg` (+ `.m4a` twins). Single-stem tracks: `assets/audio/music/<track_id>.ogg`.

| # | Track ID | Intent | BPM | Key feel | Structure | Length |
|---|---|---|---|---|---|---|
| 01 | `mus_title` | Attract/title. The mission statement. Contains the Patriot cell. | 132 | D minor, heroic | 8-bar intro → 64-bar loop | 1:50 |
| 02 | `mus_select` | Character select. Short, cocky, loops fast. | 138 | D dorian | 4-bar intro → 16-bar loop | 0:45 |
| 03 | `mus_map` | World map / between-stage. Warm, breathing. | 96 | F major | 4-bar intro → 32-bar loop | 1:10 |
| 04 | `mus_w1_village` | W1 dawn village & gym. Sunrise, discipline. Patriot cell. | 124 | A minor → A dorian | 8-bar intro (solo accordion) → 48-bar loop | 1:40 |
| 05 | `mus_w2_bazaar` | W2 bazaar & rooftops. Busy, mischievous, fast. | 142 | E phrygian dominant | no intro → 48-bar loop | 1:35 |
| 06 | `mus_w3_train_int` | W3 train interior. Tight, mechanical, claustrophobic. | 130 | C minor | 8-bar intro → 40-bar loop (first beat lands on a rail-clack accent) | 1:30 |
| 07 | `mus_w3_train_roof` | W3 roof chase. Wide open, wind, urgency. Crossfades from 06 in-engine. | 150 | C minor | no intro → 32-bar loop | 1:15 |
| 08 | `mus_w4_port` | W4 rainy port & cargo ship. Heavy, grey, determined. | 118 | G minor | 8-bar intro (atmosphere + bass) → 48-bar loop | 1:45 |
| 09 | `mus_w5_casino` | W5 casino floor. Sleazy, glittering, wrong. Funk clavinet, tacky synth brass, chromatic bass, faint accordion ghost motif. | 126 | B♭ minor, chromatic | 4-bar intro → 32-bar loop (no arpeggio stutter at loop point) | 1:20 |
| 10 | `mus_w5_arena` | W5 neon arena. Everything at once. Peak track. | 146 | D minor (Patriot cell) | 8-bar intro (cell on solo zurna) → 56-bar loop | 1:50 |
| 11 | `mus_boss_mid` | Shared bosses 1–4. Synth-metal menace. | 158 | F# minor | 4-bar riser intro → 32-bar loop | 1:10 |
| 12 | `mus_boss_final` | Final boss, 2-part: synth-metal menace → lezginka reclamation (accordion/zurna take the melody, triumphant minor). One file, **two loop regions**: A-loop (bars 5–36), B-loop (bars 37–68); engine jumps A→B on boss phase 2. | 152 | F# minor → D minor | intro → A-loop 32 → B-loop 32 | 2:20 |
| 13 | `mus_victory` | Stage clear fanfare. Patriot cell, triumphant. Brass + accordion flourish + claps. | 132 | D major | **one-shot**, no loop, exactly 9.0 s clean tail | 0:09 |
| 14 | `mus_gameover` | Game over / continue. Lone accordion, sparse bass, soft timpani. Defeated but dignified. Must survive looping through a 10 s countdown. | 84 | D minor | 2-bar intro → 16-bar loop | 0:40 |
| 15 | `mus_results` | Score tally. Bouncy, keeps energy up. Must **not** build (tally length varies). | 120 | F major | 2-bar intro → 16-bar loop | 0:35 |
| 16 | `mus_credits` | Credits. Full Patriot cell arrangement, unhurried. | 108 | D major | 8-bar intro → 64-bar loop | 2:30 |

### Title-track vocal hook (the only track with lyrics)

`mus_title` carries a 4-line **Russian chant hook**, shouted crowd-style (a room of men, not a singer), no melody, over bars 17–24:

```
СТОЙ — КАК ГОРА!
ДЕРЖИ — КАК ЗИМА!
БРОСАЙ — И ТЕБЯ ЗАПОМНЯТ!
ПА — ТРИ — ОТ!
```

All other tracks are instrumental.

### Stem behavior (informs how you split)

- **Level themes (04–10):** `base` = accordion/zurna melody + slap bass + pads **plus a baked-in skeleton kick/hat pattern** (so low-combo play never goes rhythm-silent); `drums` = full breakbeat kit + claps + doli. Engine rides drums gain 0.35 → 1.0 with the player's combo.
- **Boss themes (11, 12):** `drums` additionally carries double-kick and crash accents; gain driven by boss HP.
- **Title/select/map/results/credits:** stems exist for format consistency only; content split is free, drums gain is fixed at 1.0.
- **Victory/game over:** single mono file each, no stems.

### Suno-style generation prompts (if using generative tools)

Style prompts in **English** (generative style parsers degrade on Russian); lyrics in **Russian**. Generate ≥4 takes per track — the funk+lezginka fusion succeeds ~1 in 3. Generated audio is never loop-ready: time-stretch to target BPM in a DAW, then cut loops on bar lines with 20–30 ms crossfades.

- **01 `mus_title`:** `1993 SNES arcade beat-em-up main theme, funky breakbeat, slap bass, heroic brass stabs, lezginka accordion riff, zurna lead, hand-clap percussion, gated snare, 132 BPM, D minor, triumphant and nostalgic, anthemic` — lyrics field: the Russian chant above.
- **02 `mus_select`:** `short 16-bit arcade character select theme, punchy funk breakbeat, slap bass riff, accordion stab, hand claps, confident and looping, 138 BPM, D dorian, instrumental`
- **03 `mus_map`:** `relaxed 16-bit adventure map theme, warm accordion melody, soft finger-snap and shaker percussion, mellow electric piano, gentle funk bass, mountain folk flavor, 96 BPM, F major, hopeful and calm, instrumental`
- **04 `mus_w1_village`:** `16-bit arcade beat-em-up stage theme, sunrise mood, solo garmon accordion opening into funky breakbeat, doli drum lezginka pattern, slap bass, warm brass pads, zurna melody, 124 BPM, A minor to A dorian, proud and awakening, instrumental`
- **05 `mus_w2_bazaar`:** `fast 16-bit arcade stage theme, busy marketplace energy, hand claps and tambourine, darbuka and doli, rapid accordion riff, funk slap bass, wah guitar, Phrygian dominant scale, 142 BPM, E, mischievous and frantic, instrumental`
- **06 `mus_w3_train_int`:** `16-bit arcade stage theme, mechanical train rhythm, tight muted funk guitar, dark slap bass, industrial percussion mixed with doli hand drums, minor accordion motif, 130 BPM, C minor, tense and claustrophobic, instrumental`
- **07 `mus_w3_train_roof`:** `high speed 16-bit chase theme, driving breakbeat, urgent zurna lead, wind and open air, aggressive slap bass, orchestra hit stabs, 150 BPM, C minor, breathless and dangerous, instrumental`
- **08 `mus_w4_port`:** `heavy 16-bit arcade stage theme, rain and steel atmosphere, slow grinding funk groove, deep sub bass, minor-key accordion drone, metallic percussion hits, distant brass, 118 BPM, G minor, grim and determined, instrumental`
- **09 `mus_w5_casino`:** `sleazy 90s arcade casino theme, funk clavinet, tacky synth brass, disco hi-hats, chromatic descending bass, neon glitz, faint accordion ghost motif, 126 BPM, B-flat minor, decadent and menacing, instrumental`
- **10 `mus_w5_arena`:** `epic 16-bit arcade final stage theme, full lezginka breakbeat fusion, zurna and accordion in unison lead, huge brass stabs, slap bass, hand claps, crowd energy, heroic and overwhelming, 146 BPM, D minor, instrumental`
- **11 `mus_boss_mid`:** `90s action movie synth metal boss battle, palm-muted distorted guitar, aggressive synth brass, orchestra hits, double kick drums, dark arpeggiated synth, 158 BPM, F-sharp minor, threatening and relentless, instrumental`
- **12 `mus_boss_final`:** `two part final boss theme, part one 90s synth metal with distorted guitar orchestra hits and double kick, part two same tempo but lezginka accordion and zurna take over the melody in triumphant minor, 152 BPM, F-sharp minor into D minor, epic and defiant, instrumental`
- **13 `mus_victory`:** `short triumphant 16-bit arcade victory fanfare, brass stabs and accordion flourish, hand claps, 132 BPM, D major, 8 seconds, instrumental`
- **14 `mus_gameover`:** `slow melancholy 16-bit game over theme, lone accordion, sparse bass, soft timpani, 84 BPM, D minor, defeated but dignified, instrumental`
- **15 `mus_results`:** `upbeat short 16-bit results screen theme, bouncy funk bass, finger snaps, cheerful accordion, 120 BPM, F major, light and satisfying, instrumental`
- **16 `mus_credits`:** `end credits theme, unhurried 16-bit arrangement, full accordion and zurna melody with warm brass, gentle funk groove, hand claps, nostalgic and proud, 108 BPM, D major, instrumental`

---

## 3. SFX Deliverables (45 entries, ~60 files)

Path scheme: `assets/audio/sfx/<name>.ogg` + `.m4a`. Round-robin variants get suffixes `_a/_b/_c/_d`. All mono OGG q5 (ambience loops may be stereo), −14 LUFS integrated (−24 LUFS for `sfx_amb_*` loops), −1 dBTP. Priority: **P0** = ship-blocking, **P1** = vertical slice, **P2** = polish.

| # | ID | Description | Length | Pri |
|---|---|---|---|---|
| 1 | `sfx_grip_snap` | Gi fabric snap — the moment of kumi-kata. Signature sound of the game. | 0.25 s | P0 |
| 2 | `sfx_grip_fail` | Dull cloth brush, grip slips off | 0.20 s | P1 |
| 3 | `sfx_throw_whoosh_lt` | Light throw arc — cloth + air | 0.35 s | P0 |
| 4 | `sfx_throw_whoosh_hv` | Heavy throw arc — deeper, longer, doppler | 0.55 s | P0 |
| 5 | `sfx_slam_light` | Tatami slam, light body | 0.60 s | P0 |
| 6 | `sfx_slam_medium` | Tatami slam, standard enemy — the workhorse | 0.75 s | P0 |
| 7 | `sfx_slam_heavy` | Tatami slam, big enemy/boss. Sub-heavy, room tail. | 1.10 s | P0 |
| 8 | `sfx_slam_surface_stone` | Slam variant on bazaar stone — brighter, gritty | 0.80 s | P1 |
| 9 | `sfx_slam_surface_metal` | Slam variant on train/ship metal — clang + ring | 1.00 s | P1 |
| 10 | `sfx_body_thud_a/b/c` | Body-hit thuds, 3 round-robin variants | 0.20 s ea | P0 |
| 11 | `sfx_ippon_stinger` | Orchestral hit + gong + white-noise sweep. THE moment. | 1.60 s | P0 |
| 12 | `sfx_wazaari_stinger` | Smaller cousin — brass stab only | 0.70 s | P1 |
| 13 | `sfx_ukemi_roll` | Breakfall slap + roll on mat | 0.55 s | P0 |
| 14 | `sfx_enemy_ko` | Enemy defeat: thud + short comic descending tone | 0.70 s | P0 |
| 15 | `sfx_enemy_alert` | Enemy notices player — short grunt/whistle | 0.30 s | P1 |
| 16 | `sfx_melon_whoosh` | Heavy lobbed melon cutting the air | 0.25 s | P1 |
| 17 | `sfx_melon_splat` | Melon bursting on impact, wet and comedic | 0.40 s | P2 |
| 18 | `sfx_step_dojo_a–d` | Bare foot on tatami, ×4 round-robin | 0.15 s ea | P0 |
| 19 | `sfx_step_stone_a–d` | Boot on bazaar stone/cobble, ×4 | 0.15 s ea | P0 |
| 20 | `sfx_step_wood_a–d` | Boot on rooftop planking, ×4 | 0.15 s ea | P1 |
| 21 | `sfx_step_metal_a–d` | Boot on train car metal, slight ring, ×4 | 0.15 s ea | P0 |
| 22 | `sfx_step_shipdeck_a–d` | Wet boot on ship deck, slight squelch, ×4 | 0.15 s ea | P1 |
| 23 | `sfx_step_casino_a–d` | Boot on polished casino floor, reverberant, ×4 | 0.15 s ea | P1 |
| 24 | `sfx_jump` | Cloth rustle + effort exhale (non-verbal) | 0.30 s | P0 |
| 25 | `sfx_land` | Landing scuff, surface-agnostic | 0.25 s | P0 |
| 26 | `sfx_amb_crowd_loop` | W5 arena crowd bed, **seamless loop** | 12 s | P0 |
| 27 | `sfx_crowd_cheer_burst` | Crowd reaction on IPPON | 2.5 s | P0 |
| 28 | `sfx_crowd_boo` | Crowd reaction on player hit taken | 1.8 s | P2 |
| 29 | `sfx_amb_train_loop` | W3 rail clack + carriage rumble, seamless | 10 s | P0 |
| 30 | `sfx_train_horn` | Distant train horn, one-shot | 2.2 s | P2 |
| 31 | `sfx_amb_rain_loop` | W4 rain on metal and water, seamless | 12 s | P0 |
| 32 | `sfx_amb_gulls` | Sparse gull calls, W4, seamless | 8 s | P2 |
| 33 | `sfx_amb_bazaar_walla` | W2 indistinct market chatter, **no real words**, seamless | 14 s | P1 |
| 34 | `sfx_amb_wind_mountain` | W1 dawn wind, thin and cold, seamless | 10 s | P1 |
| 35 | `sfx_ui_move` | Menu cursor move — short blip | 0.08 s | P0 |
| 36 | `sfx_ui_confirm` | Menu confirm — bright two-tone | 0.20 s | P0 |
| 37 | `sfx_ui_deny` | Menu deny — low buzz | 0.20 s | P0 |
| 38 | `sfx_ui_pause` | Pause engage (engine reverses it for disengage) | 0.30 s | P0 |
| 39 | `sfx_coin` | Score pickup — classic arcade coin ping | 0.25 s | P0 |
| 40 | `sfx_score_tick` | Results tally tick (engine pitches up on chain) | 0.06 s | P1 |
| 41 | `sfx_countdown_beep` | Continue countdown beep | 0.15 s | P0 |
| 42 | `sfx_countdown_final` | 0-second expiry tone | 0.60 s | P1 |
| 43 | `sfx_powerup` | Health/item pickup, warm rising arpeggio | 0.50 s | P1 |
| 44 | `sfx_hero_hurt` | Impact on player — dull thud + breath | 0.35 s | P0 |
| 45 | `sfx_stage_clear_whoosh` | Screen wipe transition | 0.80 s | P1 |

Round-robin sets must be genuinely distinct takes — the engine never plays the same variant twice consecutively.

---

## 4. Voice Deliverables

Path scheme: `assets/audio/vo/<id>.ogg` + `.m4a`, mono. Master archive: 48 kHz / 24-bit WAV per line, named by ID.

**Production route A (strongly preferred):** record real people — the actual coach voices Idris, a younger club member voices Otajon, the most theatrical club member voices the announcer. Slight amateurism *is* the 90s arcade texture. SM58-class dynamic mic, pop filter, ~15 cm off-axis, 48 kHz/24-bit, quiet soft-surfaced room. 3 takes per line minimum + one deliberately over-the-top take of every announcer line (usually the keeper). Record grunts last, warmed up and slightly tired — real exertion. Get written releases before the session.

**Route B (fallback / temp):** Russian-capable TTS, male low register, processed hard (chain below). Feed judo terms phonetically (хад-зи-мэ́, ва-за-á-ри, о-са-э-кó-ми) and audition each. **Never TTS grunts** — source non-verbal exertion from a royalty-free effort library.

**Processing chain (both routes — this makes it sound like 1993):**
1. High-pass @ 100 Hz → de-ess → compress 4:1, ~6 dB gain reduction.
2. Announcer only: mild saturation/bitcrush to ~12-bit, then short bright plate reverb (1.2 s, pre-delay 20 ms, high-passed @ 400 Hz).
3. Character barks: **no reverb** — dry and close.
4. Normalize per bus to integrated LUFS target; trim silence ≤ 30 ms head / ≤ 80 ms tail.

### 4.1 Announcer (18 lines)

**Voice direction:** deep, over-processed 1990s arcade announcer — but Russian. A sports commentator with a cigarette voice pushed through plate reverb and a touch of distortion. Always the loudest element in the game (−12 LUFS).

**Judo-correctness (non-negotiable):** use the standard Russian-judo transliterations exactly as written. Stress marks: иппО́н, ваза-áри, осаэкóми, хадзимэ́, сорэ-мáдэ. Wrong stress is more noticeable than a wrong vowel.

| ID | Russian line (exact) | EN gloss | Trigger / delivery |
|---|---|---|---|
| `vo_ann_round1` | «РАУНД ПЕРВЫЙ… ХАДЗИМЭ!» | Round one… begin! | Stage start |
| `vo_ann_round2` | «РАУНД ВТОРОЙ… ХАДЗИМЭ!» | Round two… begin! | Stage 2 of a world |
| `vo_ann_final` | «ФИНАЛЬНЫЙ РАУНД… ХАДЗИМЭ!» | Final round… begin! | W5 arena |
| `vo_ann_ippon` | «ИППОН!» | Full point | Clean full-point throw. Maximum conviction — this is *earned*. |
| `vo_ann_wazaari` | «ВАЗА-АРИ!» | Half point | Partial throw |
| `vo_ann_osaekomi` | «ОСАЭКОМИ!» | Hold is on! | Pin begins |
| `vo_ann_toketa` | «ТОКЭТА!» | Hold broken! | Enemy escapes pin |
| `vo_ann_matte` | «МАТЭ!» | Wait! | Pause menu |
| `vo_ann_soremade` | «СОРЭ-МАДЭ!» | That is all. | Stage cleared |
| `vo_ann_ko` | «НОКАУТ!» | Knockout! | Defeat by damage (not a throw) |
| `vo_ann_perfect` | «БЕЗУПРЕЧНО!» | Flawless! | Zero-damage stage clear (see §6 gap note) |
| `vo_ann_continue` | «ПРОДОЛЖИТЬ?» | Continue? | Game over. Rising intonation, slightly taunting. |
| `vo_ann_timeup` | «ВРЕМЯ ВЫШЛО!» | Time's up! | Timed section expires |
| `vo_ann_newrecord` | «НОВЫЙ РЕКОРД!» | New record! | High score beaten |
| `vo_ann_ready` | «ПРИГОТОВИТЬСЯ!» | Get ready! | 2 s before hajime |
| `vo_ann_boss` | «ОСТОРОЖНО — ОН ОПАСЕН!» | Careful — he's dangerous! | Boss entrance. Deliberately cheesy 90s commentary. |
| `vo_ann_offtrain` | «С ПОЕЗДА!» | Off the train! | Player falls off the W3 train (engine event `off_train`) |
| `vo_ann_ippon_gachi` | «ИППОН-ГАТИ!» | Win by ippon! | Boss defeated by full-point throw. **Optional, P2** — deep cut for judoka. |

### 4.2 Idris — hero barks (15 clips)

**Voice direction:** 40-year-old head coach from Dagestan. Low, calm, economical, warm gravitas. He does not celebrate; he *assesses*. Uses four words where six are available. Dry, deadpan. Clean natural Russian, no accent-play.

| ID | Type | Russian line (exact) | EN gloss | Trigger |
|---|---|---|---|---|
| `vo_idris_effort_a/b/c` | Grunt | — non-verbal | — | Any throw (3 variants) |
| `vo_idris_effort_heavy_a/b` | Deep grunt | — non-verbal | — | Heavy throw (2 variants) |
| `vo_idris_hurt_a/b` | Pain | — non-verbal | — | Damage taken (2 variants) |
| `vo_idris_down` | Long exhale | — non-verbal | — | Player KO'd |
| `vo_idris_breath_a/b` | Recovery breath | — non-verbal | — | Low-health idle (2 variants) |
| `vo_idris_kiai` | Kiai shout | «ХА!» | sharp kiai | Combo ≥ 5 |
| `vo_idris_quip_ippon` | Quip | «Чисто.» | Clean. | On IPPON |
| `vo_idris_quip_boss` | Quip | «Сядь.» | Sit down. | Boss defeated |
| `vo_idris_quip_stage` | Quip | «Дальше.» | Next. | Stage clear |
| `vo_idris_quip_grip` | Quip | «Взял.» | Got him. | First grip of a fight |

### 4.3 Otajon — hero barks (13 clips)

**Voice direction:** 25-year-old assistant coach, Idris's former student. Lighter, younger, louder, delighted by everything — chronic optimist who narrates his own fights. Fast and warm. His enthusiasm reads as *confidence*, never clumsiness.

| ID | Type | Russian line (exact) | EN gloss | Trigger |
|---|---|---|---|---|
| `vo_ota_effort_a/b/c` | Higher grunt | — non-verbal | — | Any throw (3 variants) |
| `vo_ota_effort_heavy_a/b` | Strained grunt | — non-verbal | — | Heavy throw (2 variants) |
| `vo_ota_hurt_a/b` | Pain | — non-verbal | — | Damage taken (2 variants) |
| `vo_ota_down` | Yelp | — non-verbal | — | Player KO'd |
| `vo_ota_kiai` | Kiai shout | «ЭЙ-ЯХ!» | enthusiastic kiai | Combo ≥ 5 |
| `vo_ota_quip_ippon` | Quip | «Тренер, видел?!» | Coach, did you see that?! | On IPPON |
| `vo_ota_quip_boss` | Quip | «Вот так и надо!» | That's how it's done! | Boss defeated |
| `vo_ota_quip_stage` | Quip | «Погнали!» | Let's go! | Stage clear |
| `vo_ota_quip_hurt` | Quip | «Ай, больно!» | Ow, that hurt! | 3rd consecutive hit |

**Session note:** the full set (18 announcer + 28 character clips) fits one 2-hour session with a break.

**Scope note:** cutscene dialogue, VS-card exchanges, and boss barks are on-screen **text only** in the current design — do not voice them. The only voiced content is this section's list plus the `mus_title` chant.

---

## 5. Delivery Instructions & Manifest Wiring

1. **Drop files under** `assets/audio/` (currently empty):
   - `assets/audio/music/` — all `mus_*` stems and one-shots
   - `assets/audio/sfx/` — all `sfx_*`
   - `assets/audio/vo/` — all `vo_*`
   - Every file in **both** `.ogg` and `.m4a` with identical basenames.
2. **Deliver a loop-point sheet** (JSON or CSV): for every looping music file, `{ id, loopStart_sec, loopEnd_sec, bpm, bars }` — plus for `mus_boss_final` both loop regions (A and B). These values go into `data/audio.json` verbatim.
3. **Update `data/audio.json`** (coordinate with the dev team — see gap notes in §6): the current manifest is a placeholder (oscillator beeps + dummy stems `audio/w1_base.ogg` … `w5_base.ogg`). The final manifest must map every track/SFX/VO ID above to its file path and, for music, its loop points. If the dev team keeps the `stems.w1…w5` key scheme, the world stems map as: w1→`mus_w1_village`, w2→`mus_w2_bazaar`, w3→`mus_w3_train_int` (+`mus_w3_train_roof` as a second entry), w4→`mus_w4_port`, w5→`mus_w5_casino` (+`mus_w5_arena`).
4. **Deliver the WAV master archive** separately (not into the repo) — one folder per category, files named by ID.
5. **Voice releases:** include signed one-line usage releases for every recorded speaker (game + marketing use).

### Acceptance criteria

- [ ] All 16 music tracks present, both formats; stem pairs sample-accurate in length and loop points; each track ≤ 1 MB (OGG, both stems combined).
- [ ] Loop test: every looping track plays 5+ minutes with no click, pop, or rhythmic hiccup at the loop point; both stems stay phase-locked when started together.
- [ ] `mus_boss_final` A→B jump lands musically on any bar boundary of the A-loop.
- [ ] `mus_victory` is exactly 9.0 s one-shot; `mus_gameover` loops cleanly through a 10 s countdown.
- [ ] The Patriot 5-note cell is audibly the same motif across title / W1 / victory / arena intro / final-boss B / credits.
- [ ] All 45 SFX entries (with all round-robin variants) present, both formats, on loudness target; ambience loops seamless; round-robin variants audibly distinct.
- [ ] All 46 VO clips present, both formats; announcer set ≤ 1 MB total, character sets ≤ 400 KB each; Russian text matches this document **exactly** (character-for-character, including «ёлочки» and dashes); judo-term stress correct per §4.1.
- [ ] Loudness verified per bus: music −16 LUFS / SFX −14 / announcer −12 / character VO −14 / ambience −24; everything ≤ −1.0 dBTP.
- [ ] Total decoded-in-flight budget respected: announcer ≤ 1 MB, music ≤ 1 MB/track, core SFX set ≤ 3 MB, world SFX set ≤ 1.5 MB.
- [ ] Loop-point sheet delivered and values verified against the files.
- [ ] No English anywhere in any audio file. No real-world brands, anthems, or recognizable sampled material (must be royalty-clear).

---

## 6. Known Gaps & Decisions Flagged for the Dev Team

*(For the receiving team's awareness — production can proceed; these affect manifest wiring, not asset content.)*

1. **`data/audio.json` is a placeholder.** It defines only 5 dummy stem pairs (`audio/w1_base.ogg`, 16 s loops) and 11 oscillator-beep events (`hit_light`, `throw_slam`, `grip`, `ippon`, `hajime`, `ukemi`, `wave_cleared`, `go`, `hurt`, `pickup`, `off_train`). The engine (`js/audio.js`) currently only beeps and plays oscillator drones — it will be rebuilt to load buffers, stems with loop points, and the event map in the design spec. Asset IDs/paths in this brief are therefore the source of truth; the manifest follows the assets, not vice versa.
2. **Event-name mismatch:** manifest events (`hit_light`, `throw_slam`…) differ from the design's event vocabulary (`grip.established`, `throw.impact`…) and from the `sfx_*` IDs. Mapping is an engine task.
3. **«БЕЗУПРЕЧНО!» vs «ИДЕАЛЬНО!»:** the audio spec's perfect-clear call is «БЕЗУПРЕЧНО!», but the shipped UI string and narrative spec use «ИДЕАЛЬНО!». This brief follows the audio spec; if the team unifies on «ИДЕАЛЬНО!», re-record `vo_ann_perfect` only (cheap — flag before the session and record both takes).
4. **`vo_ann_offtrain` is an addition:** the announcer call «С ПОЕЗДА!» is canon in the narrative/UI spec and the engine already emits `off_train`, but the audio spec's announcer list omitted it. Included above (line 17 of 18).
5. **W3 second track:** manifest has one `w3` stem slot but the design requires two W3 tracks (interior + roof) with a 1.5 s in-engine crossfade — manifest schema needs a second slot.
6. **No manifest slots yet** for boss music, jingles (victory/gameover/results/credits/title/select/map), SFX files, or VO — all new manifest entries.
