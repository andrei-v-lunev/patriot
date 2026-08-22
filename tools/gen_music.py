#!/usr/bin/env python3
"""Generate the «ПАТРИОТ» music package from tools/music_manifest.json.

Same two-stage shape as gen_vo.py so audio spend happens once:

  --gen      Kie Suno -> tools/_music_raw/<id>_a.mp3 + _b.mp3   (costs credits)
  --process  raw -> master WAV + assets/audio/music/*.ogg + *.m4a   (free, re-runnable)

Suno returns up to TWO variants per task, so one submit = two takes. The brief
(AUDIO_GENERATION_TASK.md §2) asks for >=4 takes per track because the
funk+lezginka fusion lands about 1 in 3 — run --gen again with --take-set b to
bank takes c/d.

Submission is fanned out (all tracks submitted, then all polled) because Suno
generation runs minutes per track and sequential polling would take an hour.

Reuses the agency's Kie polling (`sound._poll_kie_suno`) rather than
reimplementing its status/error handling. Submission is local because
sound.py's `_submit_kie_suno` hardcodes instrumental=True, one fixed title, and
a fixed negativeTags set — this package needs all three per track, since
mus_title is the only vocal track in it.

Processing chain implements AUDIO_GENERATION_TASK.md §1 mix targets:
  1. permanent -3 dB cut @ 200-450 Hz (carves room for slam SFX)
  2. normalize to -16 LUFS integrated (tracks are minutes long, so the R128 gate
     is valid here — unlike the sub-second VO clips; see gen_vo.py's
     MIN_LUFS_GATE_S for why that distinction is load-bearing)
  3. -1.0 dBTP ceiling

NOT produced here, by construction: base/drums stems and bar-derived loop
points. Suno returns a finished stereo mix; splitting it into phase-locked stems
and cutting loops on bar lines is DAW work. See
tasks/AUDIO_GENERATION_TASK.response.md fix #5.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

AGENCY = Path("/Users/andreilunev/Documents/AI Agency V2")
sys.path.insert(0, str(AGENCY / ".claude" / "skills" / "video-sound" / "scripts"))

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "tools" / "music_manifest.json"
RAW_DIR = ROOT / "tools" / "_music_raw"
MASTER_DIR = ROOT / "tools" / "_music_masters"
OUT_DIR = ROOT / "assets" / "audio" / "music"
REPORT = ROOT / "tools" / "music_report.json"

TP_CEILING_LINEAR = 0.891  # -1.0 dBTP
SUBMIT_STAGGER_S = 1.5     # Kie createTask is frequency-capped; stagger the fan-out
SIZE_BUDGET_KB = 1024      # §1: <= 1 MB per track (ogg + m4a combined)


def load_env() -> None:
    """Read KIE_API_KEY from the agency .env if not already exported."""
    if os.getenv("KIE_API_KEY"):
        return
    for candidate in (AGENCY / ".env", ROOT / ".env"):
        if not candidate.exists():
            continue
        for line in candidate.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


# ----------------------------------------------------------------------- suno
def submit(track: dict) -> str:
    """Submit one Suno task. Returns taskId."""
    import sound  # agency module; imported lazily so --process needs no API key

    key = os.getenv("KIE_API_KEY")
    if not key:
        sys.exit("KIE_API_KEY not found")

    instrumental = bool(track.get("instrumental", True))
    payload = {
        "prompt": track.get("lyrics") or track["style"],
        "customMode": True,
        "instrumental": instrumental,
        "model": os.getenv("KIE_SUNO_MODEL", "V4_5ALL"),
        "callBackUrl": sound._kie_callback_url(),
        "style": track["style"],
        "title": track["id"],
    }
    if instrumental:
        # The package is Russian-language; an English vocal leaking into a stage
        # theme breaks §5's "No English anywhere in any audio file".
        payload["negativeTags"] = (
            "vocals, singing, lyrics, spoken word, modern EDM, supersaw, trap hats"
        )
    else:
        payload["negativeTags"] = "english lyrics, modern EDM, supersaw, trap hats"

    cmd = ["curl", "-sS", "--location", sound.KIE_SUNO_GENERATE_URL,
           "--header", f"Authorization: Bearer {key}",
           "--header", "Content-Type: application/json",
           "--data", json.dumps(payload, ensure_ascii=False),
           "--max-time", "60"]
    data = sound._curl_json(cmd)
    task_id = (data.get("data") or {}).get("taskId")
    if not task_id:
        raise RuntimeError(f"no taskId returned: {data}")
    return str(task_id)


def variant_urls(status_data: dict) -> list[str]:
    """Both Suno variants, in order. sound.py's helper returns only the first."""
    response = status_data.get("response")
    if not isinstance(response, dict):
        return []
    urls = []
    for v in response.get("sunoData") or []:
        if not isinstance(v, dict):
            continue
        for k in ("audioUrl", "audio_url", "streamAudioUrl", "sourceAudioUrl"):
            if isinstance(v.get(k), str) and v[k]:
                urls.append(v[k])
                break
    return urls


