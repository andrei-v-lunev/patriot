# 6. Audio & Music

## 6.1 Audio Direction Statement

**THE PATRIOT sounds like a 1993 arcade cabinet that somehow got shipped to a mountain village in Dagestan.**

The spine is 16-bit arcade funk: slap bass, gated snares, breakbeat loops, brass stabs, DX-style electric piano — the Turtles in Time / Aladdin (SNES) energy band. Layered over that spine, never as decoration but as the *lead voice*, are Caucasus folk colors: lezginka's driving 6/8 pulse, doli hand-drum and hand-clap patterns, accordion (garmon) riffs, and zurna for piercing melodic leads.

The fusion rule: **the groove is American funk, the melody is Caucasian.** Whenever a track feels like generic retro-game music, the fix is to push accordion/zurna forward and let the lezginka clap pattern drive the bar. Whenever a track feels like a folk recording, the fix is to add slap bass and a gated snare.

Bosses break this contract deliberately: they lean 90s action-movie synth-metal (palm-muted saw guitar, orchestra-hit stabs, minor-key arpeggios) because the villains are *outsiders* — the promoter syndicate has no folk DNA. Only the final boss reclaims the lezginka motif, distorted, as the hero's theme fights back through the boss's music.

**Motif discipline.** One 5-note melodic cell ("the Patriot cell") appears in: title theme, W1 theme, victory jingle, final boss B-section, and credits. Everything else is free. This is what makes 16 tracks feel like one score.

### Mix Rules

| Target | Value | Notes |
|---|---|---|
| Music bus loudness | −16 LUFS integrated | Web playback standard; leaves headroom for SFX |
| SFX bus loudness | −14 LUFS integrated, −1 dBTP ceiling | SFX must read over music without limiting |
| Announcer bus | −12 LUFS, −1 dBTP | Loudest element in the game, by design |
| Ambience/crowd loops | −24 LUFS | Bed only; never competes |
| Master ceiling | −1.0 dBTP | Prevents OGG/M4A decode clipping |
| Music low-mid carve | −3 dB shelf @ 200–450 Hz | Permanent; makes room for slam/thud family |

**Ducking rules** (all on the music bus, implemented as gain automation, not a compressor):

| Trigger | Duck amount | Attack | Hold | Release |
|---|---|---|---|---|
| Heavy throw impact | −3 dB | 10 ms | 150 ms | 200 ms |
| IPPON stinger | −6 dB | 5 ms | 400 ms | 350 ms |
| Player death | −8 dB | 20 ms | 900 ms | 600 ms |
| Cutscene / dialogue | −8 dB | 200 ms | duration | 400 ms |
| Boss intro announcer | −6 dB | 50 ms | duration | 300 ms |

**Sidechain feel.** Beyond discrete ducks, the music bus runs a permanent light pump keyed to the *slam family* only (not footsteps, not UI): −2 dB, 120 ms release. This makes every throw feel like it physically knocks the wind out of the soundtrack. Critically, ducks do **not** stack — take the maximum active duck, never the sum, or a death during a combo mutes the score entirely.

**Ambience is never ducked.** Rain, train, crowd, and gulls stay at fixed level through everything. They are the world; the world doesn't flinch.

---

## 6.2 Music Track List

**14 tracks.** Justification for the key decisions:

- **W1, W2, W4 get one theme each.** They are single-mood worlds (dawn village, daytime bazaar, rainy port) traversed in 5–7 minutes. A second track would be heard for 90 seconds.
- **W3 and W5 get two.** W3 (night train) has a hard tonal break — interior car brawls vs. the roof chase — that a single loop cannot serve. W5 (casino-arena) has the pre-fight approach through the casino floor and then the arena finale; the arena is where the whole score pays off and deserves dedicated material.
- **Bosses: one shared mid-boss theme + one unique final boss theme.** Bosses 1–4 are all the same *kind* of antagonist (syndicate enforcers) and are fought for 60–120 seconds each. A shared theme with per-world instrumentation swaps (handled by stems, not new tracks) reads as intentional serialization, not cheapness. The final boss is the promoter himself and gets a fully unique 2-part track. This saves ~3 MB of budget and three composition passes.

Every track ships as **two stems**: `base` (harmony, bass, melody, ambience-of-the-mix) and `drums` (kit, claps, doli, percussion fills). Both stems are identical length, sample-rate, and loop points — they are started together on the same `AudioContext.currentTime` value.

