#!/usr/bin/env node
// pixelpipe.js — sprite/bg processing for ПАТРИОТ art pipeline.
// Modes:
//   sheet  <in> <out> --frames N --fw W --fh H     chroma-key + slice strip into N cells,
//                                                  auto-crop each, re-anchor bottom-center.
//   single <in> <out> --fw W --fh H [--repeat N]   chroma-key + crop + scale one image,
//                                                  optionally repeat into an N-frame sheet.
//   crop   <in> <out> --rect x,y,w,h --size W,H [--wrap N]
//          crop region, nearest-neighbor scale (no key). --rect full = whole image.
//          --wrap N makes the result seamlessly tileable horizontally: scales to
//          W+N wide, then folds the extra N columns over the first N as irregular
//          8px blocks (deterministic, no gradients — pixel-art safe).
// Nearest-neighbor scaling only. Inputs may be JPEG-with-.png-name (decoded via sips).

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { PNG } = require('pngjs');

const KEY_THR = 90;    // magenta key: r-g and b-g must both exceed this
const FRINGE_THR = 40; // edge erode: magenta-leaning threshold

function readImage(file) {
  let buf = fs.readFileSync(file);
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50;
  if (!isPng) { // JPEG or other — convert with macOS sips
    const tmp = path.join(os.tmpdir(), `pixelpipe-${process.pid}-${Date.now()}.png`);
    execFileSync('sips', ['-s', 'format', 'png', file, '--out', tmp], { stdio: 'ignore' });
    buf = fs.readFileSync(tmp);
    fs.unlinkSync(tmp);
  }
  return PNG.sync.read(buf);
}

function writeImage(img, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(img));
}

function chromaKey(img) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] - d[i + 1] > KEY_THR && d[i + 2] - d[i + 1] > KEY_THR) d[i + 3] = 0;
  }
}

// 1px erode on alpha edge: kill magenta-leaning pixels that touch transparency.
function erodeFringe(img) {
  const { width: w, height: h, data: d } = img;
  const kill = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] === 0) continue;
    if (!(d[i] - d[i + 1] > FRINGE_THR && d[i + 2] - d[i + 1] > FRINGE_THR)) continue;
    const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    if (nb.some(([nx, ny]) => nx < 0 || ny < 0 || nx >= w || ny >= h || d[(ny * w + nx) * 4 + 3] === 0))
      kill.push(i);
  }
  for (const i of kill) d[i + 3] = 0;
}

// Remove full-width horizontal "ground line" rows (a drawn baseline connecting all
// poses would otherwise merge every frame into one content island).
function removeGroundLine(img) {
  const { width: w, height: h, data: d } = img;
  for (let y = 0; y < h; y++) {
    let run = 0, longest = 0;
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 0) { run++; if (run > longest) longest = run; }
      else run = 0;
    }
    // Only a continuous line spans most of the width; separate figures never do.
    if (longest > w * 0.5) for (let x = 0; x < w; x++) d[(y * w + x) * 4 + 3] = 0;
  }
}

// Content bbox (alpha>0) within column range [x0, x1). Returns null if empty.
function bbox(img, x0, x1) {
  const { width: w, height: h, data: d } = img;
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) {
    if (d[(y * w + x) * 4 + 3] > 0) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Nearest-neighbor draw of src rect into dst at (dx,dy) with size (dw,dh).
function drawNearest(src, sr, dst, dx, dy, dw, dh) {
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const sx = sr.x + Math.min(sr.w - 1, Math.floor(x * sr.w / dw));
    const sy = sr.y + Math.min(sr.h - 1, Math.floor(y * sr.h / dh));
    const si = (sy * src.width + sx) * 4, di = ((dy + y) * dst.width + (dx + x)) * 4;
    if (src.data[si + 3] === 0) continue;
    dst.data[di] = src.data[si]; dst.data[di + 1] = src.data[si + 1];
    dst.data[di + 2] = src.data[si + 2]; dst.data[di + 3] = src.data[si + 3];
  }
}

