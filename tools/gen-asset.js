#!/usr/bin/env node
// gen-asset.js — data-driven asset builder for ПАТРИОТ.
// Reads tools/asset-manifest.json; for each entry, skips if outPath exists (unless --force
// or --only <id,...>), otherwise builds it:
//   grok-sheet    grok-generate art/src/raw/<id>.png, then pixelpipe sheet mode.
//                 If raw gen is missing/unusable, falls back to fallbackSrc repeated N times.
//   single-repeat pixelpipe single mode with --repeat.
//   crop          pixelpipe crop mode.
//   world-ground  deterministic 16px tileset + perspective floor band.
// Always regenerates assets/atlas/atlas.json at the end.
// Usage: node tools/gen-asset.js [--force] [--only id1,id2] [--repair id1,id2] [--no-gen] [--atlas-only]

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'asset-manifest.json'), 'utf8'));

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('Usage: node tools/gen-asset.js [--force] [--only id1,id2] [--repair id1,id2] [--no-gen] [--atlas-only]');
  process.exit(0);
}
const FORCE = argv.includes('--force');
const NO_GEN = argv.includes('--no-gen'); // don't call grok; use fallbacks for missing raws
const ATLAS_ONLY = argv.includes('--atlas-only');
const onlyIdx = argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? argv[onlyIdx + 1].split(',') : null;
const repairIdx = argv.indexOf('--repair');
const REPAIR = repairIdx >= 0 ? argv[repairIdx + 1].split(',') : null;

const abs = (p) => path.join(ROOT, p);

function expandPrompt(tpl, noSuffix) {
  const body = tpl.replace(/\{(\w+)\}/g, (_, k) => manifest.characters[k] || `{${k}}`);
  return noSuffix ? body : body + ', ' + manifest.styleSuffix;
}

function pixelpipe(args) {
  execFileSync('node', [path.join(__dirname, 'pixelpipe.js'), ...args], { stdio: 'inherit' });
}

/* Image editors strongly inherit the aspect ratio of identity references. Give
   multi-frame edits a deterministic landscape guide made from the already
   processed canonical model: repeated cutouts establish canvas geometry and
   clean gutters without introducing a second creative generation. */
function makeLayoutGuide(entry) {
  if (!entry.ref || !entry.cells || entry.cells.frames < 2) return null;
  const modelId = path.basename(entry.ref, path.extname(entry.ref));
  const modelEntry = manifest.entries.find(e => e.id === modelId);
  if (!modelEntry || !fs.existsSync(abs(modelEntry.outPath))) return null;
  const guidePath = abs(`art/src/layout-guides/${modelId}-${entry.cells.frames}.png`);
  const src = PNG.sync.read(fs.readFileSync(abs(modelEntry.outPath)));
  const out = new PNG({ width: 1536, height: 1024 });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 255; out.data[i + 3] = 255;
  }
  let minX = src.width, minY = src.height, maxX = -1, maxY = -1;
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    if (src.data[(y * src.width + x) * 4 + 3] > 0) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return null;
  const sw = maxX - minX + 1, sh = maxY - minY + 1;
  const cellW = out.width / entry.cells.frames;
  /* Editors tend to enlarge reference figures by ~1.4×. Seed at 46% cell
     width so the edited result still retains clean gutters and outer margins. */
  const scale = Math.min(cellW * 0.46 / sw, out.height * 0.42 / sh);
  const dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
  const footY = 760;
  for (let f = 0; f < entry.cells.frames; f++) {
    const dx = Math.round((f + 0.5) * cellW - dw * 0.5), dy = footY - dh;
    for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
      const sx = minX + Math.min(sw - 1, Math.floor(x * sw / dw));
      const sy = minY + Math.min(sh - 1, Math.floor(y * sh / dh));
      const si = (sy * src.width + sx) * 4;
      if (src.data[si + 3] === 0) continue;
      const di = ((dy + y) * out.width + dx + x) * 4;
      out.data[di] = src.data[si]; out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2]; out.data[di + 3] = src.data[si + 3];
    }
  }
  fs.mkdirSync(path.dirname(guidePath), { recursive: true });
  fs.writeFileSync(guidePath, PNG.sync.write(out));
  return guidePath;
}

