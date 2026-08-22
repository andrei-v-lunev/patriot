#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");
var cp = require("child_process");
var ROOT = path.resolve(__dirname, "..");

function probe(rel) {
  var file = path.join(ROOT, rel);
  var out = cp.spawnSync("ffprobe", ["-v", "error", "-select_streams", "a:0",
    "-show_entries", "stream=codec_name,sample_rate,channels,duration",
    "-show_entries", "format=duration,size", "-of", "json", file], { encoding: "utf8" });
  if (out.status !== 0) return { error: (out.stderr || "ffprobe failed").trim() };
  try {
    var data = JSON.parse(out.stdout), stream = data.streams && data.streams[0], format = data.format || {};
    if (!stream) return { error: "no audio stream" };
    return { codec: stream.codec_name, rate: Number(stream.sample_rate), channels: Number(stream.channels),
      duration: Number(stream.duration || format.duration), size: Number(format.size) };
  } catch (err) { return { error: "invalid ffprobe output" }; }
}

function inspect() {
  var audio = JSON.parse(fs.readFileSync(path.join(ROOT, "data/audio.json"), "utf8"));
  var errors = [], pairs = [], files = {}, probes = {}, totalBytes = 0;
  function addPair(id, kind, pair) {
    if (!Array.isArray(pair) || pair.length !== 2) { errors.push(id + " " + kind + " is not a pair"); return; }
    pairs.push({ id: id, kind: kind, ogg: pair[0], m4a: pair[1] });
    files[pair[0]] = true; files[pair[1]] = true;
  }
  Object.keys(audio.assets || {}).forEach(function (id) {
    var def = audio.assets[id], i, key;
    addPair(id, "main", def.files);
    for (i = 0; i < (def.variants || []).length; i++) addPair(id, "variant" + i, def.variants[i]);
    for (key in (def.stems || {})) if (Object.prototype.hasOwnProperty.call(def.stems, key)) addPair(id, "stem-" + key, def.stems[key]);
  });
  Object.keys(files).sort().forEach(function (rel) {
    if (!fs.existsSync(path.join(ROOT, rel))) { errors.push(rel + " is missing"); return; }
    var p = probe(rel), ext = path.extname(rel).slice(1);
    probes[rel] = p;
    if (p.error) { errors.push(rel + " cannot decode: " + p.error); return; }
    if (p.rate !== 48000) errors.push(rel + " sample rate " + p.rate + " != 48000");
    if (p.channels !== 1 && p.channels !== 2) errors.push(rel + " channels " + p.channels + " must be mono/stereo");
    if (!(p.duration > 0.05) || !Number.isFinite(p.duration)) errors.push(rel + " has invalid duration");
    if (ext === "ogg" && p.codec !== "vorbis") errors.push(rel + " codec " + p.codec + " != vorbis");
    if (ext === "m4a" && p.codec !== "aac") errors.push(rel + " codec " + p.codec + " != aac");
    totalBytes += p.size || 0;
  });
  pairs.forEach(function (pair) {
    var a = probes[pair.ogg], b = probes[pair.m4a];
    if (!a || !b || a.error || b.error) return;
    var tolerance = Math.max(0.06, Math.max(a.duration, b.duration) * 0.005);
    if (Math.abs(a.duration - b.duration) > tolerance) errors.push(pair.id + " " + pair.kind + " duration mismatch " + a.duration + "/" + b.duration);
  });
  Object.keys(audio.assets || {}).forEach(function (id) {
    var def = audio.assets[id], main = def.files && probes[def.files[0]], key, stem;
    if (!main || main.error) return;
    if (def.loop) {
      if (!(def.loopStart >= 0 && def.loopEnd > def.loopStart && def.loopEnd <= main.duration + 0.03)) {
        errors.push(id + " loop points are outside decoded duration " + main.duration);
      }
    }
    for (key in (def.stems || {})) if (Object.prototype.hasOwnProperty.call(def.stems, key)) {
      stem = probes[def.stems[key][0]];
      if (stem && !stem.error && Math.abs(stem.duration - main.duration) > 0.06) errors.push(id + " " + key + " stem is not phase-aligned");
    }
  });
  return { errors: errors, files: Object.keys(files).length, pairs: pairs.length, bytes: totalBytes };
}

function main() {
  var out = inspect();
  out.errors.forEach(function (error) { console.error("audio QA: " + error); });
  console.log("audio QA: " + out.files + " decoded files, " + out.pairs + " codec pairs, " +
    (out.bytes / 1048576).toFixed(2) + " MiB, " + out.errors.length + " errors");
  if (out.errors.length) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { inspect: inspect, probe: probe };