// Detect frame segments by empty-column gaps (generated strips are rarely evenly spaced).
// Returns list of [x0, x1) column ranges; falls back to equal slicing if detection fails.
function detectSegments(img, frames) {
  const { width: w, height: h, data: d } = img;
  const col = new Array(w).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (d[(y * w + x) * 4 + 3] > 0) col[x]++;
  const MIN_PX = 3, MAX_GAP = Math.max(4, Math.round(w * 0.004)), MIN_W = Math.round(w * 0.02);
  const segs = [];
  let start = -1, gap = 0;
  for (let x = 0; x <= w; x++) {
    const filled = x < w && col[x] >= MIN_PX;
    if (filled) { if (start < 0) start = x; gap = 0; }
    else if (start >= 0 && ++gap > MAX_GAP) {
      const end = x - gap + 1;
      if (end - start >= MIN_W) segs.push([start, end]);
      start = -1;
    }
  }
  if (start >= 0 && w - start >= MIN_W) segs.push([start, w]);
  if (segs.length === frames) return segs; // clean gaps, exact count
  // Close-but-wrong count (e.g. 7 or 9 figures for 8 frames): resample whole
  // figures evenly (dup/drop) rather than bisecting one with a grid cut.
  if (segs.length >= Math.ceil(frames * 0.6) && segs.length <= frames * 2) {
    return Array.from({ length: frames }, (_, i) =>
      segs[Math.min(segs.length - 1, Math.round(i * (segs.length - 1) / Math.max(1, frames - 1)))]);
  }
  // Heavily merged (touching/overlapping frames): cut at even intervals, refined to the local
  // occupancy minimum (the thinnest column) near each expected boundary.
  const cuts = [0];
  for (let i = 1; i < frames; i++) {
    const center = Math.round(i * w / frames), win = Math.round(w / (6 * frames));
    let best = center;
    for (let x = Math.max(0, center - win); x <= Math.min(w - 1, center + win); x++) {
      if (col[x] < col[best] || (col[x] === col[best] && Math.abs(x - center) < Math.abs(best - center)))
        best = x;
    }
    cuts.push(best);
  }
  cuts.push(w);
  return Array.from({ length: frames }, (_, i) => [cuts[i], cuts[i + 1]]);
}

// Extract a frame's column range as a sub-image keeping only the largest 4-connected
// component — drops slivers of neighboring frames (a fist or head across the cut line).
function extractFrame(img, x0, x1) {
  const { height: h, width: W, data: D } = img;
  const w = x1 - x0;
  const sub = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    D.copy(sub.data, (y * w) * 4, (y * W + x0) * 4, (y * W + x1) * 4);
  const label = new Int32Array(w * h).fill(-1);
  const sizes = [];
  for (let i = 0; i < w * h; i++) {
    if (sub.data[i * 4 + 3] === 0 || label[i] >= 0) continue;
    const id = sizes.length; let size = 0;
    const stack = [i];
    label[i] = id;
    while (stack.length) {
      const p = stack.pop(); size++;
      const px = p % w, py = (p / w) | 0;
      for (const [nx, ny] of [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (label[n] < 0 && sub.data[n * 4 + 3] > 0) { label[n] = id; stack.push(n); }
      }
    }
    sizes.push(size);
  }
  if (sizes.length > 1) {
    const keep = sizes.indexOf(Math.max(...sizes));
    for (let i = 0; i < w * h; i++)
      if (label[i] >= 0 && label[i] !== keep) sub.data[i * 4 + 3] = 0;
  }
  return sub;
}

// Slice keyed strip into frames, uniform scale (largest frame fits cell), bottom-center anchor.
function buildSheet(img, frames, fw, fh, anchor) {
  const subs = detectSegments(img, frames).map(([x0, x1]) => extractFrame(img, x0, x1));
  const boxes = subs.map(s => bbox(s, 0, s.width));
  const maxW = Math.max(1, ...boxes.filter(Boolean).map(b => b.w));
  const maxH = Math.max(1, ...boxes.filter(Boolean).map(b => b.h));
  const scale = Math.min((fw - 2) / maxW, (fh - 2) / maxH);
  const out = new PNG({ width: fw * frames, height: fh });
  boxes.forEach((b, f) => {
    if (!b) return;
    const dw = Math.max(1, Math.round(b.w * scale)), dh = Math.max(1, Math.round(b.h * scale));
    const dy = anchor === 'center' ? Math.floor((fh - dh) / 2) : fh - 1 - dh;
    drawNearest(subs[f], b, out, f * fw + Math.floor((fw - dw) / 2), dy, dw, dh);
  });
  return out;
}

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
    else a._.push(argv[i]);
  }
  return a;
}