function grokGen(entry, rawPath) {
  const guide = makeLayoutGuide(entry);
  const refNote = entry.ref
    ? `Read the image at ${abs(entry.ref)}. Use it as the INPUT IMAGE for an image edit — ` +
      `the character in the output must be EXACTLY the character from that image: same face, ` +
      `same facial hair (or lack of it), same hairstyle, same clothing and colors, same belt color, ` +
      `same accessories (nothing added, nothing removed), same proportions, same pixel-art style. ` +
      `Use the input only as the identity source: create a NEW 1536x1024 wide landscape canvas for the sheet; ` +
      `do not preserve or inherit the portrait dimensions of the reference image.\n`
    : '';
  const guideNote = guide
    ? `Read the image at ${guide} as the LAYOUT GUIDE. Preserve its 1536x1024 landscape canvas, ` +
      `pose centers, generous outer margins, uninterrupted pure-magenta background, and empty spaces between figures. ` +
      `Each complete figure plus every prop must occupy at most 65% of its cell width. ` +
      `Replace each repeated neutral cutout with the requested animation pose while retaining the canonical identity.\n`
    : '';
  const layoutNote = entry.mode === 'grok-sheet' && entry.cells && entry.cells.frames > 1
    ? `LAYOUT CONTRACT: output a 1536x1024 LANDSCAPE image containing one very wide SINGLE horizontal row of exactly ${entry.cells.frames} poses. ` +
      `Confine each pose to its own equal-width cell; leave a full-height pure-magenta vertical gutter ` +
      `between every cell; no body, prop, weapon, motion smear, or effect may touch or cross a gutter. ` +
      `Never use multiple rows, panels, borders, labels, or overlapping poses.\n`
    : '';
  const prompt = refNote +
    guideNote +
    layoutNote +
    `Use your image generation tool to generate ONE image in a SINGLE generation call ` +
    `and save it to exactly this path: ${rawPath}\n` +
    `Do not iterate, composite, animate, or refine — one direct generation, then stop.\n` +
    `Image description: ${expandPrompt(entry.prompt, entry.noSuffix)}`;
  console.log(`[gen] grok → ${rawPath}`);
  execFileSync('grok', ['-p', prompt, '--permission-mode', 'bypassPermissions'],
    { stdio: 'inherit', timeout: 15 * 60 * 1000 });
}

function grokRepair(entry, rawPath) {
  if (!entry.repairPrompt) throw new Error(`${entry.id}: no repairPrompt in manifest`);
  if (!fs.existsSync(rawPath)) throw new Error(`${entry.id}: no raw candidate to repair`);
  const repaired = rawPath.replace(/\.png$/, '-repair.png');
  if (fs.existsSync(repaired)) throw new Error(`${entry.id}: stale repair candidate exists`);
  const guide = makeLayoutGuide(entry);
  const prompt =
    `Read ${rawPath} as the EDIT TARGET. Read ${abs(entry.ref)} as the canonical identity reference. ` +
    (guide ? `Read ${guide} only as the existing layout reference. ` : '') +
    `Make exactly ONE image edit and save the result to ${repaired}. ` +
    `Change ONLY this defect: ${entry.repairPrompt}. Preserve the target's exact pose sequence, ` +
    `face, hair, body proportions, outfit, scale, spacing, canvas, magenta background, and every ` +
    `already-correct pixel as closely as possible. Do not add panels, borders, labels, extra figures, ` +
    `or new effects. Do not iterate or refine; one edit, then stop.`;
  console.log(`[gen] grok repair → ${repaired}`);
  execFileSync('grok', ['-p', prompt, '--permission-mode', 'bypassPermissions'],
    { stdio: 'inherit', timeout: 15 * 60 * 1000 });
  if (!fs.existsSync(repaired)) throw new Error(`${entry.id}: repair produced no image`);
  fs.renameSync(repaired, rawPath);
}

