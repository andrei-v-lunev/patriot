/* HUD: hearts, score, meter, world name. Bitmap font only. */
(function () {
  function S(key) {
    if (window.PData && PData.getString) return PData.getString(key);
    if (window.PDataRaw && PDataRaw.strings && PDataRaw.strings[key] != null) return PDataRaw.strings[key];
    return key;
  }

  function list(x) {
    if (!x) return [];
    return x.all || x;
  }

  function text(ctx, str, x, y, face, color) {
    if (!window.PFont) return 0;
    var scale = face === "font_10x14" || face === 2 ? 2 : 1;
    return PFont.draw(ctx, str, x, y, scale, color || "#FFFFFF");
  }

  function heart(ctx, x, y, on) {
    ctx.fillStyle = on ? "#E03B3B" : "#3D3455";
    ctx.fillRect(x + 1, y, 2, 1);
    ctx.fillRect(x + 5, y, 2, 1);
    ctx.fillRect(x, y + 1, 8, 2);
    ctx.fillRect(x + 1, y + 3, 6, 2);
    ctx.fillRect(x + 3, y + 5, 2, 2);
  }

  function bar(ctx, x, y, w, h, t, col, bg) {
    ctx.fillStyle = bg || "#241E33";
    ctx.fillRect(x, y, w, h);
    var f = t < 0 ? 0 : t > 1 ? 1 : t;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, (w * f) | 0, h);
    ctx.fillStyle = "#14121C";
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
  }

  function playing() {
    var s = window.PScreens && PScreens.get ? PScreens.get() : "PLAY";
    return s === "PLAY" || s === "PAUSE" || s === "VS";
  }

  function hud(ctx, state) {
    if (!ctx || !playing()) return;
    var hs = list(state && state.heroes);
    var h0 = hs[0];
    var lives = (h0 && (h0.lives != null ? h0.lives : 3)) || 3;
    var hp = h0 ? h0.hp : 0;
    var maxHp = (h0 && h0.maxHp) || 120;
    var meter = (h0 && (h0.meter != null ? h0.meter : h0.special)) || 0;
    var i;
    for (i = 0; i < 3; i++) heart(ctx, 8 + i * 10, 8, i < lives);
    bar(ctx, 40, 8, 116, 8, maxHp ? hp / maxHp : 0, "#5FD16A", "#8E1D24");
    var name = "ИДРИС";
    if (h0 && window.PSprites) {
      name = PSprites.heroId(h0) === "otajon" ? S("OTAJON") : S("IDRIS");
    } else if (h0 && h0.name) name = h0.name;
    text(ctx, name + " x" + lives, 40, 18, 1, "#FFE9A8");
    bar(ctx, 40, 28, 116, 4, (meter > 1 ? meter / 100 : meter), "#F2C14E", "#241E33");

    var score = (state && (state.score != null ? state.score : 0)) | 0;
    var sc = S("SCORE") + " " + score;
    var sw = window.PFont ? PFont.measure(sc, 1) : sc.length * 6;
    text(ctx, sc, (480 - sw) >> 1, 6, 1, "#F2C14E");

    var world = "";
    if (state && state.level) {
      world = state.level.worldName || "";
      if (!world && state.level.world) world = S("W" + state.level.world);
      if (!world && state.level.id) world = S((state.level.id + "").toUpperCase());
    }
    if (!world) world = S("W1");
    var ww = window.PFont ? PFont.measure(world, 1) : world.length * 6;
    text(ctx, world, 472 - ww, 6, 1, "#FFFFFF");

    if (hs[1] && hs[1].alive !== false) {
      var h1 = hs[1];
      bar(ctx, 324, 8, 116, 8, (h1.maxHp ? h1.hp / h1.maxHp : 0), "#5FD16A", "#8E1D24");
      var n2 = S("OTAJON");
      var w2 = window.PFont ? PFont.measure(n2, 1) : 36;
      text(ctx, n2, 472 - w2, 18, 1, "#FFE9A8");
    }
  }

  var api = { text: text, hud: hud, S: S, heart: heart, bar: bar };
  if (typeof window !== "undefined") window.PUI = api;
  if (typeof global !== "undefined") global.PUI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
