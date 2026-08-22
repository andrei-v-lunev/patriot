/* Arcade title + character select rendering. Bitmap font only. */
(function () {
  function S(key) {
    if (window.PUI && PUI.S) return PUI.S(key);
    if (window.PData && PData.getString) return PData.getString(key);
    if (window.PDataRaw && PDataRaw.strings && PDataRaw.strings[key] != null) return PDataRaw.strings[key];
    return key;
  }

  var HERO_IDS = ["idris", "otajon"];
  var HERO_KEYS = ["IDRIS", "OTAJON"];
  var crest = null;
  var crestTried = false;

  function crestImage() {
    if (!crestTried && typeof Image !== "undefined") {
      crestTried = true;
      crest = new Image();
      crest.src = "assets/ui/club-crest.png";
    }
    return crest && crest.complete && crest.naturalWidth ? crest : null;
  }

  function drawCrest(ctx, x, y, size) {
    var img = crestImage();
    if (!ctx || !img) return false;
    var prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x | 0, y | 0, size | 0, size | 0);
    ctx.imageSmoothingEnabled = prevSmooth;
    return true;
  }

  function measure(str, scale) {
    return window.PFont ? PFont.measure(str, scale) : String(str).length * 6 * (scale || 1);
  }

  function center(ctx, str, y, scale, col) {
    if (!window.PFont) return;
    var w = PFont.measure(str, scale || 1);
    PFont.draw(ctx, str, (480 - w) >> 1, y, scale || 1, col || "#FFFFFF");
  }

  function shadowCenter(ctx, str, y, scale, col, shadowCol, off) {
    if (!window.PFont) return;
    var w = PFont.measure(str, scale || 1);
    var x = (480 - w) >> 1;
    PFont.draw(ctx, str, x + (off || 1), y + (off || 1), scale || 1, shadowCol || "#14121C");
    PFont.draw(ctx, str, x, y, scale || 1, col || "#FFFFFF");
  }

  /* Dark panel + vignette bands over the running scene. */
  function backdrop(ctx) {
    ctx.fillStyle = "rgba(10,8,20,0.72)";
    ctx.fillRect(0, 0, 480, 270);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, 480, 26);
    ctx.fillRect(0, 244, 480, 26);
    ctx.fillStyle = "#F2C14E";
    ctx.fillRect(0, 26, 480, 1);
    ctx.fillRect(0, 243, 480, 1);
  }

  function drawTitle(ctx, tick, state) {
    if (!ctx || !window.PFont) return;
    var t = tick || 0;
    backdrop(ctx);

    /* Club crest + logotype. The text-only composition remains the load fallback. */
    var branded = drawCrest(ctx, 204, 34, 72);
    var title = S("TITLE");
    var scale = branded ? 3 : 4;
    var tw = PFont.measure(title, scale);
    var tx = (480 - tw) >> 1;
    var ty = (branded ? 112 : 66) + Math.round(Math.sin(t * 0.05) * 2);

    /* Plate behind logotype. */
    var padX = 14, padY = 10;
    ctx.fillStyle = "rgba(20,18,28,0.85)";
    ctx.fillRect(tx - padX, ty - padY, tw + padX * 2, 7 * scale + padY * 2);
    ctx.fillStyle = "#F2C14E";
    ctx.fillRect(tx - padX, ty - padY, tw + padX * 2, 1);
    ctx.fillRect(tx - padX, ty + 7 * scale + padY - 1, tw + padX * 2, 1);

    PFont.draw(ctx, title, tx + 2, ty + 2, scale, "#5A3A10");
    PFont.draw(ctx, title, tx, ty, scale, "#F2C14E");
    /* Amber top-glint line inside glyph band. */
    PFont.draw(ctx, title, tx, ty - 1, scale, "rgba(255,233,168,0.35)");

    /* Subtitle. */
    shadowCenter(ctx, "ДЗЮДО-АРКАДА", branded ? 151 : 116, 1, "#FFE9A8", "#14121C", 1);

    /* Blinking press-start, ~30-tick period. */
    if (((t / 30) | 0) % 2 === 0) {
      shadowCenter(ctx, S("PRESS_START"), branded ? 184 : 170, 2, "#FFFFFF", "#14121C", 2);
    }

    /* Credit line. */
    center(ctx, "КЛУБ «ПАТРИОТ» · ДАГЕСТАН", 252, 1, "#8A7FA6");
  }

  function drawChar(ctx, tick, state, cursor, playerN, p1Id, p2Id) {
    if (!ctx || !window.PFont) return;
    var t = tick || 0;
    var cur = cursor | 0;
    ctx.fillStyle = "rgba(10,8,20,0.72)";
    ctx.fillRect(0, 0, 480, 270);

    if (playerN) {
      shadowCenter(ctx, "ИГРОК " + playerN, 16, 1, playerN === 1 ? "#F2C14E" : "#8FD3FF", "#14121C", 1);
      shadowCenter(ctx, S("CHOOSE_FIGHTER"), 32, 1, "#FFFFFF", "#14121C", 1);
    } else shadowCenter(ctx, S("CHOOSE_FIGHTER"), 24, 2, "#F2C14E", "#14121C", 2);

    var prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    var i, id, img, x, sel, edge;
    for (i = 0; i < 2; i++) {
      id = HERO_IDS[i];
      sel = i === cur;
      x = 80 + i * 200;
      /* Panel frame: pulsing gold when selected. */
      edge = sel ? (((t / 15) | 0) % 2 === 0 ? "#F2C14E" : "#FFE9A8") : "#3D3455";
      ctx.fillStyle = edge;
      ctx.fillRect(x - 2, 58, 124, 144);
      ctx.fillStyle = "#14121C";
      ctx.fillRect(x, 60, 120, 140);
      ctx.fillStyle = "#241E33";
      ctx.fillRect(x + 2, 62, 116, 96);

      img = window.PSprites && PSprites.portrait ? PSprites.portrait(id) : null;
      if (img) ctx.drawImage(img, x + 12, 60, 96, 96);
      else {
        ctx.fillStyle = id === "otajon" ? "#3A6EA5" : "#F4F0E6";
        ctx.fillRect(x + 30, 72, 60, 80);
      }

      /* Name plate. */
      ctx.fillStyle = sel ? "#F2C14E" : "#241E33";
      ctx.fillRect(x + 8, 166, 104, 14);
      var nm = S(HERO_KEYS[i]);
      var nw = PFont.measure(nm, 1);
      PFont.draw(ctx, nm, x + ((120 - nw) >> 1), 170, 1, sel ? "#14121C" : "#FFFFFF");

      /* Cursor chevrons under the selected panel. */
      if (sel) {
        var cw = PFont.measure("> " + nm + " <", 1);
        PFont.draw(ctx, "> " + nm + " <", x + ((120 - cw) >> 1), 188, 1, "#F2C14E");
      }
    }
    ctx.imageSmoothingEnabled = prevSmooth;

    if (playerN === 2) {
      var p1 = p1Id === "otajon" ? S("OTAJON") : S("IDRIS");
      var p2 = p2Id === "idris" ? S("IDRIS") : S("OTAJON");
      center(ctx, "P1 " + p1 + " · P2 " + p2, 218, 1, "#8FD3FF");
    }
    if (((t / 30) | 0) % 2 === 0) center(ctx, playerN === 1 ? "ПОДТВЕРДИ P1" : playerN === 2 ? "ПОДТВЕРДИ P2" : S("PRESS_START_FIGHT"), 240, 1, "#FFE9A8");
  }

  var api = { drawTitle: drawTitle, drawChar: drawChar, drawCrest: drawCrest };
  if (typeof window !== "undefined") window.PUITitle = api;
  if (typeof global !== "undefined") global.PUITitle = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
