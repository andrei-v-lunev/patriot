"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var audio = require("../data/audio.json");

var required = [
  "hit_light", "throw_slam", "throw_slam_stone", "throw_slam_metal", "throw_slam_heavy",
  "grip", "grip_fail", "throw_whoosh_lt", "throw_whoosh_hv", "ko", "hurt", "ukemi",
  "wazaari", "ippon", "ippon_gachi", "pickup", "coin", "jump", "land", "enemy_alert",
  "melon_whoosh", "melon_splat", "crowd_boo", "crowd_cheer", "menu_move", "menu_confirm",
  "menu_deny", "pause", "countdown", "countdown_final", "wave_cleared", "go", "off_train"
];

required.forEach(function (name) {
  var event = audio.events[name];
  assert(event, "missing audio event route " + name);
  [event.asset].concat(event.layers || []).forEach(function (id) {
    var asset = audio.assets[id];
    assert(asset, name + " references missing asset " + id);
    assert(asset.files && asset.files.length >= 2, id + " lacks browser codec pair");
    asset.files.forEach(function (file) { assert(fs.existsSync(path.join(root, file)), "missing " + file); });
  });
});

["w1", "w2", "w3", "w4", "w5"].forEach(function (world) {
  assert(audio.worlds[world] && audio.music[audio.worlds[world]], world + " lacks music route");
  assert(audio.ambience[world] && audio.ambience[world].length, world + " lacks ambience route");
  audio.ambience[world].forEach(function (id) { assert(audio.assets[id], world + " ambience missing " + id); });
});

assert(fs.readFileSync(path.join(root, "js/game.js"), "utf8").indexOf("PAudioEvents.update(state)") >= 0,
  "game loop does not consume render-side audio transitions");
console.log("ok complete audio route and file coverage");
