"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var dataDir = path.join(root, "data");
var baked = require(path.join(dataDir, "index.js"));

function read(rel) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, rel), "utf8"));
}

assert.deepStrictEqual(baked.moves, read("moves.json"));
assert.deepStrictEqual(baked.enemies, read("enemies.json"));
assert.deepStrictEqual(baked.strings, read("strings.ru.json"));
assert.deepStrictEqual(baked.campaign, read("campaign.json"));
assert.deepStrictEqual(baked.audio, read("audio.json"));
var levelIds = fs.readdirSync(path.join(dataDir, "levels")).filter(function (name) {
  return /\.json$/.test(name);
}).map(function (name) { return path.basename(name, ".json"); }).sort();
assert.deepStrictEqual(Object.keys(baked.levels).sort(), levelIds);
levelIds.forEach(function (id) {
  assert.deepStrictEqual(baked.levels[id], read(path.join("levels", id + ".json")));
});
console.log("ok browser data fallback exactly matches " + levelIds.length + " canonical level JSON files");
