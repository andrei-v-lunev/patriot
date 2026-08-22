"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;

var root = path.join(__dirname, "..");
var crestPath = path.join(root, "assets/ui/club-crest.png");
var sourcePath = path.join(root, "art/src/raw/club-crest-pixel.png");
var titleSource = fs.readFileSync(path.join(root, "js/ui.title.js"), "utf8");
var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
var manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/manifest.webmanifest"), "utf8"));
var crest = PNG.sync.read(fs.readFileSync(crestPath));
var transparent = 0;
var opaque = 0;

for (var i = 3; i < crest.data.length; i += 4) {
  if (crest.data[i] === 0) transparent++;
  if (crest.data[i] === 255) opaque++;
}

assert(fs.existsSync(sourcePath), "pixel crest generation source is preserved");
assert.strictEqual(crest.width, 128, "runtime crest width");
assert.strictEqual(crest.height, 128, "runtime crest height");
assert(transparent > 5000, "runtime crest has a transparent surround");
assert(opaque > 3000, "runtime crest retains substantial opaque artwork");
assert(titleSource.indexOf("assets/ui/club-crest.png") >= 0, "title loads the club crest");
assert(titleSource.indexOf("drawCrest: drawCrest") >= 0, "crest renderer is reusable");
assert(html.indexOf('rel="icon" type="image/png" href="assets/ui/club-crest.png"') >= 0,
  "club crest is the browser icon");
assert(html.indexOf('rel="manifest"') >= 0 && html.indexOf('rel="apple-touch-icon"') >= 0,
  "browser shell advertises installable club branding");
assert(manifest.display === "fullscreen" && manifest.orientation === "landscape",
  "Home Screen web app removes browser chrome and stays landscape");
console.log("ok club crest branding asset, title route, and browser icon");