| # | Track ID | Intent | BPM | Key feel | Structure | Length |
|---|---|---|---|---|---|---|
| 01 | `mus_title` | Attract mode / title. The mission statement. | 132 | D minor, heroic | 8-bar intro → 64-bar loop | 1:50 |
| 02 | `mus_select` | Character select. Short, cocky, loops fast. | 138 | D dorian | 4-bar intro → 16-bar loop | 0:45 |
| 03 | `mus_map` | World map / between-stage. Warm, breathing. | 96 | F major | 4-bar intro → 32-bar loop | 1:10 |
| 04 | `mus_w1_village` | W1 dawn village & gym. Sunrise, discipline. | 124 | A minor → A dorian | 8-bar intro → 48-bar loop | 1:40 |
| 05 | `mus_w2_bazaar` | W2 bazaar & rooftops. Busy, mischievous, fast. | 142 | E phrygian dominant | 4-bar intro → 48-bar loop | 1:35 |
| 06 | `mus_w3_train_int` | W3 train interior. Tight, mechanical, claustrophobic. | 130 | C minor | 8-bar intro → 40-bar loop | 1:30 |
| 07 | `mus_w3_train_roof` | W3 roof chase. Wide open, wind, urgency. | 150 | C minor | no intro → 32-bar loop | 1:15 |
| 08 | `mus_w4_port` | W4 rainy port & cargo ship. Heavy, grey, determined. | 118 | G minor | 8-bar intro → 48-bar loop | 1:45 |
| 09 | `mus_w5_casino` | W5 casino floor approach. Sleazy, glittering, wrong. | 126 | B♭ minor, chromatic | 4-bar intro → 32-bar loop | 1:20 |
| 10 | `mus_w5_arena` | W5 neon arena. Everything at once. Peak track. | 146 | D minor (Patriot cell) | 8-bar intro → 56-bar loop | 1:50 |
| 11 | `mus_boss_mid` | Shared bosses 1–4. Synth-metal menace. | 158 | F# minor | 4-bar intro → 32-bar loop | 1:10 |
| 12 | `mus_boss_final` | The Promoter. Two-part: menace → folk reclamation. | 152 | F# minor → D minor | intro → A-loop 32 → B-loop 32 | 2:20 |
| 13 | `mus_victory` | Stage clear. Patriot cell, triumphant. | 132 | D major | one-shot, no loop | 0:09 |
| 14 | `mus_gameover` | Game over / continue screen. | 84 | D minor, deflated | 2-bar intro → 16-bar loop | 0:40 |
| 15 | `mus_results` | Score tally screen. Bouncy, keeps energy up. | 120 | F major | 2-bar intro → 16-bar loop | 0:35 |
| 16 | `mus_credits` | Credits. Full Patriot cell arrangement, unhurried. | 108 | D major | 8-bar intro → 64-bar loop | 2:30 |

**Stem split guidance per track type:**

- *Level themes* — `base` carries accordion/zurna melody + slap bass + pads; `drums` carries the full breakbeat kit + claps + doli. At combo <3 the drums stem sits at gain 0.35 (a skeleton kick/hat pattern is baked into `base` so silence never happens); at combo ≥3 it ramps to 1.0.
- *Boss themes* — `drums` additionally carries the double-kick and crash accents. Boss stem gain is driven by **boss HP**, not combo: <50% HP → 1.0.
- *Title / map / credits / results* — `drums` gain fixed at 1.0. Stems exist only for format consistency; do not automate.
- *Victory / game over* — mono-stem one-shots, no `drums` file. Saves 4 files.

**Per-track budget:** ≤ 1 MB per track means ≤ 500 KB per stem. At 1:50 stereo OGG this is ~q3 (≈64 kbps/stem). Encode stems mono where the source allows (drums stems for level themes are near-mono anyway) and pan in WebAudio — this buys back ~40% and keeps quality at q5.

---

## 6.3 SUNO PROMPT PACK

**Global rules for the client using Suno:**
1. Always enable **Instrumental** unless a lyric sheet is given below.
2. Suno will not hit BPM exactly. Generate, then time-stretch to the target BPM in the DAW before cutting loops.
3. Generate 4 takes per track minimum; the fusion (funk + lezginka) succeeds maybe 1 in 3.
4. Suno outputs are not loop-ready. Every prompt below ends with the loop-cut instruction — that is a DAW task, not a Suno task.
5. For stems: Suno's stem export gives more than 2 parts. Bounce them down to exactly `base` and `drums` per the split table above.
6. **Language split — important.** All *style prompts* below stay in **English**: Suno's style parser is trained overwhelmingly on English genre/instrument vocabulary and degrades noticeably on Russian style text (it starts guessing "Russian pop" instead of parsing "breakbeat, slap bass, zurna"). *Lyrics*, where they exist, go in **Russian** — Suno sings Russian fine when the words are in the lyrics field. Only one track has lyrics: `mus_title`.

---

**01 — `mus_title` (Title / Attract)**
> *Style:* `1993 SNES arcade beat-em-up main theme, funky breakbeat, slap bass, heroic brass stabs, lezginka accordion riff, zurna lead, hand-clap percussion, gated snare, 132 BPM, D minor, triumphant and nostalgic, anthemic`
> *Vocals:* **4-line chant hook, in Russian**, shouted crowd-style (a room of men, not a singer), no melody, over bars 17–24:
> ```
> СТОЙ — КАК ГОРА!
> ДЕРЖИ — КАК ЗИМА!
> БРОСАЙ — И ТЕБЯ ЗАПОМНЯТ!
> ПА — ТРИ — ОТ!
> ```
> *EN gloss:* "Stand — like the mountain! / Hold — like the winter! / Throw — and they will remember you! / PA-TRI-OT!"
> *Note:* paste the Russian lyrics into Suno's **lyrics** field only. The style field above stays English (see global rule 6).
> *Loop/edit:* Keep the 8-bar brass intro as a separate one-shot region; cut the loop from the downbeat after the chant to the end of the 64-bar section, crossfade 20 ms.

