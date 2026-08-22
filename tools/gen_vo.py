#!/usr/bin/env python3
"""Generate the «ПАТРИОТ» voice package from tools/vo_manifest.json.

Two independent stages so audio spend happens once:

  --tts      Fish Audio TTS -> tools/_vo_raw/<id>.mp3        (costs money)
  --process  raw mp3 -> master WAV + assets/audio/vo/*.ogg + *.m4a   (free, re-runnable)

Default runs both. Use --only <id,id> to work on a subset, --force to re-TTS
clips whose raw mp3 already exists.

Processing chain implements tasks/AUDIO_GENERATION_TASK.md §4:
  1. high-pass 100 Hz -> de-ess -> compress 4:1 (~6 dB GR)
  2. announcer only: ~12-bit crush + bright plate (HPF 400 Hz, 20 ms pre-delay)
  3. character barks: dry, no reverb
  4. trim silence, normalize to the bus integrated-LUFS target, -1.0 dBTP ceiling
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "tools" / "vo_manifest.json"
RAW_DIR = ROOT / "tools" / "_vo_raw"
MASTER_DIR = ROOT / "tools" / "_vo_masters"
OUT_DIR = ROOT / "assets" / "audio" / "vo"
REPORT = ROOT / "tools" / "vo_report.json"
AUDIO_DATA = ROOT / "data" / "audio.json"

TP_CEILING_LINEAR = 0.891  # -1.0 dBTP
HEAD_PAD_MS = 20           # spec: <= 30 ms
TAIL_PAD_S = 0.06          # spec: <= 80 ms


# --------------------------------------------------------------------------- env
def load_env() -> None:
    """Read FISH_AUDIO_API_KEY from the agency .env if not already exported."""
    if os.getenv("FISH_AUDIO_API_KEY"):
        return
    for candidate in (
        Path("/Users/andreilunev/Documents/AI Agency V2/.env"),
        ROOT / ".env",
    ):
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


# --------------------------------------------------------------------------- tts
def do_tts(clips, voices, force: bool) -> list[dict]:
    from fish_audio_sdk import Prosody, Session, TTSRequest

    load_env()
    key = os.getenv("FISH_AUDIO_API_KEY")
    if not key:
        sys.exit("FISH_AUDIO_API_KEY not found")
    session = Session(key)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    results = []
    for i, clip in enumerate(clips, 1):
        cid = clip["id"]
        out = RAW_DIR / f"{cid}.mp3"
        if out.exists() and not force:
            print(f"[{i:2}/{len(clips)}] skip (exists)  {cid}")
            results.append({"id": cid, "status": "cached"})
            continue

        vcfg = voices[clip["voice"]]
        req = TTSRequest(
            text=clip["tts"],
            format="mp3",
            mp3_bitrate=128,
            reference_id=vcfg["reference_id"],
            prosody=Prosody(speed=vcfg.get("speed", 1.0)),
            temperature=vcfg.get("temperature"),
            normalize=True,
        )
        try:
            buf = bytearray()
            for chunk in session.tts(req, backend="s2-pro"):
                buf.extend(chunk)
            out.write_bytes(bytes(buf))
            print(f"[{i:2}/{len(clips)}] ok  {cid}  ({len(buf)/1024:.0f} KB)")
            results.append({"id": cid, "status": "generated", "bytes": len(buf)})
        except Exception as exc:  # noqa: BLE001 - report, do not abort the batch
            print(f"[{i:2}/{len(clips)}] FAIL {cid}: {exc}")
            results.append({"id": cid, "status": "failed", "error": str(exc)})
    return results


# ----------------------------------------------------------------------- process
def has_filter(name: str) -> bool:
    return re.search(rf"\b{name}\b", run(["ffmpeg", "-hide_banner", "-filters"]).stdout) is not None


def build_chain(is_announcer: bool, deesser: bool) -> str:
    pre = ["highpass=f=100"]
    if deesser:
        pre.append("deesser=i=0.4")
    pre.append("acompressor=threshold=-18dB:ratio=4:attack=5:release=100:makeup=3")
    pre_s = ",".join(pre)

    if is_announcer:
        # ~12-bit crush, then a bright plate: HPF 400 Hz wet, 20 ms pre-delay.
        fx = (
            f"{pre_s},acrusher=bits=12:mode=lin:mix=0.4,"
            "asplit=2[dry][pre];"
            "[pre]highpass=f=400,aecho=0.9:0.85:20|37|61|97:0.30|0.20|0.13|0.08[wet];"
            "[dry][wet]amix=inputs=2:weights=1 0.38:normalize=0"
        )
    else:
        fx = pre_s

    trim = (
        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0:detection=peak,"
        "areverse,"
        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0:detection=peak,"
        "areverse"
    )
    return f"{fx},{trim}"


def duration_s(path: Path) -> float | None:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "csv=p=0", str(path)]).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return None


# EBU R128 integrated loudness gates in 400 ms blocks and needs several seconds
# of material to be meaningful. Below this, ebur128 reports the -70 LUFS floor
# (or a wildly low value) for a perfectly loud clip — which is how a 0.4 s grunt
# earned a +56 dB gain on the first proof run. Anything shorter is measured by
# RMS instead, which tracks integrated LUFS within a couple of dB on speech.
MIN_LUFS_GATE_S = 3.0
MAX_GAIN_DB = 12.0


def measure_lufs(path: Path) -> float | None:
    """Integrated LUFS via ebur128; None when the clip is too short to gate."""
    if (d := duration_s(path)) is not None and d < MIN_LUFS_GATE_S:
        return None
    r = run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128", "-f", "null", "-"])
    hits = re.findall(r"I:\s*(-?\d+\.?\d*)\s*LUFS", r.stderr)
    if not hits:
        return None
    val = float(hits[-1])
    return None if val <= -70 else val


def measure_rms(path: Path) -> float | None:
    r = run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "astats=metadata=1", "-f", "null", "-"])
    hits = re.findall(r"RMS level dB:\s*(-?\d+\.?\d*)", r.stderr)
    return float(hits[0]) if hits else None


def do_process(clips, voices) -> list[dict]:
    deesser = has_filter("deesser")
    if not deesser:
        print("note: ffmpeg has no 'deesser' filter — chain step 1 runs without de-essing")
    MASTER_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    rows = []
    for i, clip in enumerate(clips, 1):
        cid = clip["id"]
        raw = RAW_DIR / f"{cid}.mp3"
        if not raw.exists():
            print(f"[{i:2}/{len(clips)}] MISSING raw  {cid}")
            rows.append({"id": cid, "status": "missing_raw"})
            continue

        vcfg = voices[clip["voice"]]
        target = float(vcfg["lufs"])
        stage = MASTER_DIR / f"_{cid}.stage.wav"

        r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(raw),
                 "-filter_complex", build_chain(bool(vcfg.get("reverb")), deesser),
                 "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", str(stage)])
        if r.returncode != 0:
            print(f"[{i:2}/{len(clips)}] FAIL chain {cid}: {r.stderr.strip()[:200]}")
            rows.append({"id": cid, "status": "chain_failed", "error": r.stderr.strip()[:400]})
            continue

        measured = measure_lufs(stage)
        basis = "ebur128_integrated"
        if measured is None:
            rms = measure_rms(stage)
            if rms is None:
                measured, basis = target, "unmeasurable_no_gain"
            else:
                # Short clips cannot be gated; RMS tracks integrated LUFS within
                # a couple of dB on speech, so use it and say so in the report.
                measured, basis = rms, "astats_rms_fallback"

        gain = round(target - measured, 2)
        if abs(gain) > MAX_GAIN_DB:
            clamped = round(MAX_GAIN_DB if gain > 0 else -MAX_GAIN_DB, 2)
            print(f"[{i:2}/{len(clips)}] WARN {cid}: gain {gain} dB clamped to {clamped} "
                  f"(basis {basis}) — inspect this clip")
            basis += "_clamped"
            gain = clamped
        master = MASTER_DIR / f"{cid}.wav"
        r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(stage),
                 "-af", (f"volume={gain}dB,"
                         f"alimiter=limit={TP_CEILING_LINEAR}:level=disabled,"
                         f"adelay={HEAD_PAD_MS}|{HEAD_PAD_MS},apad=pad_dur={TAIL_PAD_S}"),
                 "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", str(master)])
        stage.unlink(missing_ok=True)
        if r.returncode != 0:
            print(f"[{i:2}/{len(clips)}] FAIL gain {cid}: {r.stderr.strip()[:200]}")
            rows.append({"id": cid, "status": "gain_failed", "error": r.stderr.strip()[:400]})
            continue

        ogg = OUT_DIR / f"{cid}.ogg"
        m4a = OUT_DIR / f"{cid}.m4a"
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master),
             "-c:a", "libvorbis", "-q:a", "4", "-ac", "1", str(ogg)])
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master),
             "-c:a", "aac", "-b:a", "96k", "-ac", "1", str(m4a)])

        final_lufs = measure_lufs(master)
        final_rms = measure_rms(master)
        dur = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                   "-of", "csv=p=0", str(master)]).stdout.strip()
        rows.append({
            "id": cid, "status": "ok", "voice": clip["voice"], "bus": vcfg["bus"],
            "temp_placeholder": bool(clip.get("temp")),
            "duration_s": round(float(dur), 3) if dur else None,
            "target_lufs": target, "measured_lufs": measured,
            "measure_basis": basis, "gain_applied_db": gain,
            "final_lufs": final_lufs, "final_rms_db": final_rms,
            "ogg_bytes": ogg.stat().st_size if ogg.exists() else 0,
            "m4a_bytes": m4a.stat().st_size if m4a.exists() else 0,
        })
        flag = " [TEMP]" if clip.get("temp") else ""
        print(f"[{i:2}/{len(clips)}] ok  {cid}{flag}  {rows[-1]['duration_s']}s  "
              f"{measured:.1f}->{final_lufs if final_lufs is None else round(final_lufs,1)} LUFS ({basis})")
    return rows


def sync_audio(clips) -> None:
    audio = json.loads(AUDIO_DATA.read_text())
    for clip in clips:
        cid = clip["id"]
        audio["assets"][cid] = {
            "bus": "vo",
            "files": [f"assets/audio/vo/{cid}.ogg", f"assets/audio/vo/{cid}.m4a"],
        }
    AUDIO_DATA.write_text(json.dumps(audio, ensure_ascii=False, indent=2) + "\n")


# ---------------------------------------------------------------------------- cli
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tts", action="store_true")
    ap.add_argument("--process", action="store_true")
    ap.add_argument("--sync", action="store_true", help="publish existing VO paths into data/audio.json")
    ap.add_argument("--force", action="store_true", help="re-TTS even if raw mp3 exists")
    ap.add_argument("--only", help="comma-separated clip ids")
    args = ap.parse_args()
    if not args.tts and not args.process and not args.sync:
        args.tts = args.process = True

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found")

    data = json.loads(MANIFEST.read_text())
    clips, voices = data["clips"], data["voices"]
    if args.only:
        want = {s.strip() for s in args.only.split(",")}
        clips = [c for c in clips if c["id"] in want]
        if not clips:
            sys.exit("--only matched no clips")

    report: dict = json.loads(REPORT.read_text()) if REPORT.exists() else {}
    report["clips"] = len(clips)
    if args.tts:
        print(f"=== TTS: {len(clips)} clips ===")
        report["tts"] = do_tts(clips, voices, args.force)
    if args.process:
        print(f"=== PROCESS: {len(clips)} clips ===")
        report["process"] = do_process(clips, voices)
        ok = [r for r in report["process"] if r["status"] == "ok"]
        for bus in ("announcer", "character"):
            b = [r for r in ok if r.get("bus") == bus]
            if b:
                tot = sum(r["ogg_bytes"] + r["m4a_bytes"] for r in b)
                print(f"bus {bus}: {len(b)} clips, {tot/1024:.0f} KB (ogg+m4a)")
    if args.sync or (args.process and len(clips) == len(data["clips"])):
        sync_audio(clips)

    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nreport -> {REPORT}")


if __name__ == "__main__":
    main()