function main() {
  const [mode, inFile, outFile, ...rest] = process.argv.slice(2);
  const o = parseArgs(rest);
  if (!mode || !inFile || !outFile) {
    console.error('usage: pixelpipe.js <sheet|single|crop> <in> <out> [options]');
    process.exit(1);
  }
  const img = readImage(inFile);

  if (mode === 'sheet') {
    const frames = +o.frames, fw = +o.fw, fh = +o.fh;
    chromaKey(img); erodeFringe(img); removeGroundLine(img);
    writeImage(buildSheet(img, frames, fw, fh, o.anchor), outFile);
  } else if (mode === 'single') {
    const fw = +o.fw, fh = +o.fh, repeat = +(o.repeat || 1);
    chromaKey(img); erodeFringe(img);
    const one = buildSheet(img, 1, fw, fh);
    const out = new PNG({ width: fw * repeat, height: fh });
    for (let f = 0; f < repeat; f++)
      drawNearest(one, { x: 0, y: 0, w: fw, h: fh }, out, f * fw, 0, fw, fh);
    writeImage(out, outFile);
  } else if (mode === 'montage') {
    // montage <baseImg> <sheet> --out <file> --fw W --fh H : base frame (keyed, scaled
    // into one cell) followed by every cell of an already-processed sheet — for
    // side-by-side identity comparison.
    const fw = +o.fw, fh = +o.fh;
    chromaKey(img); erodeFringe(img);
    const baseCell = buildSheet(img, 1, fw, fh);
    const sheet = readImage(outFile); // 2nd positional arg = processed sheet
    const frames = Math.floor(sheet.width / fw);
    const outImg = new PNG({ width: fw * (frames + 1), height: fh });
    // dark backdrop so white gi reads against transparency
    for (let i = 0; i < outImg.data.length; i += 4) { outImg.data[i] = 40; outImg.data[i + 1] = 44; outImg.data[i + 2] = 52; outImg.data[i + 3] = 255; }
    drawNearest(baseCell, { x: 0, y: 0, w: fw, h: fh }, outImg, 0, 0, fw, fh);
    for (let f = 0; f < frames; f++) {
      const sy = Math.max(0, sheet.height - fh);
      drawNearest(sheet, { x: f * fw, y: sy, w: fw, h: Math.min(fh, sheet.height) }, outImg, (f + 1) * fw, 0, fw, Math.min(fh, sheet.height));
    }
    writeImage(outImg, o.out);
  } else if (mode === 'crop') {
    const [x, y, w, h] = o.rect === 'full'
      ? [0, 0, img.width, img.height]
      : o.rect.split(',').map(Number);
    const [W, H] = o.size.split(',').map(Number);
    const wrap = +(o.wrap || 0);
    const out = new PNG({ width: W + wrap, height: H });
    out.data.fill(255); // opaque base for bg crops
    drawNearest(img, { x, y, w, h }, out, 0, 0, W + wrap, H);
    let fin = out;
    if (wrap > 0) {
      // Fold the extra right-end columns over the first `wrap` columns as
      // irregular 8px blocks: column 0 continues the right edge exactly, so
      // side-by-side copies tile without a seam.
      fin = new PNG({ width: W, height: H });
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        let sx = xx;
        if (xx < wrap) {
          const t = xx / wrap;
          const n = (Math.imul((xx >> 3) * 73856093 ^ (yy >> 3) * 19349663, 2654435761) >>> 0) / 4294967296;
          if (n >= t) sx = W + xx; // wrapped continuation of the right edge
        }
        const si = (yy * (W + wrap) + sx) * 4, di = (yy * W + xx) * 4;
        for (let k = 0; k < 4; k++) fin.data[di + k] = out.data[si + k];
      }
    }
    writeImage(fin, outFile);
  } else {
    console.error(`unknown mode: ${mode}`); process.exit(1);
  }
  console.log(`ok: ${outFile}`);
}

main();