**01a — Alternate style seed A (folk-forward)**
> `1993 arcade beat-em-up theme, Caucasus lezginka groove in 6/8, garmon accordion and zurna leads front and center, doli hand drums, hand claps, funk slap bass underneath, brass stabs, 132 BPM, D minor, proud and driving, instrumental`

**01b — Alternate style seed B (funk-forward)**
> `early 90s arcade funk theme, heavy slap bass, wah guitar, gated reverb snare, orchestra hit stabs, Amen-style breakbeat, accordion counter-melody, Middle Eastern woodwind lead, 132 BPM, D minor, cocky and heroic, instrumental`

**01c — Alternate style seed C (chiptune-hybrid)**
> `16-bit SNES soundtrack, FM synthesis brass and electric piano, sampled breakbeat drums, chip bass, folk accordion melody in Caucasian scale, hand claps, 132 BPM, D minor, bright arcade energy, retro video game, instrumental`

**02 — `mus_select` (Character Select)**
> `short 16-bit arcade character select theme, punchy funk breakbeat, slap bass riff, accordion stab, hand claps, confident and looping, 138 BPM, D dorian, instrumental` — *[Instrumental]*
> *Loop/edit:* Take any 16 bars that don't resolve; force a loop by cutting on the bar line. No intro fade.

**03 — `mus_map` (World Map)**
> `relaxed 16-bit adventure map theme, warm accordion melody, soft finger-snap and shaker percussion, mellow electric piano, gentle funk bass, mountain folk flavor, 96 BPM, F major, hopeful and calm, instrumental` — *[Instrumental]*
> *Loop/edit:* Cut a 32-bar section with no cymbal swells; loop at bar line, 30 ms crossfade.

**04 — `mus_w1_village` (World 1 — Dagestan village at dawn)**
> `16-bit arcade beat-em-up stage theme, sunrise mood, solo garmon accordion opening into funky breakbeat, doli drum lezginka pattern, slap bass, warm brass pads, zurna melody, 124 BPM, A minor to A dorian, proud and awakening, instrumental` — *[Instrumental]*
> *Loop/edit:* Intro = the solo accordion 8 bars, exported separately. Loop the 48 bars after the drums enter.

**05 — `mus_w2_bazaar` (World 2 — bazaar & rooftops)**
> `fast 16-bit arcade stage theme, busy marketplace energy, hand claps and tambourine, darbuka and doli, rapid accordion riff, funk slap bass, wah guitar, Phrygian dominant scale, 142 BPM, E, mischievous and frantic, instrumental` — *[Instrumental]*
> *Loop/edit:* No intro — loop straight from bar 5 for 48 bars.

**06 — `mus_w3_train_int` (World 3 — train interior)**
> `16-bit arcade stage theme, mechanical train rhythm, tight muted funk guitar, dark slap bass, industrial percussion mixed with doli hand drums, minor accordion motif, 130 BPM, C minor, tense and claustrophobic, instrumental` — *[Instrumental]*
> *Loop/edit:* Cut the loop so the first beat lands on a rail-clack accent. 40-bar loop.

**07 — `mus_w3_train_roof` (World 3 — roof chase)**
> `high speed 16-bit chase theme, driving breakbeat, urgent zurna lead, wind and open air, aggressive slap bass, orchestra hit stabs, 150 BPM, C minor, breathless and dangerous, instrumental` — *[Instrumental]*
> *Loop/edit:* No intro. Straight 32-bar loop; the transition from `mus_w3_train_int` is a 1.5 s crossfade.

**08 — `mus_w4_port` (World 4 — rainy port / cargo ship)**
> `heavy 16-bit arcade stage theme, rain and steel atmosphere, slow grinding funk groove, deep sub bass, minor-key accordion drone, metallic percussion hits, distant brass, 118 BPM, G minor, grim and determined, instrumental` — *[Instrumental]*
> *Loop/edit:* Intro 8 bars of atmosphere + bass only; loop the 48 bars after the full kit enters.

**09 — `mus_w5_casino` (World 5 — casino floor)**
> `sleazy 90s arcade casino theme, funk clavinet, tacky synth brass, disco hi-hats, chromatic descending bass, neon glitz, faint accordion ghost motif, 126 BPM, B-flat minor, decadent and menacing, instrumental` — *[Instrumental]*
> *Loop/edit:* 32-bar loop. Fade the slot-machine-like synth arpeggio out of the loop point so it doesn't stutter.

**10 — `mus_w5_arena` (World 5 — neon arena finale)**
> `epic 16-bit arcade final stage theme, full lezginka breakbeat fusion, zurna and accordion in unison lead, huge brass stabs, slap bass, hand claps, crowd energy, heroic and overwhelming, 146 BPM, D minor, instrumental` — *[Instrumental]*
> *Loop/edit:* 8-bar intro with the Patriot 5-note cell on solo zurna, then 56-bar loop.

