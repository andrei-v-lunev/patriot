/* Sky / parallax mountains / floor. 6 layers: 0, 0.25, 0.55, 1, 1.25, 1. */
(function () {
  var W = 480;
  var H = 270;
  var FLOOR_BASE = 246;
  var baked = {};
  var palettes = {
    1: { sky: ["#2A3B63", "#4C5F8C", "#B9805E", "#F0B87C"], far: "#414B70", mid: "#6E708C", snow: "#DCE4F2", floor: "#C8A46A", floorDk: "#7A8B52", floorInk: "#4E4239", fore: "#3B3B47" },
    2: { sky: ["#3FC4D6", "#7EDCE4", "#CFF2EE", "#F7DCA6"], far: "#1B6570", mid: "#2E9EA8", snow: "#F4E3C2", floor: "#E0B573", floorDk: "#B07F47", floorInk: "#7A5229", fore: "#D2543F" },
    3: { sky: ["#0E1130", "#1E2450", "#232A55", "#2E3866"], far: "#16203A", mid: "#2E3866", snow: "#8E9CC8", floor: "#454B5C", floorDk: "#262A38", floorInk: "#0E1130", fore: "#16203A" },
    4: { sky: ["#2A3344", "#4A5568", "#6A7384", "#8A92A0"], far: "#3A4454", mid: "#5A6574", snow: "#C8D0D8", floor: "#6C5A48", floorDk: "#4A3C30", floorInk: "#2A221C", fore: "#2A3344" },
    5: { sky: ["#120818", "#2A1038", "#4A1858", "#1A0A28"], far: "#3A1050", mid: "#6A2080", snow: "#F2C14E", floor: "#241E33", floorDk: "#14121C", floorInk: "#F2C14E", fore: "#8E1D24" }
  };

  function pal(world) {
    return palettes[world] || palettes[1];
  }

  function fillSky(ctx, p) {
    var i, y0, y1;
    for (i = 0; i < 4; i++) {
      y0 = (i * 42) | 0;
      y1 = ((i + 1) * 42) | 0;
      ctx.fillStyle = p.sky[i];
      ctx.fillRect(0, y0, W, y1 - y0 + 8);
    }
    ctx.fillStyle = p.sky[3];
    ctx.fillRect(0, 160, W, 40);
  }

  function bakeSky(world) {
    if (baked[world]) return baked[world];
    if (typeof document === "undefined" || !document.createElement) return null;
    var c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    var g = c.getContext("2d");
    if (!g) return null;
    g.imageSmoothingEnabled = false;
    fillSky(g, pal(world));
    baked[world] = c;
    return c;
  }

  function hash(n) {
    n = (n ^ 0x5bd1e995) >>> 0;
    n = Math.imul(n, 2246822519) >>> 0;
    return (n ^ (n >>> 15)) >>> 0;
  }

  function ridge(x, seed, amp, base) {
    var a = hash((x >> 4) + seed * 17);
    var b = hash(((x >> 4) + 1) + seed * 17);
    var t = (x & 15) / 15;
    var h = (a % 100) / 100 * (1 - t) + (b % 100) / 100 * t;
    return base - (h * amp) | 0;
  }

  function drawRidge(ctx, camx, factor, color, snow, seed, amp, base) {
    var x, y, px;
    ctx.fillStyle = color;
    for (x = 0; x < W; x++) {
      px = x + ((camx * factor) | 0);
      y = ridge(px, seed, amp, base);
      ctx.fillRect(x, y, 1, H - y);
    }
    if (snow) {
      ctx.fillStyle = snow;
      for (x = 0; x < W; x++) {
        px = x + ((camx * factor) | 0);
        y = ridge(px, seed, amp, base);
        if ((hash(px + seed) & 3) === 0) ctx.fillRect(x, y, 1, 2);
      }
    }
  }

  function drawFloor(ctx, camx, p) {
    var y, x, stripe;
    ctx.fillStyle = p.floorDk;
    ctx.fillRect(0, 150, W, H - 150);
    ctx.fillStyle = p.floor;
    ctx.fillRect(0, 186, W, 60);
    ctx.fillStyle = p.floorInk;
    for (y = 186; y < 246; y += 6) {
      ctx.fillRect(0, y, W, 1);
    }
    stripe = ((camx) | 0) % 16;
    ctx.fillStyle = p.floorDk;
    for (x = -stripe; x < W; x += 16) ctx.fillRect(x, 186, 1, 60);
    ctx.fillStyle = p.floorInk;
    ctx.fillRect(0, 246, W, H - 246);
  }

  function drawFore(ctx, camx, p) {
    var x, px, h;
    ctx.fillStyle = p.fore;
    for (x = 0; x < W; x += 48) {
      px = x - ((camx * 1.25) | 0) % 96;
      h = 20 + (hash(x + 9) % 18);
      ctx.fillRect(px, H - h - 8, 10, h);
    }
  }

  function drawLight(ctx, world) {
    ctx.fillStyle = world === 3 || world === 5 ? "rgba(10,8,24,0.18)" : "rgba(255,220,160,0.06)";
    ctx.fillRect(0, 0, W, H);
  }

  function draw(ctx, cam, world) {
    world = world || 1;
    var p = pal(world);
    var camx = (cam && cam.x) || 0;
    var sky = bakeSky(world);
    if (sky) ctx.drawImage(sky, 0, 0);
    else fillSky(ctx, p);
    drawRidge(ctx, camx, 0.25, p.far, p.snow, 3, 50, 130);
    drawRidge(ctx, camx, 0.55, p.mid, null, 7, 36, 150);
    drawFloor(ctx, camx, p);
    drawFore(ctx, camx, p);
    drawLight(ctx, world);
  }

  function floorY(d) {
    return FLOOR_BASE - (d || 0);
  }

  var api = { draw: draw, floorY: floorY, FLOOR_BASE: FLOOR_BASE, pal: pal, bakeSky: bakeSky };
  if (typeof window !== "undefined") window.PLayers = api;
  if (typeof global !== "undefined") global.PLayers = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
