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
  const img = PNG.sync.read(buf);
  img.wasConverted = !isPng;
  return img;
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

/* JPEG generations contain broad clouds of compressed pink pixels that miss
   the exact key threshold and falsely join neighboring poses. Remove only
   relaxed-magenta pixels connected to the canvas edge, so interior costume
   colors are never keyed merely for being purple. */
function floodKeyConvertedBackground(img) {
  if (!img.wasConverted) return;
  const { width: w, height: h, data: d } = img;
  const seen = new Uint8Array(w * h), q = [];
  function pink(p) {
    const i = p * 4;
    return d[i + 3] === 0 || (d[i] > 145 && d[i + 2] > 145 && d[i] - d[i + 1] > 35 && d[i + 2] - d[i + 1] > 35);
  }
  function add(p) { if (!seen[p] && pink(p)) { seen[p] = 1; q.push(p); } }
  for (let x = 0; x < w; x++) { add(x); add((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { add(y * w); add(y * w + w - 1); }
  for (let at = 0; at < q.length; at++) {
    const p = q[at], x = p % w, y = (p / w) | 0;
    d[p * 4 + 3] = 0;
    if (x) add(p - 1); if (x + 1 < w) add(p + 1);
    if (y) add(p - w); if (y + 1 < h) add(p + w);
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

// Reject generator layouts that cannot be sliced without inventing pixels.
// Panel dividers, broad background bands, and artwork clipped by the source
// canvas all produced mechanically valid but visibly severed sprite cells in
// the past. Strict generated sheets must provide clean, isolated poses.
function assertCleanSheetLayout(img) {
  const { width: w, height: h, data: d } = img;
  let broadRows = 0, maxBroadRows = 0;
  for (let y = 0; y < h; y++) {
    let run = 0, longest = 0;
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 0) { run++; longest = Math.max(longest, run); }
      else run = 0;
    }
    if (longest > w * 0.5) { broadRows++; maxBroadRows = Math.max(maxBroadRows, broadRows); }
    else broadRows = 0;
  }
  if (maxBroadRows > Math.max(2, Math.round(h * 0.01)))
    throw new Error('strict sheet contains a broad cross-pose background/panel band');

  for (let x = 0; x < w; x++) {
    let run = 0, longest = 0;
    for (let y = 0; y < h; y++) {
      if (d[(y * w + x) * 4 + 3] > 0) { run++; longest = Math.max(longest, run); }
      else run = 0;
    }
    if (longest > h * 0.9)
      throw new Error('strict sheet contains a full-height panel divider');
  }

  let left = 0, right = 0, top = 0, bottom = 0;
  for (let y = 0; y < h; y++) {
    if (d[(y * w) * 4 + 3] > 0) left++;
    if (d[(y * w + w - 1) * 4 + 3] > 0) right++;
  }
  for (let x = 0; x < w; x++) {
    if (d[x * 4 + 3] > 0) top++;
    if (d[((h - 1) * w + x) * 4 + 3] > 0) bottom++;
  }
  if (left > Math.max(3, h * 0.02) || right > Math.max(3, h * 0.02) ||
      top > Math.max(3, w * 0.02) || bottom > Math.max(3, w * 0.02))
    throw new Error('strict sheet artwork is clipped by the source canvas edge');
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
function detectSegments(img, frames, strict) {
  const { width: w, height: h, data: d } = img;
  const col = new Array(w).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (d[(y * w + x) * 4 + 3] > 0) col[x]++;
  /* JPEG-backed generations leave isolated non-key speckles in nominally
     empty magenta columns. Scale the occupancy floor with image height so
     those speckles do not merge an otherwise clean pose strip. */
  const MIN_PX = Math.max(3, Math.round(h * 0.01)), MAX_GAP = Math.max(4, Math.round(w * 0.004)), MIN_W = Math.round(w * 0.02);
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
  if (strict)
    throw new Error(`expected exactly ${frames} separated poses, detected ${segs.length}`);
  // Close-but-wrong count (e.g. 7 or 9 figures for 8 frames): resample whole
  // figures evenly (dup/drop) rather than bisecting one with a grid cut.
  if (!strict && segs.length >= Math.ceil(frames * 0.6) && segs.length <= frames * 2) {
    return Array.from({ length: frames }, (_, i) =>
      segs[Math.min(segs.length - 1, Math.round(i * (segs.length - 1) / Math.max(1, frames - 1)))]);
  }
  // Heavily merged (touching/overlapping frames): cut at even intervals, refined to the local
  // occupancy minimum (the thinnest column) near each expected boundary.
  const cuts = [0];
  for (let i = 1; i < frames; i++) {
    /* Generated strips often center the group within the canvas unevenly.
       Search most of the half-cell around an expected cut; the old narrow
       window could slice through pose 1 while a clean magenta valley sat
       only ~8% of the canvas farther right. */
    const center = Math.round(i * w / frames), win = Math.round(w / (2.5 * frames));
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

// Extract a frame's column range as a sub-image. Keep the main 4-connected component
// plus substantial detached pieces (held props, dust, impact rays); discard only tiny
// islands likely to be generation noise or a neighboring pose crossing the cut line.
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
    const largest = Math.max(...sizes);
    const minKeep = Math.max(6, Math.ceil(largest * 0.01));
    for (let i = 0; i < w * h; i++)
      if (label[i] >= 0 && sizes[label[i]] < minKeep) sub.data[i * 4 + 3] = 0;
  }
  return sub;
}

/* When adjacent silhouettes overlap in X but do not actually touch, column
   projection cannot separate them. Recover the N dominant connected bodies
   and attach smaller nearby props to the nearest body's horizontal center. */
function extractConnectedPoses(img, frames) {
  if (frames < 2) return null;
  const { width: w, height: h, data: d } = img;
  const label = new Int32Array(w * h).fill(-1), comps = [];
  for (let i = 0; i < w * h; i++) {
    if (d[i * 4 + 3] === 0 || label[i] >= 0) continue;
    const id = comps.length, stack = [i], c = { n: 0, minX: w, maxX: 0, sumX: 0 };
    label[i] = id;
    while (stack.length) {
      const p = stack.pop(), x = p % w, y = (p / w) | 0;
      c.n++; c.minX = Math.min(c.minX, x); c.maxX = Math.max(c.maxX, x); c.sumX += x;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (label[q] < 0 && d[q * 4 + 3] > 0) { label[q] = id; stack.push(q); }
      }
    }
    c.cx = c.sumX / c.n; comps.push(c);
  }
  if (comps.length < frames) return null;
  const ranked = comps.map((c, id) => ({ c, id })).sort((a, b) => b.c.n - a.c.n);
  const majorN = ranked.filter(x => x.c.n >= ranked[0].c.n * 0.35).length;
  if (majorN !== frames) return null;
  const mains = ranked.slice(0, frames);
  if (!mains.length || mains[mains.length - 1].c.n < mains[0].c.n * 0.35) return null;
  mains.sort((a, b) => a.c.cx - b.c.cx);
  const owner = new Int32Array(comps.length).fill(-1);
  mains.forEach((m, i) => { owner[m.id] = i; });
  for (let id = 0; id < comps.length; id++) {
    if (owner[id] >= 0 || comps[id].n < 6) continue;
    let best = 0, dist = Infinity;
    for (let i = 0; i < mains.length; i++) {
      const dd = Math.abs(comps[id].cx - mains[i].c.cx);
      if (dd < dist) { dist = dd; best = i; }
    }
    if (comps[id].n >= mains[best].c.n * 0.01) owner[id] = best;
  }
  return mains.map((m, f) => {
    const sub = new PNG({ width: w, height: h });
    for (let p = 0; p < w * h; p++) if (owner[label[p]] === f) {
      const q = p * 4; sub.data[q] = d[q]; sub.data[q + 1] = d[q + 1];
      sub.data[q + 2] = d[q + 2]; sub.data[q + 3] = d[q + 3];
    }
    return sub;
  });
}

// Slice keyed strip into frames, uniform scale (largest frame fits cell), bottom-center anchor.
function buildSheet(img, frames, fw, fh, anchor, strict) {
  const connected = extractConnectedPoses(img, frames);
  const subs = connected || detectSegments(img, frames, strict).map(([x0, x1]) => extractFrame(img, x0, x1));
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

function quantize(img, maxColors) {
  if (!(maxColors > 0)) return;
  const hist = new Map();
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] === 0) continue;
    const key = (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2];
    hist.set(key, (hist.get(key) || 0) + 1);
  }
  if (hist.size <= maxColors) return;
  const colors = Array.from(hist, ([key, count]) => ({
    r: (key >> 16) & 255, g: (key >> 8) & 255, b: key & 255, count
  }));
  let boxes = [colors];
  while (boxes.length < maxColors) {
    let pick = -1, pickScore = -1, channel = 'r';
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.length < 2) continue;
      let minR = 255, minG = 255, minB = 255, maxR = 0, maxG = 0, maxB = 0, total = 0;
      for (const c of box) {
        minR = Math.min(minR, c.r); maxR = Math.max(maxR, c.r);
        minG = Math.min(minG, c.g); maxG = Math.max(maxG, c.g);
        minB = Math.min(minB, c.b); maxB = Math.max(maxB, c.b); total += c.count;
      }
      const ranges = { r: maxR - minR, g: maxG - minG, b: maxB - minB };
      const ch = ranges.r >= ranges.g && ranges.r >= ranges.b ? 'r' : ranges.g >= ranges.b ? 'g' : 'b';
      const score = ranges[ch] * total;
      if (score > pickScore) { pick = i; pickScore = score; channel = ch; }
    }
    if (pick < 0) break;
    const box = boxes[pick].slice().sort((a, b) => a[channel] - b[channel]);
    const total = box.reduce((n, c) => n + c.count, 0);
    let acc = 0, cut = 1;
    for (; cut < box.length; cut++) { acc += box[cut - 1].count; if (acc >= total * 0.5) break; }
    boxes.splice(pick, 1, box.slice(0, cut), box.slice(cut));
  }
  const palette = boxes.map(box => {
    const total = box.reduce((n, c) => n + c.count, 0) || 1;
    return {
      r: Math.round(box.reduce((n, c) => n + c.r * c.count, 0) / total),
      g: Math.round(box.reduce((n, c) => n + c.g * c.count, 0) / total),
      b: Math.round(box.reduce((n, c) => n + c.b * c.count, 0) / total)
    };
  });
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] === 0) continue;
    let best = palette[0], bd = Infinity;
    for (const p of palette) {
      const dr = img.data[i] - p.r, dg = img.data[i + 1] - p.g, db = img.data[i + 2] - p.b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; best = p; }
    }
    img.data[i] = best.r; img.data[i + 1] = best.g; img.data[i + 2] = best.b;
  }
}

