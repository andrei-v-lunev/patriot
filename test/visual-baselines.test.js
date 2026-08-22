"use strict";
var assert = require("assert");
var campaign = require("../data/campaign.json");
var baseline = require("../tools/visual-baselines.json");
var levels = [];
campaign.worlds.forEach(function (world) { world.levels.forEach(function (level) { levels.push(level.id); }); });
assert.strictEqual(baseline.schema, 1);
assert.deepStrictEqual(Object.keys(baseline.levels).sort(), levels.sort(), "visual baseline covers all 15 levels");
assert.strictEqual(Object.keys(baseline.screens).length, 18, "visual baseline covers every presentation screen");
assert.deepStrictEqual(Object.keys(baseline.hazards).sort(), ["0000", "0011", "1100", "1111", "shove-near", "weight"], "visual baseline covers W5 hazard states");
Object.keys(baseline).slice(1).forEach(function (group) {
  var hashes = Object.values(baseline[group]);
  assert.strictEqual(new Set(hashes).size, hashes.length, group + " baselines must be visually distinct");
});
console.log("ok visual baseline coverage");
