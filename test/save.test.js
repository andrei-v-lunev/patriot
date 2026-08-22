"use strict";

var assert = require("assert");
var PSave = require("../js/save.js");

function memory(initial) {
  var data = initial || {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; },
    data: data
  };
}

var empty = PSave.defaults();
assert.strictEqual(empty.v, 1);
assert.deepStrictEqual(empty.campaign, {
  currentLevel: "w1l1", unlockedLevels: ["w1l1"], completedLevels: []
});
assert.deepStrictEqual(empty.onboarding, { seenHints: [] });
assert.strictEqual(empty.settings.lang, "ru");
assert.strictEqual(empty.settings.musicVol, 0.65);

var source = {
  v: 1,
  campaign: { currentLevel: "w2l1", unlockedLevels: ["w2l1", "w1l1", "w2l1"], completedLevels: ["w1l3"] },
  records: { w1l1: { best: 20, bestTimeFrames: 90, rank: "A", noHit: true } },
  settings: { masterVol: 2, musicVol: -1, lang: "xx", bindings: { p1: { index: 2, id: "pad" } } }
};
var before = JSON.stringify(source);
var normalizedA = PSave.normalize(source);
var normalizedB = PSave.normalize(source);
assert.strictEqual(JSON.stringify(source), before, "normalization is pure");
assert.strictEqual(JSON.stringify(normalizedA), JSON.stringify(normalizedB), "normalization is deterministic");
assert.deepStrictEqual(normalizedA.campaign.unlockedLevels, ["w1l1", "w1l3", "w2l1"]);
assert.strictEqual(normalizedA.settings.masterVol, 1);
assert.strictEqual(normalizedA.settings.musicVol, 0);
assert.strictEqual(normalizedA.settings.lang, "ru");

var migrated = PSave.migrate({
  v: 0,
  progress: { level: "w2l1", levelsCleared: ["w1l1", "w1l3"] },
  scores: { w1l1: { best: 1234, bestTimeFrames: 456, rank: "B" } },
  settings: { crt: true, scaleMode: "fit" }
});
assert.strictEqual(migrated.campaign.currentLevel, "w2l1");
assert.deepStrictEqual(migrated.campaign.completedLevels, ["w1l1", "w1l3"]);
assert.strictEqual(migrated.records.w1l1.best, 1234);
assert.strictEqual(migrated.settings.crt, true);

var progressed = PSave.completeLevel(empty, "w1l1", "w1l2");
assert.deepStrictEqual(progressed.campaign.completedLevels, ["w1l1"]);
assert.deepStrictEqual(progressed.campaign.unlockedLevels, ["w1l1", "w1l2"]);
assert.strictEqual(progressed.campaign.currentLevel, "w1l2");
var scored = PSave.record(progressed, "w1l1", 900, "B", 800, false);
scored = PSave.record(scored, "w1l1", 700, "A", 750, true);
assert.deepStrictEqual(scored.records.w1l1, { best: 900, bestTimeFrames: 750, rank: "A", noHit: true });
assert.strictEqual(empty.records.w1l1, undefined, "progress helpers do not mutate input");
var hinted = PSave.markHint(empty, "guard");
hinted = PSave.markHint(hinted, "guard");
hinted = PSave.markHint(hinted, "meter-full");
assert.deepStrictEqual(hinted.onboarding.seenHints, ["guard", "meter-full"], "hint history is pure, deduplicated, and slot-persistable");
assert.deepStrictEqual(empty.onboarding.seenHints, [], "hint history does not mutate its input save");

var store = memory();
var adapter = PSave.createAdapter(store);
assert.strictEqual(adapter.save(scored), true);
assert.ok(store.data[PSave.KEY], "primary save committed");
assert.strictEqual(store.data[PSave.KEY + ".tmp"], undefined, "temp removed after commit");
assert.deepStrictEqual(adapter.load(), scored);

store.data[PSave.KEY] = "{broken";
store.data[PSave.KEY + ".tmp"] = JSON.stringify(scored);
assert.deepStrictEqual(adapter.load(), scored, "valid temp recovers a corrupt primary");

var newer = PSave.completeLevel(scored, "w1l2", "w1l3");
store.data[PSave.KEY] = JSON.stringify(scored);
store.data[PSave.KEY + ".tmp"] = JSON.stringify(newer);
assert.deepStrictEqual(adapter.load(), newer, "pending temp wins after an interrupted primary replacement");

store.data[PSave.KEY] = JSON.stringify({ v: 99, campaign: { currentLevel: "w5l3" } });
store.data[PSave.KEY + ".tmp"] = JSON.stringify(scored);
assert.deepStrictEqual(adapter.load(), empty, "unknown version starts fresh instead of using stale temp");

store.data[PSave.KEY] = "x".repeat(PSave.MAX_CHARS + 1);
delete store.data[PSave.KEY + ".tmp"];
assert.deepStrictEqual(adapter.load(), empty, "oversize primary starts fresh");

var failing = memory();
failing.setItem = function (k, v) {
  failing.data[k] = String(v);
  if (k === PSave.KEY) throw new Error("quota");
};
assert.strictEqual(PSave.createAdapter(failing).save(scored), false);
assert.ok(failing.data[PSave.KEY + ".tmp"], "failed primary write leaves recoverable temp");

adapter.clear();
assert.strictEqual(store.data[PSave.KEY], undefined);
assert.strictEqual(store.data[PSave.KEY + ".tmp"], undefined);

assert.strictEqual(PSave.slotKey(1), PSave.KEY, "slot one preserves the original storage key");
assert.strictEqual(PSave.slotKey(3), PSave.KEY + ".slot3", "later slots are isolated");
assert.strictEqual(PSave.selectSlot(2), 2);
assert.strictEqual(PSave.activeSlot(), 2, "active slot is explicit and bounded");
assert.strictEqual(PSave.selectSlot(99), 1, "invalid slot safely falls back to slot one");

console.log("save persistence tests passed");
