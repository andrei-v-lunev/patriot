"use strict";

var assert = require("assert");
var campaign = require("../data/campaign.json");
var PMap = require("../js/ui.map.js");

var empty = PMap.build(campaign, {});
assert.strictEqual(empty.worlds.length, 5, "map has five campaign worlds");
assert.strictEqual(empty.nodes.length, 15, "map has fifteen campaign levels");
assert.strictEqual(empty.currentId, "w1l1", "empty save starts at first level");
assert.strictEqual(empty.nodes[0].state, "current", "first level is current");
assert.strictEqual(empty.nodes[1].state, "locked", "next level starts locked");
assert.strictEqual(empty.worlds[0].name, "ГОРНОЕ СЕЛО", "Russian world name comes from campaign");

var save = {
  progress: { level: "w2l2", levelsCleared: ["w1l1", "w1l2", "w1l3", "w2l1"] },
  scores: { w1l3: { best: 41250, bestTimeFrames: 7420, rank: "A", noHit: false } }
};
var model = PMap.build({ campaign: campaign }, save);
assert.strictEqual(PMap.find(model, "w1l3").state, "cleared", "cleared level is marked cleared");
assert.strictEqual(PMap.find(model, "w2l2").state, "current", "save progress level is current");
assert.strictEqual(PMap.find(model, "w2l3").state, "locked", "uncleared successor stays locked");
assert.strictEqual(PMap.find(model, "w1l3").record.best, 41250, "level record is attached");
assert.strictEqual(PMap.find(model, "w1l3").hasRecord, true, "record state is explicit");
assert.deepStrictEqual(PMap.find(model, "w1l3").states,
  { locked: false, cleared: true, current: false, record: true }, "all four node states are explicit");
assert.strictEqual(PMap.recordText(PMap.find(model, "w1l3").record), "РЕКОРД 41250  РАНГ A",
  "record label is Russian and deterministic");

assert.strictEqual(PMap.navigate(model, "w1l1", "ArrowRight"), "w1l2", "right selects next open node");
assert.strictEqual(PMap.navigate(model, "w1l2", "ArrowDown"), "w2l2", "down selects aligned open node");
assert.strictEqual(PMap.navigate(model, "w2l2", "ArrowRight"), "w2l2", "navigation cannot enter locked node");
assert.strictEqual(PMap.navigate(model, "w2l2", "KeyW"), "w1l2", "W key navigates upward");
assert.strictEqual(PMap.navigate(model, "w2l2", "nope"), "w2l2", "unknown key is a pure no-op");
assert.strictEqual(PMap.navigate(model, "missing", "ArrowLeft"), "w2l1", "invalid selection recovers from current");

var calls = [];
var ctx = {
  fillStyle: "", strokeStyle: "", font: "", textBaseline: "",
  fillRect: function () { calls.push("rect"); },
  fillText: function (s) { calls.push(String(s)); },
  beginPath: function () {}, moveTo: function () {}, lineTo: function () {},
  stroke: function () {}, arc: function () {}, fill: function () {}
};
delete global.PFont;
assert.strictEqual(PMap.draw(ctx, model, "w1l3", 32), true, "draw works without PFont");
assert(calls.indexOf("КАРТА") >= 0, "fallback canvas text draws Russian map title");
assert(calls.indexOf("РЕКОРД 41250  РАНГ A") >= 0, "fallback canvas text draws record");

var fontCalls = [];
global.PFont = {
  measure: function (s, scale) { return String(s).length * 6 * scale; },
  draw: function (c, s) { fontCalls.push(String(s)); return String(s).length * 6; }
};
assert.strictEqual(PMap.draw(ctx, model, "w2l2", 0), true, "draw works with PFont");
assert(fontCalls.indexOf("КАРТА") >= 0 && fontCalls.indexOf("ТЕКУЩИЙ") >= 0,
  "PFont path draws Russian title and current state");
delete global.PFont;

var corrupt = PMap.build(null, { progress: { level: "missing" }, scores: null });
assert.deepStrictEqual(corrupt.nodes, [], "missing PData degrades to an empty model");

global.PData = require("../js/data.js");
var fromData = PMap.fromData(save);
assert.strictEqual(fromData.nodes.length, 15, "fromData resolves the campaign lazily through PData");
delete global.PData;

console.log("ok map model, progress states, navigation, records, and canvas fallbacks");