**11 — `mus_boss_mid` (Shared boss theme, bosses 1–4)**
> `90s action movie synth metal boss battle, palm-muted distorted guitar, aggressive synth brass, orchestra hits, double kick drums, dark arpeggiated synth, 158 BPM, F-sharp minor, threatening and relentless, instrumental` — *[Instrumental]*
> *Loop/edit:* 4-bar riser intro, 32-bar loop. Per-world variation is done in-engine by swapping the `drums` stem, not by regenerating.

**12 — `mus_boss_final` (The Promoter)**
> `two part final boss theme, part one 90s synth metal with distorted guitar orchestra hits and double kick, part two same tempo but lezginka accordion and zurna take over the melody in triumphant minor, 152 BPM, F-sharp minor into D minor, epic and defiant, instrumental` — *[Instrumental]*
> *Loop/edit:* Export as one file with two loop regions: A-loop (bars 5–36) and B-loop (bars 37–68). Engine jumps A→B on boss phase 2 at the next bar boundary.

**13 — `mus_victory` (Stage clear jingle)**
> `short triumphant 16-bit arcade victory fanfare, brass stabs and accordion flourish, hand claps, 132 BPM, D major, 8 seconds, instrumental` — *[Instrumental]*
> *Loop/edit:* One-shot. Trim to exactly 9.0 s with a clean tail.

**14 — `mus_gameover` (Game over / continue)**
> `slow melancholy 16-bit game over theme, lone accordion, sparse bass, soft timpani, 84 BPM, D minor, defeated but dignified, instrumental` — *[Instrumental]*
> *Loop/edit:* 16-bar loop, must survive looping for a full 10-second continue countdown.

**15 — `mus_results` (Score tally)**
> `upbeat short 16-bit results screen theme, bouncy funk bass, finger snaps, cheerful accordion, 120 BPM, F major, light and satisfying, instrumental` — *[Instrumental]*
> *Loop/edit:* 16-bar loop; must not build, so tally length doesn't matter.

**16 — `mus_credits` (Credits)**
> `end credits theme, unhurried 16-bit arrangement, full accordion and zurna melody with warm brass, gentle funk groove, hand claps, nostalgic and proud, 108 BPM, D major, instrumental` — *[Instrumental]*
> *Loop/edit:* 8-bar intro + 64-bar loop; loop is a safety net only, credits should finish inside one pass.

---

## 6.4 SFX List

Priority: **P0** = ship-blocking, **P1** = needed for the vertical slice to feel right, **P2** = polish.

