"use strict";

var assert = require("assert");
var data = require("../data/audio.json");
var starts = 0;
var fetches = [];

function gain() { return { gain: { value: 1, exponentialRampToValueAtTime: function () {} }, connect: function () {} }; }
function source() { return { connect: function () {}, start: function () { starts++; }, stop: function () {}, loop: false }; }
function FakeAudioContext() {
  this.currentTime = 0; this.destination = {}; this.createGain = gain;
  this.createBuffer = function () { return {}; }; this.createBufferSource = source;
  this.createOscillator = function () { var s = source(); s.frequency = { value: 0 }; s.detune = { value: 0 }; return s; };
  this.decodeAudioData = function (bytes) { return Promise.resolve({ duration: bytes.byteLength || 1 }); };
  this.resume = function () { return Promise.resolve(); };
}

global.window = { AudioContext: FakeAudioContext, addEventListener: function () {} };
global.fetch = function (url) {
  fetches.push(url);
  return Promise.resolve({ ok: true, arrayBuffer: function () { return Promise.resolve(new ArrayBuffer(8)); } });
};
delete require.cache[require.resolve("../js/audio.js")];
var audio = require("../js/audio.js");

async function run() {
  var withVariants = JSON.parse(JSON.stringify(data));
  withVariants.assets.sfx_hit_light.variants = [
    ["assets/audio/sfx/sfx_body_thud_a.ogg", "assets/audio/sfx/sfx_body_thud_a.m4a"],
    ["assets/audio/sfx/sfx_body_thud_b.ogg", "assets/audio/sfx/sfx_body_thud_b.m4a"]
  ];
  audio.init(withVariants);
  assert.deepStrictEqual(audio.setVolumes({ master: 2, music: -1, sfx: 0.4 }), { master: 1, music: 0, sfx: 0.4, vo: 0.9 });
  await audio.unlock();
  assert.strictEqual(await audio.playEvent("hajime"), true, "real VO event decodes and plays");
  assert(fetches[0].endsWith("vo_ann_round1.ogg"), "OGG is the preferred source");
  assert.strictEqual(await audio.playStem("w1"), true, "world alias starts decoded music");
  assert(fetches.some(function (f) { return f.endsWith("mus_w1_village_base.ogg"); }), "world music loads the base stem");
  assert(fetches.some(function (f) { return f.endsWith("mus_w1_village_drums.ogg"); }), "world music loads the drums stem");
  assert.strictEqual(await audio.playAmbience("w4l2"), true, "level ambience starts through the authored world route");
  assert(fetches.some(function (f) { return f.endsWith("sfx_amb_rain_loop.ogg"); }), "W4 ambience loads rain");
  assert(fetches.some(function (f) { return f.endsWith("sfx_amb_gulls.ogg"); }), "W4 ambience layers harbor gulls");
  audio.setMusicIntensity(1);
  var before = fetches.length;
  await audio.playEvent("hajime");
  assert.strictEqual(fetches.length, before, "decoded assets are cached");
  await audio.playEvent("hit_light");
  await audio.playEvent("hit_light");
  assert(fetches.some(function (f) { return f.endsWith("sfx_body_thud_a.ogg"); }), "round-robin starts with variant A");
  assert(fetches.some(function (f) { return f.endsWith("sfx_body_thud_b.ogg"); }), "round-robin advances without immediately repeating a variant");
  assert(starts >= 4, "unlock, VO and music create sources");
  audio.stopStem();
  console.log("ok manifest audio buffers, buses, cache and world routing");
}

run().catch(function (e) { console.error(e); process.exitCode = 1; });
