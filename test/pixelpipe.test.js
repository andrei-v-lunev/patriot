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

function runResult(args) {
  return cp.spawnSync(process.execPath, [TOOL].concat(args), { cwd: tmpDir, encoding: "utf8" });
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

/* ---- Island segmentation: extractFrame keeps substantial 4-connected
   components per frame, dropping tiny disconnected islands (e.g. a
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

(function detachedPropSurvives() {
  var KEEP = [80, 200, 80, 255];
  var img = new PNG({ width: 40, height: 30 });
  fillRect(img, 5, 8, 15, 16, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(img, 23, 10, 4, 5, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var out = path.join(tmpDir, "detached-prop.out.png");
  run(["sheet", writePng("detached-prop.png", img), out, "--frames", "1", "--fw", "32", "--fh", "32"]);
  var result = readPng(out);
  var rightEdgeOpaque = false;
  for (var y = 0; y < result.height; y++) for (var x = 23; x < result.width; x++)
    if (result.data[(y * result.width + x) * 4 + 3] > 0) rightEdgeOpaque = true;
  ok(rightEdgeOpaque, "a substantial detached prop survives component cleanup");
})();

(function singleWidePoseIsNotCut() {
  var KEEP = [80, 200, 80, 255];
  var img = new PNG({ width: 40, height: 30 });
  fillRect(img, 5, 7, 30, 16, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var out = path.join(tmpDir, "single-wide.out.png");
  run(["sheet", writePng("single-wide.png", img), out, "--frames", "1", "--fw", "32", "--fh", "32", "--strict", "true"]);
  var result = readPng(out);
  ok(opaqueCount(result) > 250, "a wide single-pose model is not mistaken for a ground line");
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

(function strictGenerationGates() {
  var KEEP = [80, 200, 80, 255];
  var mismatch = new PNG({ width: 90, height: 20 });
  fillRect(mismatch, 5, 5, 10, 10, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(mismatch, 35, 5, 10, 10, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(mismatch, 65, 5, 10, 10, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var mismatchIn = writePng("strict-count.png", mismatch);
  var mismatchOut = path.join(tmpDir, "strict-count.out.png");
  var mismatchRun = runResult(["sheet", mismatchIn, mismatchOut, "--frames", "2", "--fw", "16", "--fh", "16", "--strict", "true"]);
  ok(mismatchRun.status !== 0 && /expected exactly 2 separated poses/.test(mismatchRun.stderr),
    "strict sheet gate rejects a wrong detected pose count");

  var touching = new PNG({ width: 40, height: 30 });
  fillRect(touching, 3, 5, 17, 10, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(touching, 21, 5, 16, 10, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(touching, 20, 9, 1, 1, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var touchingRun = runResult(["sheet", writePng("strict-touching.png", touching),
    path.join(tmpDir, "strict-touching.out.png"), "--frames", "2", "--fw", "16", "--fh", "16", "--strict", "true"]);
  ok(touchingRun.status !== 0 && /expected exactly 2 separated poses/.test(touchingRun.stderr),
    "strict sheet gate rejects poses that touch across the required gutter");

  var undercount = new PNG({ width: 80, height: 30 });
  fillRect(undercount, 2, 4, 23, 18, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(undercount, 29, 4, 23, 18, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(undercount, 56, 4, 22, 18, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var undercountRun = runResult(["sheet", writePng("strict-undercount.png", undercount),
    path.join(tmpDir, "strict-undercount.out.png"), "--frames", "4", "--fw", "16", "--fh", "16", "--strict", "true"]);
  ok(undercountRun.status !== 0 && /expected exactly 4 separated poses/.test(undercountRun.stderr),
    "strict sheet gate rejects a real pose undercount hidden behind equal slicing");

  var banded = new PNG({ width: 80, height: 30 });
  fillRect(banded, 5, 5, 12, 20, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(banded, 55, 5, 12, 20, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(banded, 0, 12, 80, 5, 40, 40, 40, 255);
  var bandedRun = runResult(["sheet", writePng("strict-banded.png", banded),
    path.join(tmpDir, "strict-banded.out.png"), "--frames", "2", "--fw", "16", "--fh", "16", "--strict", "true"]);
  ok(bandedRun.status !== 0 && /background\/panel band/.test(bandedRun.stderr),
    "strict sheet gate rejects a broad panel band that would cut through sprites");

  var divided = new PNG({ width: 80, height: 30 });
  fillRect(divided, 5, 5, 12, 20, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(divided, 55, 5, 12, 20, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(divided, 39, 0, 2, 30, 20, 20, 20, 255);
  var dividedRun = runResult(["sheet", writePng("strict-divided.png", divided),
    path.join(tmpDir, "strict-divided.out.png"), "--frames", "2", "--fw", "16", "--fh", "16", "--strict", "true"]);
  ok(dividedRun.status !== 0 && /full-height panel divider/.test(dividedRun.stderr),
    "strict sheet gate rejects full-height panel dividers");

  var clipped = new PNG({ width: 80, height: 30 });
  fillRect(clipped, 0, 5, 12, 20, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(clipped, 55, 5, 12, 20, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var clippedRun = runResult(["sheet", writePng("strict-clipped.png", clipped),
    path.join(tmpDir, "strict-clipped.out.png"), "--frames", "2", "--fw", "16", "--fh", "16", "--strict", "true"]);
  ok(clippedRun.status !== 0 && /clipped by the source canvas edge/.test(clippedRun.stderr),
    "strict sheet gate rejects source artwork cropped by the canvas edge");

  var dup = new PNG({ width: 60, height: 20 });
  fillRect(dup, 5, 5, 11, 10, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(dup, 40, 5, 11, 10, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var dupIn = writePng("strict-dup.png", dup);
  var dupOut = path.join(tmpDir, "strict-dup.out.png");
  var dupRun = runResult(["sheet", dupIn, dupOut, "--frames", "2", "--fw", "16", "--fh", "16", "--strict", "true"]);
  ok(dupRun.status !== 0 && /duplicate processed frame/.test(dupRun.stderr),
    "strict sheet gate rejects exact duplicate animation frames");

  var fragment = new PNG({ width: 80, height: 30 });
  fillRect(fragment, 2, 4, 22, 18, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(fragment, 30, 4, 18, 18, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(fragment, 70, 10, 3, 3, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var fragmentRun = runResult(["sheet", writePng("strict-fragment.png", fragment),
    path.join(tmpDir, "strict-fragment.out.png"), "--frames", "3", "--fw", "16", "--fh", "16", "--strict", "true"]);
  ok(fragmentRun.status !== 0 && /truncated fragment/.test(fragmentRun.stderr),
    "strict sheet gate rejects a sliced frame that contains only a pose fragment");
  var fxVariance = new PNG({ width: 80, height: 30 });
  fillRect(fxVariance, 5, 12, 7, 2, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(fxVariance, 8, 9, 2, 8, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(fxVariance, 30, 9, 15, 3, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(fxVariance, 36, 4, 3, 14, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(fxVariance, 58, 7, 19, 3, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(fxVariance, 66, 2, 3, 19, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var fxFragmentRun = runResult(["sheet", writePng("strict-fx-variance.png", fxVariance),
    path.join(tmpDir, "strict-fx-variance.out.png"), "--frames", "3", "--fw", "16", "--fh", "16",
    "--strict", "true", "--anchor", "center"]);
  ok(fxFragmentRun.status === 0,
    "center-anchored FX may intentionally grow from a tiny first frame");

  var boxedFx = new PNG({ width: 80, height: 30 });
  fillRect(boxedFx, 4, 4, 24, 1, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(boxedFx, 4, 24, 24, 1, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(boxedFx, 4, 4, 1, 21, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(boxedFx, 27, 4, 1, 21, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(boxedFx, 49, 3, 24, 1, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(boxedFx, 49, 25, 24, 1, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(boxedFx, 49, 3, 1, 23, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  fillRect(boxedFx, 72, 3, 1, 23, KEEP[0], KEEP[1], KEEP[2], KEEP[3]);
  var boxedFxRun = runResult(["sheet", writePng("strict-boxed-fx.png", boxedFx),
    path.join(tmpDir, "strict-boxed-fx.out.png"), "--frames", "2", "--fw", "32", "--fh", "32",
    "--strict", "true", "--anchor", "center"]);
  ok(boxedFxRun.status !== 0 && /opaque rectangular panel/.test(boxedFxRun.stderr),
    "strict FX gate rejects opaque per-frame cards/backplates");

  var boxedCharacterRun = runResult(["sheet", writePng("strict-boxed-character.png", boxedFx),
    path.join(tmpDir, "strict-boxed-character.out.png"), "--frames", "2", "--fw", "32", "--fh", "32",
    "--strict", "true"]);
  ok(boxedCharacterRun.status !== 0 && /opaque rectangular panel/.test(boxedCharacterRun.stderr),
    "strict character gate rejects opaque per-frame cards/backplates");

  var pal = new PNG({ width: 20, height: 20 });
  fillRect(pal, 2, 2, 4, 14, 250, 20, 20, 255);
  fillRect(pal, 6, 2, 4, 14, 20, 250, 20, 255);
  fillRect(pal, 10, 2, 4, 14, 20, 20, 250, 255);
  fillRect(pal, 14, 2, 4, 14, 240, 240, 40, 255);
  var palIn = writePng("strict-palette.png", pal);
  var palOut = path.join(tmpDir, "strict-palette.out.png");
  run(["sheet", palIn, palOut, "--frames", "1", "--fw", "16", "--fh", "16", "--strict", "true", "--colors", "2"]);
  var palImg = readPng(palOut), colors = {};
  for (var pi = 0; pi < palImg.data.length; pi += 4) {
    if (palImg.data[pi + 3]) colors[[palImg.data[pi], palImg.data[pi + 1], palImg.data[pi + 2]].join(",")] = 1;
  }
  ok(Object.keys(colors).length <= 2, "palette gate quantizes opaque sprite colors to the requested ceiling");
})();

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(oks + " ok, " + fails + " fail");
if (fails) process.exitCode = 1;
