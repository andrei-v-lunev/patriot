# Response — AUDIO_GENERATION_TASK.md

**From:** audio implementation pass, 2026-08-19
**Status:** §4 Voice executed end-to-end — 46/46 clips delivered to `assets/audio/vo/` (92 files, ogg+m4a, 1.3 MB). §2 Music and §3 SFX not started.
**Scope of this note:** edits the brief needs. Findings come from running it, not from reading it.

---

## Five doc-level fixes

### 1. §1 mix targets contradict what §4 can deliver

"Normalize every clip on a bus to the same **integrated** target (not peak)" is undefined for 44 of the 46 VO clips. EBU R128 integrated loudness gates in 400 ms blocks and needs ~3 s of material; below that `ebur128` reports the −70 LUFS floor for a perfectly loud clip. Followed literally, the instruction put **+56 dB** of gain on a 0.43 s grunt on the first proof run.

The intent behind the rule is right — the sentence after it ("otherwise short grunts vanish under long lines") is exactly why peak normalization is wrong. Only the measurement basis is unstated.

**Rewrite as:** integrated LUFS for clips ≥ 3 s; short-term/RMS for anything shorter, normalized to the same numeric bus target. Implemented that way in `tools/gen_vo.py` (`MIN_LUFS_GATE_S`), with a ±12 dB gain clamp as a backstop.

### 2. §4 Route B forbids TTS grunts but names no source

"**Never TTS grunts** — source non-verbal exertion from a royalty-free effort library." 18 of the 46 clips are non-verbal, and no effort library exists in the repo. As written the rule blocks 39% of the deliverable with no alternative path.

**Decide one:** name the licensed library (and where it lives), or state that labelled placeholders are acceptable pending a Route A session. Current delivery took the second reading — those 18 clips carry `temp_placeholder: true` in `tools/vo_report.json` and are not presented as final.

### 3. The announcer has no casting entry

§4.1 gives voice *direction* ("cigarette voice pushed through plate reverb") but never assigns a speaker. Route A names three people in prose; Route B lists no third voice. It is a required decision the doc omits silently, so it surfaces mid-production.

**Add an explicit casting line per voice**, including the announcer, for both routes. Current delivery reuses Idris's voice ID with the §4 chain step 2 processing doing the character work, per operator decision.

### 4. §6 gap 3 is open and is the cheapest one to close

«БЕЗУПРЕЧНО!» (audio spec) vs «ИДЕАЛЬНО!» (shipped UI string, narrative spec). The doc already flags recording both takes as cheap — that is true only before a Route A session. **Settle it before anyone books studio time**; after, it is the one expensive version of this decision.

### 5. §2 acceptance criteria are not reachable by the §2 generation route

Three criteria are DAW operations, not generation outputs:

- stem pairs "sample-accurate in length and loop points", both stems phase-locked
- loop points "derived from bar/BPM at export, not guessed"
- the Patriot 5-note cell "audibly the same motif" across six tracks

The Suno-style prompts in §2 produce takes. They cannot produce a bar-locked base/drums split of one performance, and a generative model will not reproduce an identical 5-note cell across six independent generations. §2 half-acknowledges this ("Generated audio is never loop-ready: time-stretch… then cut loops on bar lines") but the DAW pass is a subordinate clause, not a staged deliverable with an owner or a budget.

**Do one of:** promote the DAW pass to a named stage with an owner, or relax the stem/loop criteria to what generation alone can hit. Leaving both in place means the acceptance checklist cannot be signed regardless of how good the audio is.

---

## Production note for whoever runs Route B

Bracketed delivery directions are read aloud intermittently by the TTS engine. `[yelp of pain, taking a hit] Ай!` returned 3.0 s of continuous vocalisation across two attempts where its sibling clip on the identical direction returned 0.70 s; shortening to `[short yelp]` fixed it at 0.65 s.

Keep directions to two or three words, and duration-check every clip against its siblings before accepting a batch — a clip several times longer than its neighbours is the direction being spoken, and it is not audible as an error in a report that only checks levels.

---

## What is delivered against §4

| Item | Status |
|---|---|
| 18 announcer lines | done — bus −12 LUFS, 12-bit crush + bright plate per §4 chain step 2, 559 KB (cap 1 MB) |
| 15 Idris barks | done — bus −14 LUFS, dry |
| 13 Otajon barks | done — bus −14 LUFS, dry |
| Peak ceiling | −1.0 dBTP, verified on masters |
| Trim | ≤ 30 ms head / ≤ 80 ms tail per §1 |
| Formats | ogg q4 mono + m4a 96 kbps mono, both per clip |
| WAV masters | `tools/_vo_masters/`, 48 kHz / 24-bit, named by ID |
| Of which temp placeholders | 18 non-verbal clips, flagged in `tools/vo_report.json` |

Reproducible from `tools/vo_manifest.json` via `tools/gen_vo.py`; `--process` re-runs the whole chain free without re-spending on TTS.