| # | Name | Description | Length | Pri |
|---|---|---|---|---|
| 1 | `sfx_grip_snap` | Gi fabric snap — the moment of kumi-kata. Signature sound. | 0.25 s | P0 |
| 2 | `sfx_grip_fail` | Dull cloth brush, grip slips off | 0.20 s | P1 |
| 3 | `sfx_throw_whoosh_lt` | Light throw arc — cloth + air | 0.35 s | P0 |
| 4 | `sfx_throw_whoosh_hv` | Heavy throw arc — deeper, longer, doppler | 0.55 s | P0 |
| 5 | `sfx_slam_light` | Tatami slam, light body (mook) | 0.60 s | P0 |
| 6 | `sfx_slam_medium` | Tatami slam, standard enemy — the workhorse | 0.75 s | P0 |
| 7 | `sfx_slam_heavy` | Tatami slam, big enemy/boss. Sub-heavy, room tail. | 1.10 s | P0 |
| 8 | `sfx_slam_surface_stone` | Slam variant on bazaar stone — brighter, gritty | 0.80 s | P1 |
| 9 | `sfx_slam_surface_metal` | Slam variant on train/ship metal — clang + ring | 1.00 s | P1 |
| 10 | `sfx_body_thud_a/b/c` | Body-hit thuds, 3 variations for round-robin | 0.20 s ea | P0 |
| 11 | `sfx_ippon_stinger` | Orchestral hit + gong + white-noise sweep. THE moment. | 1.60 s | P0 |
| 12 | `sfx_wazaari_stinger` | Smaller cousin of the above, brass stab only | 0.70 s | P1 |
| 13 | `sfx_ukemi_roll` | Breakfall slap + roll on mat | 0.55 s | P0 |
| 14 | `sfx_enemy_ko` | Enemy defeat: thud + short comic descending tone | 0.70 s | P0 |
| 15 | `sfx_enemy_alert` | Enemy notices player — short grunt/whistle | 0.30 s | P1 |
| 16 | `sfx_melon_whoosh` | Heavy lobbed melon cutting the air (E3 projectile) | 0.25 s | P1 |
| 17 | `sfx_melon_splat` | Melon bursting on floor/wall impact, wet and comedic | 0.40 s | P2 |
| 18 | `sfx_step_dojo` | Bare foot on tatami | 0.15 s ×4 | P0 |
| 19 | `sfx_step_stone` | Boot on bazaar stone/cobble | 0.15 s ×4 | P0 |
| 20 | `sfx_step_wood` | Boot on rooftop planking | 0.15 s ×4 | P1 |
| 21 | `sfx_step_metal` | Boot on train car metal, slight ring | 0.15 s ×4 | P0 |
| 22 | `sfx_step_shipdeck` | Wet boot on ship deck, slight squelch | 0.15 s ×4 | P1 |
| 23 | `sfx_step_casino` | Boot on polished casino floor, reverberant | 0.15 s ×4 | P1 |
| 24 | `sfx_jump` | Cloth rustle + effort exhale (non-verbal) | 0.30 s | P0 |
| 25 | `sfx_land` | Landing scuff, surface-agnostic | 0.25 s | P0 |
| 26 | `sfx_amb_crowd_loop` | W5 arena crowd bed, seamless | 12 s loop | P0 |
| 27 | `sfx_crowd_cheer_burst` | Crowd reaction on IPPON | 2.5 s | P0 |
| 28 | `sfx_crowd_boo` | Crowd reaction on player hit taken | 1.8 s | P2 |
| 29 | `sfx_amb_train_loop` | W3 rail clack + carriage rumble | 10 s loop | P0 |
| 30 | `sfx_train_horn` | Distant train horn, one-shot punctuation | 2.2 s | P2 |
| 31 | `sfx_amb_rain_loop` | W4 rain on metal and water | 12 s loop | P0 |
| 32 | `sfx_amb_gulls` | Sparse gull calls, W4 | 8 s loop | P2 |
| 33 | `sfx_amb_bazaar_walla` | W2 indistinct market chatter, no real words | 14 s loop | P1 |
| 34 | `sfx_amb_wind_mountain` | W1 dawn wind, thin and cold | 10 s loop | P1 |
| 35 | `sfx_ui_move` | Menu cursor move — short blip | 0.08 s | P0 |
| 36 | `sfx_ui_confirm` | Menu confirm — bright two-tone | 0.20 s | P0 |
| 37 | `sfx_ui_deny` | Menu deny — low buzz | 0.20 s | P0 |
| 38 | `sfx_ui_pause` | Pause engage/disengage (one file, reversed for out) | 0.30 s | P0 |
| 39 | `sfx_coin` | Score pickup — classic arcade coin ping | 0.25 s | P0 |
| 40 | `sfx_score_tick` | Results screen tally tick, pitched-up on chain | 0.06 s | P1 |
| 41 | `sfx_countdown_beep` | Continue countdown beep, one per second | 0.15 s | P0 |
| 42 | `sfx_countdown_final` | 0-second expiry tone | 0.60 s | P1 |
| 43 | `sfx_powerup` | Health/item pickup, warm rising arpeggio | 0.50 s | P1 |
| 44 | `sfx_hero_hurt` | Impact on player — dull thud + breath | 0.35 s | P0 |
| 45 | `sfx_stage_clear_whoosh` | Screen wipe transition | 0.80 s | P1 |

Round-robin (`×4` / `a/b/c`) entries must never repeat the same sample twice consecutively — footsteps are the fastest way to make a game sound cheap.

---

## 6.5 Announcer & Voice Barks

**Canon: every spoken line in the game is in Russian.** The announcer, the hero grunts, the quips — all of it. This is not a localization pass; it is the source language. English never appears in audio. (On-screen UI text language is a separate decision owned by the UI section; the audio spec assumes Russian VO regardless of what the HUD shows.)

The one exception is the judo referee vocabulary, which stays Japanese — because that is exactly what happens on a real tatami in Makhachkala. A Russian referee shouts «Иппон!», not «Чистая победа!». Keeping the Japanese calls in their standard **Russian-judo transliterations** is the authenticity detail that people who actually train will notice first.

### Announcer word list (Russian)

Deep, over-processed, 1990s arcade announcer — but a Russian one. Think a sports commentator with a cigarette voice pushed through a plate reverb and a touch of distortion. Always the loudest element in the mix.

