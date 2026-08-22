const assert = require('assert');
global.PDressing = require('../js/render.dressing.js');
const PLayers = require('../js/render.layers.js');

function trace(world, tick, reducedMotion, levelId) {
  const ops = [];
  const ctx = {
    fillStyle: '', globalAlpha: 1, imageSmoothingEnabled: false,
    fillRect(x, y, w, h) { ops.push(['f', this.fillStyle, x, y, w, h]); },
    drawImage() { ops.push(['i'].concat(Array.prototype.slice.call(arguments, 1))); }
  };
  PLayers.draw(ctx, { x: 0, bgX: 0 }, world, null, { tick, reducedMotion, levelId });
  return JSON.stringify(ops);
}

assert.notStrictEqual(trace(3, 0, false, 'w3l1'), trace(3, 37, false, 'w3l1'), 'train wind moves');
assert.notStrictEqual(trace(4, 0, false, 'w4l1'), trace(4, 37, false, 'w4l1'), 'port rain moves');
assert.notStrictEqual(trace(5, 0, false, 'w5l1'), trace(5, 37, false, 'w5l1'), 'arena lights and crowd move');
assert.strictEqual(trace(3, 0, true, 'w3l1'), trace(3, 37, true, 'w3l1'), 'reduced motion freezes wind');
assert.strictEqual(trace(4, 0, true, 'w4l1'), trace(4, 37, true, 'w4l1'), 'reduced motion freezes rain');
assert.strictEqual(trace(5, 0, true, 'w5l1'), trace(5, 37, true, 'w5l1'), 'reduced motion freezes lights and crowd');

const identities = [];
for (let world = 1; world <= 5; world++) for (let level = 1; level <= 3; level++) {
  identities.push(trace(world, 0, true, `w${world}l${level}`));
}
assert.strictEqual(new Set(identities).size, 15, 'all fifteen levels publish a distinct deterministic dressing trace');

console.log('ok deterministic motion, reduced-motion freeze, and 15 distinct level dressings');
delete global.PDressing;
