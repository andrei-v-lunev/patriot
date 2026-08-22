#!/usr/bin/env node
// Deterministic 16px floor tiles + 96px perspective ground bands for W1-W5.
// Background master plates remain creative inputs; this file builds only the
// repeat-critical play surface so seams, collision alignment, and palette stay exact.

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..');
const worlds = {
  1: { base: '#B48755', dark: '#6C4A32', light: '#D2AD73', ink: '#403026', accent: '#667044', motif: 'dirt' },
  2: { base: '#C99A58', dark: '#875A32', light: '#E4C078', ink: '#56351F', accent: '#2E8F91', motif: 'cobble' },
  3: { base: '#454C5D', dark: '#252A36', light: '#737D91', ink: '#141826', accent: '#B78342', motif: 'steel' },
  4: { base: '#59616A', dark: '#333A42', light: '#84909A', ink: '#20262C', accent: '#B26B2E', motif: 'dock' },
  5: { base: '#5B263D', dark: '#291426', light: '#8E3A52', ink: '#140B16', accent: '#E4B943', motif: 'mat' }
};

function rgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
}

function put(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  const c = rgb(color);
  png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = 255;
}

function rect(png, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(png, xx, yy, color);
}

function hash(n) {
  n = (n ^ 0x5bd1e995) >>> 0;
  n = Math.imul(n, 2246822519) >>> 0;
  return (n ^ (n >>> 15)) >>> 0;
}

function tile(png, ox, oy, p, world, band, variant) {
  rect(png, ox, oy, 16, 16, p.base);
  const seed = world * 1000 + band * 97 + variant * 31;
  if (p.motif === 'dirt') {
    for (let i = 0; i < 8; i++) {
      const x = 2 + hash(seed + i) % 12, y = 2 + hash(seed + i * 7) % 12;
      put(png, ox + x, oy + y, i % 3 ? p.dark : p.light);
      if (i % 3 === 0) put(png, ox + x + 1, oy + y, p.accent);
    }
  } else if (p.motif === 'cobble') {
    for (let y = 1; y < 16; y += 5) rect(png, ox, oy + y, 16, 1, p.dark);
    for (let y = 1; y < 16; y += 5) {
      const shift = ((y / 5 + variant) & 1) ? 3 : 8;
      for (let x = shift; x < 16; x += 8) rect(png, ox + x, oy + y - 4, 1, 4, p.dark);
    }
    put(png, ox + 3 + variant * 4, oy + 3, p.light);
  } else if (p.motif === 'steel') {
    rect(png, ox, oy + 7, 16, 1, p.ink);
    rect(png, ox + 7, oy, 1, 16, p.dark);
    put(png, ox + 2, oy + 2, p.light); put(png, ox + 13, oy + 13, p.accent);
  } else if (p.motif === 'dock') {
    rect(png, ox, oy + 5, 16, 1, p.dark); rect(png, ox, oy + 11, 16, 1, p.ink);
    rect(png, ox + 2 + variant * 4, oy + 2, 6, 1, p.light);
    put(png, ox + 13, oy + 3 + variant * 4, p.accent);
  } else {
    rect(png, ox, oy, 16, 1, p.accent); rect(png, ox, oy + 15, 16, 1, p.ink);
    const cx = 8, cy = 8;
    for (let d = 0; d < 4; d++) {
      put(png, ox + cx - d, oy + cy - (3 - d), p.accent);
      put(png, ox + cx + d, oy + cy - (3 - d), p.accent);
      put(png, ox + cx - d, oy + cy + (3 - d), p.accent);
      put(png, ox + cx + d, oy + cy + (3 - d), p.accent);
    }
  }
  /* A tiny authored registration mark makes each of the three variants
     mechanically distinct without changing collision or tile boundaries. */
  put(png, ox + 3 + variant * 4, oy + 13 - (band & 1), variant === 1 ? p.light : p.accent);
  rect(png, ox, oy + 15, 16, 1, p.dark);
}

function makeTiles(world, p) {
  const png = new PNG({ width: 48, height: 64 });
  for (let band = 0; band < 4; band++) for (let variant = 0; variant < 3; variant++) {
    tile(png, variant * 16, band * 16, p, world, band, variant);
  }
  return png;
}

function sample(src, sx, sy) {
  const i = (sy * src.width + sx) * 4;
  return [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]];
}

function blitScaled(dst, src, sx, sy, sw, sh, dx, dy, dw, dh) {
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const c = sample(src, sx + Math.min(sw - 1, Math.floor(x * sw / dw)), sy + Math.min(sh - 1, Math.floor(y * sh / dh)));
    const i = ((dy + y) * dst.width + dx + x) * 4;
    dst.data[i] = c[0]; dst.data[i + 1] = c[1]; dst.data[i + 2] = c[2]; dst.data[i + 3] = c[3];
  }
}

function makeGround(tiles) {
  const png = new PNG({ width: 960, height: 96 });
  const heights = [12, 18, 28, 38];
  const widths = [10, 14, 20, 28];
  let y = 0;
  for (let band = 0; band < 4; band++) {
    const h = heights[band], w = widths[band];
    for (let x = 0, cell = 0; x < png.width; x += w, cell++) {
      const variant = cell % 3;
      blitScaled(png, tiles, variant * 16, band * 16, 16, 16, x, y, Math.min(w, png.width - x), h);
    }
    y += h;
  }
  /* The renderer repeats the full 960px strip. Mirror the first two columns
     into the opposite edge so the wrap is pixel-exact even when perspective
     cell widths do not divide 960 evenly. */
  for (let yy = 0; yy < png.height; yy++) for (let edge = 0; edge < 2; edge++) {
    const si = (yy * png.width + edge) * 4;
    const di = (yy * png.width + (png.width - 1 - edge)) * 4;
    png.data[di] = png.data[si]; png.data[di + 1] = png.data[si + 1];
    png.data[di + 2] = png.data[si + 2]; png.data[di + 3] = png.data[si + 3];
  }
  return png;
}

function writePng(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

const want = process.argv.indexOf('--world');
const ids = want >= 0 ? [Number(process.argv[want + 1])] : [1, 2, 3, 4, 5];
for (const world of ids) {
  const p = worlds[world];
  if (!p) throw new Error(`unknown world ${world}`);
  const tiles = makeTiles(world, p);
  writePng(path.join(ROOT, `assets/tiles/w${world}-floor.png`), tiles);
  /* W1 keeps its authored imagegen dirt strip; its tileset is supplemental.
     W2-W5 use deterministic strips derived from these tiles. */
  if (world !== 1) writePng(path.join(ROOT, `assets/bg/w${world}-ground.png`), makeGround(tiles));
  console.log(`built W${world} floor tiles${world === 1 ? '' : ' and ground band'}`);
}
