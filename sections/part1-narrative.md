# 3. NARRATIVE, CHARACTERS & SCENARIO

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
