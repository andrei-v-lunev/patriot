"use strict";

var assert = require("assert");
var Boot = require("../js/boot.js");

var shortSafari = Boot._layout(844, 270, 3, false);
assert.strictEqual(shortSafari.cssW, 480,
  "3x Safari uses the full short viewport instead of collapsing to a 320px game");
assert.strictEqual(shortSafari.cssH, 270, "short Safari keeps the complete 16:9 playfield visible");
assert.strictEqual(shortSafari.backingScale, 2, "short Safari retains a sharp retina backing buffer");

var iphone = Boot._layout(844, 390, 3, false);
assert(Math.abs(iphone.cssW - 693.3333333333) < 0.01 && iphone.cssH === 390,
  "iPhone landscape fills the available height at the correct aspect ratio");
assert.strictEqual(iphone.backingScale, 3, "iPhone landscape uses a 3x backing buffer");

var desktop = Boot._layout(1440, 900, 1, false);
assert.strictEqual(desktop.cssW, 960, "large desktop keeps integer scaling when requested");
var desktopFit = Boot._layout(1440, 900, 1, true);
assert.strictEqual(desktopFit.cssW, 1440, "explicit fit mode may fractionally fill a large desktop viewport");

console.log("ok DPR-aware small-view fit and large-screen integer scaling");
