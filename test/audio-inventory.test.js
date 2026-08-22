"use strict";

var assert = require("assert");
var result = require("../tools/check-audio.js").inspect();

assert.deepStrictEqual(result.errors, [], "audio schema routes and format pairs are structurally valid");
assert.strictEqual(result.music, 16, "all 16 music cues stay represented");
assert.strictEqual(result.vo, 46, "all 46 VO lines stay represented");
assert.strictEqual(result.sfx, 45, "all 45 logical SFX entries are mastered");
assert.strictEqual(result.sfxFiles, 65, "all 65 physical SFX variants are mastered");
assert(result.blockers.some(function (e) { return /placeholder/.test(e); }), "temporary VO remains an explicit ship blocker");
assert(!result.blockers.some(function (e) { return /loudness proof/.test(e); }), "short VO uses its documented RMS loudness proof");
console.log("ok audio inventory exposes " + result.blockers.length + " production blockers");
