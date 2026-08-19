#!/usr/bin/env node
// gen-asset.js — data-driven asset builder for ПАТРИОТ.
// Reads tools/asset-manifest.json; for each entry, skips if outPath exists (unless --force
// or --only <id,...>), otherwise builds it:
//   grok-sheet    grok-generate art/src/raw/<id>.png, then pixelpipe sheet mode.
//                 If raw gen is missing/unusable, falls back to fallbackSrc repeated N times.
//   single-repeat pixelpipe single mode with --repeat.
//   crop          pixelpipe crop mode.
// Always regenerates assets/atlas/atlas.json at the end.
// Usage: node tools/gen-asset.js [--force] [--only id1,id2] [--no-gen] [--atlas-only]

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'asset-manifest.json'), 'utf8'));

const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const NO_GEN = argv.includes('--no-gen'); // don't call grok; use fallbacks for missing raws
const ATLAS_ONLY = argv.includes('--atlas-only');
const onlyIdx = argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? argv[onlyIdx + 1].split(',') : null;

const abs = (p) => path.join(ROOT, p);

function expandPrompt(tpl, noSuffix) {
  const body = tpl.replace(/\{(\w+)\}/g, (_, k) => manifest.characters[k] || `{${k}}`);
  return noSuffix ? body : body + ', ' + manifest.styleSuffix;
}

function pixelpipe(args) {
  execFileSync('node', [path.join(__dirname, 'pixelpipe.js'), ...args], { stdio: 'inherit' });
}

function grokGen(entry, rawPath) {
  const refNote = entry.ref
    ? `Read the image at ${abs(entry.ref)}. Use it as the INPUT IMAGE for an image edit — ` +
      `the character in the output must be EXACTLY the character from that image: same face, ` +
      `same facial hair (or lack of it), same hairstyle, same clothing and colors, same belt color, ` +
      `same accessories (nothing added, nothing removed), same proportions, same pixel-art style.\n`
    : '';
  const prompt = refNote +
    `Use your image generation tool to generate ONE image in a SINGLE generation call ` +
    `and save it to exactly this path: ${rawPath}\n` +
    `Do not iterate, composite, animate, or refine — one direct generation, then stop.\n` +
    `Image description: ${expandPrompt(entry.prompt, entry.noSuffix)}`;
  console.log(`[gen] grok → ${rawPath}`);
  execFileSync('grok', ['-p', prompt, '--permission-mode', 'bypassPermissions'],
    { stdio: 'inherit', timeout: 15 * 60 * 1000 });
}

function build(entry) {
  const { fw, fh, frames } = entry.cells;
  const out = abs(entry.outPath);
  if (entry.mode === 'crop') {
    pixelpipe(['crop', abs(entry.src), out, '--rect', entry.rect, '--size', entry.size]);
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
      pixelpipe(['sheet', raw, out, '--frames', frames, '--fw', fw, '--fh', fh, ...extra]);
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
    if (ONLY && !ONLY.includes(entry.id)) continue;
    if (!FORCE && !ONLY && fs.existsSync(abs(entry.outPath))) {
      console.log(`[gen] skip (exists): ${entry.id}`);
      continue;
    }
    try { build(entry); } catch (e) { console.error(`[gen] FAILED ${entry.id}: ${e.message}`); }
  }
}
writeAtlas();
