/* Arcade presentation beats: level banner, VS card, results and ending. */
(function () {
  var CREDITS = [
    "ПАТРИОТ", "ИДРИС — ТРЕНЕР", "ОТАЖОН — ПОМОЩНИК",
    "РЕЖИССУРА — АНДРЕЙ ЛУНЕВ", "ИГРА СОЗДАНА С ЛЮБОВЬЮ",
    "ДЕТИ — НАША ПОБЕДА", "СПАСИБО ЗА ИГРУ"
  ];

  function S(key) {
    if (typeof window !== "undefined" && window.PUI && PUI.S) return PUI.S(key);
    if (typeof window !== "undefined" && window.PData && PData.getString) return PData.getString(key);
    return key;
  }

  function center(ctx, text, y, scale, col) {
    var F = typeof window !== "undefined" && window.PFont;
    if (!F) return;
    F.draw(ctx, text, (480 - F.measure(text, scale || 1)) >> 1, y, scale || 1, col || "#FFFFFF");
  }

  function panel(ctx, x, y, w, h, accent) {
    ctx.fillStyle = "#14121C"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = accent || "#F2C14E";
    ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillRect(x, y, 3, h); ctx.fillRect(x + w - 3, y, 3, h);
  }

  function levelInfo(state) {
    var id = state && (state.levelId || state.level && state.level.id) || "w1l1";
    var n = id.match(/^w(\d)l(\d)$/);
    return {
      id: id,
      world: n ? +n[1] : 1,
      level: n ? +n[2] : 1,
      name: S(id.toUpperCase()),
      worldName: S("W" + (n ? n[1] : 1))
    };
  }

  function drawIntro(ctx, state, tick) {
    var info = levelInfo(state), slam = Math.min(1, tick / 15), x = ((1 - slam) * -220) | 0;
    ctx.fillStyle = "rgba(0,0,0,0.68)"; ctx.fillRect(0, 0, 480, 270);
    ctx.fillStyle = "#8E1D24"; ctx.fillRect(x, 74, 430, 94);
    ctx.fillStyle = "#F2C14E"; ctx.fillRect(x, 78, 430, 4);
    center(ctx, "МИР " + info.world + " — " + info.level, 91, 1, "#FFE9A8");
    center(ctx, info.name.toUpperCase(), 116, 2, "#FFFFFF");
    center(ctx, info.worldName, 148, 1, "#F2C14E");
  }

  function bossId(state) { return state && state.vs && state.vs.id || "B1"; }

  function heroId(state) {
    var h = state && state.heroes && state.heroes[0];
    if (typeof window !== "undefined" && window.PSprites && h) return PSprites.heroId(h);
    return h && (h.heroId || h.archetype) || "idris";
  }

  function drawVs(ctx, state, tick) {
    var hid = heroId(state), bid = bossId(state), hero = null, boss = null, A;
    ctx.fillStyle = "rgba(12,8,22,0.92)"; ctx.fillRect(0, 0, 480, 270);
    ctx.fillStyle = "#2A3B63"; ctx.fillRect(0, 0, 236, 270);
    ctx.fillStyle = "#8E1D24"; ctx.fillRect(244, 0, 236, 270);
    panel(ctx, 22, 24, 170, 190, "#8FD3FF"); panel(ctx, 288, 24, 170, 190, "#FFD65C");
    if (typeof window !== "undefined" && window.PSprites) hero = PSprites.portrait(hid);
    if (hero) ctx.drawImage(hero, 43, 34, 128, 128);
    A = typeof window !== "undefined" && window.PAnim;
    if (A && A.frameAt) boss = A.frameAt(bid.toLowerCase() + "-model", 0);
    if (boss && boss.img) ctx.drawImage(boss.img, boss.sx, boss.sy, boss.sw, boss.sh, 309, 34, 128, 128);
    ctx.fillStyle = "#14121C"; ctx.fillRect(194, 0, 92, 270);
    center(ctx, S("VS"), 108, 2, ((tick / 12) | 0) % 2 ? "#FFFFFF" : "#F2C14E");
    center(ctx, S(hid.toUpperCase()), 184, 1, "#FFFFFF");
    center(ctx, S(bid), 218, 1, "#FFE9A8");
  }

  function score(state) { return ((state && state.score || 0) + (state && state.ippon && state.ippon.score || 0)) | 0; }

  function resultRows(state) {
    var r = state && state.results || {};
    return [
      ["ОЧКИ", score(state)],
      ["ИППОНОВ", r.ippons == null ? (state && state.ippon && state.ippon.total || 0) : r.ippons],
      ["ВРЕМЯ", (((state && state.tick || 0) / 120) | 0) + " С"],
      [S("NO_DAMAGE"), r.noHit ? S("YES") : S("NO")]
    ];
  }

  function drawResults(ctx, state, tick) {
    var rows = resultRows(state), shown = Math.min(rows.length, 1 + ((tick / 42) | 0)), i, rank;
    ctx.fillStyle = "rgba(8,6,16,0.88)"; ctx.fillRect(0, 0, 480, 270);
    panel(ctx, 68, 22, 344, 224, "#F2C14E");
    center(ctx, S("STAGE_CLEAR"), 38, 1, "#F2C14E");
    for (i = 0; i < shown; i++) {
      if (typeof window !== "undefined" && window.PFont) {
        PFont.draw(ctx, rows[i][0], 98, 76 + i * 24, 1, "#FFFFFF");
        PFont.draw(ctx, String(rows[i][1]), 320, 76 + i * 24, 1, "#FFE9A8");
      }
    }
    if (tick >= 210) {
      rank = state && state.results && state.results.rank || "C";
      center(ctx, S("RANK") + " " + rank, 184, 2, rank === "S" ? "#FFD65C" : "#FFFFFF");
    }
    if (tick >= 300) center(ctx, S("PRESS_START"), 224, 1, "#8FD3FF");
  }

  function drawBossDefeat(ctx, state, tick) {
    ctx.fillStyle = "rgba(20,5,10,0.72)"; ctx.fillRect(0, 0, 480, 270);
    center(ctx, tick < 24 ? "..." : S("IPPON"), 94, tick < 24 ? 1 : 3, tick < 24 ? "#FFFFFF" : "#FFD65C");
    if (tick > 70) center(ctx, S("VICTORY"), 170, 2, "#FFFFFF");
  }

  function drawEnding(ctx, tick) {
    var lines = ["ПЯТНИЦА. КЛУБ «ПАТРИОТ».", "МЕДАЛИ ВЕРНУЛИСЬ ДЕТЯМ.", "ПОЯС ВЕРНУЛСЯ В ВИТРИНУ.", "ОНИ СМОГЛИ. МЫ ПРОСТО ДОШЛИ."];
    ctx.fillStyle = "#151328"; ctx.fillRect(0, 0, 480, 270);
    center(ctx, lines[Math.min(lines.length - 1, (tick / 100) | 0)], 116, 1, "#FFE9A8");
    if (tick > 360) center(ctx, "ПАТРИОТ", 150, 2, "#F2C14E");
  }

  function drawCredits(ctx, tick) {
    var i, y;
    ctx.fillStyle = "#0B0A14"; ctx.fillRect(0, 0, 480, 270);
    for (i = 0; i < CREDITS.length; i++) {
      y = 280 + i * 42 - ((tick * 0.55) | 0);
      if (y > -20 && y < 280) center(ctx, CREDITS[i], y, i === 0 ? 2 : 1, i === 0 ? "#F2C14E" : "#FFFFFF");
    }
  }

  function drawPostCredit(ctx, tick) {
    ctx.fillStyle = "#1B1830"; ctx.fillRect(0, 0, 480, 270);
    center(ctx, "ВТОРНИК. ШЕСТЬ УТРА.", 54, 1, "#8FD3FF");
    center(ctx, "ЗАХВАТ.", 108, 2, "#FFFFFF");
    if (tick > 80) center(ctx, "УРА! ПРИРОЖДЁННЫЙ.", 150, 1, "#F2C14E");
    if (tick > 150) center(ctx, S("RETURNING"), 202, 1, "#FFFFFF");
  }

  var api = { levelInfo: levelInfo, resultRows: resultRows, drawIntro: drawIntro, drawVs: drawVs,
    drawResults: drawResults, drawBossDefeat: drawBossDefeat, drawEnding: drawEnding,
    drawCredits: drawCredits, drawPostCredit: drawPostCredit };
  if (typeof window !== "undefined") window.PPresentation = api;
  if (typeof global !== "undefined") global.PPresentation = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
