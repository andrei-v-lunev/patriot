#!/usr/bin/env python3
"""Select four-take music candidates and build compact looped masters/stems."""
from __future__ import annotations

import json
import math
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "_music_raw"
MASTERS = ROOT / "tools" / "_music_masters"
OUT = ROOT / "assets" / "audio" / "music"
MANIFEST = ROOT / "tools" / "music_manifest.json"
REPORT = ROOT / "tools" / "music_report.json"
AUDIO = ROOT / "data" / "audio.json"
NO_STEMS = {"mus_victory", "mus_gameover"}
INTRO_BARS = {
    "mus_title": 8, "mus_select": 4, "mus_map": 4, "mus_w1_village": 8,
    "mus_w2_bazaar": 0, "mus_w3_train_int": 8, "mus_w3_train_roof": 0,
    "mus_w4_port": 8, "mus_w5_casino": 4, "mus_w5_arena": 8,
    "mus_boss_mid": 4, "mus_boss_final": 4, "mus_gameover": 2,
    "mus_results": 2, "mus_credits": 8,
}


def run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True, check=False)


def seconds(label: str) -> float:
    minute, sec = label.split(":")
    return int(minute) * 60 + int(sec)


def duration(path: Path) -> float:
    p = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(p.stdout.strip())


def lufs(path: Path) -> float | None:
    p = run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128", "-f", "null", "-"])
    hits = re.findall(r"I:\s*(-?\d+\.?\d*)\s*LUFS", p.stderr)
    return float(hits[-1]) if hits else None


def select(track: dict) -> tuple[str, list[dict]]:
    target = seconds(track["target_len"])
    rows = []
    for take in "abcd":
        path = RAW / f"{track['id']}_{take}.mp3"
        rows.append({"take": take, "duration_s": round(duration(path), 3), "path": path})
    long = [r for r in rows if r["duration_s"] >= target]
    pick = min(long or rows, key=lambda r: abs(r["duration_s"] - target))
    return pick["take"], [{"take": r["take"], "duration_s": r["duration_s"]} for r in rows]


def cyclic_trim(stage: Path, out: Path, bpm: float, intro_bars: int, target: float) -> tuple[float, float]:
    rate, data = wavfile.read(stage)
    if data.dtype != np.float32:
        data = data.astype(np.float32) / max(1, np.iinfo(data.dtype).max)
    bar = 240.0 / bpm
    intro = intro_bars * bar
    available = len(data) / rate
    end = min(target, available - 0.05)
    if end <= intro + bar:
        intro = 0.0
    end = intro + max(1, math.floor((end - intro) / bar)) * bar
    end = min(end, available - 0.03)
    cross = max(64, int(rate * 0.025))
    start_i, end_i = int(intro * rate), int(end * rate)
    if start_i:
        head = data[max(0, start_i - cross):start_i]
        body = data[start_i:end_i - len(head)]
        intro_audio = data[:start_i]
    else:
        head = data[:cross]
        body = data[cross:end_i - cross]
        intro_audio = data[:0]
    tail = data[end_i - len(head):end_i]
    n = min(len(head), len(tail))
    fade = np.linspace(0.0, 1.0, n, dtype=np.float32)
    if data.ndim == 2:
        fade = fade[:, None]
    blend = tail[-n:] * np.cos(fade * math.pi * 0.5) + head[-n:] * np.sin(fade * math.pi * 0.5)
    result = np.concatenate([intro_audio, body, blend], axis=0)
    wavfile.write(out, rate, result.astype(np.float32))
    return round(len(intro_audio) / rate, 6), round(len(result) / rate, 6)


def encode(src: Path, stem: Path, mono: bool = False) -> None:
    ogg = stem.with_suffix(".ogg")
    m4a = stem.with_suffix(".m4a")
    channels = ["-ac", "1"] if mono else []
    for args in ([*channels, "-c:a", "libvorbis", "-b:a", "32k" if mono else "48k"],
                 [*channels, "-c:a", "aac", "-b:a", "20k" if mono else "32k"]):
        dest = ogg if "libvorbis" in args else m4a
        p = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), *args, str(dest)])
        if p.returncode:
            raise RuntimeError(p.stderr[-400:])