function build(entry) {
  const { fw, fh, frames } = entry.cells;
  const out = abs(entry.outPath);
  if (entry.mode === 'crop') {
    pixelpipe(['crop', abs(entry.src), out, '--rect', entry.rect, '--size', entry.size]);
  } else if (entry.mode === 'world-ground') {
    execFileSync('node', [path.join(__dirname, 'build-world-art.js'), '--world', String(entry.world)],
      { stdio: 'inherit' });
  } else if (entry.mode === 'grok-crop') {
    // Generated full-bleed background: grok gen raw, then crop/scale (no chroma key).
    const raw = abs(`art/src/raw/${entry.id}.png`);
    if (!fs.existsSync(raw) && !NO_GEN) {
      try { grokGen(entry, raw); } catch (e) { console.error(`[gen] grok failed for ${entry.id}: ${e.message}`); }
    }
    if (!fs.existsSync(raw)) throw new Error(`${entry.id}: no raw image`);
    const wrap = entry.wrap ? ['--wrap', entry.wrap] : [];
    pixelpipe(['crop', raw, out, '--rect', entry.rect, '--size', entry.size, ...wrap]);
  } else if (entry.mode === 'single-repeat') {
    pixelpipe(['single', abs(entry.src), out, '--fw', fw, '--fh', fh, '--repeat', frames]);
  } else if (entry.mode === 'grok-sheet') {
    const raw = abs(`art/src/raw/${entry.id}.png`);
    if (!fs.existsSync(raw) && !NO_GEN) {
      try { grokGen(entry, raw); } catch (e) { console.error(`[gen] grok failed for ${entry.id}: ${e.message}`); }
    }
    if (fs.existsSync(raw)) {
      const extra = entry.anchor ? ['--anchor', entry.anchor] : [];
      const colors = entry.maxColors ? ['--colors', String(entry.maxColors)] : [];
      pixelpipe(['sheet', raw, out, '--frames', frames, '--fw', fw, '--fh', fh,
        '--strict', 'true', ...colors, ...extra]);
    } else if (entry.fallbackSrc) {
      console.warn(`[gen] ${entry.id}: no raw sheet — static fallback from ${entry.fallbackSrc}`);
      pixelpipe(['single', abs(entry.fallbackSrc), out, '--fw', fw, '--fh', fh, '--repeat', frames]);
    } else {
      throw new Error(`${entry.id}: no raw and no fallbackSrc`);
    }
  } else {
    throw new Error(`${entry.id}: unknown mode ${entry.mode}`);
  }
}

function writeAtlas() {
  const atlas = {};
  for (const e of manifest.entries) {
    if (!fs.existsSync(abs(e.outPath))) {
      console.warn(`[gen] atlas skip (missing output): ${e.id}`);
      continue;
    }
    if (e.maxColors) {
      try {
        const img = PNG.sync.read(fs.readFileSync(abs(e.outPath)));
        const wantW = e.cells.fw * e.cells.frames;
        if (img.width !== wantW || img.height !== e.cells.fh)
          throw new Error(`dimensions ${img.width}x${img.height}, expected ${wantW}x${e.cells.fh}`);
        const colors = new Set();
        for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3])
          colors.add(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`);
        if (colors.size > e.maxColors) throw new Error(`${colors.size} colors, max ${e.maxColors}`);
      } catch (err) {
        console.warn(`[gen] atlas skip (gate failed): ${e.id}: ${err.message}`);
        continue;
      }
    }
    atlas[e.id] = {
      path: e.outPath,
      fw: e.cells.fw, fh: e.cells.fh, frames: e.cells.frames, fps: e.fps,
    };
  }
  const file = abs('assets/atlas/atlas.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(atlas, null, 2) + '\n');
  console.log(`[gen] wrote ${file}`);
}

if (!ATLAS_ONLY) {
  for (const entry of manifest.entries) {
    if (REPAIR && !REPAIR.includes(entry.id)) continue;
    if (ONLY && !ONLY.includes(entry.id)) continue;
    if (!FORCE && !ONLY && !REPAIR && fs.existsSync(abs(entry.outPath))) {
      console.log(`[gen] skip (exists): ${entry.id}`);
      continue;
    }
    try {
      if (REPAIR) grokRepair(entry, abs(`art/src/raw/${entry.id}.png`));
      build(entry);
    } catch (e) { console.error(`[gen] FAILED ${entry.id}: ${e.message}`); }
  }
}
writeAtlas();
