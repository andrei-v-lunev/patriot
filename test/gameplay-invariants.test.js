"use strict";
var assert = require("assert");
var campaign = require("../data/campaign.json");
var h = require("./harness");
var PSim = h.sim();
var ids = [];

campaign.worlds.forEach(function (world) {
  world.levels.forEach(function (level) { ids.push(level.id); });
});

function settle(game, ticks) {
  for (var i = 0; i < ticks; i++) h.step(game, h.intents());
}

var segmentN = 0;
ids.forEach(function (id) {
  var probe = h.createGame(9001, { levelId: id, difficulty: "easy" });
  (probe.level.segments || []).forEach(function (segment, index) {
    if ((segment.mode || "plat") !== "plat") return;
    var game = h.createGame(9001, { levelId: id, difficulty: "easy" });
    if (index) PSim.applySegment(game, index);
    var hero = h.getHero(game);
    hero.x = game.currentCheckpoint ? game.currentCheckpoint.x : 80;
    hero.z = -200; hero.vz = -760; hero.grounded = false;
    hero.hazardIF = 0; hero.pitRespawnT = 0; hero.hp = hero.maxHp;
    h.step(game, h.intents());
    assert(!hero.alive && hero.combatState === "PIT_FALL" && hero.pitRespawnT > 0,
      id + "/" + segment.id + " recovers a hero who escapes below authored geometry");
    settle(game, 90);
    assert(hero.alive && hero.z >= 0 && hero.x >= game.xMin && hero.x <= game.xMax,
      id + "/" + segment.id + " returns the hero to playable bounds");
    segmentN++;
  });
});

var pitN = 0;
ids.forEach(function (id) {
  var source = h.createGame(9002, { levelId: id, difficulty: "easy" });
  (source.level.segments || []).forEach(function (segment, index) {
    (segment.hazards || []).filter(function (hazard) { return hazard.type === "pit"; }).forEach(function (pit) {
      var margin = 18;
      var points = pit.w > margin * 2 + 2 ? [pit.x + margin, pit.x + pit.w * 0.5, pit.x + pit.w - margin] : [pit.x + pit.w * 0.5];
      points.forEach(function (x) {
        var game = h.createGame(9002, { levelId: id, difficulty: "easy" });
        if (index) PSim.applySegment(game, index);
        var hero = h.getHero(game);
        hero.x = x; hero.z = -1; hero.vz = -100; hero.grounded = false;
        hero.hazardIF = 0; hero.pitRespawnT = 0; hero.hp = hero.maxHp;
        h.step(game, h.intents());
        assert(!hero.alive && hero.pitRespawnT > 0,
          id + "/" + segment.id + " pit catches every physically fallable interior probe");
        pitN++;
      });
    });
  });
});

assert(segmentN >= 10, "platform invariant covers the campaign");
assert(pitN >= 20, "pit edge matrix covers every authored gap");
console.log("ok gameplay bounds: " + segmentN + " platform segments, " + pitN + " pit-edge probes");
