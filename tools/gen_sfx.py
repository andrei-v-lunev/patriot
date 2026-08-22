#!/usr/bin/env python3
"""Generate and master the canonical 45-entry SFX package.

Paid generation is explicit (`--generate`) and never retried. Existing raw files
are immutable cache entries. Processing (`--process`) is deterministic and free.
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

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "tools" / "sfx_manifest.json"
RAW = ROOT / "tools" / "_sfx_raw"
MASTERS = ROOT / "tools" / "_sfx_masters"
OUT = ROOT / "assets" / "audio" / "sfx"
REPORT = ROOT / "tools" / "sfx_report.json"
AUDIO_DATA = ROOT / "data" / "audio.json"
AGENCY = Path("/Users/andreilunev/Documents/AI Agency V2")
sys.path.insert(0, str(AGENCY / ".claude" / "skills" / "video-sound" / "scripts"))
API = "https://api.kie.ai/api/v1/generate/sounds"
LETTERS = "abcd"
SUBMIT_STAGGER_S = 1.2


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def load_env() -> None:
    if os.getenv("KIE_API_KEY"):
        return
    for candidate in (Path("/Users/andreilunev/Documents/AI Agency V2/.env"), ROOT / ".env"):
        if not candidate.exists():
            continue
        for line in candidate.read_text().splitlines():
            if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
                continue
            key, value = line.partition("=")[::2]
            if key.strip() not in os.environ:
                os.environ[key.strip()] = value.strip().strip("'\"")


def physical(entry: dict) -> list[str]:
    count = int(entry.get("variants", 1))
    return [entry["id"]] if count == 1 else [entry["id"] + "_" + LETTERS[i] for i in range(count)]


def duration(path: Path) -> float | None:
    value = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]).stdout.strip()
    try:
        return float(value)
    except ValueError:
        return None


def rms(path: Path) -> float | None:
    result = run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "astats=metadata=1", "-f", "null", "-"])
    hits = re.findall(r"RMS level dB:\s*(-?\d+\.?\d*)", result.stderr)
    return float(hits[0]) if hits else None


def active_rms(path: Path) -> float | None:
    """Peak short-window RMS; silence tails must not make a transient seem quiet."""
    result = run(["ffmpeg", "-hide_banner", "-i", str(path), "-af",
                  "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level",
                  "-f", "null", "-"])
    hits = re.findall(r"lavfi\.astats\.Overall\.RMS_level=(-?\d+\.?\d*)", result.stderr)
    values = [float(value) for value in hits if float(value) > -70]
    return max(values) if values else None


def peak_db(path: Path) -> float | None:
    result = run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"])
    hit = re.search(r"max_volume:\s*(-?\d+\.?\d*)\s*dB", result.stderr)
    return float(hit.group(1)) if hit else None


def lufs(path: Path) -> float | None:
    result = run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128", "-f", "null", "-"])
    hits = re.findall(r"I:\s*(-?\d+\.?\d*)\s*LUFS", result.stderr)
    if not hits:
        return None
    value = float(hits[-1])
    return value if value > -70 else None


def generate(entries: list[dict]) -> list[dict]:
    import sound

    load_env()
    key = os.getenv("KIE_API_KEY")
    if not key:
        raise SystemExit("KIE_API_KEY not found")
    RAW.mkdir(parents=True, exist_ok=True)
    jobs = [(entry, pid, i) for entry in entries for i, pid in enumerate(physical(entry))]
    rows = []
    submitted = []
    for number, (entry, pid, variant) in enumerate(jobs, 1):
        target = RAW / (pid + ".mp3")
        if target.exists():
            print(f"[{number:2}/{len(jobs)}] cached {pid}")
            rows.append({"id": pid, "status": "cached", "bytes": target.stat().st_size})
            continue
        prompt = entry["prompt"]
        if len(physical(entry)) > 1:
            prompt += f". Distinct natural variation {variant + 1}, different timing and timbre from the other takes"
        prompt += f". Target duration approximately {max(0.1, float(entry['duration'])):.2f} seconds"
        payload = {"prompt": prompt, "model": "V5", "soundLoop": bool(entry.get("loop")), "grabLyrics": False}
        try:
            data = sound._curl_json(["curl", "-sS", "--location", API,
                "--header", f"Authorization: Bearer {key}", "--header", "Content-Type: application/json",
                "--data", json.dumps(payload), "--max-time", "60"])
            task_id = (data.get("data") or {}).get("taskId")
            if not task_id:
                raise RuntimeError(f"no taskId returned: {data}")
            print(f"[{number:2}/{len(jobs)}] submitted {pid} task={task_id}")
            submitted.append((pid, str(task_id)))
        except Exception as error:  # one paid submission only; record and continue
            print(f"[{number:2}/{len(jobs)}] SUBMIT FAIL {pid}: {error}")
            rows.append({"id": pid, "status": "submit_failed", "error": str(error)[:300]})
        time.sleep(SUBMIT_STAGGER_S)

    def collect(job: tuple[str, str]) -> dict:
        pid, task_id = job
        try:
            url, status = sound._poll_kie_suno(task_id)
            result = run(["curl", "-sS", "--location", url, "-o", str(RAW / (pid + ".mp3")), "--max-time", "600"])
            target = RAW / (pid + ".mp3")
            if result.returncode or not target.exists() or target.stat().st_size < 1000:
                raise RuntimeError("download failed: " + result.stderr[:200])
            response = status.get("response") or {}
            records = response.get("sunoData") or [{}]
            record = records[0] if records and isinstance(records[0], dict) else {}
            print(f"collected {pid} ({target.stat().st_size // 1024} KB)")
            return {"id": pid, "status": "generated", "task_id": task_id,
                    "bytes": target.stat().st_size, "source_duration_s": record.get("duration")}
        except Exception as error:
            print(f"POLL FAIL {pid} task={task_id}: {error}")
            return {"id": pid, "status": "poll_failed", "task_id": task_id, "error": str(error)[:300]}

    with ThreadPoolExecutor(max_workers=8) as executor:
        rows.extend(executor.map(collect, submitted))
    return rows


def process(entries: list[dict], config: dict) -> list[dict]:
    MASTERS.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    jobs = [(entry, pid) for entry in entries for pid in physical(entry)]
    for number, (entry, pid) in enumerate(jobs, 1):
        raw = RAW / (pid + ".mp3")
        if not raw.exists():
            rows.append({"id": pid, "group": entry["id"], "status": "missing_raw"})
            continue
        wanted = float(entry["duration"])
        channels = 2 if entry.get("ambience") else 1
        stage = MASTERS / ("_" + pid + ".wav")
        trim = f"atrim=duration={wanted},apad=pad_dur={wanted},atrim=duration={wanted}"
        if not entry.get("loop"):
            trim = ("silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0:detection=peak," + trim)
        result = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(raw),
                      "-af", trim, "-ar", "48000", "-ac", str(channels), "-c:a", "pcm_s24le", str(stage)])
        if result.returncode:
            rows.append({"id": pid, "group": entry["id"], "status": "process_failed", "error": result.stderr[:300]})
            continue
        target = float(config["ambience_lufs"] if entry.get("ambience") else config["target_lufs"])
        measured = lufs(stage) if wanted >= 3 else active_rms(stage)
        basis = "ebur128_integrated" if wanted >= 3 else "astats_active_rms_fallback"
        gain = max(-48, min(48, target - measured)) if measured is not None else 0
        master = MASTERS / (pid + ".wav")
        mastering = f"volume={gain:.3f}dB,alimiter=limit=0.891:level=disabled"
        result = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(stage),
                      "-af", mastering,
                      "-ar", "48000", "-ac", str(channels), "-c:a", "pcm_s24le", str(master)])
        stage.unlink(missing_ok=True)
        if result.returncode:
            rows.append({"id": pid, "group": entry["id"], "status": "master_failed", "error": result.stderr[:300]})
            continue
        final = lufs(master) if wanted >= 3 else active_rms(master)
        peak = peak_db(master)
        if wanted < 3 and final is not None and peak is not None and final < target - 0.5 and peak < -1.2:
            correction = min(target - final, -1.0 - peak)
            corrected = MASTERS / ("_" + pid + ".corrected.wav")
            result = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master),
                          "-af", f"volume={correction:.3f}dB,alimiter=limit=0.891:level=disabled",
                          "-ar", "48000", "-ac", str(channels), "-c:a", "pcm_s24le", str(corrected)])
            if result.returncode == 0:
                corrected.replace(master)
                final, peak = active_rms(master), peak_db(master)
        ogg, m4a = OUT / (pid + ".ogg"), OUT / (pid + ".m4a")
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master), "-c:a", "libvorbis", "-q:a", "5", str(ogg)])
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master), "-c:a", "aac", "-b:a", "128k" if channels == 2 else "96k", str(m4a)])
        peak_constrained = wanted < 3 and final is not None and final < target - 2.5 and peak is not None and peak >= -1.2
        rows.append({"id": pid, "group": entry["id"], "status": "ok", "priority": entry["priority"],
                     "duration_s": duration(master), "loop": bool(entry.get("loop")), "channels": channels,
                     "target_lufs": target, "measure_basis": basis, "final_loudness": final,
                     "final_peak_db": peak, "peak_constrained": peak_constrained,
                     "ogg_bytes": ogg.stat().st_size, "m4a_bytes": m4a.stat().st_size})
        print(f"[{number:2}/{len(jobs)}] mastered {pid} {wanted:.2f}s {final:.1f} dB ({basis})")
    return rows


def derive_missing(entries: list[dict]) -> list[dict]:
    """Build explicitly approved deterministic composites; never resubmit failed tasks."""
    rows = []
    wanted = {pid for entry in entries for pid in physical(entry)}
    pid = "sfx_slam_surface_metal"
    target = RAW / (pid + ".mp3")
    source = RAW / "sfx_slam_medium.mp3"
    if pid in wanted and not target.exists() and source.exists():
        graph = ("[0:a]asplit=2[dry][wet];"
                 "[wet]highpass=f=650,aecho=0.8:0.65:28|61|103:0.62|0.38|0.18[ring];"
                 "[dry][ring]amix=inputs=2:weights=1 0.85:normalize=0,alimiter=limit=0.95[out]")
        result = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
                      "-filter_complex", graph, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "192k", str(target)])
        if result.returncode:
            rows.append({"id": pid, "status": "derive_failed", "error": result.stderr[:300]})
        else:
            rows.append({"id": pid, "status": "derived", "source": "sfx_slam_medium",
                         "method": "high-pass resonant metal echo composite", "bytes": target.stat().st_size})
            print(f"derived {pid} from accepted sfx_slam_medium raw")
    return rows


def sync_audio(entries: list[dict]) -> None:
    """Publish every canonical logical SFX asset, including round-robin variants."""
    audio = json.loads(AUDIO_DATA.read_text())
    for entry in entries:
        ids = physical(entry)
        pairs = [[f"assets/audio/sfx/{pid}.ogg", f"assets/audio/sfx/{pid}.m4a"] for pid in ids]
        definition = {"bus": "sfx", "files": pairs[0]}
        if len(pairs) > 1:
            definition["variants"] = pairs
        if entry.get("loop"):
            definition.update({"loop": True, "loopStart": 0, "loopEnd": float(entry["duration"])})
        audio["assets"][entry["id"]] = definition
    AUDIO_DATA.write_text(json.dumps(audio, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--generate", action="store_true", help="make one paid API call for each uncached physical file")
    parser.add_argument("--process", action="store_true", help="master cached raws without API calls")
    parser.add_argument("--derive-missing", action="store_true", help="build approved deterministic composites for failed provider tasks")
    parser.add_argument("--only", help="comma-separated logical entry IDs")
    args = parser.parse_args()
    if not args.generate and not args.process and not args.derive_missing:
        parser.error("choose --generate, --derive-missing and/or --process")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise SystemExit("ffmpeg and ffprobe are required")
    config = json.loads(MANIFEST.read_text())
    entries = config["entries"]
    if args.only:
        selected = set(args.only.split(","))
        entries = [entry for entry in entries if entry["id"] in selected]
    report = {"schema": 1, "logical_entries": len(entries), "physical_files": sum(len(physical(e)) for e in entries)}
    if args.generate:
        report["generation"] = generate(entries)
    if args.derive_missing:
        report["derivations"] = derive_missing(entries)
    if args.process:
        report["process"] = process(entries, config)
        if len(entries) == len(config["entries"]):
            sync_audio(entries)
    if REPORT.exists():
        old = json.loads(REPORT.read_text())
        for key in ("generation", "process"):
            if key not in report and key in old:
                report[key] = old[key]
    REPORT.write_text(json.dumps(report, indent=2))
    print(f"report -> {REPORT}")


if __name__ == "__main__":
    main()