| ID | Russian line | EN gloss | Trigger | Usage note |
|---|---|---|---|---|
| `vo_ann_round1` | «РАУНД ПЕРВЫЙ… ХАДЗИМЭ!» | "Round one… begin!" | Stage start | *Хадзимэ* is the standard RU-judo transliteration of 始め. Correct as a match start. |
| `vo_ann_round2` | «РАУНД ВТОРОЙ… ХАДЗИМЭ!» | "Round two… begin!" | Stage 2 of a world | |
| `vo_ann_final` | «ФИНАЛЬНЫЙ РАУНД… ХАДЗИМЭ!» | "Final round… begin!" | W5 arena | |
| `vo_ann_ippon` | «ИППОН!» | "Ippon!" (full point) | Full-point throw: back lands flat, with force and speed | Never for a scrappy knockdown. This is *earned*. Standard RU spelling is «иппон». |
| `vo_ann_wazaari` | «ВАЗА-АРИ!» | "Waza-ari!" (half point) | Partial throw — enemy lands on side or shoulder | Correct as the score one step below ippon. RU-judo standard: «ваза-ари». |
| `vo_ann_osaekomi` | «ОСАЭКОМИ!» | "Hold is on!" | Grapple/pin minigame begins | *Осаэкоми* = holding. Pins only, never throws. |
| `vo_ann_toketa` | «ТОКЭТА!» | "Hold broken!" | Enemy escapes the pin | The correct counterpart to osaekomi. |
| `vo_ann_matte` | «МАТЭ!» | "Wait!" | Pause menu opened | *Матэ* is the referee's stop call — a perfect pause word. |
| `vo_ann_soremade` | «СОРЭ-МАДЭ!» | "That is all." | Stage cleared | The referee's end-of-match call. |
| `vo_ann_ko` | «НОКАУТ!» | "Knockout!" | Enemy or boss defeated by damage rather than a throw | Deliberately *not* judo — arcade convention, and it reads as such in Russian too. |
| `vo_ann_perfect` | «БЕЗУПРЕЧНО!» | "Flawless!" | Stage cleared with zero damage taken | Chosen over «идеально» — «безупречно» is what a commentator would actually say about a performance. |
| `vo_ann_continue` | «ПРОДОЛЖИТЬ?» | "Continue?" | Game over screen | Read as a question, rising intonation, slightly taunting. |
| `vo_ann_timeup` | «ВРЕМЯ ВЫШЛО!» | "Time's up!" | Timed section expires | |
| `vo_ann_newrecord` | «НОВЫЙ РЕКОРД!» | "New record!" | High score beaten | |
| `vo_ann_ready` | «ПРИГОТОВИТЬСЯ!» | "Get ready!" | 2 s before `hajime` on stage start | Standard arcade beat; gives the player a breath. |
| `vo_ann_boss` | «ОСТОРОЖНО — ОН ОПАСЕН!» | "Careful — he's dangerous!" | Boss entrance | Deliberately cheesy 90s commentary. |
| `vo_ann_ippon_gachi` | «ИППОН-ГАТИ!» | "Win by ippon!" | Boss defeated by a full-point throw specifically | Optional, P2. The correct term for winning a match by ippon — a deep cut for the judo audience. |

**Judo-correctness rules for the VO director:**

1. The Japanese calls map to *scoring conditions*, not to "that looked cool." Firing «ИППОН!» on a generic knockdown is the single fastest way to lose credibility with anyone who trains — and this game's audience trains.
2. Use the standard Russian-judo transliterations exactly as written above (иппон, ваза-ари, осаэкоми, токэта, матэ, сорэ-мадэ, хадзимэ). Do not invent phonetic variants; these spellings are what appear in Russian judo federation materials and what a Dagestani coach says out loud.
3. Stress marks for the voice actor: иппО́н, ваза-áри, осаэкóми, хадзимэ́, сорэ-мáдэ. Getting the stress wrong is more noticeable than getting the vowel wrong.
4. Everything that isn't a referee call goes in plain, punchy Russian — no бюрократический phrasing, no full sentences where a word will do.

### Hero effort barks & quips (Russian)

Recorded or synthesized later; this spec locks **trigger events + the actual lines**. Grunts are non-verbal and language-neutral; quips are short Russian phrases chosen so they survive being shouted over a breakbeat.

**Idris — 40yo coach from Dagestan. Low, calm, economical. He does not celebrate; he assesses. Budget: 15 clips.**

| ID | Type | Russian line | EN gloss | Trigger |
|---|---|---|---|---|
| `vo_idris_effort_a/b/c` | Grunt | — (non-verbal) | — | Any throw executed |
| `vo_idris_effort_heavy_a/b` | Deep grunt | — (non-verbal) | — | Heavy throw |
| `vo_idris_hurt_a/b` | Pain | — (non-verbal) | — | Damage taken |
| `vo_idris_down` | Long exhale | — (non-verbal) | — | Player KO'd |
| `vo_idris_breath_a/b` | Recovery breath | — (non-verbal) | — | Low-health idle |
| `vo_idris_kiai` | Kiai shout | «ХА!» | sharp kiai | Combo chain ≥ 5 |
| `vo_idris_quip_ippon` | Quip | «Чисто.» | "Clean." | On IPPON |
| `vo_idris_quip_boss` | Quip | «Сядь.» | "Sit down." | Boss defeated |
| `vo_idris_quip_stage` | Quip | «Дальше.» | "Next." | Stage clear |
| `vo_idris_quip_grip` | Quip | «Взял.» | "Got him." | First grip of a fight, ≤1× per stage |

**Otajon — the helper. Younger, louder, delighted by everything. Budget: 13 clips.**

| ID | Type | Russian line | EN gloss | Trigger |
|---|---|---|---|---|
| `vo_ota_effort_a/b/c` | Higher grunt | — (non-verbal) | — | Any throw executed |
| `vo_ota_effort_heavy_a/b` | Strained grunt | — (non-verbal) | — | Heavy throw |
| `vo_ota_hurt_a/b` | Pain | — (non-verbal) | — | Damage taken |
| `vo_ota_down` | Yelp | — (non-verbal) | — | Player KO'd |
| `vo_ota_kiai` | Kiai shout | «ЭЙ-ЯХ!» | enthusiastic kiai | Combo chain ≥ 5 |
| `vo_ota_quip_ippon` | Quip | «Тренер, видел?!» | "Coach, did you see that?!" | On IPPON |
| `vo_ota_quip_boss` | Quip | «Вот так и надо!» | "That's how it's done!" | Boss defeated |
| `vo_ota_quip_stage` | Quip | «Погнали!» | "Let's go!" | Stage clear |
| `vo_ota_quip_hurt` | Quip | «Ай, больно!» | "Ow, that hurt!" | Third consecutive hit taken |

