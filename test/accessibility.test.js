"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Font = require("../js/ui.font.js");
var strings = require("../data/strings.ru.json");

var full = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя«»";
for (var i = 0; i < full.length; i++) assert(Font.has(full.charAt(i)), "missing Cyrillic glyph " + full.charAt(i));
Object.keys(strings).forEach(function (key) {
  String(strings[key]).split("").forEach(function (ch) { assert(Font.has(ch), key + " has unsupported glyph " + ch); });
});

function rgb(hex) { return [1, 3, 5].map(function (i) { var v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); }
function contrast(a, b) { var x = rgb(a), y = rgb(b), l1 = 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2], l2 = 0.2126 * y[0] + 0.7152 * y[1] + 0.0722 * y[2]; return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
[["#FFFFFF", "#14121C"], ["#FFE9A8", "#241E33"], ["#F2C14E", "#14121C"], ["#8FD3FF", "#14121C"]].forEach(function (pair) {
  assert(contrast(pair[0], pair[1]) >= 4.5, pair.join(" on ") + " misses text contrast");
});

var boot = fs.readFileSync(path.join(__dirname, "../js/boot.js"), "utf8");
assert(boot.indexOf("Math.min(vw / UW, vh / UH)") >= 0, "small viewports need fractional fit");
assert(boot.indexOf("visualViewport") >= 0 && boot.indexOf("offsetTop") >= 0, "mobile visual viewport offsets are required");
var page = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
assert(page.indexOf("user-scalable=no") < 0 && page.indexOf("maximum-scale=1") < 0, "mobile zoom must remain available");
assert(page.indexOf('role="application"') >= 0 && page.indexOf("aria-label") >= 0, "canvas needs an accessible name");
var render = fs.readFileSync(path.join(__dirname, "../js/render.js"), "utf8");
assert(render.indexOf("prefs.reducedMotion || prefs.video && prefs.video.flashReduction") >= 0, "flash reduction does not reach hazards");
assert(render.indexOf("screenShake") >= 0, "screen-shake scaling is not consumed");
console.log("ok Cyrillic, contrast, motion, flash and viewport accessibility contracts");