function assertDistinctFrames(img, frames, fw, fh) {
  const seen = new Set();
  for (let f = 0; f < frames; f++) {
    let key = '';
    for (let y = 0; y < fh; y++) {
      const start = (y * img.width + f * fw) * 4;
      key += img.data.subarray(start, start + fw * 4).toString('base64');
    }
    if (seen.has(key)) throw new Error(`duplicate processed frame ${f + 1}/${frames}`);
    seen.add(key);
  }
}

function assertFrameIntegrity(img, frames, fw, fh) {
  const counts = [];
  for (let f = 0; f < frames; f++) {
    let n = 0;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++)
      if (img.data[(y * img.width + f * fw + x) * 4 + 3] > 0) n++;
    counts.push(n);
  }
  const sorted = counts.slice().sort((a, b) => a - b);
  const median = sorted[(sorted.length / 2) | 0] || 1;
  for (let f = 0; f < frames; f++) {
    if (counts[f] < median * 0.45)
      throw new Error(`processed frame ${f + 1}/${frames} is a truncated fragment`);
  }
}

/* Generators sometimes place a pose/effect on an opaque rectangular card.
   Chroma-keying cannot remove that card, so detect a four-sided contour at
   the content bbox before it becomes a visible box over gameplay. */
function assertNoBoxedFrames(img, frames, fw, fh) {
  var f, b, x, y, top, bottom, left, right;
  for (f = 0; f < frames; f++) {
    b = bbox(img, f * fw, (f + 1) * fw);
    if (!b || b.w < 6 || b.h < 6) continue;
    top = bottom = left = right = 0;
    for (x = b.x; x < b.x + b.w; x++) {
      if (img.data[(b.y * img.width + x) * 4 + 3] > 0) top++;
      if (img.data[((b.y + b.h - 1) * img.width + x) * 4 + 3] > 0) bottom++;
    }
    for (y = b.y; y < b.y + b.h; y++) {
      if (img.data[(y * img.width + b.x) * 4 + 3] > 0) left++;
      if (img.data[(y * img.width + b.x + b.w - 1) * 4 + 3] > 0) right++;
    }
    if (top > b.w * 0.8 && bottom > b.w * 0.8 &&
        left > b.h * 0.8 && right > b.h * 0.8)
      throw new Error(`processed frame ${f + 1}/${frames} contains an opaque rectangular panel`);
  }
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
    chromaKey(img); floodKeyConvertedBackground(img); erodeFringe(img);
    if (o.strict === 'true' && frames > 1) assertCleanSheetLayout(img);
    if (frames > 1) removeGroundLine(img);
    const out = buildSheet(img, frames, fw, fh, o.anchor, o.strict === 'true');
    quantize(out, +o.colors);
    /* Center-anchored FX intentionally grow from tiny specks and fade back to
       near-empty; character sheets are the ones that require comparable mass. */
    if (o.strict === 'true') {
      if (o.anchor !== 'center') assertFrameIntegrity(out, frames, fw, fh);
      assertDistinctFrames(out, frames, fw, fh);
      if (frames > 1) assertNoBoxedFrames(out, frames, fw, fh);
    }
    writeImage(out, outFile);
  } else if (mode === 'single') {
    const fw = +o.fw, fh = +o.fh, repeat = +(o.repeat || 1);
    chromaKey(img); floodKeyConvertedBackground(img); erodeFringe(img);
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
    chromaKey(img); floodKeyConvertedBackground(img); erodeFringe(img);
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
