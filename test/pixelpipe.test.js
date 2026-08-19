"use strict";

/* Tests for tools/pixelpipe.js — chroma-key threshold predicate and island
   segmentation, on synthetic in-memory PNGs built with pngjs (a real
   devDependency, real pixel data — not mocked).

   pixelpipe.js is a CLI script that calls main() unconditionally at the
   bottom of the file and exits the process on bad args, so it can't be
   require()'d in-process like the other modules under test. It exposes no
   pure functions either. It's invoked here as a real child process, the
   same way a person would run it, with real PNG files in a temp dir. */

var path = require("path");
var fs = require("fs");
var os = require("os");
var cp = require("child_process");
var PNG = require("pngjs").PNG;

var ROOT = path.join(__dirname, "..");
var TOOL = path.join(ROOT, "tools", "pixelpipe.js");

var fails = 0;
var oks = 0;

function ok(cond, msg) {
  if (cond) {
    console.log("ok", msg);
    oks++;
  } else {
    console.error("FAIL", msg);
    process.exitCode = 1;
    fails++;
  }
}

var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixelpipe-test-"));

function fillRect(img, x0, y0, w, h, r, g, b, a) {
  for (var y = y0; y < y0 + h; y++) {
    for (var x = x0; x < x0 + w; x++) {
      var i = (y * img.width + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a;
    }
  }
}

function writePng(name, img) {
  var p = path.join(tmpDir, name);
  fs.writeFileSync(p, PNG.sync.write(img));
  return p;
}

function readPng(p) {
  return PNG.sync.read(fs.readFileSync(p));
}

function run(args) {
  return cp.execFileSync(process.execPath, [TOOL].concat(args), { cwd: tmpDir }).toString();
}

function opaqueCount(img) {
  var n = 0;
  for (var i = 3; i < img.data.length; i += 4) if (img.data[i] > 0) n++;
  return n;
}

/* ---- Chroma-key threshold predicate: r-g>90 && b-g>90, exactly at KEY_THR ---- */

(function chromaKeyThreshold() {
  // Just OVER threshold (91,91): the whole uniform image gets keyed fully
  // transparent, so buildSheet finds no bbox and draws nothing at all.
  var dropImg = new PNG({ width: 40, height: 20 });
  fillRect(dropImg, 0, 0, 40, 20, 219, 128, 219, 255); // r-g=91, b-g=91
  var dropIn = writePng("drop.png", dropImg);
  var dropOut = path.join(tmpDir, "drop.out.png");
  run(["sheet", dropIn, dropOut, "--frames", "1", "--fw", "16", "--fh", "16"]);
  var dropResult = readPng(dropOut);
  ok(dropResult.width === 16 && dropResult.height === 16, "sheet output has requested dimensions (drop case)");
  ok(opaqueCount(dropResult) === 0, "color just over KEY_THR (91,91) is keyed out entirely — output fully transparent");

  // Just UNDER threshold (89,89): predicate is false, pixels stay opaque and
  // survive through to the sheet output. Blob kept narrower than 50% of the
  // canvas width so the ground-line remover (full-width row filter) leaves it.
  var keepImg = new PNG({ width: 40, height: 20 });
  fillRect(keepImg, 4, 4, 14, 12, 217, 128, 217, 255); // r-g=89, b-g=89
  var keepIn = writePng("keep.png", keepImg);
  var keepOut = path.join(tmpDir, "keep.out.png");
  run(["sheet", keepIn, keepOut, "--frames", "1", "--fw", "16", "--fh", "16"]);
  var keepResult = readPng(keepOut);
  ok(opaqueCount(keepResult) > 0, "color just under KEY_THR (89,89) is kept — output has opaque pixels");
})();

/* ---- Island segmentation: extractFrame keeps only the largest 4-connected
   component per frame, dropping smaller disconnected islands (e.g. a
   stray fist/head sliver from a neighboring frame). Verified by comparing
   a clean image against the same image plus a small disconnected noise
   blob within the same detected column segment — the outputs must be
   byte-identical once the noise island is dropped. ---- */

(function islandSegmentation() {
  var KEEP = [80, 200, 80, 255]; // clearly non-magenta, survives chroma-key

  function baseImg() {
    var img = new PNG({ width: 60, height: 20 });
    // Frame 0 main blob.
    fillRect(img, 5, 5, 11, 10, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
    // Frame 1 main blob, far enough away to form its own column segment.
    fillRect(img, 40, 5, 11, 10, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
    return img;
  }

  var clean = baseImg();
  var cleanIn = writePng("island-clean.png", clean);
  var cleanOut = path.join(tmpDir, "island-clean.out.png");
  run(["sheet", cleanIn, cleanOut, "--frames", "2", "--fw", "16", "--fh", "16"]);

  var noisy = baseImg();
  // Small disconnected blob: same column segment as frame 0's main blob
  // (gap of 2 columns, within MAX_GAP), but a different row band separated
  // by a fully transparent row, so it's NOT 4-connected to the main blob.
  fillRect(noisy, 18, 1, 2, 2, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var noisyIn = writePng("island-noisy.png", noisy);
  var noisyOut = path.join(tmpDir, "island-noisy.out.png");
  run(["sheet", noisyIn, noisyOut, "--frames", "2", "--fw", "16", "--fh", "16"]);

  var cleanResult = readPng(cleanOut);
  var noisyResult = readPng(noisyOut);

  ok(cleanResult.width === 32 && cleanResult.height === 16, "2-frame sheet output is fw*frames x fh (32x16)");
  ok(opaqueCount(cleanResult) > 0, "clean two-blob image produces a non-empty sheet");
  ok(Buffer.compare(cleanResult.data, noisyResult.data) === 0,
    "a disconnected noise island in the same column segment is dropped: output is identical with or without it");
})();

/* ---- Sanity: a genuinely bigger disconnected blob is NOT silently dropped
   (guards against a test that would pass if extractFrame kept nothing). ---- */

(function islandSegmentationSanityCheck() {
  var KEEP = [80, 200, 80, 255];
  var img = new PNG({ width: 60, height: 20 });
  fillRect(img, 5, 5, 11, 10, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var out = path.join(tmpDir, "island-sanity.out.png");
  var inFile = writePng("island-sanity.png", img);
  run(["sheet", inFile, out, "--frames", "1", "--fw", "16", "--fh", "16"]);
  var result = readPng(out);
  ok(opaqueCount(result) > 0, "a single real blob (no islands to drop) still produces opaque output");
})();

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(oks + " ok, " + fails + " fail");
if (fails) process.exitCode = 1;
