#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");

function read(name) { return JSON.parse(fs.readFileSync(path.join(root, name), "utf8")); }
function exists(name) { return fs.existsSync(path.join(root, name)); }

function inspect() {
  var audio = read("data/audio.json");
  var music = read("tools/music_report.json");
  var vo = read("tools/vo_report.json");
  var sfxManifest = read("tools/sfx_manifest.json");
  var sfx = exists("tools/sfx_report.json") ? read("tools/sfx_report.json") : {};
  var errors = [];
  var blockers = [];
  var ids = {};
  var musicRows = music.process || [];
  var voRows = vo.process || [];
  var sfxRows = sfx.process || [];

  if (audio.schema !== 2) errors.push("data/audio.json must use schema 2");
  Object.keys(audio.assets || {}).forEach(function (id) {
    var def = audio.assets[id];
    ids[id] = true;
    if (["music", "sfx", "vo"].indexOf(def.bus) < 0) errors.push(id + " has invalid bus");
    if (!Array.isArray(def.files) || def.files.length !== 2) errors.push(id + " must provide OGG and M4A paths");
    else if (!/\.ogg$/.test(def.files[0]) || !/\.m4a$/.test(def.files[1])) errors.push(id + " format order must be OGG then M4A");
    (def.variants || []).forEach(function (files, index) {
      if (!Array.isArray(files) || files.length !== 2 || !/\.ogg$/.test(files[0]) || !/\.m4a$/.test(files[1])) {
        errors.push(id + " variant " + index + " must provide OGG and M4A paths");
      }
    });
  });
  Object.keys(audio.music || {}).forEach(function (id) {
    if (!ids[audio.music[id].asset]) errors.push("music route " + id + " references missing asset");
  });
  Object.keys(audio.events || {}).forEach(function (id) {
    if (audio.events[id].asset && !ids[audio.events[id].asset]) errors.push("event " + id + " references missing asset");
    (audio.events[id].layers || []).forEach(function (asset) {
      if (!ids[asset]) errors.push("event " + id + " layer references missing asset " + asset);
    });
  });

  if (musicRows.length !== 16) blockers.push("music report must contain 16 cues (got " + musicRows.length + ")");
  musicRows.forEach(function (row) {
    var base = "assets/audio/music/" + row.id;
    if (!exists(base + ".ogg") || !exists(base + ".m4a")) blockers.push(row.id + " lacks format pair");
    if (row.take !== "selected" && row.candidates !== 4) blockers.push(row.id + " lacks four-take selection evidence");
    if (row.over_size_budget) blockers.push(row.id + " exceeds size budget");
    if (row.loop_points == null && row.id !== "mus_victory") blockers.push(row.id + " lacks loop points");
    if (row.id !== "mus_victory" && row.id !== "mus_gameover" && !row.stems) blockers.push(row.id + " lacks mastered stems");
  });

  if (voRows.length !== 46) blockers.push("VO report must contain 46 lines (got " + voRows.length + ")");
  voRows.forEach(function (row) {
    var base = "assets/audio/vo/" + row.id;
    if (!exists(base + ".ogg") || !exists(base + ".m4a")) blockers.push(row.id + " lacks format pair");
    if (row.temp_placeholder) blockers.push(row.id + " is a placeholder");
    var shortClip = Number(row.duration_s) < 3;
    var hasLufs = Number.isFinite(row.final_lufs);
    var hasRms = Number.isFinite(row.final_rms_db) && /^astats_rms_fallback/.test(row.measure_basis || "");
    if (!hasLufs && !(shortClip && hasRms)) blockers.push(row.id + " lacks valid loudness proof");
  });
  if ((sfxManifest.entries || []).length !== 45) errors.push("SFX manifest must contain 45 logical entries");
  if (sfx.logical_entries !== 45 || sfxRows.length !== 65) blockers.push("SFX report must prove 45 entries and 65 physical files");
  sfxRows.forEach(function (row) {
    var base = "assets/audio/sfx/" + row.id;
    if (row.status !== "ok") blockers.push(row.id + " is not mastered");
    if (!exists(base + ".ogg") || !exists(base + ".m4a")) blockers.push(row.id + " lacks format pair");
    if (!Number.isFinite(row.final_loudness)) blockers.push(row.id + " lacks loudness proof");
    else if (Math.abs(row.final_loudness - row.target_lufs) > 2.5 && !row.peak_constrained) blockers.push(row.id + " loudness is outside the 2.5 dB tolerance");
    if (!Number.isFinite(row.final_peak_db) || row.final_peak_db > -0.8) blockers.push(row.id + " lacks a valid -1 dB peak ceiling");
  });
  return { errors: errors, blockers: blockers, music: musicRows.length, vo: voRows.length,
    sfx: sfx.logical_entries || 0, sfxFiles: sfxRows.length };
}

function main() {
  var out = inspect();
  if (out.errors.length) out.errors.forEach(function (e) { console.error("audio error: " + e); });
  console.log("audio inventory: " + out.music + " music, " + out.sfx + " SFX, " + out.vo + " VO, " + out.blockers.length + " production blockers");
  out.blockers.forEach(function (e) { console.log("BLOCKED " + e); });
  if (out.errors.length || (process.argv.indexOf("--strict") >= 0 && out.blockers.length)) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { inspect: inspect };