**Throttling.** Quips fire at most once per 20 seconds per character regardless of trigger frequency, and never while the announcer bus is active — the announcer always wins. Unthrottled repetition is the fastest way to make voice work that players mute. Non-verbal grunts are exempt from the throttle but use strict round-robin with no immediate repeats.

### Voiceover production spec

**Option A — record the club members themselves (strongly preferred).**

This is a game about real people from a real gym. Their real voices are the single cheapest source of authenticity in the entire project, and no TTS will reproduce a Dagestani coach's cadence. Concretely:

- **Casting:** the actual coach voices Idris; a younger club member voices Otajon; the loudest, most theatrical person in the club voices the announcer. Do not cast a professional — the slight amateurism *is* the 90s arcade texture.
- **Rig:** one cardioid dynamic mic (SM58-class is genuinely fine here — it rejects room), pop filter, mic ~15 cm off-axis, recorded into any interface at **48 kHz / 24-bit WAV**.
- **Room:** the quietest room in the gym with soft surfaces; hang a blanket behind the speaker. Kill the ventilation. Record at night if the street is loud.
- **Takes:** 3 takes per line minimum, plus one deliberately over-the-top take of every announcer line — that over-the-top take is usually the keeper.
- **Grunts:** record these last, after the speaker is genuinely warmed up and slightly tired. Have them actually throw someone if the mat is nearby; real exertion sounds like real exertion.
- **Session budget:** the full list (17 announcer + 28 character clips) fits in one 2-hour session with a 15-minute break.
- **Rights:** get a one-line written release from each participant covering use in the game and its marketing. Do this before the session, not after.

**Option B — TTS / AI voice (fallback, or for the temp track).**

Acceptable for prototype and for placeholder passes during development; acceptable at ship only if Option A is genuinely impossible. Use a Russian-capable TTS with a male low-register voice, then **process it hard** — the processing chain below hides most of the TTS tell. Note that TTS will mispronounce the judo terms every time: feed them phonetically (хад-зи-мэ́, ва-за-á-ри, о-са-э-кó-ми) and audition every one. Never use TTS for grunts — synthesized exertion sounds uncanny in a way processing cannot fix; source those from a royalty-free effort library instead.

**Processing chain (identical for both options — this is what makes it sound like 1993):**

1. High-pass @ 100 Hz → de-ess → compress 4:1, ~6 dB gain reduction.
2. Announcer only: mild saturation/bitcrush to ~12-bit, then a short bright plate reverb (1.2 s, pre-delay 20 ms, high-passed at 400 Hz).
3. Character barks: no reverb — they must sit dry and close, in the player's face.
4. Normalize per bus, then trim silence to ≤30 ms head and ≤80 ms tail.

**Delivery format & loudness:**

| Property | Value |
|---|---|
| Master archive | 48 kHz / 24-bit WAV, one file per line, named by the `vo_*` ID above |
| Game format | OGG Vorbis q4 mono, M4A/AAC 96 kbps mono fallback (Safari) |
| Announcer loudness | −12 LUFS integrated, −1.0 dBTP — the loudest bus in the game |
| Character bark loudness | −14 LUFS integrated, −1.0 dBTP |
| Consistency | Every clip on a bus normalized to the same integrated target, not peak-normalized — otherwise short grunts vanish under long lines |
| Size budget | Announcer set ≤ 1 MB total; per-character set ≤ 400 KB. At q4 mono this is comfortable for 45 clips. |

All VO ships mono and is panned in WebAudio (announcer dead center and never panned; character barks panned ±0.2 toward the speaking hero). Stereo VO files would double the budget for zero perceptible gain.

---

## 6.6 Implementation Spec

### Event → sound mapping

The sim emits named events onto the queue; the audio module drains the queue once per frame. The sim never calls audio directly and never knows a sound exists.

