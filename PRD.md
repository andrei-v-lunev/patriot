# THE PATRIOT — Product Requirements Document

**Version 1.2 · 2026-08-19 · Studio Director: Claude · Owner: Andrei Lunev**
**Implementing agent: every number in this document is a spec, not a suggestion. Where you must deviate, leave a `// PRD-DEVIATION:` comment explaining why.**

---

## PART A — VISION (Director's brief; binds every section below)

### A.1 Logline

**The Patriot** is a 16-bit judo beat-'em-up where you never punch — you **grip and throw**. Coach Idris and his helper Otajon fight through a 90s action-movie plot to take back their club's stolen championship belt.

### A.2 The two source vibes (client-mandated)

- **Aladdin (SNES/Genesis):** fluid, personality-rich hand-animated sprites; painterly, layered pixel backgrounds; platforming runs with chase setpieces.
- **TMNT: Turtles in Time:** belt-scroll arena combat with Y-depth movement, chunky readable sprites, goons hurled at the camera, arcade presentation — attract mode, announcer, "GO ➜" arrows, continue countdown.

The game alternates these two modes inside every level: **platforming runs** connect **combat arenas**.

### A.3 Design pillars (test every feature against these)

1. **The throw is the punchline.** Every system feeds the grip-and-throw fantasy: thrown enemies are projectiles, chains are the score, "IPPON!" is the dopamine hit.
2. **Real people, heroic portrait.** Idris and Otajon are the developer's actual coaches, rendered with affection — warm, funny, badass. Never mocking, no ethnic stereotypes, no politics/religion. Villains are cartoonish 90s arcade goons.
3. **1990s vibe in content, never in friction.** CRT filters and continue countdowns — yes. Password saves, unskippable text, cheap deaths — no. Modern UX, arcade soul.
4. **Detailed pixel art or nothing.** 480×270 logical grid, integer scaling, disciplined palettes, animation with anticipation and smears. If an asset wouldn't pass in a 1994 arcade, it doesn't ship.
5. **One codebase, two platforms.** Browser and Android APK from the same files, feature-detected, never forked.

### A.4 Locked director decisions (canon for all sections)

- **Heroes:** Idris — 40, judo coach from Dagestan, white gi/black belt, power and grip range. Otajon — 25, his helper, blue gi, speed, foot sweeps, counters. Tag-team single player (swap on the fly) + local 2P co-op on gamepads.
- **Villain (client-locked):** the syndicate is **American** — Rex "The Snake" Sterling, a slick Las-Vegas-style pay-per-view fight mogul, and his Sterling Fight Syndicate steal the club's championship belt and the students' medals to force fighters into his rigged PPV circus. Villains are cartoonish 90s action-movie henchmen (bouncers, linebackers, bikers, showmen) — never a mockery of Americans as people; the target of the joke is greedy show-business, not a nationality.
- **Worlds:** W1 Dagestan mountain village + gym (dawn) → W2 city bazaar & rooftops (day, Aladdin vibe) → W3 night train through the mountains → W4 port & cargo ship (rain) → W5 "The Golden Cage" casino-arena (neon night, finale).
- **Music:** generated with **Suno** — 90s arcade funk/breakbeat fused with Caucasus lezginka rhythms and accordion/zurna colors; boss themes lean 90s action-movie synth-metal. Prompt pack in Part 4.
- **Art generation:** executed by **Grok** from the prompt pack in Part 3; hero faces derived from real photos (supplied by the owner later; pipeline in Part 3). **Likeness is a P0 requirement (client-locked):** Idris and Otajon must be recognizable from their photos. Portraits are authored at high resolution (≥192×192) and rendered on a 2× UI layer — 96×96 was judged too small. The owner may generate the pixel-art faces with **Higgsfield** (photo-to-pixel-art); the pipeline in Part 3 must accept either Grok or Higgsfield output, with the same hand-cleanup + owner-approval gate.
- **Language (client-locked):** ALL player-facing text and voiceovers are **Russian** (RU is the primary and default language; EN is a later settings option, stub only). The PRD itself stays in English for the implementing dev, but every in-game string is specified as actual Russian text with an English gloss in parentheses. Judo terms use the forms standard in Russian judo practice: «Хадзимэ!», «Иппон!», «Ваза-ари!». All fonts must include Cyrillic glyphs.
- **Tech:** the proven Madagaskar pipeline — vanilla JS IIFE modules, headless deterministic sim, fixed 120Hz timestep, canvas renderer with offscreen 480×270 buffer, WebView APK wrapper.
- **Production reality:** feel is iterated, not specced — playtest rounds and feel reviews are scheduled work in every milestone (see Part 6).

### A.5 Document map

- **Part 1 — Narrative & World** (story, characters, enemies fiction, levels, cutscenes)
- **Part 2 — Combat, Physics & Enemies** (grip system, move lists, frame data, AI, bosses)
- **Part 3 — Art Direction** (pixel spec, palettes, animation tables, Grok prompt pack)
- **Part 4 — Audio** (music design, Suno prompt pack, SFX, announcer)
- **Part 5 — UX, Controls & Screens** (flow, control schemes, touch design, HUD, onboarding)
- **Part 6 — Technical Architecture & Milestones** (sim, schemas, platforms, tests, roadmap)

Cross-reference convention: enemies E1–E8, bosses B1–B5, levels W#L#, as defined in Part 1 and specced in Part 2.

---

## A.6 Director's reconciliation notes (cross-part canon)

- **Enemy numbering** follows Part 2 mechanics. Fiction names (Part 1): E1 Clipboard, E2 Barrel (heavy), E3 Melonhand (ranged melon-lobber), E4 Sneaker (rushdown), E5 Tracksuit (grappler), E6 Turnstile (shield), E7 Kite Boy (agile aerial), E8 Gold Jacket (elite counter).
- **Boss mapping** (Part 1 fiction → Part 2 mechanics): B1 Dale "Padlock" Pruitt → gatekeeper brawler · B2 Cleo "The Kite" Vance → zoner (her "chain-whip" is a weighted kite-line) · B3 "Boxcar" Bruno Marchetti → rival grappler · B4 Denny "The Crane" Hollis → armored bruiser with crane-drop adds · B5 Rex "The Snake" Sterling → final cage match.
- **Frame data** is authored at 60 fps everywhere in Part 2; the sim runs at 120 Hz and converts ×2 exactly once (Part 6 §3.3.2).
- **Healing fiction:** tea thermos = +30 HP, plov = full heal (Part 2 numbers; Otajon-flavored pickup art in Part 3).
- **Language:** all player-facing strings across every part are Russian with EN gloss (canon §A.4); Part 3 §4.6.6 owns the Cyrillic font gate; generated Cyrillic never ships without native-reader verification and hand redraw.
- **Portraits:** 192×192 masters on the 2× UI layer (Part 3 §4.2.2) are the single source for VS cards, cutscene close-ups, and derived HUD chips.
- Where any two parts still disagree on a number, precedence is: Part 2 (mechanics) > Part 6 (tech) > others; flag the conflict in a `// PRD-DEVIATION:` comment rather than silently choosing.

---

# PART 1 — NARRATIVE & WORLD

*Owner: Narrative Design. Status: canon. All IDs in this section are stable — reference them from combat, art, and audio specs.*

> **LANGUAGE CANON:** every player-facing string in THE PATRIOT ships in **RUSSIAN** — dialogue, VS cards, cutscene captions, quips, on-screen level names, announcer calls, UI. This document is a spec for the dev team and stays in English; every actual in-game string below is written in Russian with a short English gloss in parentheses. **The gloss is never shipped** — it exists only so non-Russian-speaking team members can work. Russian is the *source* language for localization, not a translation of an English original.

---

## 3.1 Story Synopsis & Tone Rules

### 3.1.1 Synopsis

High in the mountains of Dagestan, the **Patriot Judo Club** (клуб «Патриот») is one week away from hosting the Regional Youth Championship — the biggest thing to happen to the village in forty years. Head coach **Idris** (Идрис), a 40-year-old former competitor with hands like vise grips, and his assistant **Otajon** (Отажон), 25, who is faster than everyone and hungrier than everyone, have the mats swept, the tea brewed, and thirty kids ready. Then **Rex "The Snake" Sterling** (Рекс «Змей» Стерлинг) arrives in a helicopter with a briefcase and a smile — a Las Vegas pay-per-view fight mogul whose **STERLING FIGHT SYNDICATE** (Синдикат Стерлинга) turns real fighters into cage-match clowns for a rigged television circus. Idris says no, on camera, in four words. That night the Syndicate strips the club: the championship belt gone from its case, thirty students' medals gone from the wall, and a forged "safety violation" notice padlocking the doors — with Idris's name signed at the bottom. The championship is "relocated" to Sterling's casino-arena, **The Golden Cage** («Золотая клетка»), where the village kids will fight for his cameras or not fight at all. So Idris hangs the club key around his neck, Otajon packs eleven sandwiches, and the two of them walk down the mountain to take back every single medal — through the bazaar, onto a night train, across a rain-soaked port, and into the neon throat of the Golden Cage. They do not punch anybody. They don't have to.

### 3.1.2 Tone Rules — MANDATORY FOR ALL WRITTEN CONTENT

Every line of dialogue, item description, achievement name, and store blurb obeys these. If a line violates one, it gets cut, not softened.

- **T1 — Affection first.** Idris and Otajon are based on real people. They are always competent, always dignified, always the smartest men in the room. Comedy comes *from* them (dry wit, food, deadpan understatement), never *at* them.
- **T2 — Clean, natural Russian. No stereotyping.** Both heroes speak normal, confident, literary Russian — no phonetic "accent" spelling, no мультяшный «горский» говор, no mystical-mountain-wisdom register. Idris speaks in short declarative sentences; Otajon speaks fast and warm. Flavor words (**«Ура!»**, **«Давай!»**, плов, чай) are used the way a real person uses them, never as a punchline about where they're from.
- **T3 — Zero real-world politics, religion, or current events.** No flags as political symbols, no clerical imagery, no real organizations. «Патриот» is the name of a judo club, full stop — the badge is a bear on a mat, and that is all it ever means.
- **T4 — Villains are 90s cartoons.** The Sterling Fight Syndicate are greedy, vain, cowardly, gimmick-obsessed goons in matching gold jackets — casino bouncers, ex-linebackers, bikers, Vegas showmen, infomercial hype-men. They are funny because they are *ridiculous*, not because of where they're from.
- **T5 — Judo is treated with respect.** Throws keep their real names (Russian judo convention: **сэои-нагэ, о-госи, учи-мата, томоэ-нагэ, о-сото-гари, харай-госи**). Nobody is ever thrown onto anything that would realistically maim them; enemies bounce, spin, land in barrels, and see stars.
- **T6 — 90s arcade voice, in Russian.** Short sentences. Present tense. CAPS for announcer and captions. Exclamation points are free. If a caption runs past ~8 Russian words, cut it.
- **T7 — No blood, no weapons drawn on the heroes with intent to kill.** Goons carry crowbars, shovels, clipboards, and melons. The heroes carry nothing.
- **T8 — Kids are never in danger on screen.** The students are a *motivation*, seen in the intro and the ending. No hostage scenes, no threatened children.
- **T9 — Otajon eats, but is never greedy, clumsy, or the butt of the joke.** He is the fastest fighter in the game who also happens to be enthusiastic about lunch. His food jokes always land as *confidence*.
- **T10 — Idris never brags and never explains.** His funniest lines are the shortest ones.
- **T11 — The target is the fight-show business, never a nationality.** The Syndicate is a *pay-per-view racket* — rigged cards, sponsor logos, contracts nobody reads. No joke may land on Americans (or anyone else) as a people; no crude national stereotypes in either direction, and villains get clean Russian dialogue too — no comedy-foreigner accent spelling.
- **T12 — Russian first, always.** Nobody writes a line in English and translates it. Write it in Russian, then gloss it for the doc. If a joke only works in English, it is not a joke for this game.

---

## 3.2 Heroes

### 3.2.1 H1 — IDRIS / ИДРИС ("The Coach" / «Тренер»)

| Field | Spec |
|---|---|
| Age / role | 40. Head coach and founder, клуб «Патриот». |
| Silhouette | Broad shoulders, thick forearms, shaved head, white judogi with a worn black belt, sleeves rolled to the elbow. Reads at 32px by shoulder width alone. |
| Palette | White gi, black belt, red club patch (bear on a mat) on the left chest. |
| Personality | Calm to the point of comedy. Uses four words where six are available. Dry, deadpan. Absolutely immovable — physically and morally. Treats the entire Syndicate as a scheduling problem. |
| Fighting identity | **POWER GRIP.** Slow startup, enormous payoff. Highest grip strength in the game — grabs through enemy attack animations. Signature throws: **о-госи**, **харай-госи**, **о-сото-гари**. His thrown enemies travel the farthest and do the most collision damage as projectiles. Cannot be broken out of a grip by normal enemies (E1–E7). |
| Weakness | Slowest walk speed; punished by ranged and airborne enemies (E3, E7). |
| Signature | **УДЕРЖАНИЕ (осаэкоми)** — tap grab on a downed enemy to pin; the announcer counts, and a full count restores a sliver of health. Pure risk/reward. |

**Idris quips (IQ1–IQ8)** — victory / idle / pickup barks, max 24 Cyrillic characters displayed:

- IQ1 — «Сядь.» (Sit down.)
- IQ2 — «Тренировка окончена.» (Practice is over.)
- IQ3 — «Ты уронил. Ура!» (You dropped this. Ura!)
- IQ4 — «Мой клуб. Мой ковёр.» (My club. My mat.)
- IQ5 — «Сначала захват.» (Grip first.)
- IQ6 — «Во вторник заболит.» (You'll feel it on Tuesday.)
- IQ7 — *(idle, cracking knuckles)* «Давай. Следующий.» (Come on. Next.)
- IQ8 — *(picking up a medal)* «Тут имя написано.» (There's a name on this one.)

### 3.2.2 H2 — OTAJON / ОТАЖОН ("The Assistant" / «Помощник»)

| Field | Spec |
|---|---|
| Age / role | 25. Assistant coach, клуб «Патриот». Idris's student since he was a teenager, his helper ever since. |
| Silhouette | Lean, light on his feet, blue judogi, headband, always a small bag over one shoulder (the sandwich bag — persistent prop). Reads by the bag and the bounce in his idle. |
| Palette | Blue gi, brown belt, yellow headband, red club patch. |
| Personality | Cheerful, loud, chronically optimistic. Narrates his own fights. Genuinely believes any problem can be solved with speed, a foot sweep, and a proper lunch. Adores Idris and shows it by never shutting up. |
| Fighting identity | **SPEED & COUNTERS.** Fastest dash, fastest grip startup, lowest grip strength. Signature throws: **учи-мата**, **томоэ-нагэ** (sacrifice throw, sends enemies backward over him), **дэ-аси-барай** foot sweeps that knock down whole rows. Best air game — can grab mid-jump. |
| Weakness | Big enemies (E2, E8) resist his throws unless he sweeps or counters first. |
| Signature | **ОБЕДЕННЫЙ ПЕРЕРЫВ** — the sandwich pickup. Otajon eats health items with a full 8-frame animation and gets a 3-second attack-speed buff on top of the heal. Only he gets the buff. |

**Otajon quips (OQ1–OQ8)** — max 24 Cyrillic characters displayed:

- OQ1 — «Медленно! Давай, давай!» (Too slow! Come on, come on!)
- OQ2 — «Это была разминка!» (That was the warm-up!)
- OQ3 — «Тренер! Ты видел?!» (Coach! Did you see that?!)
- OQ4 — «Уже обед? ...Ура!» (Is it lunch yet? ...Ura!)
- OQ5 — «Дерёшься как холодный плов.» (You fight like cold plov.)
- OQ6 — «Чай стынет. Ты приглашён.» (The tea's getting cold. You're invited.)
- OQ7 — *(idle, chewing)* «Секунду... всё, готов.» (One second... okay, ready.)
- OQ8 — *(low health)* «Мне бы бутерброд!» (I could really use a sandwich!)

### 3.2.3 Banter Rule

At the start of every level, one two-line exchange plays over gameplay (no camera stop). Idris always gets the last word, and it is always shorter. Example (W2L1):
**ОТАЖОН:** «Тренер, тут сорок выходов!» (Coach, this bazaar has forty exits!) / **ИДРИС:** «Хорошо. Им пригодятся.» (Good. They'll need them.)

---

## 3.3 Villain Roster

### 3.3.1 B5 — REX "THE SNAKE" STERLING / РЕКС «ЗМЕЙ» СТЕРЛИНГ (Final Boss, W5)

Sequined gold tuxedo jacket over a fight-worn tracksuit, snakeskin boots, bolo tie, spray tan, a headset mic he never takes off, and a championship belt he did not earn slung over one shoulder. A Las Vegas fight mogul: owns the arena, owns the broadcast, owns the judges. Talks entirely in television — «шоу», «цифры», «бренд», «прайм-тайм». He is genuinely a good fighter — that's the joke and the threat — a former collegiate wrestler who quit because winning honestly didn't sell tickets. He is a coward exactly once, at the very end, and it costs him.

- **Gimmick:** he never starts the fight. Phase 1 he sits ringside and sends waves of **E8 Gold Jackets** while the cage floor electrifies in telegraphed neon strips. Phase 2 he fights with a **counter-grip**: any grab attempt not preceded by a broken guard is reversed into his own throw. Phase 3 he cuts the lights and fights in strobe with the crowd screaming, and the only reliable damage is throwing his own Gold Jackets into him.
- **Barks:** «Ты не звезда, старик. Ты повтор!» (You're not a star, old man — you're a rerun!) / «У всех есть цена. Твоя — копеечная.» (Everybody's got a price. Yours is pocket change.) / «Это прайм-тайм, детка! РЕЙТИНГИ!» (This is prime time, baby! RATINGS!)

### 3.3.2 Mid-Bosses

| ID | Name (team / in-game RU) | World | Look | Personality | Gimmick |
|---|---|---|---|---|---|
| **B1** | **Dale "Padlock" Pruitt** / **Дэйл «Замок» Пруитт** | W1 | Ex-linebacker stuffed into a rented inspector's suit, laminated badge from a copy shop, clipboard chained to his wrist, ring of giant padlocks on his belt. | Pompous, officious, quotes regulations he invented that morning. | Chains one hero to a floor ring for 4s; you fight as (or free) the other. Throwing an **E1** into him snaps the chain. |
| **B2** | **Cleo "The Kite" Vance** / **Клео «Кайт» Вэнс** | W2 | Ex-casino-revue aerialist in a patchwork glider-jacket, goggles, the students' medals sewn onto her sash like coins. | Giggling, showy, treats the rooftops as her stage. Never lands if she can help it. | Untouchable while airborne — must be baited down by breaking the awnings she perches on. Steals a pickup on contact. |
| **B3** | **"Boxcar" Bruno Marchetti** / **«Бокскар» Бруно Маркетти** | W3 | Mountain of a biker in a stolen conductor's cap two sizes too small, cut-off leather vest over a soot-black undershirt, coal shovel. | Slow, sincere, deeply proud of being a conductor for exactly one night. | The train enters tunnels: the arena goes dark for 3s, lit only by shovel sparks, and he charges along a telegraphed track line. |
| **B4** | **Denny "The Crane" Hollis** / **Дэнни «Кран» Холлис** | W4 | Yellow rain slicker over a bowling shirt, magnet-crane remote bolted to his forearm, hard hat with a gold snake decal and three sponsor stickers. | Nervous, chatty, hides behind machinery; the most cowardly of the four. | Operates a magnetic container crane from a cab: drops containers on telegraphed shadows, hoists the hero briefly. Only vulnerable when a thrown enemy shatters the cab glass. |

**Mid-boss fight barks (shipped strings, 3 each):**

- **B1 — ПРУИТТ:** «Пункт девять, параграф двенадцать: ты ПРОИГРАЛ!» (Section nine, paragraph twelve: you LOSE!) / «Объект ЗАКРЫТ. Как и ты!» (This facility is CONDEMNED. Like you!) / «Мне нужно это в трёх копиях. И пояс!» (I'll need that in triplicate. And the belt!)
- **B2 — КЛЕО:** «Догоняй, дедуля!» (Catch me, grandpa!) / «Блестит — значит, моё!» (If it's shiny, it's mine!) / «Змей платит за каждую медаль!» (The Snake pays for every medal!)
- **B3 — БРУНО:** «Билетики! ...А билетиков-то нет.» (Tickets! ...You've got no tickets.) / «Теперь это МОЙ поезд!» (This is MY train now!) / «Следующая остановка — ПОЛ!» (Next stop — the FLOOR!)
- **B4 — ХОЛЛИС:** «Ты теперь груз! По накладной — МЕТАЛЛОЛОМ!» (You're cargo now! Manifest says SCRAP!) / «Не надо... не лезь сюда, у меня КОНТРАКТ!» (Don't— don't come up here, I've got a CONTRACT!) / «Одна кнопка, старик. ОДНА КНОПКА!» (One button, old man. ONE BUTTON!)

### 3.3.3 Regular Enemies (E1–E8)

Design names are **internal** (English) — enemies are never named in dialogue. The Russian display names below are used only on the score screen / bestiary.

| ID | Name (team / RU) | Silhouette read | Behavior (one line) |
|---|---|---|---|
| **E1** | **Clipboard** / «Планшет» | Thin suit, tie, clipboard held like a shield, Syndicate jacket. | The basic goon — approaches, swings the clipboard, and is the game's tutorial for кумиката; the cheapest projectile in the game. |
| **E5** | **Tracksuit** / «Спортивка» | Matching gold-striped tracksuit, gym bag, hair gel. | Syndicate-trained grappler who tries to grab *you* — the first enemy that teaches grip-vs-grip priority. |
| **E2** | **Barrel** / «Бочка» | Huge round torso, tiny head, weightlifting belt. | Walks straight through your first grab attempt; must be staggered (Otajon sweep / Idris hold-break) before any throw connects. |
| **E4** | **Sneaker** / «Кроссовок» | Skinny, high-tops, hunched sprint pose. | Darts in and out at speed, punishing whiffed grips; never blocks, always flees to the screen edge. |
| **E7** | **Kite Boy** / «Летун» | Cloth wing-cape, goggles, always drawn above the horizon line. | Cleo's crew — glides in from off-screen, drops onto you, and cannot be grabbed until he touches the ground. |
| **E6** | **Turnstile** / «Турникет» | Riot shield, helmet, low crouch, plated legs. | Advances behind the shield and blocks all frontal grips; must be circled on the belt-scroll Z-axis or hit with a thrown body. |
| **E3** | **Melonhand** / «Арбузник» | Apron, crate on one shoulder, wide stance. | Stands at the back of the arena lobbing melons/crates in arcs — pressure that forces you off your preferred lane. |
| **E8** | **Gold Jacket** / «Золотой пиджак» | Sequined gold blazer, sunglasses at night, arms crossed. | Sterling's elite bouncer — counters any un-set-up grab with a throw of his own, and is the only regular enemy that punishes greed. |

---

## 3.4 World-by-World Scenario

**Structure:** 5 worlds. W1–W4 are three levels each (two traversal/combat levels + a mid-boss level). W5 is two levels + the final boss. Level tables list the **Russian display name** (what the player sees on the stage card) and the English working title used by the team.

### 3.4.1 W1 — «ГОРНОЕ СЕЛО» / THE MOUNTAIN VILLAGE (dawn)

*Why they're here:* This is home. The gym has been padlocked and the belt is gone; before they leave the mountain they need to know who took it and where they went.

| ID | Display / working title | Beat | Setpiece | Enemy debuts |
|---|---|---|---|---|
| **W1L1** | «Утренняя тренировка» / "Morning Practice" | Playable tutorial *before* the crime. Dawn light through the gym windows, thirty kids drilling on the mats, the championship belt in its glass case. Idris teaches the player the Grip System by demonstrating on cheerfully bouncing volunteers; Otajon narrates every throw like a commentator. A helicopter shadow crosses the windows. Sterling's offer, Idris's four-word answer, hard cut to black. | The **glass case shot** — camera pushes in on the belt, holds two beats, screen tears to the title card. | — (tutorial dummies) |
| **W1L2** | «Замок на дверях» / "Padlocked" | Sunrise. The heroes return to a gym wrapped in chain, the medal wall bare, a forged notice nailed to the door with Idris's signature on it. Clipboards and Tracksuits are still loading crates into a truck outside; the fight spills from the yard down the village street, past the bakery, into the sheep pens. Otajon is furious. Idris is quiet, which is worse. | The **truck escape** — the last crate of medals drives off as the player fights, and no matter how fast you clear the wave, it leaves. Deliberate. | E1, E2, E5 |
| **W1L3** | «Пункт девятый» / "Section Nine" *(Boss B1)* | The heroes corner **Пруитт** on the mountain switchback road, standing on the tailgate of the stalled truck, reading regulations aloud. Cliff-side parallax of the whole valley at dawn. Beating him yields **one** medal and a bus ticket stub to the city bazaar. | **Chain-and-throw** — Pruitt chains one hero to the truck; the other must throw goons at him to break it, teaching "enemies are ammo." | — |

### 3.4.2 W2 — «БАЗАР И КРЫШИ» / THE BAZAAR & ROOFTOPS (day)

*Why they're here:* The stolen medals are being fenced through the bazaar, sold one at a time to collectors. Every medal has a kid's name on it.

| ID | Display / working title | Beat | Setpiece | Enemy debuts |
|---|---|---|---|---|
| **W2L1** | «Всё на продажу» / "Everything Must Go" | Blazing midday, seven parallax layers of awnings, spice sacks, brass, hanging carpets. Belt-scroll combat through crowded stalls where the scenery is ammunition: melons, crates, rolled rugs. Melonhands lob fruit from behind stalls; a friendly tea seller hands out health if you don't break his cart. | **Carpet ride** — a thrown enemy tears down a hanging carpet, opening a shortcut across the market square. | E3 |
| **W2L2** | «Над навесами» / "Above the Awnings" | Platforming ascent: awning-bounce chains, laundry lines, rooftops, pigeon flocks that burst on contact. Kite Boys glide in from off-screen. Pure Aladdin-run traversal with combat pockets on flat roofs. | **Awning cascade** — a chain of six bounces with camera pull-back at the apex, medals raining as collectibles. | E4, E7 |
| **W2L3** | «Кайт» / "The Kite" *(Boss B2)* | **Клео** perches above the clocktower with the medal sash. Vertical arena of three awning tiers; she taunts, dives, and steals a pickup every 20 seconds. Beat her and the sash bursts — a shower of medals in slow motion, Otajon catching them in his sandwich bag. The last medal carries a note: *«ЗОЛОТАЯ КЛЕТКА — В ПЯТНИЦУ»* (Golden Cage — Friday). | **The medal rain** — 30 medals fall, each displaying a student's name as you collect it. Emotional beat, no combat. | E6 |

### 3.4.3 W3 — «НОЧНОЙ ПОЕЗД» / THE NIGHT TRAIN (night, moving vehicle)

*Why they're here:* The belt itself is on the last train through the mountains, in a locked freight car, headed for the port.

**Design mandate:** W3 is a **continuous right-moving vehicle level.** The camera never stops scrolling right for the entire world; arenas are car-shaped, transitions are jumps between cars, and the parallax mountain line, tunnel blackouts, and rain of sparks run unbroken from W3L1 to the boss. Falling off the train is an instant life loss, not a pit death — the announcer yells **«С ПОЕЗДА!»** (Off the train!).

| ID | Display / working title | Beat | Setpiece | Enemy debuts |
|---|---|---|---|---|
| **W3L1** | «Последний поезд» / "Last Train Out" | The heroes catch the train at a mountain halt — Otajon literally throwing Idris onto the coupling. Passenger cars: narrow lanes, luggage racks as breakables, Turnstiles blocking the aisles so the only way forward is over the seats or onto the roof. | **Coupling jump** with a full-speed camera pan down the length of the train. | — |
| **W3L2** | «По крышам вагонов» / "Roof Riders" | On top of the train at speed. Wind pushes the heroes leftward, tunnels force ducking on a 3-second telegraph, Sneakers sprint the roofline. Combat happens between tunnel warnings — an enforced rhythm. Otajon's sandwich blows away in a gag animation and he is *devastated*: **ОТАЖОН:** «НЕТ! Он был с мясом!» (NO! That one had meat in it!) | **Tunnel gauntlet** — five tunnels in twelve seconds, silhouette-only lighting, enemies knocked off by tunnel mouths if you time throws right. | — |
| **W3L3** | «Бокскар» / "Boxcar" *(Boss B3)* | Freight car interior, belt visible in a strongbox chained to the far wall. **Бруно** blocks it with a coal shovel and a conductor's cap. Fight cycles through tunnel blackouts. On defeat the strongbox opens: empty, except a photograph of Sterling holding the belt at the port. Bruno, sitting on the floor, apologizes honestly — **БРУНО:** «Мужики... мне сказали, это реквизит.» (Guys... they told me it was a prop.) — and gives them a sandwich. Otajon nearly cries. | **Tunnel charge** — 3 seconds of darkness, one telegraphed spark-line showing Bruno's charge lane. | — |

### 3.4.4 W4 — «ПОРТ И СУХОГРУЗ» / THE PORT & THE CARGO SHIP (heavy rain)

*Why they're here:* The belt and the last crate of medals ship out at dawn. This is the final chance to catch it on land.

| ID | Display / working title | Beat | Setpiece | Enemy debuts |
|---|---|---|---|---|
| **W4L1** | «Причал под дождём» / "Dockside, Raining" | Night rain, sodium lamps, puddle reflections, containers stacked five high. Slippery-floor modifier: throws slide targets an extra distance, chaining collisions. Syndicate crews load crates under floodlights. First Gold Jackets, on the gangway. | **Reflection frame** — a full-screen puddle reflection of the two heroes walking into the floodlights. Pure style. | E8 |
| **W4L2** | «Контейнерный забег» / "Container Run" ⚑ *Aladdin-homage escape* | **The chase sequence.** Hollis panics and starts collapsing the container stacks behind the heroes with the magnet crane. Forced left-to-right auto-scroll at high speed: containers topple in from the right, walkways drop away one frame behind Idris's heels, chains snap, a fuel-drum wall explodes. No combat — pure reactive platforming with 3-frame telegraphs, one continuous unbroken shot, rising musical stinger. Ends with both heroes leaping onto the moving ship's ramp as the dock behind them folds into the water. | The **whole level** is the setpiece. Death restarts at generous checkpoints (every 8s) — this must feel exhilarating, never punishing. | — |
| **W4L3** | «Кран» / "The Crane" *(Boss B4)* | Ship deck in the storm. **Холлис** hides in the crane cab overhead, dropping containers on shadow telegraphs, hoisting the heroes by the belt. Goons feed in from the hold. Break the cab glass with a thrown Gold Jacket, drag him down, and he surrenders instantly and tells them everything: the belt was never shipped. It's hanging over the ring at the Golden Cage — and the kids' championship is being held there tonight, on pay-per-view. | **Cab break** — glass shatter in slow motion, Hollis clinging to the crane hook as it swings over the sea, begging. | — |

### 3.4.5 W5 — «ЗОЛОТАЯ КЛЕТКА» / THE GOLDEN CAGE (neon night, finale)

*Why they're here:* Everything is in one building: the belt, the medals, the students, and the Snake.

| ID | Display / working title | Beat | Setpiece | Enemy debuts |
|---|---|---|---|---|
| **W5L1** | «Правила заведения» / "House Rules" | Vegas casino floor: neon, slot machines, gold carpet, mirrored ceilings, a forty-foot Sterling billboard outside the windows. Every enemy archetype returns in mixed waves, escalating. Breakable slot machines spray coin-particles that convert to score. Security shutters drop, forcing arena-lock fights. The announcer is *diegetic* here — the building's PA is calling your fight. | **Mirror hall** — a corridor where enemy reflections outnumber enemies; readability test, played straight, then subverted once. | — (all return) |
| **W5L2** | «За кулисами» / "Backstage" | Behind the arena: catwalks, lighting rigs, and the pay-per-view control room, where the heroes see the monitors — thirty kids in a holding room, told they'll fight tonight or go home with nothing. Idris gets his only angry line of the game: **ИДРИС:** «Дети. Не товар.» (Children. Not merchandise.) Vertical platforming ascent to the cage. | **The monitor wall** — 30 screens, one per medal collected in the run; uncollected medals show static. Direct payoff for W2L3. | — |
| **W5L3** | «Золотая клетка» / "The Golden Cage" *(Boss B5)* | Three-phase Sterling fight in a raised cage under the stolen belt, crowd roaring, cameras live. Phase 1: Gold Jacket waves + electrified floor strips. Phase 2: Sterling's counter-grip duel. Phase 3: strobe, chaos, and throwing his own men into him. Final blow is a scripted **сэои-нагэ** in slow motion, cameras flashing, announcer screaming **«ИППОН!»** — and the belt falls off its hook into Idris's hands. | **The final сэои-нагэ** — full-screen freeze frame on the throw's apex, crowd silhouetted, one white flash. | — |

---

## 3.5 Cutscene Scripts

*Everything in quotes below is a shipped Russian string. English in parentheses is the internal gloss and is never displayed.*

### 3.5.1 CS-INTRO — Attract Mode (12 panels, pixel-art stills + caption bar)

Captions are white pixel type on a black bar, bottom third. Each panel holds 2.5s, or advances on any button. Full sequence skippable with START.

1. **PANEL 1** — Mountains at dawn, one lit window. *CAPTION:* «ВЫСОКО В ГОРАХ ДАГЕСТАНА...» (High in the mountains of Dagestan...)
2. **PANEL 2** — Interior: thirty kids bowing onto the mat. *CAPTION:* «...ЕСТЬ КЛУБ «ПАТРИОТ».» (...there is a club called Patriot.)
3. **PANEL 3** — Close on Idris's hands adjusting a kid's grip. *CAPTION:* «ТРЕНЕР ИДРИС УЧИТ ОДНОМУ. ЗАХВАТУ.» (Coach Idris teaches one thing. The grip.)
4. **PANEL 4** — Otajon mid-учи-мата, grinning, sandwich in his belt. *CAPTION:* «ОТАЖОН УЧИТ ВСЕМУ ОСТАЛЬНОМУ.» (Otajon teaches everything else.)
5. **PANEL 5** — The belt in its glass case, medals on the wall behind it. *CAPTION:* «В ПЯТНИЦУ — ПЕРВЕНСТВО СРЕДИ ЮНОШЕЙ.» (Friday: the youth championship.)
6. **PANEL 6** — Helicopter shadow across the mat. **СТЕРЛИНГ:** «Тренер! Поговорим о ТЕЛЕВИДЕНИИ.» (Coach! Let's talk TELEVISION.)
7. **PANEL 7** — Sterling, gold tuxedo jacket, briefcase open, camera crew rolling. **СТЕРЛИНГ:** «Твои бойцы. Моя клетка. Деньги Вегаса.» (Your fighters. My cage. Vegas money.)
8. **PANEL 8** — Idris, arms folded, four words. **ИДРИС:** «Мои дети — не товар.» (My kids are not merchandise.)
9. **PANEL 9** — Night. Chain through the door handles. Empty glass case, spider-webbed. *CAPTION:* «В ТУ НОЧЬ ЗАБРАЛИ ВСЁ.» (That night, they took everything.)
10. **PANEL 10** — The forged notice, Idris's name signed at the bottom. *CAPTION:* «И ПОДПИСАЛИСЬ ЕГО ИМЕНЕМ.» (And they signed his name to it.)
11. **PANEL 11** — Dawn. Two silhouettes at the top of the mountain road. **ОТАЖОН:** «Тренер... идти далеко.» (Coach... it's a long walk.) **ИДРИС:** «Значит, выходим сейчас.» (Then we start now.)
12. **PANEL 12** — Title slam: **«ПАТРИОТ»**. *ANNOUNCER (VO):* «ПРИГОТОВИТЬСЯ... ХАДЗИМЭ!» (Get ready... hajime!)

### 3.5.2 VS-Card Exchanges

Format: split card, hero portrait left, boss portrait right, name plates, «VS» burst center. Lines alternate L/R in a caption strip. 2–4 lines per side. Full card duration ≤ 6s.

**VS-B1 — «Замок» Пруитт (W1L3)**
- **ПРУИТТ:** «Объект закрыт! Подписано и опечатано!» (This facility is condemned! Signed and sealed!)
- **ПРУИТТ:** «Вы на территории Синдиката.» (You're on Syndicate property.)
- **ИДРИС:** «Это мой зал.» (This is my gym.)
- **ИДРИС:** «И ты стоишь на моём ковре.» (And you're standing on my mat.)

**VS-B2 — Клео «Кайт» Вэнс (W2L3)**
- **КЛЕО:** «Тридцать медалей! Тридцать имён!» (Thirty medals! Thirty names!)
- **КЛЕО:** «Забирай, дедуля, — если летать умеешь!» (Come and take them, grandpa — if you can fly!)
- **ОТАЖОН:** «Я не летаю. Я ловлю.» (I don't fly. I catch.)
- **ОТАЖОН:** «Давай — спускайся и повтори.» (Come on — come down and say that again.)

**VS-B3 — «Бокскар» Бруно (W3L3)**
- **БРУНО:** «Билетики. ...А билетиков нет.» (Tickets. ...You've got no tickets.)
- **БРУНО:** «Бесплатно на моём поезде не ездят!» (Nobody rides my train for free!)
- **ИДРИС:** «Мы не едем. Мы забираем.» (We're not riding. We're collecting.)
- **ИДРИС:** «Отойди, проводник.» (Step aside, conductor.)

**VS-B4 — Дэнни «Кран» Холлис (W4L3)**
- **ХОЛЛИС:** «Одна кнопка — и ты груз, старик!» (One button and you're cargo, old man!)
- **ХОЛЛИС:** «Сорок тонн! Сорок! Посчитай!» (Forty tons! Forty! Do the math!)
- **ОТАЖОН:** «Я считаю до ужина.» (I'm counting down to dinner.)
- **ОТАЖОН:** «А ты стоишь на пути.» (And you're in the way.)

**VS-B5 — Рекс «Змей» Стерлинг (W5L3)**
- **СТЕРЛИНГ:** «Смотри, какой зал! Какие ЦИФРЫ!» (Look at this house! Look at these NUMBERS!)
- **СТЕРЛИНГ:** «У тебя тридцать детей. У меня тридцать МИЛЛИОНОВ.» (You've got thirty kids. I've got thirty MILLION.)
- **СТЕРЛИНГ:** «Я давал тебе прайм-тайм. Ты сказал нет.» (I offered you prime time. You said no.)
- **ИДРИС:** «Я сказал: дети — не товар.» (I said: kids are not merchandise.)
- **ИДРИС:** «Надо было слушать.» (You should have listened.)

### 3.5.3 CS-END — «Пятница» / "Friday" (post-final-boss)

- **SHOT 1** — The Golden Cage, silent. Sterling flat on the mat, counted out by the arena PA. Idris holds the belt. Otajon holds the sandwich bag full of medals.
- **SHOT 2** — Sterling, propped on one elbow, headset dangling. **СТЕРЛИНГ:** «Стой... стой. Реванш. Платный эфир. Назови сумму.» (Wait... wait. Rematch. Pay-per-view. Name your number.)
- **SHOT 3** — Idris looks at him for a long beat. **ИДРИС:** «Вторник. Шесть утра. Кроссовки не забудь.» (Tuesday. Six a.m. Bring shoes.) *(He drops a Patriot club flyer on Sterling's chest.)*
- **SHOT 4** — Wipe to the mountain village, Friday morning, sun up. The gym doors, chain cut, standing open.
- **SHOT 5** — Thirty kids in a line. Otajon returns each medal by name, reading off the back of it. **ОТАЖОН:** «Так... эта твоя. Эта — твоя. Больше не теряем!» (Right... this one's yours. This one's yours. No losing them again!) Idris hangs the belt back in the repaired case.
- **SHOT 6** — Wide shot: the championship, actually happening, kids on the mat, the whole village in the doorway. **ОТАЖОН:** «Тренер. Мы смогли.» (Coach. We did it.) **ИДРИС:** «Они смогли. Мы просто дошли.» (They did it. We just walked there.)
- **SHOT 7** — Freeze frame on the two of them bowing onto the mat. Credits roll over gameplay-style parallax of all five worlds.

### 3.5.4 CS-POSTCREDITS — Gag

Interior, клуб «Патриот», Tuesday, 6:00 a.m. Sterling — gold jacket gone, headset gone, in a borrowed white gi three sizes too big, hair flat, spray tan fading — stands at the edge of the mat looking miserable. Idris, off-screen: **ИДРИС:** «Захват.» (Grip.) Sterling reaches out. Instant cut to a hard **о-госи** freeze frame, Sterling's legs straight up in the air. Otajon, from the bench, mouth full: **ОТАЖОН:** «Ура! Прирождённый.» (Ura! A natural.) *CAPTION:* «ПАТРИОТ ВЕРНЁТСЯ.» (The Patriot will return.) Beat. Second caption: «АБОНЕМЕНТ ОПЛАЧИВАЕТСЯ ОТДЕЛЬНО.» (Membership fees not included.)

---

## 3.6 Dialogue & VS-Card System Spec

- **D1 — Portrait source.** Hero portraits are hand-pixeled from the developer's real reference photographs at 64×64, 16-color palette, upscaled 2× for VS cards (128×128). Hero portraits need 4 states: **neutral, shout, hurt, victory.** Bosses need **neutral + shout** only.
- **D2 — VS card composition.** 320×224 base resolution. Hero portrait anchored left with a 12px angled Cyrillic name plate («ИДРИС» / «ОТАЖОН»); boss portrait right, mirrored; «VS» starburst center at 3-frame flash. Diagonal scan-line wipe in, 8 frames; hold; wipe out, 8 frames.
- **D3 — Line length (Russian source).** VS-card and cutscene caption lines: **max 34 Cyrillic characters**, hard wrap, **max 2 lines on screen at once**. Combat barks (IQ/OQ, boss barks): **max 24 Cyrillic characters, single line**, drawn as a speech tag above the sprite for 1.2s. Cyrillic runs ~15% wider than Latin at equal character count — budget by pixel width, not glyph count, and test every string against the widest glyphs (Ж, Щ, Ы, М).
- **D4 — Typography.** The pixel font must ship the **full Cyrillic set** including Ё, Ъ, Ы, Э, Ж, Щ — no substitutions, no missing-glyph boxes. Dialogue uses Russian «ёлочки»; nested quotes use „лапки“. Dashes are the em dash — with spaces, never a hyphen. Never uppercase a string containing Й or Ё unless the font has proper caps for both.
- **D5 — Reveal speed.** Text types at 30 characters/second. Any button press fills the current line instantly; a second press advances. Never auto-advance a line the player hasn't fully seen.
- **D6 — Skip rules.** START skips the entire cutscene (intro, VS card, ending) with a 0.5s confirm flash to prevent accidental skips on the first playthrough. VS cards are individually skippable but **never auto-skipped** — they're part of the arcade feel. A «ПРОПУСКАТЬ ЗАСТАВКИ» toggle appears in Options only after the first full clear.
- **D7 — Announcer.** Separate audio+text channel, centered ALL-CAPS burst text (no bar), max 14 Cyrillic characters. Canon calls: «ХАДЗИМЭ!» (fight start), «ИППОН!» (clean signature throw), «ВАЗА-АРИ!» (partial throw / big hit), «ОСАЭКОМИ!» (hold begins), «С ПОЕЗДА!» (W3 fall), «ИДЕАЛЬНО!» (no-damage clear), «РАУНД ПЕРВЫЙ!» (boss intro). Never overlaps a caption bar.
- **D8 — Bark priority.** If two barks fire on the same frame: boss > hero low-health > hero victory > enemy > idle. Never two speech tags on screen simultaneously.
- **D9 — Localization.** **Russian is the source language.** All strings externalized with Russian as key content; English and other locales are downstream translations. The English glosses in this document are internal reference and must never enter the string table. Judo terms stay in Russian transliteration (сэои-нагэ, иппон, хадзимэ) across every locale — terminology, not prose. «Ура!» / «Давай!» are never re-translated in any build. Latin locales get a 20% width overflow budget relative to the Russian source strings.
- **D10 — Co-op.** In 2P, the hero side of a VS card shows both portraits stacked at 75% scale; the exchange uses P1's hero lines. Banter lines (3.2.3) play in full in 2P and are shortened to one line in 1P.

---

## 3.7 Names & Glossary (Canon Table)

| Term (team) | In-game Russian | Type | Canon definition / usage |
|---|---|---|---|
| **THE PATRIOT** | «ПАТРИОТ» | Title | Title card and marketing. Refers to the club, not a person. |
| **Patriot Judo Club** | клуб «Патриот» | Org | Idris's club in the mountain village. Badge: a bear seated on a mat, red on white. |
| **Idris (H1)** | Идрис | Character | Head coach, 40. Never given a surname. |
| **Otajon (H2)** | Отажон | Character | Assistant coach, 25. Never given a surname. |
| **Rex "The Snake" Sterling (B5)** | Рекс «Змей» Стерлинг | Character | Las Vegas pay-per-view fight mogul, final boss. Nickname always in «ёлочки» on nameplates. |
| **Sterling Fight Syndicate** | Синдикат Стерлинга | Org | «Синдикат» on second reference. Gold-and-black jackets, coiled-snake-over-dollar-sign logo, Las Vegas HQ. |
| **Dale "Padlock" Pruitt (B1)** | Дэйл «Замок» Пруитт | Character | W1 mid-boss, fake safety inspector, ex-linebacker. |
| **Cleo "The Kite" Vance (B2)** | Клео «Кайт» Вэнс | Character | W2 mid-boss, rooftop aerialist. |
| **"Boxcar" Bruno Marchetti (B3)** | «Бокскар» Бруно Маркетти | Character | W3 mid-boss, biker posing as a conductor. Redeemed on defeat. |
| **Denny "The Crane" Hollis (B4)** | Дэнни «Кран» Холлис | Character | W4 mid-boss, crane operator. Surrenders on defeat. |
| **Clipboard (E1)** | «Планшет» | Enemy | Basic Syndicate goon. |
| **Tracksuit (E5)** | «Спортивка» | Enemy | Grappler goon. |
| **Barrel (E2)** | «Бочка» | Enemy | Heavy; resists first grab. |
| **Sneaker (E4)** | «Кроссовок» | Enemy | Fast harasser. |
| **Kite Boy (E7)** | «Летун» | Enemy | Airborne glider. |
| **Turnstile (E6)** | «Турникет» | Enemy | Shield blocker. |
| **Melonhand (E3)** | «Арбузник» | Enemy | Ranged thrower. |
| **Gold Jacket (E8)** | «Золотой пиджак» | Enemy | Elite counter-grabber, W4+. |
| **W1 — Mountain Village** | «Горное село» | World | Dawn. W1L1–W1L3. |
| **W2 — Bazaar & Rooftops** | «Базар и крыши» | World | Day. W2L1–W2L3. |
| **W3 — Night Train** | «Ночной поезд» | World | Night, continuous right-scroll vehicle level. |
| **W4 — Port & Cargo Ship** | «Порт и сухогруз» | World | Rain. W4L1–W4L3. |
| **W5 — The Golden Cage** | «Золотая клетка» | World / Location | Sterling's Las Vegas-style casino-arena, neon night finale. |
| **The Championship Belt** | чемпионский пояс | MacGuffin | The club's belt. «Пояс» on second reference. |
| **The Medals** | медали учеников | MacGuffin | 30 student medals, each with a name on it. Collectible count = 30. |
| **The Grip System** | система захвата / кумиката | Mechanic | Core mechanic. In-fiction «кумиката». Never «система хватания». |
| **HOLD** | «Удержание» (осаэкоми) | Mechanic | Idris's pin. Announcer counts. |
| **LUNCH BREAK** | «Обеденный перерыв» | Mechanic | Otajon's eat-buff. |
| **Throws** | сэои-нагэ / о-госи / учи-мата / томоэ-нагэ / о-сото-гари / харай-госи / дэ-аси-барай | Moves | Russian judo transliteration, lowercase in prose, CAPS in UI. |
| **Announcer calls** | «Хадзимэ!» / «Иппон!» / «Ваза-ари!» / «Осаэкоми!» | Announcer | Fixed set — see D7. Never localized away. |
| **Ура! / Давай!** | «Ура!» / «Давай!» | Flavor | Heroes only. Never used by villains, never re-translated in any locale. |
| **Chai / Plov** | чай / плов | Flavor | Otajon's food references only. Always affectionate. |

---

# PART 2 — COMBAT, PHYSICS & ENEMIES

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

---

# PART 3 — ART DIRECTION & GROK PROMPT PACK

*Owner: Art Director. Status: canon for all asset production. Any deviation requires AD sign-off in writing.*

---

## 4.1 Art Direction Statement

THE PATRIOT is a love letter rendered in 16 bits: the fluid, boneless personality of *Aladdin* (Genesis) fused to the chunky, high-contrast readability of *TMNT: Turtles in Time*, staged inside a 1990s arcade cabinet that never actually existed. Every frame is hand-authored pixel art — no filters, no upscales, no vector tracing. Backgrounds are painterly and layered, built from big confident color shapes with tight cluster detail only where the eye lands; characters are bold, warm, and instantly legible at arm's length in a bright room. Idris and Otajon are drawn as *heroes and as real men* — affectionate, dignified, recognizable to anyone who trains with them — while the Sterling Fight Syndicate's goons are broad, funny, rubbery **90s American action-movie henchmen** (clipboard-waving gatekeepers in cheap suits, ex-linebacker heavies, riot-shield security, glider-caped rooftop harassers, gold-blazered Vegas elites) who telegraph everything they do. The game must read as "expensive cartridge era": deep parallax, animated crowds, rain that lands, throws that hit like a truck, and a big brass IPPON stamp that slams the screen.

### Hard Style Rules (non-negotiable)

| # | Rule | Specification |
|---|---|---|
| **SR-1** | **Outline policy** | All *characters, enemies, pickups, and foreground props* carry a **1px selective dark outline**. Selective = the outline color is a darkened, hue-shifted derivative of the adjacent fill (never pure `#000000` except for the deepest core shadow on W5 neon stages). Outlines thin to zero on top-lit edges. **Backgrounds are un-outlined** — separation comes from value contrast and atmospheric desaturation. |
| **SR-2** | **Cluster shading only** | Shading is built from **contiguous clusters of flat color** with clean, deliberate anti-shaped edges. Ramps are **3–4 steps per material** (shadow / base / light / spec-hit). No soft gradients, no painted blends, no per-pixel noise. Cluster edges follow form, not scanlines. |
| **SR-3** | **Palette discipline** | Every asset draws from its world sub-palette + the master constants (§4.3). No off-palette color may enter a shipped asset. Hue-shift all ramps (shadows drift cool/violet, highlights drift warm/yellow) — never darken by lowering value alone. |
| **SR-4** | **Silhouette-first readability** | Every character pose must be identifiable as a **pure black silhouette at 100% zoom**. Test gate: fill the sprite black, show it to someone off-team, they must name the action (grip / throw / getup / hurt) in under 2 seconds. Enemy classes must be distinguishable by silhouette alone (headwear, bulk, stance width). |
| **SR-5** | **Banned techniques** | ❌ Automatic/algorithmic dithering ❌ Bayer & noise dither patterns ❌ Anti-aliasing generated by resampling ❌ Gaussian blur, bloom baked into sprites ❌ Non-integer scaling or rotation baked into art ❌ Photo textures, gradient maps, "pixelate filter" output ❌ Pure-black `#000000` outlines on organics ❌ 45°-only pixel-perfect lines used decoratively (banding). *Hand-placed* dither is permitted **only** for W3 night sky bands and W4 rain haze, max 2 adjacent ramp steps. |
| **SR-6** | **Never caricature the heroes** | Idris and Otajon are real people. Exaggeration is permitted in *motion* (smears, squash/stretch, anticipation) and never in *anatomy of the face*. No enlarged noses, no comedy proportions, no gag expressions. Heroic, warm, likable, dignified — always. Villains carry 100% of the cartoon exaggeration budget. **And the villains are exaggerated as *characters*, never as a nationality:** the Sterling Fight Syndicate is American, and the target of the parody is 1990s pay-per-view fight-promoter excess — gold chains, cheap suits, Vegas showmanship — never America, its flag, or its people. No national flags, no stars-and-stripes motifs, no eagles, no political iconography anywhere in villain design. |

---

## 4.2 Technical Specification

### 4.2.1 Logical resolution

**480 × 270 logical pixels, 16:9.**

> *Justification (one line):* 480×270 is the largest 16:9 canvas that still reads as authentic 16-bit chunk while giving us the ~2× horizontal room over SNES 256×224 that a belt-scroll brawler needs for 4 simultaneous bodies plus throw arcs — and it scales by clean integers to 960×540, 1440×810, and 1920×1080 (4×), which covers every target display and Android WebView without a single fractional pixel.

| Parameter | Value | Notes |
|---|---|---|
| Logical buffer | `480 × 270` | Offscreen canvas, `imageSmoothingEnabled = false` |
| Integer scales | 1× / 2× / 3× / 4× | 4× = exactly 1920×1080 |
| Letterbox color | `#0B0A10` | Master constant `UI_LETTERBOX` |
| Tile size | **16 × 16 px** | All collision & terrain. Sub-tiles at 8×8 for trim/decals only |
| Metatile | **48 × 48 px** (3×3) | Authoring unit for tilesets |
| Playfield floor band | 96 px tall (y=150→246) | Belt-scroll depth zone, 4 walk lanes |
| Target framerate | 60 fps render / 60 Hz logic | Animation authored at 12/15/20/30 fps, stepped |
| Colorspace | sRGB, no color management | Hex values are literal |
| **UI/portrait buffer** | **`960 × 540`** | Second offscreen canvas, exactly 2× the world buffer. Portraits, VS cards, cutscene close-ups |

### 4.2.2 The 2× UI/portrait layer

> **Why this exists:** likeness is **P0**. Idris and Otajon are real people, and at a 64px sprite height a face is roughly 14×16 px — enough for build and hair mass, not enough for a man's actual face. The client is right that 96×96 is too small for a VS card. Rather than compromise the chunky 16-bit world grid, the game composites **two buffers**: a 480×270 world and a **960×540 UI/portrait layer at exactly 2×**. Faces get **4× the pixel area**; nothing in the world changes.

| Parameter | Value |
|---|---|
| World buffer | `480 × 270`, `imageSmoothingEnabled = false` |
| UI/portrait buffer | `960 × 540`, `imageSmoothingEnabled = false` |
| Relationship | **Exactly 2×.** 1 world px = 2 UI px. Never any other ratio |
| Portrait authoring size | **192 × 192** (= 96×96 world px of screen area) |
| Composite order | 1. draw world → world buffer · 2. draw portraits/HUD/word art → UI buffer · 3. blit **world buffer scaled ×2 into the UI buffer** · 4. draw UI buffer to the display canvas at integer scale (×1 = 960×540, ×2 = 1920×1080) |
| Display scales | 960×540 (1×), 1440×810 (1.5× — **disallowed**), 1920×1080 (2×) |
| Allowed integer chain | World ×2 → UI ×1 → screen; or world ×4 → UI ×2 → screen. **No odd multipliers, ever** |
| CRT filter | Applied **last**, over the composited UI buffer, so scanline pitch stays uniform across world and portraits |
| Fallback | If a device cannot afford two buffers, portraits render at 96×96 into the world buffer directly (P2 degradation path, visibly worse — log it, don't ship it silently) |

**Hard rules for the 2× layer:**
1. **Nothing that lives in the world may be drawn on it.** Characters, tiles, FX and props stay on the 480×270 buffer. The 2× layer holds *only* portraits, HUD, word art, menus, VS cards and cutscene close-ups. The instant a game object crosses over, the two grids become visible against each other and the illusion dies.
2. **Portrait pixels are still hand-authored chunky pixels** — a 192×192 portrait is not a "high-res" portrait, it is a 16-bit portrait with room for a real face. Same cluster shading, same 1px selective outline (1 UI px = a half world px, so outlines on the 2× layer are drawn **2px** wide to match the visual weight of world outlines).
3. **Cluster scale must be doubled, not detail-doubled.** The temptation at 192×192 is to paint. Ramps stay at 3–4 steps; clusters stay large; the extra resolution buys *accuracy of shape*, not softness.
4. HUD chips, bars and word art on the 2× layer are authored at 2× their previous nominal size (a 32×32 chip becomes a 64×64 asset occupying the same screen area).

### 4.2.3 Sprite canvas sizes per entity class

| Entity class | Sprite canvas (W×H) | Character height in-canvas | Max colors/sprite | Anchor |
|---|---|---|---|---|
| **Idris (hero)** | 96 × 96 | 64 px standing | 24 + transparent | bottom-center, x=48 |
| **Otajon (hero)** | 96 × 96 | 58 px standing | 22 + transparent | bottom-center, x=48 |
| **Hero throw/extended frames** | 160 × 128 | — | 24 | bottom-center, x=80 |
| **Goon E1–E8 (generic rig)** | 80 × 80 | 52–60 px | 16 + transparent | bottom-center, x=40 |
| **Elite goon (E6–E8)** | 96 × 96 | 66 px | 18 | bottom-center |
| **Boss (W1–W4)** | 128 × 128 | 88–104 px | 28 + transparent | bottom-center, x=64 |
| **Final boss (W5)** | 160 × 160 | 128 px | 32 + transparent | bottom-center, x=80 |
| **Thrown-body pair (grapple composite)** | 160 × 128 | — | 32 combined | bottom-center |
| **FX small** (spark, dust puff) | 32 × 32 | — | 8 | center |
| **FX large** (throw arc, impact shock) | 96 × 64 | — | 10 | center |
| **Pickup / prop** | 32 × 32 | — | 10 | bottom-center |
| **VS-card / cutscene portrait** *(2× UI layer)* | **192 × 192** | full head + shoulders + gi collar | 40 | — |
| **HUD portrait chip** *(2× UI layer)* | **64 × 64** (occupies 32×32 world px) | head only, **derived crop of the approved 192×192**, hand-reduced | 18 | — |
| **Background layer strip** | 480 × 270 (tiling ×N) | — | 32 per layer | — |

### 4.2.4 Sub-palette system

The game runs a **master constant set (12 colors, always resident)** plus **one active world sub-palette (16 colors)** plus **one entity sub-palette per drawn character (16 colors)**. Practical ceiling on screen ≈ 64–72 distinct colors — deliberately above a literal SNES budget, deliberately below "modern indie mush," which is the exact register the client's "very detailed pixel art" note is asking for.

- `PAL_MASTER[12]` — UI, damage, FX. Never varies.
- `PAL_WORLD_n[16]` — backgrounds, tiles, props, world lighting.
- `PAL_CHAR_x[16]` — one per character rig. Goons E1–E8 share **one skeleton and one 16-color layout**, recolored per variant (swap slots 5–11: suit, trim, hair, skin). This is how 8 enemy types cost the art budget of ~1.4.
- **Lighting layer** applies a per-world multiply/screen tint over layers 1–4 only; sprites receive a *separate* 2-step rim adjustment, never a full-screen tint (keeps heroes readable in W3/W5).

---

## 4.3 Palettes

### 4.3.1 `PAL_MASTER` — game-wide constants

| Slot | Name | Hex | Use |
|---|---|---|---|
| M0 | `UI_GOLD` | `#F2C14E` | Arcade chrome, IPPON stamp, VS card frame, score |
| M1 | `UI_GOLD_DK` | `#A9761F` | Gold shadow / bevel underside |
| M2 | `UI_GOLD_LT` | `#FFE9A8` | Gold spec, text hot edge |
| M3 | `DAMAGE_RED` | `#E03B3B` | Health depletion, hurt flash, danger |
| M4 | `DAMAGE_RED_DK` | `#8E1D24` | Health bar shadow, blood-free impact core |
| M5 | `HEAL_GREEN` | `#5FD16A` | Pickups, P2 health, "safe" |
| M6 | `FX_WHITE` | `#FFFFFF` | Hit spark core, smear hot line, flash frame |
| M7 | `FX_CREAM` | `#FFF3D6` | Spark falloff, dust top light |
| M8 | `UI_INK` | `#14121C` | Text outline, HUD ink, panel line |
| M9 | `UI_PANEL` | `#241E33` | HUD backing plate |
| M10 | `UI_PANEL_LT` | `#3D3455` | HUD backing highlight |
| M11 | `UI_LETTERBOX` | `#0B0A10` | Outside-frame fill, CRT surround |

### 4.3.2 `PAL_W1` — Dagestan Mountain Village & Judo Gym, **dawn** (cold blue → warm amber break)

| Slot | Name | Hex |
|---|---|---|
| 0 | SKY_HIGH | `#2A3B63` |
| 1 | SKY_MID | `#4C5F8C` |
| 2 | SKY_LOW_WARM | `#B9805E` |
| 3 | SKY_HORIZON_HOT | `#F0B87C` |
| 4 | PEAK_SNOW | `#DCE4F2` |
| 5 | PEAK_ROCK | `#6E708C` |
| 6 | RIDGE_FAR | `#414B70` |
| 7 | STONE_WALL_LT | `#A89684` |
| 8 | STONE_WALL_BASE | `#7C6A5C` |
| 9 | STONE_WALL_DK | `#4E4239` |
| 10 | WOOD_BEAM | `#6B4630` |
| 11 | ROOF_SLATE | `#3B3B47` |
| 12 | GRASS_DRY | `#7A8B52` |
| 13 | GRASS_DK | `#47552F` |
| 14 | FLOOR_TATAMI | `#C8A46A` |
| 15 | ACCENT_LANTERN | `#F5D08A` |

### 4.3.3 `PAL_W2` — City Bazaar & Rooftops, **sun-drenched day** (ochre / turquoise, Aladdin register)

| Slot | Name | Hex |
|---|---|---|
| 0 | SKY_ZENITH | `#3FC4D6` |
| 1 | SKY_MID | `#7EDCE4` |
| 2 | SKY_HAZE | `#CFF2EE` |
| 3 | DOME_TURQUOISE | `#2E9EA8` |
| 4 | DOME_TEAL_DK | `#1B6570` |
| 5 | PLASTER_HOT | `#F7DCA6` |
| 6 | PLASTER_BASE | `#E0B573` |
| 7 | PLASTER_SHADE | `#B07F47` |
| 8 | OCHRE_DK | `#7A5229` |
| 9 | AWNING_RED | `#D2543F` |
| 10 | AWNING_STRIPE | `#F4E3C2` |
| 11 | SPICE_SAFFRON | `#F0A83A` |
| 12 | CARPET_INDIGO | `#3A4C93` |
| 13 | PALM_GREEN | `#5E9648` |
| 14 | PALM_GREEN_DK | `#33602F` |
| 15 | ACCENT_BRASS | `#C99B34` |

### 4.3.4 `PAL_W3` — Night Train Through the Mountains (deep indigo, sodium interior)

| Slot | Name | Hex |
|---|---|---|
| 0 | NIGHT_SKY_HIGH | `#0E1130` |
| 1 | NIGHT_SKY_LOW | `#1E2450` |
| 2 | MOON_HALO | `#5A6BA0` |
| 3 | MOON_DISC | `#E8ECFA` |
| 4 | MTN_FAR | `#232A55` |
| 5 | MTN_MID | `#2E3866` |
| 6 | MTN_SNOW_MOONLIT | `#8E9CC8` |
| 7 | PINE_DK | `#16203A` |
| 8 | CAR_STEEL_LT | `#6C7385` |
| 9 | CAR_STEEL_BASE | `#454B5C` |
| 10 | CAR_STEEL_DK | `#262A38` |
| 11 | RIVET_SPEC | `#9AA2B4` |
| 12 | WINDOW_SODIUM | `#F2B24C` |
| 13 | WINDOW_SODIUM_DK | `#A96F22` |
| 14 | SPARK_COLD | `#B7E3FF` |
| 15 | ACCENT_SIGNAL_RED | `#D63C3C` |

### 4.3.5 `PAL_W4` — Port & Cargo Ship, **rain** (desaturated steel, wet green-blue)

| Slot | Name | Hex |
|---|---|---|
| 0 | STORM_SKY_HIGH | `#3A4450` |
| 1 | STORM_SKY_LOW | `#5A6672` |
| 2 | RAIN_HAZE | `#7E8A94` |
| 3 | SEA_FAR | `#2C4750` |
| 4 | SEA_MID | `#38606A` |
| 5 | SEA_FOAM | `#A8C4C2` |
| 6 | HULL_RUST | `#8A4B2E` |
| 7 | HULL_RUST_DK | `#55301F` |
| 8 | CONTAINER_GREEN | `#3E6B53` |
| 9 | CONTAINER_BLUE | `#2F5478` |
| 10 | CONTAINER_YELLOW | `#C4A03C` |
| 11 | DECK_STEEL | `#4A5259` |
| 12 | DECK_STEEL_WET | `#68737C` |
| 13 | CRANE_ORANGE | `#D4712C` |
| 14 | PUDDLE_SHEEN | `#9FB6BC` |
| 15 | ACCENT_LAMP_COLD | `#DDEBF2` |

### 4.3.6 `PAL_W5` — "The Golden Cage" Neon Casino-Arena, **night** (magenta / gold / black)

| Slot | Name | Hex |
|---|---|---|
| 0 | VOID_BLACK | `#08060E` |
| 1 | VOID_PURPLE | `#1B0F2E` |
| 2 | HAZE_VIOLET | `#3A1B57` |
| 3 | NEON_MAGENTA | `#FF2F92` |
| 4 | NEON_MAGENTA_DK | `#9C1358` |
| 5 | NEON_PINK_GLOW | `#FF8FC4` |
| 6 | NEON_CYAN | `#2FE6E0` |
| 7 | NEON_CYAN_DK | `#146F72` |
| 8 | GOLD_HOT | `#FFD65C` |
| 9 | GOLD_BASE | `#D9A32B` |
| 10 | GOLD_DK | `#7E5A14` |
| 11 | CAGE_STEEL | `#4C4658` |
| 12 | CAGE_STEEL_LT | `#7C7490` |
| 13 | MAT_CRIMSON | `#8E1B3A` |
| 14 | MAT_CRIMSON_LT | `#C43257` |
| 15 | CROWD_SILHOUETTE | `#150D22` |

---

## 4.4 Background & Parallax Specification

### 4.4.1 The 6-layer stack

| # | Layer | Parallax X | Parallax Y | Draw size | Content rule |
|---|---|---|---|---|---|
| L0 | **Sky** | 0.00 | 0.05 | 480×270, static/slow | Banded gradient in ≤5 world colors + celestial body. Never tiled horizontally |
| L1 | **Far** | 0.15 | 0.10 | 960×180 tiling | Mountains / skyline / sea horizon. Desaturated 25% toward sky color, no outlines |
| L2 | **Mid** | 0.40 | 0.20 | 960×220 tiling | Buildings, ship hulls, train cars, crowd stands. Full world palette, soft value contrast |
| L3 | **Play** | **1.00** | 1.00 | tiled 16px | Collision terrain, the belt floor, interactive props. Highest local contrast in scene |
| L4 | **Foreground overlay** | 1.65 | 1.15 | sparse sprites | Pillars, hanging rugs, crates, rain sheets, cage bars. ≤30% screen coverage, drawn at 70–100% alpha, always darker than L3 |
| L5 | **Lighting/atmosphere** | 1.00 (screen-locked) | — | 480×270 | Multiply/screen tint, god-rays, fog band, CRT vignette hook. Sprites excluded |

*In-world text rule: any legible signage baked into a background layer — shop boards, station names, banners, neon — is **Russian Cyrillic**, hand-drawn at 6px cap-height or larger. Below 6px, signage is drawn as abstract text-texture (2-value squiggle clusters) with no attempted letterforms, which is both cheaper and safer than illegible fake Cyrillic. W5's neon signage is the one place Latin is permitted, as stylized casino brand marks that are clearly logos rather than words.*

*Rule: value separation between adjacent layers must be ≥ 15% luminance, or the belt-scroll depth collapses. Foreground (L4) is always the darkest band on screen except in W5, where it is the brightest (neon cage bars).*

### 4.4.2 Per-world layer content

**W1 — Mountain Village, Dawn**
- L0: 4-band dawn sky, `SKY_HIGH → SKY_MID → SKY_LOW_WARM → SKY_HORIZON_HOT`, hand-dithered 2-step seams only.
- L1: Caucasus ridgeline, snow caps, one hero peak silhouette at x=340. Slow drifting cloud strip at 0.08.
- L2: Stone village houses, slate roofs, stacked terraces, smoke columns (4-frame loop, 8 fps), a low stone wall.
- L3: Packed-earth path + tatami gym interior variant. Gym: hanging heavy bag (idle sway 6f/10fps), wall scrolls, framed photos.
- L4: Foreground pine boughs, hanging laundry line, a wooden fence post at screen edge.
- L5: Warm amber god-rays from screen right, 12% screen-blend, slow 4s pulse.

**W2 — Bazaar & Rooftops, Day**
- L0: Flat turquoise sky, one lens-free sun bloom disc, 3 slow clouds.
- L1: Minarets, domes, distant city haze, hand-lettered Russian shop boards over the stalls, circling birds (3 sprites, 6f/8fps).
- L2: Bazaar stall rows, striped awnings (2-frame flutter, 6 fps), hanging carpets, brass lamps.
- L3: Cobbled market floor / rooftop tile floor. Props: crates, melon piles, urns, breakable pottery.
- L4: Foreground awning fringe across the top 24px, hanging rug at stage edges, a swinging sign.
- L5: Hot white-yellow overexposure at 8% screen, plus warm dust motes.

**W3 — Night Train**
- L0: Deep indigo night + moon disc + hand-dithered star band.
- L1: Mountain silhouettes scrolling **right-to-left at 0.9 px/frame** (independent of player — the train is moving).
- L2: Pine forest strip + telegraph poles, auto-scroll **2.6 px/frame**; tunnel-entry event blacks L1/L2 for 40 frames.
- L3: Train car roof / interior corridor. Rivets, hatches, luggage. Interior windows show L2 through a 32×24 cutout mask.
- L4: Passing signal masts and tunnel pillars, auto-scroll **5.5 px/frame** (strong speed cue), plus wind streak sprites.
- L5: Sodium interior glow (screen 14%), cold moon rim (screen 6%), periodic tunnel strobe.

**W4 — Port & Cargo Ship, Rain**
- L0: Flat storm gradient, 3 bands, no sun. Lightning event: 2-frame full-screen `#DDEBF2` flash at 6% frequency.
- L1: Harbor cranes, distant freighters, choppy sea line (8f/6fps wave loop).
- L2: Container walls, gantry, ship superstructure, swinging cargo hook (10f/10fps).
- L3: Wet steel deck with `PUDDLE_SHEEN` reflection strips; puddle ripple 4f/8fps.
- L4: Rain sheet A (fast, 8 px/frame, 60% alpha) + hanging chains + a foreground container corner.
- L5: Rain sheet B (near, 14 px/frame, 40% alpha), cold desaturating multiply at 10%, splash motes at floor line.

**W5 — The Golden Cage, Night**
- L0: Near-black void with a slow magenta radial pulse (`NEON_MAGENTA_DK`, 90-frame sine).
- L1: Casino tower silhouettes + animated neon signage (4-frame chase, 6 fps).
- L2: Tiered crowd in `CROWD_SILHOUETTE` — 3 crowd bands, 6-frame roar loop at 8 fps, brightened 2 frames on every IPPON.
- L3: Crimson mat with gold cage-perimeter markings; spotlight ellipses baked into the floor.
- L4: **Cage bars** — vertical 3px `CAGE_STEEL_LT` bars at 24px pitch, 55% alpha, plus 2 hanging spotlights with visible cones.
- L5: Rotating spotlight cones (screen 20%), magenta rim light from left, gold from right, heavy vignette.

### 4.4.3 Belt-scroll floor treatment (TMNT-style)

- The floor occupies **y = 150 → 246**, split into **4 perspective bands** of 24 px. Band heights compress upward: 28 / 26 / 23 / 19 px of visual detail scale.
- **4 walk lanes** map to bands; sprite scale is **constant** (no per-lane scaling — 16-bit honesty), depth is sold by **y-sort, shadow size, and band value shift**.
- Each band steps **one ramp value darker going up** (`FLOOR_LT → FLOOR → FLOOR_DK → FLOOR_DKR`), which produces the classic chunky depth staircase.
- Floor texture repeats horizontally at 96 px with a **3-variant tile rotation** to kill visible tiling.
- **Contact shadow**: every entity draws a 2-step elliptical shadow, width = 60% sprite width, darkened multiply, offset +1y per lane depth. Airborne entities shrink the shadow to 40% and lighten one step.
- A **1px warm scuff line** marks the front boundary (y=246) so players read the walkable edge instantly.

### 4.4.4 Animated background elements — motion table

| Element | World | Frames | fps | Motion |
|---|---|---|---|---|
| Chimney smoke | W1 | 6 | 8 | rising loop, 2 offset instances |
| Hanging heavy bag | W1 | 6 | 10 | sway, reacts to hero throws (+2 amplitude, 30f) |
| Awning flutter | W2 | 4 | 6 | edge ripple |
| Birds | W2 | 6 | 8 | drift left 0.3 px/f |
| Bazaar crowd extras | W2 | 8 | 6 | idle chatter, 3 recolors |
| Flags / banners | W1,W2,W5 | 8 | 10 | wave, 3-phase offset per instance |
| Mountain scroll | W3 | — | — | 0.9 px/frame |
| Pine + poles scroll | W3 | — | — | 2.6 px/frame |
| Signal masts (fg) | W3 | — | — | 5.5 px/frame |
| Sea waves | W4 | 8 | 6 | horizontal shimmer |
| Cargo hook swing | W4 | 10 | 10 | pendulum |
| Rain sheet A / B | W4 | 4 / 4 | 20 / 30 | 8 px/f and 14 px/f downfall |
| Puddle ripple | W4 | 4 | 8 | on-impact retrigger |
| Neon chase signage | W5 | 4 | 6 | sequential |
| Crowd roar | W5 | 6 | 8 | +2 bright frames on IPPON |
| Spotlight sweep | W5 | 16 | 12 | 4s full rotation |

---

## 4.5 Character Animation Tables

### 4.5.1 Global animation doctrine

- **Anticipation → action → smear → impact → settle.** Every offensive move has ≥1 anticipation frame and ≥1 smear frame. Impact frames hold **2 logical frames** minimum with a 1-frame white flash on the receiver.
- **The Aladdin rule — personality in idles.** Idles are not neutral loops; they are character. **Idris** (every ~4s of idle) tightens and re-ties his black belt, rolls his shoulders, gives a small approving nod. **Otajon** pulls a snack from his gi sleeve, eats it, looks around guiltily, brushes crumbs. These are *idle-break* animations that trigger on a timer and never interrupt input.
- **Ukemi is sacred.** Every character who is thrown breaks their fall correctly — arm slap, chin tucked, rolling out. This is a judo game; the falls sell the sport.
- Frame timing is authored at 12 / 15 / 20 / 30 fps and stepped against the 60 Hz clock (5 / 4 / 3 / 2 render frames per art frame).
- **Throws are 6–10 frames each**, authored as a **paired composite** (thrower + uke on one canvas) for frames where bodies interlock, then split into a separate `thrown-flight` sprite at release.

### 4.5.2 Idris — hero, 40, white gi, black belt, solid build (64 px)

| Animation | Frames | fps | Notes |
|---|---|---|---|
| idle | 6 | 8 | Breathing, weight shift, hands open at hip height |
| idle_break_belt | 14 | 10 | **Personality**: re-ties black belt, shoulder roll, nod |
| walk | 8 | 12 | Grounded, heavy heel, gi skirt sway 2-step |
| run | 8 | 15 | Forward lean, gi trails, 1 smear frame per stride |
| jump_rise | 4 | 12 | Tuck knees, arms compact |
| jump_apex | 2 | 8 | Hold, hair/gi settle |
| fall | 3 | 12 | Arms out, legs reaching |
| land | 4 | 15 | Squash 2 frames + dust FX trigger |
| grip_attempt | 5 | 15 | Lunge, both hands open, 1 anticipation + 1 smear |
| grip_hold | 4 | 8 | Kumi-kata, sleeve + lapel, both bodies rocking |
| grip_struggle | 6 | 12 | Push–pull contest, alternating lean, strain shading |
| **throw_seoi_nage** | 10 | 20 | Shoulder throw. 2 antic / 2 turn-in / 2 smear / 2 impact / 2 settle |
| **throw_o_goshi** | 8 | 20 | Hip throw, big arc |
| **throw_uchi_mata** | 10 | 20 | Inner-thigh, highest arc, 3 smear frames |
| **throw_harai_goshi** | 9 | 20 | Sweeping hip |
| **throw_tai_otoshi** | 8 | 20 | Body drop, low & fast |
| **throw_osoto_gari** | 7 | 20 | Major outer reap, slam-heavy, 3 impact frames |
| thrown_flight | 5 | 15 | (when Idris is the one thrown) |
| knockdown | 4 | 12 | Impact + bounce |
| getup | 7 | 12 | Push to knee, rise, reset stance |
| ukemi_roll | 8 | 15 | Break-fall, arm slap, roll to feet |
| hurt | 3 | 15 | Recoil, 1 flash frame |
| guard | 3 | 10 | Forearms up, small sway loop |
| ko | 6 | 10 | Stagger 3, fall 3, hold last |
| victory | 12 | 10 | Straightens gi, bows, one raised fist |
| special_ippon_seoi | 14 | 20 | Super: screen-dim, 2 charge / 4 turn-in / 3 smear / 3 impact / 2 hold |
| **Total** | **~200 frames** | | Budget cap: **210** |

### 4.5.3 Otajon — hero, **25**, lighter build, blue gi (58 px)

| Animation | Frames | fps | Notes |
|---|---|---|---|
| idle | 6 | 10 | Bouncier, lighter weight shift |
| idle_break_snack | 16 | 10 | **Personality**: snack from sleeve, eats, guilty glance, brushes crumbs |
| walk | 8 | 14 | Springier gait |
| run | 8 | 18 | Faster cadence, 2 smear frames |
| jump_rise / apex / fall / land | 4 / 2 / 3 / 3 | 14 / 8 / 14 / 15 | Higher, floatier arc than Idris |
| grip_attempt | 5 | 18 | Quicker, one-handed sleeve snatch |
| grip_hold | 4 | 8 | |
| grip_struggle | 6 | 14 | Loses ground more visibly vs heavies |
| **throw_ippon_seoi** | 9 | 20 | Signature |
| **throw_ko_uchi_gari** | 7 | 20 | Small inner reap, fast |
| **throw_tomoe_nage** | 10 | 20 | Sacrifice throw — Otajon goes down too, biggest arc |
| **throw_sumi_gaeshi** | 8 | 20 | Corner reversal |
| **throw_de_ashi_barai** | 6 | 20 | Foot sweep, lowest commitment |
| **throw_kata_guruma** | 9 | 20 | Shoulder wheel |
| thrown_flight | 5 | 15 | |
| knockdown / getup | 4 / 6 | 12 / 14 | Faster getup than Idris |
| ukemi_roll | 8 | 18 | Snappier |
| hurt / guard / ko | 3 / 3 / 6 | 15 / 10 / 10 | |
| victory | 12 | 10 | Double thumbs-up, then eats another snack |
| special_tomoe_combo | 14 | 20 | Super |
| **Total** | **~195 frames** | | Budget cap: **210** |

> **Age note (canon):** Otajon is **25** — a young adult, not a teenager. Posing energy is springy and eager, but the *body* is an adult athlete's: full shoulder width for his frame, adult limb proportions (7.5 heads at portrait scale), no youthful head-to-body inflation. The contrast with Idris (40) is read through **build and bearing** — Idris settled and rooted, Otajon light and quick — never through childlike proportions.

### 4.5.4 Generic goon rig — shared skeleton, variants E1–E8

*One animation set, eight palette/accessory recolors. Accessories (clipboard + lanyard badge, gold chain, sunglasses, earpiece wire, riot shield, glider cape, apron, belly pad, Sterling snake-"S" patch) are drawn as 2–5 overlay sprites parented to head/torso/arm anchors — they cost 6–14 extra frames each, not a full set. Two variants carry oversized props that break the shared rig and need extra authored frames: **Turnstile's shield** (+8: shield-raise, shield-bash, shield-break) and **Kite Boy's cape** (+10: cape-open, glide loop 4, dive, crumple-land).*

| Animation | Frames | fps | Notes |
|---|---|---|---|
| idle | 4 | 8 | Cocky shoulder roll |
| idle_taunt | 8 | 10 | Beckons, spits, adjusts collar (variant-flavored) |
| walk | 6 | 10 | |
| run_charge | 6 | 15 | Arms flailing, comic |
| telegraph | 4 | 10 | **Mandatory** wind-up, high-contrast pose + `!` FX |
| attack_swing | 5 | 15 | 1 antic / 1 smear / 2 impact / 1 recover |
| attack_grab | 5 | 12 | |
| grip_received | 3 | 10 | Reaction to hero grip |
| grip_struggle | 4 | 12 | |
| thrown_flight | 6 | 15 | Ragdoll-ish, arms windmill, comic terror face |
| ukemi_fail | 6 | 12 | Flops badly — the joke is that *they* can't break-fall |
| knockdown | 3 | 12 | |
| getup | 5 | 10 | Wobbly |
| hurt | 3 | 15 | |
| ko_spin | 8 | 12 | Spins out, comedy star FX |
| **Base total** | **76 frames** | | ×1 authored set |
| E1–E8 overlays | 6–14 each | — | **~80 frames total across all 8 variants** |
| E6 shield + E7 cape extras | 8 + 10 | — | **18** — oversized props that break the shared rig |
| **Effective total** | **~174 frames for 8 enemy types** | | |

**Variant silhouette differentiation (SR-4 compliance) — the Sterling Fight Syndicate roster:**

| ID | Canon name | Mechanical role | Visual spec & silhouette hook | Palette swap slots | First world |
|---|---|---|---|---|---|
| E1 | **Clipboard** | Basic melee | Cheap off-the-rack suit, sleeves too short, skinny tie, **laminated badge on a lanyard and a clipboard tucked under one arm** — he swings it. Boxy shoulders, narrow legs | 5,6,7 | W1 |
| E2 | **Barrel** | Heavy / armored | Ex-linebacker gone to seed: neckless trapezoid, letterman jacket straining over a gut, forearms like hams | 5,6,9 | W1 |
| E3 | **Melonhand** | Ranged lobber | Stall apron over a stained shirt, sleeves rolled, **crate or melon held overhead in the wind-up** — the raised load is the silhouette | 5,6,8,10 | W2 |
| E4 | **Sneaker** | Rushdown | Skinny, fast, oversized **high-top sneakers** and a hooded windbreaker; longest stride, narrowest mass | 5,7,9,11 | W2 |
| E5 | **Tracksuit** | Grappler | Gold-striped shiny tracksuit, chunky gold chain, low wide grappling stance, collar popped | 5,6,8,11 | W3 |
| E6 | **Turnstile** | Blocker | **Riot-shield security** — earpiece wire, half-face visor, a full-height shield held out front. Reads as a moving wall; the shield is 60% of the silhouette | 5,6,8,9,11 | W3 |
| E7 | **Kite Boy** | Aerial harasser | Cleo's crew: slim frame under a **patchwork glider cape**, goggles, wrapped hands. Silhouette doubles in width the moment the cape opens | 5,6,7,10 | W4 |
| E8 | **Gold Jacket** | Elite | **Sequined gold blazer** over a black shirt, sunglasses worn at night, immaculate hair, gold rings. The best-dressed and hardest-hitting man in the room | 3,5,6,8,11 | W5 |

*Shared syndicate signifiers (readable at 1×): a **gold pinky ring or chain glint** (2px `UI_GOLD`) on every variant, and the **Sterling "S" patch** — a 6×6 gold-on-black stylized snake-S — on the shoulder or lapel. These two marks are the visual glue that says "same organization" across eight completely different silhouettes. Cheap suits are rendered in flat, slightly-too-shiny synthetic ramps (2 steps, hard spec) — the fabric itself is part of the joke.*

### 4.5.5 Bosses

*All five bosses are **Sterling Fight Syndicate** figures — Rex's talent roster and his fixers. Each wears at least one gold Sterling marker (ring, chain, belt buckle, or the snake-"S" patch) so the chain of command reads visually from W1 to W5.*

| Boss | World | Height | Visual language | Key animations | Total |
|---|---|---|---|---|---|
| **B1 — Dale "Padlock" Pruitt** — gatekeeper brawler | W1 | 88 px | An ex-linebacker **stuffed into a rented inspector's suit** two sizes too small: buttons straining, trouser cuffs riding high, a **laminated copy-shop badge** on a lanyard and a clipboard he brandishes like a warrant. Bureaucratic swagger on a body built for collisions. Silhouette hook: the clipboard held out at arm's length on every telegraph frame | idle 6, walk 6, telegraph 4, grip 5, struggle 6, 3 signature throws (8/8/9), counter-throw 8, hurt 3, knockdown 4, getup 6, phase-shift 8, KO 8, victory 10 | **99** |
| **B2 — Cleo "The Kite" Vance** — aerial zoner | W2 | 92 px | Ex-casino-revue aerialist in a **patchwork glider cape / wing-rig** of stitched showgirl fabrics, goggles, wrapped hands, feathered pauldrons. Fights from **above the clocktower**, descending in arcs; her "chain-whip" is a **weighted kite-line** — a 1px `UI_GOLD` cord with a 4×4 lead weight, drawn as an animated spline, never a static sprite. Silhouette hook: cape-open pose is the widest, thinnest shape in the game | + kite-line lash 8, dive-swoop 7, perch-and-taunt 6 | **114** |
| **B3 — "Boxcar" Bruno Marchetti** — rival grappler | W3 | 96 px | A mountain of a biker in cutoff denim over leather, wearing a **stolen train conductor's cap** perched comically small on his head, hauling a **coal shovel**. Coal dust and soot streaks on forearms; the only boss who out-masses Idris. Silhouette hook: shovel blade catching the sodium light | + shovel-swing 7, boxcar-charge 8, roof-leap 9 | **118** |
| **B4 — Denny "The Crane" Hollis** — armored bruiser | W4 | 104 px | Dockside crane operator: a **bright yellow rain slicker worn open over a loud bowling shirt**, work gloves, cigarette that never goes out in the rain. Slow, heavy, plated in wet vinyl. Calls **crane-drop adds** — containers and hook-loads that fall into the lane, telegraphed by a gold ground-shadow. Silhouette hook: the flared slicker hem makes a bell shape no other character has | + hook-grapple 10, container-slam 9, rain-stomp 6 | **120** |
| **B5 — REX "THE SNAKE" STERLING** | W5 | **128 px** | **White suit with heavy gold trim and lapels, black shirt, gold snake ring the size of a knuckle-duster, slicked silver-blond hair, PPV-promoter grin.** Phase 1: he fights *through* his Gold Jacket elites, gesturing and directing. Phase 2: jacket flung off, sleeves rolled, gold cane drawn — he fights personally and dirtily | 2 phases, 5 signature throws, cage-slam 10, jacket-off phase-2 transform 14, desperation super 16, defeat 12 | **165** |

*Boss doctrine: telegraph frames are **never** fewer than 4, and every boss attack has a distinct color-coded FX tell (gold = throwable counter window, red = unblockable, cyan = grip-break).*

*Rex-specific: his gold is the only pure `GOLD_HOT #FFD65C` on a character sprite in the whole game — the palette itself marks him as the man at the top. The snake ring gets a dedicated 2px glint that catches light on every telegraph frame, so players learn to read his wind-up off one pixel cluster.*

---

## 4.6 FX & UI Art

### 4.6.1 FX library

| FX | Canvas | Frames | fps | Colors | Description |
|---|---|---|---|---|---|
| `fx_hit_spark_sm` | 32×32 | 5 | 30 | `FX_WHITE, FX_CREAM, UI_GOLD, DAMAGE_RED` | 4-point star, expands then collapses, 1 pure-white frame |
| `fx_hit_spark_lg` | 64×64 | 6 | 30 | +`UI_GOLD_LT` | Impact starburst for throws |
| `fx_dust_puff` | 32×32 | 6 | 15 | world floor ramp ×3 | Landing/step, palette-swapped per world |
| `fx_dust_ring` | 96×32 | 7 | 20 | world floor ramp | Throw-impact shockwave ring, ground-hugging |
| `fx_throw_arc` | 96×64 | 8 | 30 | `FX_WHITE, FX_CREAM, UI_GOLD` | Trailing crescent following the uke's path; 3px→1px taper |
| `fx_smear` | per-frame inline | — | — | character palette | Drawn **into** throw frames, never as an overlay. Elongated limb ghost, 2-color |
| `fx_impact_flash` | full-screen | 2 | 30 | `FX_WHITE` at 65% | 2-frame screen flash on IPPON only |
| `fx_speed_lines` | 480×270 | 4 | 20 | world accent | Radial, super moves |
| `fx_water_splash` | 48×32 | 6 | 15 | W4 palette | Rain/puddle impacts |
| `fx_neon_glow_pulse` | 64×64 | 8 | 12 | W5 palette | Additive, W5 only |
| `fx_star_ko` | 48×24 | 6 | 12 | `UI_GOLD, FX_CREAM` | Comedy KO stars, goons only |

### 4.6.2 The «ИППОН!» stamp

> **Language canon: all player-facing text in THE PATRIOT is Russian.** Every string in the HUD, menus, VS cards, word art, and in-world signage is authored in Cyrillic. The only Latin text that ships is the small `THE PATRIOT` subtitle on the logo lockup (for the itch.io store page) and internal asset filenames.

- **Cyrillic lettering: `ИППОН!`** — set in heavy custom pixel display caps, hand-drawn as word art (not typed). **No Japanese glyphs anywhere in the game**, to eliminate any risk of malformed kanji; a stylized *brush-energy* treatment (angled strokes, dry-brush chipped edges) evokes calligraphy without using it.
- **Glyph note:** `И`, `П`, `О`, `Н` are all wide, blocky, high-symmetry forms — this actually reads *better* as a chunky arcade stamp than the Latin original. `И` needs its diagonal drawn at a consistent 2:1 pixel slope across both stems; `П` must not be confusable with `Н` at 1× (the crossbar sits at cap-height on `П`, at mid-height on `Н`).
- Canvas widens to **352×96** to hold six Cyrillic caps plus the exclamation mark at the same stroke weight.
- Canvas **352×96**, 12 colors. Fill `UI_GOLD` → `UI_GOLD_LT` vertical 3-step, 2px `UI_INK` outline, 3px `DAMAGE_RED_DK` drop shadow offset (+3,+3).
- **Animation, 10 frames @ 20 fps**: 2 frames scale-in at 140% (integer-safe: authored as 3 discrete size variants, *never* runtime-scaled), 1 frame overshoot 110%, 1 settle 100%, 4 frames hold with a gold shimmer sweep, 2 frames fade-out.
- Accompanied by: `fx_impact_flash`, crowd brighten (W5), 6-frame screen shake at ±2 px, and a 20-frame slow-motion hold on the throw's final impact frame.

### 4.6.3 Combo counter

- Digits in the display font, `UI_GOLD` fill / `UI_INK` outline, with **escalating tint**: 2–4 hits gold, 5–7 hits `#FF9A3C`, 8+ hits `DAMAGE_RED` with a 2-frame vibrate.
- Suffix word art, hand-drawn Cyrillic: `ХОРОШО!` (64×16) / `ЧИСТО!` (56×16) / `ТЕХНИКА!` (72×16) / `МАСТЕР ИППОНА!` (128×16). Russian strings run **15–25% longer than their English equivalents** — every word-art plate and HUD panel in this section is sized for the Cyrillic string, not a Latin placeholder, and any new plate must be measured against the longest Russian variant before it is drawn.
- Counter sits at x=200, y=48, scales via 3 pre-authored size variants.
- **GO arrow / stage prompt**: `ВПЕРЁД ➜` — 96×16 word art, `UI_GOLD` on `UI_INK`, 4-frame chase blink at 6 fps. Note the **Ё with its diaeresis**: the two dots sit 2px above cap-height, which means the plate is 2px taller than an all-`Е` string would need. Every `Ё` in the game keeps its dots — no substitution with `Е`.

### 4.6.4 Health bars & portrait chips

- Bar: **128×12**, `UI_PANEL` backing, 2px `UI_INK` border, bevel using `UI_PANEL_LT` top-left / `UI_INK` bottom-right.
- Fill: 3-step ramp `HEAL_GREEN → #F2C14E → DAMAGE_RED` as health drops; a **white "chip" ghost bar** drains behind the real bar over 24 frames (fighting-game tell).
- **Portrait chip: 64×64 authored on the 2× UI layer** (occupying 32×32 world px of screen area), framed in a 4px `UI_GOLD` bevel, seated left of P1 bar / right of P2 bar. **4 states**, hand-authored: `neutral`, `hurt` (grimace, 1 flash), `low` (breathing hard, 4f loop @ 6fps), `ko` (eyes closed).
- **Chips are derived, never independent.** Every chip is a **crop of the approved 192×192 master portrait** — crop to the head, then *hand-reduce* to 64×64 (see §4.7.5). A chip drawn from scratch will drift off-likeness from the VS card, and players see both on the same screen. If the master portrait changes, every chip is re-derived; they are never edited in isolation.
- Boss bar: **240×14**, `MAT_CRIMSON` fill, segmented into phase pips.

### 4.6.5 VS-card layout — **authored at 960×540 on the 2× UI layer**

> **The portraits dominate the card, and that is the point.** This game is about two specific men. The VS card is the moment the player looks them in the face, so the faces get the majority of the screen: each 192×192 portrait occupies **20% of the card's width and 36% of its height** — roughly 4× the screen area of the old 96×96 treatment, at 4× the pixel density. Everything else on the card is subordinate furniture.

```
┌────────────────────────────────── 960 ─────────────────────────────────┐
│  фон: PAL_W5 void + вращающийся золотой луч (16 кадров / 12 fps)       │
│                                                                        │
│  ╔═══════════════╗                              ╔═══════════════╗      │
│  ║               ║        ┌──────────┐          ║               ║      │
│  ║   ПОРТРЕТ     ║        │  ПРОТИВ  │          ║   ПОРТРЕТ     ║      │
│  ║   192 × 192   ║        │ 160 × 96 │          ║   192 × 192   ║      │
│  ║   (герой)     ║        └──────────┘          ║   (враг)      ║      │
│  ║               ║         x=400,y=176          ║               ║      │
│  ╚═══════════════╝                              ╚═══════════════╝      │
│   x=64, y=112                                    x=704, y=112          │
│                                                                        │
│  ▬▬▬▬▬  ТАБЛИЧКА 352×48  ▬▬▬▬▬▬▬▬▬▬  ТАБЛИЧКА 352×48  ▬▬▬▬▬▬▬▬▬▬▬▬▬   │
│  «ИДРИС» · ДАГЕСТАН              «РЕКС СТЕРЛИНГ» · СИНДИКАТ            │
│   x=64, y=320                                    x=544, y=320          │
│                                                                        │
│  ──────────────── нижняя полоса 960×40, UI_PANEL ───────────────────   │
│              «РАУНД 1  —  ЗОЛОТАЯ КЛЕТКА»          y=456               │
└────────────────────────────────────────────────────────────────────────┘
   (all coordinates in UI-layer pixels; divide by 2 for world-space equivalents)
```

| Element | 960×540 UI px | Screen area vs. old 480×270 card |
|---|---|---|
| Portrait (×2) | 192 × 192 | **4× the pixel density, ~1.8× the screen footprint** |
| Portrait bevel | 4px `UI_GOLD` / `UI_GOLD_DK`, inner 2px `UI_INK`, corner rivets 6×6 `UI_GOLD_LT` | doubled to match |
| ПРОТИВ badge | 160 × 96 | doubled |
| Name plate (×2) | 352 × 48 | doubled |
| Bottom strip | 960 × 40 | doubled |

- **Cyrillic sizing pass (carried forward, now at 2×):** the badge holds `ПРОТИВ` and the plates hold the longest Russian names (`РЕКС СТЕРЛИНГ`, `ЗОЛОТАЯ КЛЕТКА`) without tracking compression. Names use **guillemets «…»** — a real 6×18 px glyph pair on this layer, not two `<` characters.
- **Animation:** portraits slide in from opposing edges over 16 frames (motion in **2px UI steps** so they stay on the world grid's rhythm), `ПРОТИВ` badge slams in at frame 18 with a 4-frame gold shockwave, name plates type on at 2 chars/frame.
- **Cutscene close-ups** reuse the same 192×192 masters at 1:1 on this layer, cropped to head-and-shoulders, with 3 authored expression variants per hero (`neutral`, `determined`, `exhausted`) — see the manifest.
- **Non-negotiable:** the portraits are the last thing cut for performance and the first thing re-checked after any palette change.

### 4.6.6 Fonts — **Cyrillic is a hard requirement**

**Every shipping face must cover the full Russian alphabet.** A Latin-only pixel font is disqualified regardless of how good it looks: missing glyphs fall back mid-string and the HUD visibly breaks. This ruled out **Silkscreen** and **Jersey 10** (both Latin-only) — Silkscreen was in an earlier draft of this spec and has been **replaced**.

| Role | Font | Cyrillic? | Source | Fallback stack |
|---|---|---|---|---|
| **Display / titles / «ИППОН!» / VS** | **Press Start 2P** | ✅ yes | Google Fonts | `"Press Start 2P", "Courier New", monospace` |
| **UI / body / dialogue / menus** | **Pixelify Sans** (Regular + Bold) | ✅ yes | Google Fonts | `"Pixelify Sans", "Press Start 2P", monospace` |
| Numerals + custom word art | Custom bitmap sheet, 8×12 | ✅ authored in-house | in-house | falls back to Pixelify Sans Bold |
| ~~Silkscreen~~ | ~~—~~ | ❌ **Latin only — rejected** | — | do not use |
| ~~Jersey 10~~ | ~~—~~ | ❌ **Latin only — rejected** | — | do not use |

**Custom bitmap font glyph set (`font_bitmap_ru.png`, 8×12 cells):** the sheet must contain, in this order —

| Block | Glyphs | Count |
|---|---|---|
| Digits | `0–9` | 10 |
| Cyrillic caps | `А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я` | **33** |
| Cyrillic lowercase | `а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я` | **33** |
| Punctuation | `. , ! ? : ; — – … « » ( ) % + × ➜ ✕ ♥` | 19 |
| Latin caps (logo subtitle + credits only) | `A–Z` | 26 |
| **Total** | | **121 cells** |

- **Wide-glyph budget:** `Ж`, `Щ`, `Ы`, `Ю`, `М` do not fit an 8px advance at legible weight. The sheet is **proportional, not fixed-width**: those five ship at a **10px advance** with a per-glyph width table; every other glyph stays at 8. Trying to force `Ж` into 8px produces a blob at 1× and is a hard fail.
- **Ascender/diacritic rows:** `Ё` and `ё` need 2px of headroom above cap-height for the diaeresis, and `Й`/`й` need the breve — the 12px cell height is sized for these two cases. Never substitute `Е` for `Ё`.
- **Descenders:** `р`, `у`, `ф`, `ц`, `щ` descend 2px below baseline; line-height in every text plate is **16px**, not 14.
- All fonts render **only at integer multiples of their native pixel size** (Press Start 2P at 8/16/24 px; Pixelify Sans at 8/16 px — it is a pixel-styled variable face, so it MUST be pinned to those sizes and snapped to the logical grid, never rendered at an arbitrary size), with `text-rendering: geometricPrecision` and no sub-pixel positioning.
- Fonts are **self-hosted WOFF2 subsetted to Cyrillic + Latin + punctuation** (no CDN dependency in Android WebView, and subsetting keeps the payload small) with `font-display: block`. **Verify the Cyrillic subset is actually included in the WOFF2 before shipping** — Google Fonts serves Latin-only subsets by default via `unicode-range`, and a naive download drops Cyrillic silently.
- **Layout rule:** Russian UI strings run **15–25% longer** than English. Every panel, button, plate and word-art canvas in this section is dimensioned against its longest Russian string. No plate may be sized from an English mockup.

### 4.6.7 CRT filter (toggleable, default ON in arcade/attract mode, OFF in gameplay-default for mobile)

| Component | Spec |
|---|---|
| Scanlines | Pitch is locked to the **world** pixel grid, not the UI grid: 1 dark line per world pixel row = every 2 UI-buffer rows, opacity **15%**, color `#000000`. Applied after the world+UI composite so portraits and world share one uniform scanline field. Disabled below 960×540 output |
| Barrel distortion | Slight — max 1.2% displacement at corners. Applied as a pre-baked UV mesh, not per-pixel math |
| Vignette | Radial, `UI_LETTERBOX`, 0% at center → 32% at corners, ease-in-quad |
| Aperture mask | Optional sub-toggle: RGB triad mask at 8% opacity, scale ≥3× only |
| Bloom | **None.** Banned by SR-5 |
| Toggle | Options menu + hotkey `F`. State persisted to `localStorage`. Must be OFF-able for accessibility |
| Perf budget | ≤1.5 ms/frame on a mid-range Android WebView; auto-disables if frame time exceeds budget for 90 consecutive frames |

---

## 4.7 Photo → Pixel Pipeline (Idris & Otajon)

> The heroes are real people — the developer's actual coaches. **Likeness is P0**: a portrait that does not read as *that man* is a defect, not a style choice, and blocks the build the same way a crash would. Portraits are authored at **192×192 on the 2× UI layer** (§4.2.2) precisely so there is enough resolution for a real face.

### 4.7.1 Photo intake requirements (request to client)

Per person, request: **1 frontal**, **1 three-quarter left**, **1 three-quarter right**, **1 full-body standing in gi**, all in even daylight, neutral expression + one smiling. Minimum 1000 px head height. Plus: one photo of the actual gi and belt for exact color reference.

### 4.7.2 Three input paths, one convergence point

The first draft of a portrait may come from any of three sources. **The source does not matter; the convergence steps do.** Nothing reaches the repo without passing every stage of §4.7.3.

| Path | Input | Who produces it | What it is |
|---|---|---|---|
| **A — Direct hand-pixel** | The raw reference photo | Studio artist | The baseline path. Slowest, highest fidelity, always available as the fallback |
| **B — Grok generation** | Prompt P23 / P24 + attached reference photo | Studio artist | A *blocking sketch* — silhouette, value structure, general read |
| **C — Higgsfield generation** | Reference photo run through Higgsfield's photo-to-pixel-art tool | **The client**, self-serve | Same status as B: a blocking sketch, not an asset |

> **Both B and C produce a starting shape, never a shipping asset.** Generated pixel art is systematically wrong in exactly the ways that matter here: it invents facial detail, uses off-palette color, applies automatic dithering and anti-aliasing (both banned by SR-5), and drifts likeness toward a generic handsome average. What it is genuinely good at is getting the head mass, pose and value structure onto the canvas fast. Treat it that way and it saves real time; treat it as finished and it ships a stranger's face.

**What to ask Higgsfield for** (give this verbatim to the client so their generations arrive usable):

```
HIGGSFIELD REQUEST SPEC — THE PATRIOT hero portraits

Output canvas:      384 × 384 px, square, 1:1 (we downsample by hand to 192×192)
Framing:            head and shoulders, chin at ~78% of frame height,
                    head centered, small margin above the hair
Style:              16-bit SNES-era pixel art, chunky hand-drawn look
Colors:             limited palette, 32 colors maximum, flat color clusters,
                    3-4 shading steps per material
Edges:              hard pixel edges, 1px dark outline around the head and
                    shoulders, NO anti-aliasing, NO soft edges
Explicitly avoid:   dithering of any kind, gradients, blur, glow, bloom,
                    noise, texture overlays, painterly rendering,
                    beautification / skin smoothing / face slimming,
                    changing age, changing ethnicity, anime or chibi styling,
                    background scenery (transparent or flat single color only)
Likeness:           match the attached reference photo exactly — preserve
                    hairline, beard or stubble exactly as photographed,
                    brow weight, jaw shape, and head-to-shoulder proportion.
                    Do NOT idealize the face.
Deliver:            PNG, no compression artifacts, plus the source photo used
Generate:           3-4 variations per person so we can pick the best base
```

*If Higgsfield cannot honor "no dithering," generate anyway and flag it — dither removal is a known, budgeted cleanup step (§4.7.3 step 3). If it cannot hold the palette, that is also fine; step 4 conforms everything regardless. The two constraints that genuinely matter from Higgsfield are **canvas size** and **do not idealize the face**.*

### 4.7.3 Convergence pipeline — every path runs all of these

| Step | Action | Applies to | Output |
|---|---|---|---|
| 0 | Crop the reference photo to head + shoulders, square, chin at 78% height. **Desaturate and posterize to 6 values** as a reading aid — never traced, never imported | A, B, C | reference plate |
| 1 | **Intake triage** of the generated image (B/C only): reject outright if the face is idealized, the age is wrong, the facial-hair state differs from the photo, or the head mass is off. Regenerate rather than repair — repairing a wrong skull costs more than restarting | B, C | accepted base |
| 2 | **Downsample to 192×192** by hand, nearest-neighbour, no resampling filter. Verify no half-pixels or 1px seams survived | B, C | on-grid base |
| 3 | **Cleanup pass:** strip every dithered region, every anti-aliased edge pixel, every stray off-cluster pixel. Rebuild those areas as flat clusters. This is the single largest labor item on paths B/C — budget it honestly | B, C | de-noised base |
| 4 | **Palette conformance pass:** snap every pixel to `PAL_CHAR_x` + `PAL_MASTER`. Skin uses the 4-value ramp (shadows hue-shifted toward `#8A4A3E`, lights toward `#F2C39C`); anything that cannot be snapped without visible banding gets a hand-drawn replacement cluster. **Hard gate: an automated report must show 0 off-palette pixels** | A, B, C | palette-locked |
| 5 | Block or correct the silhouette by hand: skull mass, jaw, neck, shoulder line, hair mass, gi collar | A, B, C | corrected silhouette |
| 6 | **Likeness-anchor checklist (§4.7.4)** — measure each anchor against the reference plate and correct. This is a written checklist with a tick per anchor, not an impression | A, B, C | anchored portrait |
| 7 | Material passes: beard/stubble cluster, brow cluster, gi collar (white / blue), black belt knot if in frame | A, B, C | detailed portrait |
| 8 | **2px selective outline** (2 UI px = 1 world px of visual weight — see §4.2.2 rule 2), hue-shifted per adjacent fill | A, B, C | outlined |
| 9 | **Squint test**: view at 50% and at 1× on a phone. Must still read as *that man* | A, B, C | validated |
| 10 | Color count check: ≤40 colors on the 192×192 master | A, B, C | locked master |
| 11 | **Derive the 64×64 HUD chip**: crop the master to the head, then **hand-reduce** — never a filtered downscale. ≥2 anchors must survive | A, B, C | chip set |
| 12 | **Owner approval gate (§4.7.5)** — the client says yes or it does not ship | A, B, C | approved asset |

**Path-cost reality check:** paths B and C skip steps 5–7 only *partially* — they give you a head to correct rather than a blank canvas. Expect **~60–70% of the hand-labor of path A**, not 20%. The savings are real but modest; the risk of an off-likeness face slipping through because "the tool made it" is the thing to actively guard against. **When B or C fights the artist for more than one working session, abandon it and finish on path A.**

### 4.7.4 Likeness anchors — preserve at every scale

**Idris (40, Dagestan, solid build):**

| Anchor | Priority | Pixel budget @192px portrait / @64px sprite | Notes |
|---|---|---|---|
| Hairline shape & recession pattern | **P0** | 3–4 px band | The single strongest ID cue at small scale |
| Beard outline & density edge | **P0** | 5–7 px mass | Shape of the jawline beard, not individual hairs |
| Brow weight & angle | **P0** | 2 px, 2 values | Reads as "commanding" — never angled into a scowl |
| Neck/shoulder mass ratio | **P0** | silhouette-level | Solid build: shoulders ≈ 2.6 head-widths |
| Nose bridge line | P1 | 2–3 px, 2 values | 1 highlight px only |
| Eye spacing & set depth | P1 | 1 px per eye at sprite scale, 4×4 at portrait | |
| Mouth resting line (warm, slightly upturned) | P1 | 2–3 px | Warmth is a likeness anchor here |
| Black belt tie + knot | P1 | 6×4 px | Signature — always visible in silhouette |
| Ear position/size | P2 | 1–2 px | |

**Otajon (25, lighter build, blue gi):**

| Anchor | Priority | Notes |
|---|---|---|
| Hair mass & part/fringe direction | **P0** | Top ID cue — full, dark, styled; the strongest read at chip scale |
| Jaw taper (narrower and cleaner than Idris) | **P0** | Silhouette differentiator between the two heroes |
| Slimmer shoulder ratio (≈2.2 head-widths) | **P0** | Reads instantly against Idris in co-op |
| Facial-hair state (light stubble or clean-shaven — **match the photo exactly**) | **P0** | At 25 this is the single most misread anchor; do not invent a full beard, do not erase real stubble |
| Brow lift / open, alert expression | P1 | Adult and confident — bright, not boyish |
| Blue gi + belt rank color from photo | P1 | Primary color-ID at any distance |
| Cheek structure (flatter, less padded than a teen's) | P1 | Keeps him reading 25, not 16 |
| Ear position/size | P2 | |

**Universal rules:** **every P0 anchor must be individually verifiable in the 192×192 portrait** — that is the entire reason for the larger canvas, and it is where the client's "is this him?" is answered. ≥2 anchors must survive in the 64×64 HUD chip. ≥3 must survive in the 64px in-game head (which is ~14×16 px of face — meaning: hair mass, beard/stubble mass, brow, and build carry the whole likeness; individual features do not). Skin tone comes from the photo, sampled and then **snapped to the character ramp** — never left as raw photo color. **Age reads through proportion, not detail:** Idris at 40 gets a heavier brow shelf, a thicker neck, and a slightly lower shoulder line; Otajon at 25 gets a lighter brow, a longer neck, and squarer shoulders — both at full adult 7.5-head proportion. Neither hero may be drawn with juvenile head-to-body ratios.

### 4.7.5 Client approval loop (owner approval gate)

| Round | Deliverable | Turnaround | Gate |
|---|---|---|---|
| **R0** | Photo intake + gi/belt color reference confirmed | — | Client supplies |
| **R1** | 3 portrait variants per hero at **192×192**, presented at 1×, 2× and as a phone-sized screenshot. If the client generated bases via Higgsfield, their picks are included as candidates here | 3 days | Client picks direction |
| **R2** | Chosen portrait refined + derived **64×64 chip** + 64px idle sprite, shown **in-context on a real VS card and a real gameplay screenshot** | 3 days | **Owner approval gate.** Client: "is this him?" — binary yes/no. A "nearly" is a no |
| **R3** | Full idle + walk + one throw animated GIF at 2× | 4 days | Likeness must hold **in motion** — the real test |
| **R4** | Sign-off; anchors frozen into a **Likeness Bible** (annotated PNG per hero, marking every P0 anchor on the approved 192×192 master) | — | **Locked.** Any later change to hair/beard/build requires re-running R2–R4. Re-deriving chips does not require re-approval; re-drawing the master does |

> **Escalation rule:** if the client says "close, but not quite," the fix is *always* re-measuring the anchors against the reference — never adding more detail. More pixels does not equal more likeness; correct proportions do.
>
> **Source-agnostic rule:** the approval gate is identical whether the portrait began as a hand-pixel, a Grok generation or a Higgsfield generation. The client is never asked to approve a *tool*; they approve a finished, palette-conformed, anchor-checked face. If a client-supplied Higgsfield base fails R2 twice, the artist finishes it on path A and the generation is retired.
>
> **Age-check gate (added to R2):** the client must explicitly confirm both heroes read at their canon ages — Idris 40, **Otajon 25**. A portrait that reads as a teenager fails R2 even if every feature is individually accurate.

---

## 4.8 GROK IMAGE PROMPT PACK

### 4.8.1 Consistency header — **prepend verbatim to every prompt below**

```
[STYLE HEADER — THE PATRIOT]
16-bit SNES/Genesis-era pixel art, authentic 1990s arcade game asset.
Hand-crafted chunky pixel clusters, hard-edged flat color shapes, 3-4 step
color ramps with hue-shifted shadows (cool) and highlights (warm).
1px selective dark outline on all characters and props (outline color is a
darkened hue-shifted version of the adjacent fill, never pure black).
NO anti-aliasing, NO gradients, NO blur, NO dithering patterns, NO noise.
Crisp 1:1 pixels, nearest-neighbour, pixel grid strictly aligned.
Bold readable silhouettes. Limited palette. Transparent background unless
stated otherwise. Reference feel: Disney's Aladdin (Genesis) sprite fluidity
+ TMNT Turtles in Time arcade chunkiness.
[/STYLE HEADER]
```

**Universal negative line** (append to every prompt's own NEGATIVE): `blurry, anti-aliased, soft edges, gradients, glow, bloom, 3D render, vector art, painterly, watercolor, photorealistic, modern indie hi-bit, jpeg artifacts, text watermark, signature, extra limbs, deformed hands, off-model.`

---

**P01 — Idris idle sprite sheet**
> `[STYLE HEADER]` A sprite sheet grid of a 40-year-old judo coach from Dagestan named Idris, standing idle in a fighting-ready stance. He is 64 pixels tall in a 96×96 transparent cell, solid powerful build, broad shoulders, short dark hair with a receding hairline, full dark trimmed beard, warm confident expression, wearing a crisp **white judo gi** with a **black belt** tied at the waist. 6 idle frames in one horizontal row showing subtle breathing and weight shift. Palette limited to 24 colors. Heroic, dignified, likable — absolutely not a caricature. Sprite sheet grid with even cell spacing, transparent background.
> **NEGATIVE:** cartoon exaggeration of the face, big nose, comedy proportions, anime style, chibi, colored belt other than black, blue gi, background scenery, drop shadow, + *universal negative*.

**P02 — Idris walk + run cycle sheet**
> `[STYLE HEADER]` Sprite sheet, two rows: row 1 = 8-frame walk cycle, row 2 = 8-frame run cycle, of Idris — 40yo Dagestani judo coach, white gi, black belt, solid build, 64px tall per 96×96 cell. Grounded heavy footfalls, gi skirt swaying, one motion-smear frame per running stride. Side view, facing right. Consistent character height and palette across every frame.
> **NEGATIVE:** inconsistent character size between frames, floating feet, changing outfit color, motion blur, ghosting, + *universal negative*.

**P03 — Idris throw poses (seoi-nage / o-goshi / uchi-mata)**
> `[STYLE HEADER]` Sprite sheet of dramatic judo throw key poses performed by Idris (white gi, black belt, solid build) throwing an opponent in a cheap dark suit and sunglasses (the "Clipboard" henchman — cheap suit, lanyard badge). Three rows of key frames: shoulder throw (seoi-nage), hip throw (o-goshi), inner-thigh throw (uchi-mata). Each row shows anticipation crouch → turn-in grip → explosive smear frame with elongated limbs → impact slam. 160×128 pixel cells, both bodies drawn interlocked. Exaggerated arcs, dynamic energy, chunky readable silhouettes.
> **NEGATIVE:** anatomically wrong grips, floating opponent, blood, gore, realistic violence, mushy overlapping silhouettes, + *universal negative*.

**P04 — Otajon full base sheet**
> `[STYLE HEADER]` Sprite sheet of Otajon, a **25-year-old** judo training partner with a lighter athletic build — 58 pixels tall in a 96×96 transparent cell. Full dark hair with a visible styled fringe, narrow clean jaw, light stubble, open friendly adult expression, wearing a **blue judo gi**. Adult proportions (roughly 7.5 heads tall), square shoulders, young man not a boy. Rows: 6-frame idle (bouncy), 8-frame walk, 4-frame jump. Springy, energetic personality in the posing.
> **NEGATIVE:** white gi, full beard, heavy build, older face, child or teenager proportions, oversized head, chibi, baby face, + *universal negative*.

**P05 — Otajon idle-break "snack" animation**
> `[STYLE HEADER]` A 16-frame single-row pixel art animation strip of Otajon (25-year-old young man, blue judo gi, full dark hair, light stubble) pulling a small snack out of his gi sleeve, eating it, glancing around guiltily, then brushing crumbs off his chest. Expressive cartoon timing in the *body*, never distorting the face. 96×96 cells, transparent background.
> **NEGATIVE:** grotesque chewing faces, distorted facial features, food gore, childlike proportions, + *universal negative*.

**P06 — Goon base rig, E1 "Clipboard" / E2 "Barrel"**
> `[STYLE HEADER]` Sprite sheet of two cartoonish **1990s American syndicate henchmen** sharing one body rig, 52–60 pixels tall in an 80×80 transparent cell. Variant 1 "Clipboard": a boxy cheap off-the-rack suit with sleeves slightly too short, skinny tie, **laminated badge on a lanyard**, a **clipboard tucked under one arm and swung as a weapon**, gold pinky ring, cocky shoulder-rolling posture. Variant 2 "Barrel": an ex-linebacker gone to seed — neckless trapezoid build, letterman jacket straining over a gut, ham forearms. Rows: 4-frame idle, 6-frame walk, 4-frame wind-up telegraph pose, 5-frame swinging attack. Rubbery, funny, broadly exaggerated 90s action-movie henchman energy. 16 colors.
> **NEGATIVE:** realistic menace, guns or drawn weapons, blood, hero-quality facial detail, national flags, stars and stripes, eagles, political symbols, military or police uniforms, real sports team logos, + *universal negative*.

**P07 — Goon variants E3–E5 turnaround sheet**
> `[STYLE HEADER]` Three cartoonish 1990s American syndicate henchman variants in one lineup sheet, same body rig and same 80×80 cell height, differentiated purely by silhouette and palette: (1) **"Melonhand"** — a market heavy in a stall apron over a stained rolled-sleeve shirt, holding a **crate or a melon overhead in the throwing wind-up**, (2) **"Sneaker"** — skinny and fast in a hooded windbreaker and **oversized high-top sneakers**, longest stride and narrowest mass of the roster, (3) **"Tracksuit"** — a low, wide-stanced grappler in a shiny **gold-striped tracksuit** with a chunky gold chain and popped collar. Front-facing idle pose each, plus a 3/4 view. Each wears a small gold pinky ring or chain glint.
> **NEGATIVE:** identical silhouettes, same headwear across variants, licensed character likenesses, real brand logos, national flags, political symbols, + *universal negative*.

**P08 — Goon variants E6–E8 turnaround sheet**
> `[STYLE HEADER]` Three elite 1990s American syndicate henchman variants, one lineup sheet, 96×96 cells: (1) **"Turnstile"** — riot-shield security with an earpiece wire, half-face visor and a **full-height shield held out front that forms most of the silhouette**, reading as a moving wall, (2) **"Kite Boy"** — a slim aerial harasser in goggles and wrapped hands under a **patchwork glider cape** stitched from mismatched showgirl fabrics, shown both cape-closed and cape-open, (3) **"Gold Jacket"** — the elite: a **sequined gold blazer** over a black shirt, sunglasses worn at night, immaculate hair, gold rings, the best-dressed man in the room. Idle pose + wind-up pose each. Each carries a small gold stylized snake-"S" shoulder patch.
> **NEGATIVE:** identical silhouettes, gore, real brand logos, police or military insignia, riot gear photorealism, national flags, + *universal negative*.

**P09 — Boss B1, Dale "Padlock" Pruitt (gatekeeper brawler)**
> `[STYLE HEADER]` Boss character sprite sheet, 88 pixels tall in a 128×128 transparent cell: **Dale "Padlock" Pruitt** — a huge ex-linebacker **stuffed into a rented inspector's suit two sizes too small**, buttons straining across the chest, trouser cuffs riding high above his socks, a cheap **laminated copy-shop badge on a lanyard**, and a **clipboard brandished like a warrant**. Bureaucratic swagger on a body built for collisions; smug, jowly, pleased with his own authority. Rows: 6-frame idle, 4-frame exaggerated telegraph wind-up with the clipboard thrust out at arm's length, 8-frame counter-throw. Cold dawn palette (`#2A3B63 #6E708C #A89684 #F0B87C`) with a hot gold pinky-ring glint.
> **NEGATIVE:** heroic warmth, resemblance to Idris, gore, real government or police insignia, real agency badges, firearms, national flags, political symbols, + *universal negative*.

**P10 — Boss B2, Cleo "The Kite" Vance (aerial zoner)**
> `[STYLE HEADER]` Boss sprite sheet, 92px tall in 128×128 cells: **Cleo "The Kite" Vance**, an ex-casino-revue aerialist turned syndicate enforcer — a lean athletic woman in goggles and wrapped hands, wearing a **patchwork glider cape / wing-rig stitched from mismatched showgirl fabrics** with feathered pauldrons, swinging a **weighted kite-line** (a thin cord with a heavy lead weight at the end) as a whip. Rows: idle perched on a rooftop ledge, cape-open glide, diving swoop attack, kite-line lash, taunt. Shown both cape-closed (narrow) and cape-open (widest, thinnest shape in the game). Sun-drenched bazaar palette (`#E0B573 #2E9EA8 #D2543F #F0A83A`) with gold `#FFD65C` line accents.
> **NEGATIVE:** sexualized posing, cleavage focus, midriff cheesecake, real celebrity likenesses, angel or fairy wings, feathered bird costume, gore, national flags, + *universal negative*.

**P11 — Boss B3, "Boxcar" Bruno Marchetti (rival grappler)**
> `[STYLE HEADER]` Boss sprite sheet, 96px tall in 128×128 cells: **"Boxcar" Bruno Marchetti** — a mountain of a biker in a sleeveless denim cutoff over black leather, huge tattooed forearms rendered as simple 2-color pixel clusters, wearing a **stolen train conductor's peaked cap perched comically small on his enormous head**, hauling a heavy **coal shovel** as his weapon. Soot and coal-dust streaks on arms and jaw. The largest, heaviest body in the game so far. Rows: idle, shovel-swing arc, charging rush, grapple lunge. Night palette (`#1E2450 #454B5C #F2B24C #D63C3C`), warm sodium train light raking him from one side.
> **NEGATIVE:** real motorcycle club insignia, real railway company branding, swastikas or hate symbols, military uniforms, national flags, gore, + *universal negative*.

**P12 — Boss B4, Denny "The Crane" Hollis (armored bruiser)**
> `[STYLE HEADER]` Boss sprite sheet, 104px tall in 128×128 cells: **Denny "The Crane" Hollis**, a dockside crane operator turned syndicate muscle, soaked in heavy rain — a **bright yellow rain slicker worn open over a loud patterned bowling shirt**, heavy work gloves, steel-toe boots, a cigarette that somehow never goes out. Slow, heavy, plated in wet vinyl; the flared slicker hem gives him a distinctive bell-shaped silhouette no other character has. Rows: idle with rain sheeting off the slicker, hook-grapple swing, container-slam, overhead signal-call summoning a crane drop. Wet palette (`#4A5259 #8A4B2E #D4712C #9FB6BC`) with the slicker as the brightest yellow on screen; wet-sheen highlights along every fold.
> **NEGATIVE:** dry clothing, sunny lighting, real shipping company or brand logos, firearms, gore, national flags, + *universal negative*.

**P13 — Final boss B5, REX "THE SNAKE" STERLING**
> `[STYLE HEADER]` Final boss sprite sheet, **128 pixels tall** in a 160×160 transparent cell: **Rex "The Snake" Sterling, a Las-Vegas-style 1990s pay-per-view fight mogul.** Tall and broad-shouldered in a **white suit with heavy gold trim on the lapels and cuffs**, black open-collar shirt, an enormous **gold snake ring** on one hand, slicked silver-blond hair, a permanent television-promoter grin, gold-topped cane. Two phases in the sheet: phase 1 jacket on, arms spread, directing his men theatrically; phase 2 jacket flung away, sleeves rolled, cane drawn, fighting personally and dirtily. Rows: idle, taunt, signature slam, phase-transform. Palette: white `#FFFFFF`, hot gold `#FFD65C` and `#D9A32B`, near-black `#08060E`, neon magenta `#FF2F92` and cyan `#2FE6E0` rim light from the arena.
> **NEGATIVE:** real promoter or celebrity likenesses, real event or network branding, national flags, stars and stripes, eagles, political imagery, firearms, gore, + *universal negative*.

**P14 — W1 background layer set**
> `[STYLE HEADER]` Pixel art game background **layers, delivered as separate stacked strips**, for a Dagestan mountain village at dawn. Layer A (sky, 480×270): 4-band dawn gradient from deep blue `#2A3B63` through `#4C5F8C` to warm `#B9805E` and hot horizon `#F0B87C`. Layer B (far, 960×180): snow-capped Caucasus ridgeline in `#414B70` / `#DCE4F2`, desaturated and hazy, no outlines. Layer C (mid, 960×220): stone-walled village houses with slate roofs, terraced, smoke rising from chimneys, palette `#A89684 #7C6A5C #3B3B47`. Layer D (foreground): dark pine boughs and a wooden fence post. Painterly layered depth, clean pixel clusters.
> **NEGATIVE:** characters, UI, single flattened image, outlines on distant mountains, modern buildings, + *universal negative*.

**P15 — W2 background layer set**
> `[STYLE HEADER]` Separate pixel art background layers for a **sun-drenched Middle-Eastern-style bazaar with rooftops**, Aladdin (Genesis) mood. Layer A (sky): flat turquoise `#3FC4D6 → #7EDCE4 → #CFF2EE` with a soft haze band. Layer B (far): minarets and turquoise domes `#2E9EA8 #1B6570` in city haze. Layer C (mid): dense market stalls, **striped awnings in `#D2543F` and `#F4E3C2`**, hanging carpets in indigo `#3A4C93`, brass lamps, spice piles in saffron `#F0A83A`. Layer D (foreground): awning fringe and a hanging rug at the frame edge. Ochre plaster architecture `#F7DCA6 #E0B573 #B07F47`, hot bright daylight.
> **NEGATIVE:** English or Latin signage text, misspelled Cyrillic, Arabic or Japanese script on signs, night, rain, characters, UI, flattened single layer, muted colors, + *universal negative*.

**P16 — W3 background layer set**
> `[STYLE HEADER]` Separate pixel art background layers for a **night train speeding through mountains**. Layer A (sky): deep indigo `#0E1130 → #1E2450` with a moon disc `#E8ECFA` and a subtle hand-placed star band. Layer B (far): moonlit mountain silhouettes `#232A55` with cold snow highlights `#8E9CC8`. Layer C (mid): dark pine forest strip `#16203A` and telegraph poles, built to scroll horizontally and tile seamlessly. Layer D (play): the **riveted steel roof of a train carriage**, `#6C7385 #454B5C #262A38`, with hatches and warm sodium-lit windows `#F2B24C`. Layer E (foreground): passing signal masts and wind streaks.
> **NEGATIVE:** daylight, characters, UI, seams in tiling layers, modern high-speed train, + *universal negative*.

**P17 — W4 background layer set**
> `[STYLE HEADER]` Separate pixel art background layers for a **cargo port and ship deck in heavy rain**. Layer A (sky): flat storm gradient `#3A4450 → #5A6672 → #7E8A94`, no sun. Layer B (far): harbor cranes and distant freighters over a choppy sea line `#2C4750 #38606A #A8C4C2`. Layer C (mid): stacked shipping containers in `#3E6B53 #2F5478 #C4A03C`, gantry structure, a swinging cargo hook, orange crane `#D4712C`. Layer D (play): wet riveted steel deck `#4A5259 #68737C` with mirror-sheen puddles `#9FB6BC`. Layer E (foreground): hanging chains and a container corner. Desaturated, cold, soaked.
> **NEGATIVE:** sunshine, warm colors, dry surfaces, characters, UI, lens flare, + *universal negative*.

**P18 — W5 background layer set**
> `[STYLE HEADER]` Separate pixel art background layers for a **neon casino fighting arena called The Golden Cage, at night**. Layer A: near-black void `#08060E #1B0F2E` with a magenta radial glow. Layer B (far): casino tower silhouettes with animated-style neon signage in magenta `#FF2F92` and cyan `#2FE6E0`. Layer C (mid): tiered crowd rendered as near-black silhouettes `#150D22` in three depth bands. Layer D (play): a **crimson fighting mat `#8E1B3A #C43257` with gold `#D9A32B` cage-perimeter markings** and baked spotlight ellipses. Layer E (foreground): vertical steel cage bars `#7C7490` and two hanging spotlights with visible light cones. Maximum neon contrast, deep black shadows, gold accents.
> **NEGATIVE:** daylight, pastel colors, readable crowd faces, real casino branding, characters, UI, + *universal negative*.

**P19 — Belt-scroll floor tile set**
> `[STYLE HEADER]` A pixel art **seamless tileable floor sheet** for a side-scrolling beat-'em-up, 16×16 tiles arranged in a grid, showing four horizontal perspective depth bands where each band upward is one ramp-step darker to create classic arcade depth. Deliver five sets: packed mountain earth, cobbled bazaar stone, riveted train steel, wet port deck plating, crimson-and-gold arena mat. Three variants per band to break visible repetition. Include a warm 1px scuff line marking the front walkable boundary.
> **NEGATIVE:** perspective distortion, non-tiling seams, characters, props, drop shadows, + *universal negative*.

**P20 — FX kit sheet**
> `[STYLE HEADER]` A pixel art **effects sprite sheet** on transparent background, arranged in labeled rows: (1) 5-frame white-and-gold 4-point hit spark, (2) 6-frame large impact starburst, (3) 6-frame dust puff, (4) 7-frame ground-hugging shockwave dust ring, (5) 8-frame white-to-gold crescent throw arc trail tapering 3px to 1px, (6) 6-frame comedy KO stars in gold, (7) 6-frame water splash. Punchy, high-contrast, chunky arcade FX with 1 pure-white hot frame each. Max 10 colors per effect.
> **NEGATIVE:** soft glow, additive blur, particle-system look, smoke wisps, realistic fire, + *universal negative*.

**P21 — UI kit sheet**
> `[STYLE HEADER]` A pixel art **arcade UI kit sheet** on a dark backing: a 128×12 health bar with a beveled `#241E33` frame, `#F2C14E` gold border and a green→gold→red fill ramp; a 240×14 segmented boss bar in crimson; 32×32 square gold-beveled portrait chip frames with 3×3 corner rivets; a combo counter numeral set; **Russian Cyrillic word-art banners reading exactly `ХОРОШО!`, `ЧИСТО!`, `ТЕХНИКА!` and `ВПЕРЁД`**; menu panels and selector arrows; a coin/credit icon. All lettering is **Russian Cyrillic**, blocky pixel caps, correctly formed — note `Ё` keeps its two dots. Chunky 1990s arcade cabinet chrome, gold `#F2C14E #A9761F #FFE9A8` on `#14121C` ink.
> **NEGATIVE:** Latin/English text, misspelled or invented Cyrillic, mirrored or reversed letters, fake-Cyrillic "Я for R" novelty lettering, Japanese or Chinese text, modern flat UI, thin lines, blurred drop shadows, rounded soft corners, modern sans-serif fonts, + *universal negative*.

**P22 — «ИППОН!» stamp**
> `[STYLE HEADER]` Pixel art word-art banner, 352×96, reading exactly **"ИППОН!"** — six heavy bold **Russian Cyrillic capital letters** И, П, П, О, Н followed by an exclamation mark, in that exact order. Gold vertical 3-step fill `#F2C14E → #FFE9A8`, 2px dark `#14121C` outline, 3px dark-red `#8E1D24` offset drop shadow. The `И` has its diagonal running from lower-left to upper-right between two vertical stems; the `П` is a squared arch with the crossbar at the very top. Angled dry-brush chipped stroke ends give it calligraphic energy **without using any Japanese characters**. Explosive arcade victory-stamp feel, transparent background.
> **NEGATIVE:** Latin letters, "IPPON" in Latin script, `N` instead of `И`, mirrored or reversed letters, extra or missing letters, misspelled Cyrillic, fake-Cyrillic novelty lettering, kanji, hiragana, katakana, any Japanese or Chinese characters, script fonts, soft glow, + *universal negative*.

**P23 — Idris VS-card portrait (reference-matched)**
> `[STYLE HEADER]` A **192×192 pixel art VS-card portrait** (generate at 384×384, we downsample by hand), head and shoulders with the chin at about 78% of frame height, of a 40-year-old judo coach — **match the attached reference photo likeness: `[ATTACH PHOTO — IDRIS]`**. Preserve exactly: the hairline shape and recession pattern, the beard outline and density edge, the brow weight and angle, and the broad neck-to-shoulder mass. Warm, commanding, dignified expression. White judo gi collar and black belt visible. 4-step hue-shifted skin ramp, cluster shading, 2px selective outline, max 40 colors, transparent or flat single-color background. Realistic likeness translated to chunky pixels — **not a caricature**. This is a *blocking base* for hand finishing, so favor correct head mass and proportion over invented detail.
> **NEGATIVE:** caricature, exaggerated features, anime eyes, chibi, beautification, changed ethnicity, changed age, generic stock face, smoothed skin, + *universal negative*.

**P24 — Otajon VS-card portrait (reference-matched)**
> `[STYLE HEADER]` A **192×192 pixel art VS-card portrait** (generate at 384×384, we downsample by hand), head and shoulders with the chin at about 78% of frame height, of a **25-year-old** judo training partner — **match the attached reference photo likeness: `[ATTACH PHOTO — OTAJON]`**. Preserve exactly: the hair mass and fringe direction, the narrow clean jaw taper, the facial-hair state exactly as photographed (light stubble or clean-shaven — do not invent a beard), the slimmer shoulder ratio, and an open, alert adult expression. Blue judo gi collar visible. Must read clearly as a confident young **man of 25**, not a teenager. 4-step hue-shifted skin ramp, cluster shading, 2px selective outline, max 40 colors, transparent or flat single-color background. **Not a caricature.** This is a *blocking base* for hand finishing, so favor correct head mass and proportion over invented detail.
> **NEGATIVE:** teenager, child, baby face, oversized head, chibi, anime eyes, invented full beard, beautification, changed ethnicity, aged-up middle-aged face, generic stock face, + *universal negative*.

**P25 — Villain VS-card portraits (Sterling Fight Syndicate)**
> `[STYLE HEADER]` A set of five 192×192 pixel art VS-card villain portraits (generate at 384×384), head and shoulders, matching the five bosses of a 1990s American fight syndicate: (1) **Dale "Padlock" Pruitt** — a jowly ex-linebacker bursting out of a too-small rented inspector's suit, laminated badge on a lanyard, smug, (2) **Cleo "The Kite" Vance** — a sharp-eyed aerialist in goggles pushed up on her forehead, patchwork glider cape collar framing her shoulders, (3) **"Boxcar" Bruno Marchetti** — a soot-streaked giant in a stolen conductor's cap that is far too small for him, (4) **Denny "The Crane" Hollis** — rain-soaked under a yellow slicker hood, loud bowling-shirt collar showing, cigarette clamped in his teeth, (5) **Rex "The Snake" Sterling** — silver-blond slicked hair, white suit with gold-trimmed lapels, black shirt, gold snake ring raised beside his face, television-promoter grin. Each smirking or snarling with broad 1990s cartoon-villain theatricality. Consistent lighting from upper-left across all five, 40 colors each.
> **NEGATIVE:** heroic warmth, sympathetic expressions, real-person or celebrity likenesses, national flags, stars and stripes, eagles, political imagery, gore, + *universal negative*.

**P26 — Logo & key art**
> `[STYLE HEADER]` Arcade **title logo and key art**. The wordmark reads exactly **«ПАТРИОТ»** — eight heavy chiselled **Russian Cyrillic capitals** П, А, Т, Р, И, О, Т — in gold `#F2C14E → #FFE9A8` with a dark `#14121C` outline and a crimson `#8E1D24` shadow, angled with a slight upward tilt, a black-belt ribbon sweeping beneath it. Directly under the ribbon, a **small Latin subtitle line reading "THE PATRIOT"** at roughly one-fifth the wordmark height, in plain gold pixel caps. Behind it, a dramatic composed key-art scene: a bearded judo coach in a white gi mid shoulder-throw, suited American henchmen in cheap suits and shades flying outward in silhouette, and — small, upper right, behind neon cage bars — a white-suited gold-trimmed fight promoter watching with a grin and a raised gold snake ring. Mountains at dawn on the left transitioning to neon casino magenta on the right. Attract-mode arcade poster energy. 480×270.
> **NEGATIVE:** misspelled or invented Cyrillic, mirrored/reversed letters, extra or missing letters in ПАТРИОТ, fake-Cyrillic novelty lettering, the title rendered only in Latin, military imagery, national flags, stars and stripes, eagles, political symbols, guns, weapons, gore, real-world insignia, modern movie-poster style, photographic elements, + *universal negative*.
>
> ⚠️ **Cyrillic QA gate — applies to P21, P22 and P26.** Image models routinely mangle Cyrillic. Treat every generated letterform as a *sketch of a shape*, never as final text: a native Russian reader on the team must verify each string character-by-character, and any word art that survives review is **redrawn by hand pixel-by-pixel** before it enters the repo. No generated Cyrillic ships as-is.

> **Prompt-pack operating notes:** run every prompt at 4× the stated pixel size and hand-downsample with nearest-neighbour — Grok output is a **base layer for hand-cleanup, never a shippable asset**. All hero-likeness prompts (P01–P05, P23, P24) require the client-approved reference photos attached; do not generate hero faces speculatively. Every generated asset is palette-snapped to §4.3 before it enters the repo.

---

## 4.9 Asset Manifest

*Priority: **P0** = required for vertical slice / first playable · **P1** = required for ship · **P2** = polish (tracked separately, not listed).*

| # | Asset file | Class | Size (px) | Frames | Pri |
|---|---|---|---|---|---|
| 1 | `hero_idris_base.png` | Sprite sheet | 96×96 cells | 200 | **P0** |
| 2 | `hero_idris_throws.png` | Sprite sheet | 160×128 cells | 52 | **P0** |
| 3 | `hero_idris_special.png` | Sprite sheet | 160×128 cells | 14 | P1 |
| 4 | `hero_otajon_base.png` | Sprite sheet | 96×96 cells | 195 | **P0** |
| 5 | `hero_otajon_throws.png` | Sprite sheet | 160×128 cells | 49 | **P0** |
| 6 | `hero_otajon_special.png` | Sprite sheet | 160×128 cells | 14 | P1 |
| 7 | `goon_rig_base.png` | Sprite sheet | 80×80 cells | 76 | **P0** |
| 8 | `goon_overlays_e1_e8.png` | Overlay sheet | 80×80 cells | 80 | **P0** |
| 8b | `goon_props_shield_cape.png` | Overlay sheet | 96×96 cells | 18 | P1 |
| 9 | `goon_palettes.json` | Palette LUT | — | 8 sets | **P0** |
| 10 | `goon_heavy_rig.png` | Sprite sheet | 96×96 cells | 76 | P1 |
| 11 | `boss_b1_pruitt.png` | Sprite sheet | 128×128 cells | 99 | **P0** |
| 12 | `boss_b2_vance.png` | Sprite sheet | 128×128 cells | 114 | P1 |
| 13 | `boss_b3_marchetti.png` | Sprite sheet | 128×128 cells | 118 | P1 |
| 14 | `boss_b4_hollis.png` | Sprite sheet | 128×128 cells | 120 | P1 |
| 15 | `boss_b5_rex_sterling.png` | Sprite sheet | 160×160 cells | 165 | P1 |
| 16 | `bg_w1_sky.png` | BG layer | 480×270 | 1 | **P0** |
| 17 | `bg_w1_far.png` | BG layer | 960×180 | 1 | **P0** |
| 18 | `bg_w1_mid.png` | BG layer | 960×220 | 1 | **P0** |
| 19 | `bg_w1_fg.png` | BG layer | 480×270 | 1 | **P0** |
| 20 | `bg_w1_anim.png` | BG anim strip | 64×64 cells | 22 | **P0** |
| 21 | `bg_w2_sky/far/mid/fg.png` | BG layers | as W1 | 4 | P1 |
| 22 | `bg_w2_anim.png` | BG anim strip | 64×64 cells | 26 | P1 |
| 23 | `bg_w3_sky/far/mid/fg.png` | BG layers | as W1 | 4 | P1 |
| 24 | `bg_w3_anim.png` | BG anim strip | 64×64 cells | 14 | P1 |
| 25 | `bg_w4_sky/far/mid/fg.png` | BG layers | as W1 | 4 | P1 |
| 26 | `bg_w4_anim.png` | BG anim strip | 64×64 cells | 32 | P1 |
| 27 | `bg_w5_sky/far/mid/fg.png` | BG layers | as W1 | 4 | P1 |
| 28 | `bg_w5_anim.png` | BG anim strip | 64×64 cells | 34 | P1 |
| 29 | `tiles_w1_village.png` | Tileset | 16×16 | 96 tiles | **P0** |
| 30 | `tiles_w2_bazaar.png` | Tileset | 16×16 | 112 tiles | P1 |
| 31 | `tiles_w3_train.png` | Tileset | 16×16 | 88 tiles | P1 |
| 32 | `tiles_w4_port.png` | Tileset | 16×16 | 104 tiles | P1 |
| 33 | `tiles_w5_cage.png` | Tileset | 16×16 | 80 tiles | P1 |
| 34 | `floor_belt_bands.png` | Tileset | 16×16 | 60 tiles | **P0** |
| 35 | `props_breakables.png` | Sprite sheet | 32×32 cells | 48 | P1 |
| 36 | `pickups.png` | Sprite sheet | 32×32 cells | 24 | P1 |
| 37 | `fx_sparks.png` | FX sheet | 32/64 cells | 11 | **P0** |
| 38 | `fx_dust.png` | FX sheet | 32/96 cells | 13 | **P0** |
| 39 | `fx_throw_arcs.png` | FX sheet | 96×64 cells | 8 | **P0** |
| 40 | `fx_screen.png` | FX sheet | 480×270 | 6 | P1 |
| 41 | `fx_weather_w4.png` | FX sheet | 480×270 | 8 | P1 |
| 42 | `fx_neon_w5.png` | FX sheet | 64×64 cells | 8 | P1 |
| 43 | `ui_hud.png` | UI atlas | 256×128 | — | **P0** |
| 44 | `ui_portrait_chips.png` | UI atlas *(2× layer)* — derived crops of the approved masters | 64×64 cells | 16 | **P0** |
| 45 | `ui_ippon_stamp.png` | UI anim | 352×96 cells | 10 | **P0** |
| 46 | `ui_combo_ru.png` | UI atlas (Cyrillic word art) | 160×64 | 24 | P1 |
| 47 | `ui_menus.png` | UI atlas | 256×256 | — | P1 |
| 48 | `vs_card_frame.png` | UI *(2× layer)* | 960×540 | 1 | P1 |
| 49 | `vs_portraits_heroes.png` | Portrait sheet *(2× layer)* — **likeness P0** | 192×192 cells | 2 | **P0** |
| 49b | `portraits_cutscene_heroes.png` | Cutscene close-ups *(2× layer)* — neutral / determined / exhausted | 192×192 cells | 6 | P1 |
| 50 | `vs_portraits_bosses.png` | Portrait sheet *(2× layer)* | 192×192 cells | 5 | P1 |
| 51 | `font_pressstart2p_cyr.woff2` | Font (Cyrillic subset verified) | — | — | **P0** |
| 52 | `font_pixelifysans_cyr.woff2` | Font (Cyrillic subset verified) | — | — | **P0** |
| 53 | `font_bitmap_ru.png` | Bitmap font — digits + А-Я/а-я/Ё + punctuation + Latin caps | 8×12 cells (10px advance for Ж Щ Ы Ю М) | 121 | **P0** |
| 54 | `logo_title_ru.png` | Key art — «ПАТРИОТ» + Latin subtitle | 480×270 | 1 | P1 |
| 55 | `keyart_attract.png` | Key art | 480×270 | 1 | P1 |
| 56 | `attract_screens.png` | UI sheet | 480×270 | 4 | P1 |
| 57 | `crt_overlay_scanline.png` | Shader asset | 480×270 | 1 | P1 |
| 58 | `crt_vignette.png` | Shader asset | 480×270 | 1 | P1 |
| 59 | `palettes_master.json` | Data | — | 6 sets | **P0** |
| 60 | `likeness_bible_heroes.png` | Reference (not shipped) — P0 anchors annotated on the approved 192×192 masters | 192×192 | 2 | **P0** |

**Totals:** ~1,760 authored animation frames · 5 world layer sets (20 layers) · 5 tilesets (480 tiles) · 13 portrait masters at 192×192 on the 2× UI layer · P0 subset = 4 heroes/enemy sheets + W1 complete + core FX/UI ≈ **41% of total frame budget**, which is the vertical slice.

---

# PART 4 — AUDIO & SUNO PROMPT PACK

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

---

# PART 5 — UX, CONTROLS & SCREENS

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

---

# PART 6 — TECHNICAL ARCHITECTURE & MILESTONES

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

---

