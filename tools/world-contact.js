#!/usr/bin/env node
// Compose the five painted world layers at camera x=0 for a persistent visual gate.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const ROOT = path.join(__dirname, '..');

function read(file) { return PNG.sync.read(fs.readFileSync(path.join(ROOT, file))); }
function blit(dst, src, dx, dy, sw) {
  sw = Math.min(sw == null ? src.width : sw, src.width);
  for (let y = 0; y < src.height; y++) for (let x = 0; x < sw; x++) {
    const tx = dx + x, ty = dy + y;
    if (tx < 0 || ty < 0 || tx >= dst.width || ty >= dst.height) continue;
    const si = (y * src.width + x) * 4, di = (ty * dst.width + tx) * 4;
    dst.data[di] = src.data[si]; dst.data[di + 1] = src.data[si + 1];
    dst.data[di + 2] = src.data[si + 2]; dst.data[di + 3] = src.data[si + 3];
  }
}

const out = new PNG({ width: 480 * 5, height: 270 });
for (let world = 1; world <= 5; world++) {
  const x = (world - 1) * 480;
  blit(out, read(`assets/bg/w${world}-sky.png`), x, 0, 480);
  blit(out, read(`assets/bg/w${world}-far.png`), x, -12, 480);
  blit(out, read(`assets/bg/w${world}-mid.png`), x, -30, 480);
  blit(out, read(`assets/bg/w${world}-ground.png`), x, 150, 480);
}
const file = path.join(ROOT, 'art/gate/worlds-contact.png');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, PNG.sync.write(out));
console.log(file);
