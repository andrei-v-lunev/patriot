# UltraQA cycle 2 — adversarial game completion audit

Goal: find and close remaining gameplay, controls, runtime-art, and robustness
defects without publishing failed generated art or touching protected hero likenesses.

| ID | Model / intent | Setup and harness | Expected signal | Actual / fix / evidence | Cleanup |
|---|---|---|---|---|---|
| C2-NORMAL | Normal player | Full campaign/boss and control smoke | No softlock; authored progression | The legal-input botfight cleared all 15 levels; every authored level reached Results in bounded deterministic probes; real menu reached PLAY with 135 ms keys | No temp state |
| C2-MALFORMED | Corrupt input/state | Missing/null/oversized intents, invalid IDs, partial pools | One deterministic tick or canonical fallback; no throw | Fixed corrupt `activeHero` Continue softlock and duplicate-reference pool corruption; hostile intent matrix remained deterministic | Temporary Node harness only |
| C2-INTERRUPT | Button masher | Pause/resume, grip/release, tag/action churn | No stuck state or stale pointers | 12 pause/resume pairs, simultaneous COOP input, blur release, and buffered action checks passed | All keys released; browser closed |
| C2-RESUME | Reloading player | Reload during menus/play, continue/next-level seams | Clean restart or preserved authored state; no stale input | Reload reset cleanly; valid Continue/Results and cross-level exhausted-player carry passed | Browser closed |
| C2-STALE | Long-running campaign | Re-enter segments/checkpoints/waves after deaths | Current checkpoint/wave remains authoritative | Continue, current-wave restart, latest checkpoint, pit delay, and 15-level forced-clear coverage green | Temporary Node harness only |
| C2-DIRTY | Existing worktree | Fingerprint before/after hostile harnesses | No unrelated edits hidden or overwritten | Baseline `5c658f80…970` preserved through read-only hostile runs; subsequent changes are the scoped fixes documented in CHANGELOG | User/shared changes preserved |
| C2-HUNG | Runtime failure | Bound botfight/server/browser commands | Timeout is bounded and child is cleaned | Botfight completed in <1 s; every isolated browser session closed; existing shared server left intact | No owned child remains |
| C2-FLAKE | Determinism skeptic | Repeat identical hostile intent logs | Byte-identical hashes/results | Repeated solo/COOP/B5 hostile hashes matched; 36,000-tick replay and 600-tick caller-intent replay tests green | Stdin-only probes |
| C2-MISLEAD | False-green detector | Check exit codes plus failure markers for tests/validator | Green output and exit 0 agree | Final `npm test`, validator, focused suites, pixelpipe 21/21, and `git diff --check` all exit 0 | Baseline temp log removed |
| C2-ART | Visual adversary | Atlas/source/gate/live-route audit | No overlap, crop, panel, bad identity or failed sheet live | Exact supplied B1 raw-v3 rejected (16 near-full-height dividers); live B1 walk is 6/6 unique with zero edge contacts. Published atlas has no current crop/panel failure; failed actions remain omitted with graceful fallback | Browsers closed; rejects retained as evidence |

Safety bounds: localhost and repository only; no commits, pushes, secrets, broad
deletes, or external writes. Stop this cycle after confirmed P0/P1 fixes are green
or after the same blocker repeats three times.
