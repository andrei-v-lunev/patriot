"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var page = fs.readFileSync(path.join(root, "tools/music-audition.html"), "utf8");
var manifest = require("../tools/music_manifest.json");

assert.strictEqual(manifest.tracks.length, 16, "audition source remains the canonical 16-cue manifest");
assert(/_music_raw\/.+_/.test(page), "audition board exposes raw candidate paths");
assert(/Mastered runtime mix/.test(page), "audition board exposes the selected master");
assert(/clean loop/.test(page) && /phase-safe stems/.test(page), "creative gate includes loop and stem checks");
assert(/Export verdict JSON/.test(page), "human verdict is exportable evidence");
assert(/track\.intent\|\|/.test(page), "missing optional intent labels fall back to the canonical style prompt");
console.log("ok music audition gate");
