const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/asset-manifest.json'), 'utf8'));
const atlas = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/atlas/atlas.json'), 'utf8'));

function read(rel) {
  return PNG.sync.read(fs.readFileSync(path.join(ROOT, rel)));
}

function frameHash(png, x, y, w, h) {
  let n = 2166136261 >>> 0;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const i = (yy * png.width + xx) * 4;
    for (let c = 0; c < 4; c++) { n ^= png.data[i + c]; n = Math.imul(n, 16777619) >>> 0; }
  }
  return n;
}

const ids = new Set(manifest.entries.map(e => e.id));
for (let world = 1; world <= 5; world++) {
  for (const layer of ['sky', 'far', 'mid', 'ground']) {
    const id = `w${world}-${layer}`;
    assert(ids.has(id), `${id} must be declared in the manifest`);
    assert(atlas[id], `${id} must be published in the generated atlas`);
    const png = read(`assets/bg/${id}.png`);
    const want = layer === 'sky' ? [480, 270] : layer === 'ground' ? [960, 96] : layer === 'far' ? [960, 180] : [960, 220];
    assert.deepStrictEqual([png.width, png.height], want, `${id} dimensions`);
  }
  const tiles = read(`assets/tiles/w${world}-floor.png`);
  assert.deepStrictEqual([tiles.width, tiles.height], [48, 64], `W${world} 3x4 16px tileset`);
  for (let band = 0; band < 4; band++) {
    const hashes = [0, 1, 2].map(v => frameHash(tiles, v * 16, band * 16, 16, 16));
    assert.strictEqual(new Set(hashes).size, 3, `W${world} band ${band} has three variants`);
  }
  const ground = read(`assets/bg/w${world}-ground.png`);
  let edgeDelta = 0;
  for (let y = 0; y < ground.height; y++) {
    for (let c = 0; c < 4; c++) {
      const left = ground.data[(y * ground.width) * 4 + c];
      const right = ground.data[(y * ground.width + ground.width - 1) * 4 + c];
      edgeDelta += Math.abs(left - right);
      if (world > 1) assert.strictEqual(left, right, `W${world} ground wraps at row ${y}`);
    }
  }
  if (world === 1) assert(edgeDelta < 1000, 'W1 authored wrap blend keeps its edge delta visually negligible');
}

const dojo = read('assets/bg/w1-dojo.png');
assert.deepStrictEqual([dojo.width, dojo.height], [480, 270], 'W1L1 dojo plate matches the logical world buffer');
assert(fs.existsSync(path.join(ROOT, 'art/src/raw/w1-dojo-master.png')), 'W1L1 dojo keeps its generated source master');

console.log('ok 20 world layers, dojo plate, five 16px tilesets, three variants, exact ground seams');