def download(url: str, dest: Path) -> None:
    r = run(["curl", "-sS", "--location", url, "-o", str(dest), "--max-time", "600"])
    if r.returncode != 0 or not dest.exists() or dest.stat().st_size < 10_000:
        raise RuntimeError(f"download failed: {r.stderr.strip()[:200]}")


def do_gen(tracks: list[dict], take_set: str, force: bool) -> list[dict]:
    import sound

    load_env()
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    s1, s2 = ("a", "b") if take_set == "a" else ("c", "d")

    todo, cached = [], []
    for t in tracks:
        if (RAW_DIR / f"{t['id']}_{s1}.mp3").exists() and not force:
            print(f"skip (exists)  {t['id']}")
            cached.append({"id": t["id"], "status": "cached"})
        else:
            todo.append(t)
    if not todo:
        return cached

    print(f"=== submitting {len(todo)} Suno tasks ===")
    submitted = []
    for t in todo:
        try:
            tid = submit(t)
            print(f"  submitted   {t['id']:<20} task={tid}")
            submitted.append((t, tid))
        except Exception as exc:  # noqa: BLE001 - report, do not abort the batch
            print(f"  SUBMIT FAIL {t['id']}: {exc}")
            submitted.append((t, None))
        time.sleep(SUBMIT_STAGGER_S)

    live = [x for x in submitted if x[1]]
    print(f"=== polling {len(live)} tasks (Suno takes minutes per track) ===")

    def collect(pair):
        t, tid = pair
        if not tid:
            return {"id": t["id"], "status": "submit_failed"}
        try:
            _url, status_data = sound._poll_kie_suno(tid)
        except Exception as exc:  # noqa: BLE001
            print(f"  POLL FAIL {t['id']}: {exc}")
            return {"id": t["id"], "status": "poll_failed", "task_id": tid,
                    "error": str(exc)[:300]}
        urls = variant_urls(status_data)
        got = []
        for suffix, url in zip((s1, s2), urls):
            dest = RAW_DIR / f"{t['id']}_{suffix}.mp3"
            try:
                download(url, dest)
                got.append(suffix)
            except Exception as exc:  # noqa: BLE001
                print(f"  DL FAIL {t['id']}_{suffix}: {exc}")
        sd = (status_data.get("response") or {}).get("sunoData") or [{}]
        print(f"  ok  {t['id']:<20} takes={','.join(got) or 'NONE'}")
        return {"id": t["id"], "status": "generated" if got else "no_variants",
                "task_id": tid, "takes": got,
                "model": sd[0].get("modelName") if isinstance(sd[0], dict) else None,
                "suno_duration_s": sd[0].get("duration") if isinstance(sd[0], dict) else None}

    with ThreadPoolExecutor(max_workers=8) as ex:
        return cached + list(ex.map(collect, live)) + [
            {"id": t["id"], "status": "submit_failed"} for t, tid in submitted if not tid
        ]


# -------------------------------------------------------------------- process
def measure_lufs(path: Path) -> float | None:
    r = run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128", "-f", "null", "-"])
    hits = re.findall(r"I:\s*(-?\d+\.?\d*)\s*LUFS", r.stderr)
    if not hits:
        return None
    val = float(hits[-1])
    return None if val <= -70 else val


def duration_s(path: Path) -> float | None:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "csv=p=0", str(path)]).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return None


