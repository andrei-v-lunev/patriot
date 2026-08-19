/* Cosmetic particles + screenshake. Nondeterministic clock RNG. */
(function () {
  var parts = [];
  var CAP = 96;
  var rng = null;

  /* hit-spark strip: 32x32 x 5 frames, 20fps (3 ticks per frame at 60fps) */
  var SPARK_FW = 32;
  var SPARK_FH = 32;
  var SPARK_FRAMES = 5;
  var SPARK_TPF = 3;
  var spark = { img: null, ok: false, tried: false };

  function loadSparkImg(path) {
    spark.img = new Image();
    spark.img.onload = function () { spark.ok = true; };
    spark.img.src = path;
  }

  function ensureSpark() {
    if (spark.tried || typeof Image === "undefined") return;
    spark.tried = true;
    if (typeof fetch === "function") {
      fetch("assets/atlas/atlas.json").then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (atlas) {
        var e = atlas && (atlas["fx-hit-spark"] || (atlas.entries && atlas.entries["fx-hit-spark"]));
        loadSparkImg((e && e.path) || "assets/fx/hit-spark.png");
      }).catch(function () {
        loadSparkImg("assets/fx/hit-spark.png");
      });
    } else {
      loadSparkImg("assets/fx/hit-spark.png");
    }
  }

  /* Returns true if a sprite frame was drawn for this spark particle. */
  function drawSparkSprite(ctx, p, sx, sy) {
    var fr = null;
    if (typeof window !== "undefined" && window.PAnim && PAnim.frameOnce) {
      try { fr = PAnim.frameOnce("fx-hit-spark", p.t / 60); } catch (e) { fr = null; }
      if (fr && fr.img) {
        ctx.drawImage(fr.img, fr.sx || 0, fr.sy || 0, fr.sw || SPARK_FW, fr.sh || SPARK_FH,
          sx - ((fr.sw || SPARK_FW) >> 1), sy - ((fr.sh || SPARK_FH) >> 1), fr.sw || SPARK_FW, fr.sh || SPARK_FH);
        return true;
      }
    }
    if (spark.ok && spark.img.naturalWidth > 0) {
      var fi = (p.t / SPARK_TPF) | 0;
      if (fi >= SPARK_FRAMES) return true; /* animation done: draw nothing */
      ctx.drawImage(spark.img, fi * SPARK_FW, 0, SPARK_FW, SPARK_FH,
        sx - (SPARK_FW >> 1), sy - (SPARK_FH >> 1), SPARK_FW, SPARK_FH);
      return true;
    }
    return false;
  }

  function rnd() {
    if (!rng && window.PRng) rng = PRng.create((Date.now && Date.now()) || 1);
    return rng ? rng.next() : Math.random();
  }

  function spawn(kind, x, z, d) {
    if (parts.length >= CAP) parts.shift();
    if (kind === "spark") ensureSpark();
    parts.push({
      kind: kind || "spark",
      x: x,
      z: z,
      d: d || 0,
      vx: (rnd() - 0.5) * 80,
      vz: 40 + rnd() * 80,
      t: 0,
      life: 18 + (rnd() * 12) | 0,
      col: kind === "dust" ? "#C8A46A" : "#FFF3D6"
    });
  }

  function step() {
    var i, p;
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i];
      p.t++;
      p.x += p.vx / 60;
      p.z += p.vz / 60;
      p.vz -= 40;
      if (p.t >= p.life) parts.splice(i, 1);
    }
  }

  function draw(ctx, cam) {
    var i, p, sx, sy, floorY, camx;
    camx = (cam && cam.x) || 0;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      floorY = (window.PLayers && PLayers.floorY) ? PLayers.floorY(p.d) : 246 - p.d;
      sx = (p.x - camx) | 0;
      sy = (floorY - p.z) | 0;
      if (p.kind === "spark" && drawSparkSprite(ctx, p, sx, sy)) continue;
      ctx.fillStyle = p.col;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  function ingest(state) {
    if (!state) return;
    var list = state.fx ? (state.fx.all || state.fx) : null;
    var i, f;
    if (list) {
      for (i = 0; i < list.length; i++) {
        f = list[i];
        if (f && f.alive && f.kind) spawn(f.kind, f.x, f.z, f.d);
      }
    }
    var ev = state.events;
    if (ev && ev.length) {
      for (i = 0; i < ev.length; i++) {
        f = ev[i];
        if (!f) continue;
        if (f.name === "hit_light" || f.name === "throw_slam" || f.name === "ippon") {
          spawn("spark", f.x || 240, f.z || 40, f.d || 20);
        }
      }
    }
  }

  function shake(cam, state) {
    if (!cam) return;
    var s = 0;
    if (state && state.shake) s = state.shake;
    if (s) {
      cam.shakeX = ((rnd() - 0.5) * s) | 0;
      cam.shakeZ = ((rnd() - 0.5) * s) | 0;
    } else {
      cam.shakeX = cam.shakeX ? (cam.shakeX * 0.86) : 0;
      cam.shakeZ = cam.shakeZ ? (cam.shakeZ * 0.86) : 0;
    }
  }

  var api = { spawn: spawn, step: step, draw: draw, ingest: ingest, shake: shake, particles: parts };
  if (typeof window !== "undefined") window.PFx = api;
  if (typeof global !== "undefined") global.PFx = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