| Event name | Payload | Audio response |
|---|---|---|
| `grip.established` | `{surface}` | `sfx_grip_snap` |
| `grip.slipped` | — | `sfx_grip_fail` |
| `throw.started` | `{weight}` | `sfx_throw_whoosh_lt` / `_hv` by weight |
| `throw.impact` | `{weight, surface}` | slam family by weight, surface variant if present; triggers −3 dB duck |
| `throw.scored` | `{score: 'ippon'\|'wazaari'}` | Stinger + `vo_ann_ippon` / `vo_ann_wazaari` + crowd burst (W5 only) |
| `enemy.hit` | — | `sfx_body_thud_*` round-robin |
| `enemy.defeated` | — | `sfx_enemy_ko` |
| `enemy.alerted` | — | `sfx_enemy_alert`, max 2 concurrent |
| `enemy.ukemi` | — | `sfx_ukemi_roll` |
| `player.step` | `{surface}` | `sfx_step_*` by surface, round-robin |
| `player.jump` / `player.land` | — | `sfx_jump` / `sfx_land` |
| `player.damaged` | — | `sfx_hero_hurt` + `vo_*_hurt_*` |
| `player.died` | — | `vo_*_down`, −8 dB music duck |
| `combo.changed` | `{chain}` | Drives drums stem gain (below) |
| `boss.introduced` | `{id}` | `vo_ann_boss` («ОСТОРОЖНО — ОН ОПАСЕН!») + crossfade to `mus_boss_mid` / `mus_boss_final` |
| `boss.phase2` | — | `mus_boss_final` A-loop → B-loop at next bar |
| `stage.started` | `{world}` | `vo_ann_ready` → `vo_ann_round*` («ПРИГОТОВИТЬСЯ!» / «…ХАДЗИМЭ!»), start world music + ambience |
| `stage.cleared` | `{perfect}` | Stop music, `mus_victory`, `vo_ann_soremade` («СОРЭ-МАДЭ!») → `vo_ann_perfect` («БЕЗУПРЕЧНО!») if `perfect` |
| `ui.cursorMoved` / `.confirmed` / `.denied` | — | `sfx_ui_*` |
| `game.paused` / `.resumed` | — | `sfx_ui_pause` + `vo_ann_matte` («МАТЭ!») on pause only, music behavior below |
| `score.awarded` | `{amount}` | `sfx_coin`, throttled to 8/sec |
| `continue.tick` | `{n}` | `sfx_countdown_beep`, `sfx_countdown_final` at 0 |

Unknown event names are ignored silently and logged once in dev builds. The audio module must never throw on an event it doesn't recognize — that would let an audio bug kill the sim.

### Stem intensity rules

Both stems play as two `AudioBufferSourceNode`s started with the same `startTime` argument, each into its own `GainNode`, both into the music bus. They are never restarted independently — drift is the only failure mode that matters here, and restarting is what causes it.

```
drumsGain target:
  combo chain 0–2  → 0.35
  combo chain 3–4  → 0.75
  combo chain ≥ 5  → 1.00
  boss fight, HP <50% → 1.00 (overrides combo)
Ramp: setTargetAtTime, timeConstant 0.25 s. Never setValueAtTime — steps are audible.
Decay: on combo break, ramp down over 1.2 s, not instantly.
```

### Loop points

Every music buffer sets `loop = true` with explicit `loopStart` / `loopEnd` in **seconds**, authored per track and stored in the manifest alongside the file. Values are derived from bar/BPM at export time, not guessed at runtime. Both stems of a track share identical values.

Intro handling: the intro is *part of the same buffer*, before `loopStart`. Playback starts at 0 and the node loops back to `loopStart` on its own. Do not ship separate intro files.

### Crossfades

| Transition | Duration | Curve |
|---|---|---|
| Level → boss | 0.8 s | equal-power |
| Boss → level (boss fled) | 1.2 s | equal-power |
| W3 interior ↔ roof | 1.5 s | equal-power |
| Level → victory | 0.15 s cut, 0.2 s gap | hard cut is correct here |
| Any → game over | 0.4 s | linear down, hard start |
| Map ↔ level | 1.0 s | equal-power |

Boss transitions snap to the next bar of the outgoing track where the tempo relationship allows it; W5 arena → final boss is intentionally bar-aligned (146 → 152 BPM, close enough to feel deliberate).

### Memory budget

| Category | Budget |
|---|---|
| Music, resident (title/map/UI-adjacent) | 2 MB |
| Music, current world (level + boss) | 3 MB |
| SFX core set (combat, UI, hero VO) | 3 MB |
| SFX world set (footsteps, ambience) | 1.5 MB |
| Announcer set (RU, 17 lines, OGG q4 mono) | 1 MB |
| **Ceiling** | **~10.5 MB decoded-in-flight** |

### Lazy loading

- **Boot:** UI SFX, `mus_title`, `mus_select`, announcer set. Nothing else.
- **On world entry:** fetch that world's music + world SFX set. Show the map screen until the fetch resolves; `mus_map` covers the wait.
- **Prefetch:** when the player reaches ~70% through a stage, begin fetching the next world's set in the background at low priority.
- **On world exit:** release the previous world's buffers explicitly. Do not rely on GC — held `AudioBuffer`s are the most common memory leak in WebAudio games.
- **Format:** request OGG; fall back to M4A on Safari. Decide once at boot via `canPlayType`, never per-file.

### Pause behavior

- Music **continues**, ducked to −8 dB and low-passed at 1.2 kHz. Stopping music on pause makes a 90s arcade game feel like a spreadsheet.
- All ambience loops continue, unducked.
- All in-flight SFX and voice are stopped immediately.
- The `AudioContext` is **not** suspended on pause — only on tab blur, and it must resume on the first user gesture after focus returns.
- UI sounds remain fully audible during pause; they are the only thing the player can trigger.
- Drums stem gain freezes at its current value; combo state is preserved through pause.