def do_process(tracks: list[dict], bus: dict, take: str) -> list[dict]:
    MASTER_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    target = float(bus["lufs"])
    eq = (f"equalizer=f={bus['shelf_hz']}:width_type=h:"
          f"width={bus['shelf_width_hz']}:g={bus['shelf_gain_db']}")

    rows = []
    for i, t in enumerate(tracks, 1):
        tid = t["id"]
        raw = RAW_DIR / f"{tid}_{take}.mp3"
        if not raw.exists():
            print(f"[{i:2}/{len(tracks)}] MISSING raw  {tid}_{take}")
            rows.append({"id": tid, "status": "missing_raw", "take": take})
            continue

        stage = MASTER_DIR / f"_{tid}.stage.wav"
        r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(raw),
                 "-af", eq, "-ar", "48000", "-c:a", "pcm_s24le", str(stage)])
        if r.returncode != 0:
            print(f"[{i:2}/{len(tracks)}] FAIL eq {tid}: {r.stderr.strip()[:160]}")
            rows.append({"id": tid, "status": "eq_failed", "take": take})
            continue

        measured = measure_lufs(stage)
        if measured is None:
            stage.unlink(missing_ok=True)
            print(f"[{i:2}/{len(tracks)}] FAIL measure {tid} (silent?)")
            rows.append({"id": tid, "status": "unmeasurable", "take": take})
            continue

        gain = round(target - measured, 2)
        master = MASTER_DIR / f"{tid}.wav"
        r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(stage),
                 "-af", f"volume={gain}dB,alimiter=limit={TP_CEILING_LINEAR}:level=disabled",
                 "-ar", "48000", "-c:a", "pcm_s24le", str(master)])
        stage.unlink(missing_ok=True)
        if r.returncode != 0:
            print(f"[{i:2}/{len(tracks)}] FAIL gain {tid}: {r.stderr.strip()[:160]}")
            rows.append({"id": tid, "status": "gain_failed", "take": take})
            continue

        ogg, m4a = OUT_DIR / f"{tid}.ogg", OUT_DIR / f"{tid}.m4a"
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master),
             "-c:a", "libvorbis", "-q:a", "4", str(ogg)])
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master),
             "-c:a", "aac", "-b:a", "128k", str(m4a)])

        final = measure_lufs(master)
        dur = duration_s(master)
        kb = (ogg.stat().st_size + m4a.stat().st_size) / 1024
        over = kb > SIZE_BUDGET_KB
        rows.append({
            "id": tid, "status": "ok", "take": take, "bpm": t["bpm"], "key": t["key"],
            "target_len": t["target_len"],
            "duration_s": round(dur, 2) if dur else None,
            "measured_lufs": measured, "gain_applied_db": gain, "final_lufs": final,
            "ogg_kb": round(ogg.stat().st_size / 1024, 1),
            "m4a_kb": round(m4a.stat().st_size / 1024, 1),
            "over_size_budget": over,
            # Neither is derivable from a finished Suno mix — see module docstring.
            "stems": None, "loop_points": None,
        })
        flag = "  !! over 1MB budget" if over else ""
        print(f"[{i:2}/{len(tracks)}] ok  {tid:<20} {rows[-1]['duration_s']}s "
              f"(target {t['target_len']})  {measured:.1f}->{final:.1f} LUFS  {kb:.0f}KB{flag}")
    return rows


# ---------------------------------------------------------------------- cli
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gen", action="store_true")
    ap.add_argument("--process", action="store_true")
    ap.add_argument("--force", action="store_true", help="re-generate even if raw exists")
    ap.add_argument("--only", help="comma-separated track ids")
    ap.add_argument("--take-set", choices=["a", "b"], default="a",
                    help="a = takes a/b (default), b = takes c/d (second pass)")
    ap.add_argument("--take", default="a", help="which take to process into assets")
    ap.add_argument("--recover", metavar="ID:TASKID",
                    help="re-poll an already-submitted task and download its takes. "
                         "A poll timeout is a lost RECEIPT, not a lost generation — the "
                         "credits are already spent server-side, so recover by task id "
                         "instead of re-submitting.")
    args = ap.parse_args()

    if args.recover:
        import sound
        load_env()
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        tid_key, _, task_id = args.recover.partition(":")
        s1, s2 = ("a", "b") if args.take_set == "a" else ("c", "d")
        _url, status_data = sound._poll_kie_suno(task_id)
        got = []
        for suffix, url in zip((s1, s2), variant_urls(status_data)):
            dest = RAW_DIR / f"{tid_key}_{suffix}.mp3"
            download(url, dest)
            got.append(suffix)
        print(f"recovered {tid_key}: takes={','.join(got) or 'NONE'}")
        return
    if not args.gen and not args.process:
        args.gen = args.process = True

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found")

    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    tracks, bus = data["tracks"], data["bus"]
    if args.only:
        want = {s.strip() for s in args.only.split(",")}
        tracks = [t for t in tracks if t["id"] in want]
        if not tracks:
            sys.exit("--only matched no tracks")

    report: dict = {"tracks": len(tracks)}
    if args.gen:
        report["gen"] = do_gen(tracks, args.take_set, args.force)
    if args.process:
        print(f"=== PROCESS: {len(tracks)} tracks (take {args.take}) ===")
        report["process"] = do_process(tracks, bus, args.take)
        ok = [r for r in report["process"] if r["status"] == "ok"]
        if ok:
            over = [r["id"] for r in ok if r["over_size_budget"]]
            print(f"\n{len(ok)}/{len(tracks)} processed; over 1MB budget: {over or 'none'}")

    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nreport -> {REPORT}")


if __name__ == "__main__":
    main()