def process(track: dict) -> dict:
    tid, bpm = track["id"], float(track["bpm"])
    take, candidates = select(track)
    raw = RAW / f"{tid}_{take}.mp3"
    target = seconds(track["target_len"])
    MASTERS.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
    stage = MASTERS / f"_{tid}.stage.wav"
    eq = "equalizer=f=320:width_type=h:width=250:g=-3"
    p = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(raw),
             "-af", eq, "-ar", "48000", "-ac", "2", "-c:a", "pcm_f32le", str(stage)])
    if p.returncode:
        raise RuntimeError(p.stderr[-400:])
    loop_start = loop_end = None
    shaped = MASTERS / f"_{tid}.loop.wav"
    if tid == "mus_victory":
        p = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(stage),
                 "-t", "9", "-af", "afade=t=out:st=8.75:d=0.25", "-c:a", "pcm_f32le", str(shaped)])
        if p.returncode: raise RuntimeError(p.stderr[-400:])
    elif tid == "mus_boss_final":
        end = min(target, duration(stage))
        p = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(stage),
                 "-t", str(end), "-c:a", "pcm_f32le", str(shaped)])
        if p.returncode: raise RuntimeError(p.stderr[-400:])
        bar = 240.0 / bpm
        loop_start, loop_end = round(4 * bar, 6), round(36 * bar, 6)
    else:
        loop_start, loop_end = cyclic_trim(stage, shaped, bpm, INTRO_BARS.get(tid, 0), target)
    measured = lufs(shaped)
    gain = -16.0 - (measured if measured is not None else -16.0)
    master = MASTERS / f"{tid}.wav"
    p = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(shaped),
             "-af", f"volume={gain:.3f}dB,alimiter=limit=0.891:level=disabled",
             "-ar", "48000", "-c:a", "pcm_s24le", str(master)])
    stage.unlink(missing_ok=True); shaped.unlink(missing_ok=True)
    if p.returncode: raise RuntimeError(p.stderr[-400:])
    # The runtime normally plays the stereo base/drums pair. The compact mono
    # full mix is a Safari/decode fallback and is also the canonical single
    # file for victory/game-over, both explicitly mono in the audio brief.
    encode(master, OUT / tid, mono=True)
    stems = None
    if tid not in NO_STEMS:
        base = MASTERS / f"{tid}_base.wav"; drums = MASTERS / f"{tid}_drums.wav"
        p = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master),
                 "-filter_complex", "[0:a]acrossover=split=2200:order=8th[base][drums]",
                 "-map", "[base]", "-c:a", "pcm_s24le", str(base),
                 "-map", "[drums]", "-c:a", "pcm_s24le", str(drums)])
        if p.returncode: raise RuntimeError(p.stderr[-400:])
        encode(base, OUT / f"{tid}_base"); encode(drums, OUT / f"{tid}_drums")
        stems = {"base": f"assets/audio/music/{tid}_base", "drums": f"assets/audio/music/{tid}_drums",
                 "method": "phase-coherent 2200 Hz crossover", "sample_aligned": True}
    final_duration = duration(master)
    files = [OUT / f"{tid}.ogg", OUT / f"{tid}.m4a"]
    row = {"id": tid, "status": "ok", "take": "selected", "selected_take": take,
           "selection": "mechanical duration/format gate; creative approval pending", "candidates": 4,
           "candidate_evidence": candidates, "bpm": bpm, "key": track["key"],
           "target_len": track["target_len"], "duration_s": round(final_duration, 3),
           "final_lufs": lufs(master), "loop_points": None if tid == "mus_victory" else
           {"start": loop_start, "end": loop_end, "basis": "4/4 bar grid at authored BPM"},
           "stems": stems, "ogg_kb": round(files[0].stat().st_size / 1024, 1),
           "m4a_kb": round(files[1].stat().st_size / 1024, 1)}
    if tid == "mus_boss_final":
        bar = 240.0 / bpm
        row["loop_regions"] = {"a": [round(4 * bar, 6), round(36 * bar, 6)],
                               "b": [round(36 * bar, 6), round(68 * bar, 6)]}
    row["over_size_budget"] = sum(p.stat().st_size for p in files) > 1024 * 1024
    return row


def sync_runtime(rows: list[dict]) -> None:
    audio = json.loads(AUDIO.read_text())
    for row in rows:
        asset = audio["assets"].get(row["id"])
        if not asset:
            continue
        points = row.get("loop_points")
        if points:
            asset["loopStart"] = points["start"]
            asset["loopEnd"] = points["end"]
        else:
            asset.pop("loopStart", None); asset.pop("loopEnd", None)
        stems = row.get("stems")
        if stems:
            asset["stems"] = {
                "base": [stems["base"] + ".ogg", stems["base"] + ".m4a"],
                "drums": [stems["drums"] + ".ogg", stems["drums"] + ".m4a"]
            }
        else:
            asset.pop("stems", None)
        if row.get("loop_regions"):
            asset["loopRegions"] = row["loop_regions"]
    AUDIO.write_text(json.dumps(audio, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    data = json.loads(MANIFEST.read_text())
    rows = []
    for i, track in enumerate(data["tracks"], 1):
        row = process(track); rows.append(row)
        print(f"[{i:02}/16] {row['id']} take={row['selected_take']} {row['duration_s']}s "
              f"{row['final_lufs']} LUFS {row['ogg_kb'] + row['m4a_kb']:.0f}KB")
    REPORT.write_text(json.dumps({"tracks": len(rows), "process": rows}, ensure_ascii=False, indent=2))
    sync_runtime(rows)


if __name__ == "__main__":
    main()
