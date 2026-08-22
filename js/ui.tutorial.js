/* Code-native chalkboards, target circles and contextual onboarding hints. */
(function () {
  function font() { return (typeof window !== "undefined" && window.PFont) || null; }
  function settings() { return (typeof window !== "undefined" && window.PSettings && window.PSettings.get) ? window.PSettings.get() : null; }
  function text(ctx, s, x, y, scale, color) {
    var f = font(); if (f && f.draw) f.draw(ctx, s, x, y, scale || 1, color || "#F4F0E6");
  }
  function board(ctx, label, x, y, w) {
    ctx.fillStyle = "#342F2A"; ctx.fillRect(x, y, w, 25);
    ctx.strokeStyle = "#C8A46A"; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 24);
    text(ctx, label, x + 6, y + 8, 1, "#F4F0E6");
  }
  function drawWorld(ctx, state, cam) {
    var t = state && state.tutorial, ox = (cam && cam.x) || 0, x;
    if (!t || t.done || state.segIndex !== 0) return;
    if (t.phase === 1 || t.phase === 2) board(ctx, "ЗАХВАТ", (330 - ox) | 0, 112, 84);
    if (t.phase === 3) {
      board(ctx, t.forward ? "БРОСЬ НАЗАД" : "БРОСЬ ВПЕРЁД", (300 - ox) | 0, 112, 168);
      ctx.strokeStyle = "#F4F0E6"; ctx.lineWidth = 2;
      for (x = 180; x <= 360; x += 180) { ctx.beginPath(); ctx.ellipse((x - ox) | 0, 218, 34, 9, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    if (t.phase === 4) board(ctx, "ПАДАЙ ПРАВИЛЬНО", (286 - ox) | 0, 112, 184);
    if (t.phase === 5) board(ctx, "СМЕНА", (344 - ox) | 0, 112, 72);
  }
  function drawOverlay(ctx, state) {
    var t = state && state.tutorial, prefs = settings(), a, w, f = font();
    if (!t) return;
    if (t.phase === 6 && !t.done) {
      ctx.fillStyle = "rgba(20,18,28,0.88)"; ctx.fillRect(92, 42, 296, 176);
      text(ctx, "ПРИЁМЫ", 204, 60, 2, "#F2C14E");
      text(ctx, "ВПЕРЁД   О-ГОСИ", 126, 102, 1); text(ctx, "НАЗАД    УРА-НАГЭ", 126, 126, 1);
      text(ctx, "ВВЕРХ    УТИ-МАТА", 126, 150, 1); text(ctx, "ВНИЗ     О-УТИ-ГАРИ", 126, 174, 1);
      return;
    }
    if (prefs && prefs.accessibility && prefs.accessibility.hints === "off") return;
    if (!t.hint || !(t.hintT > 0)) return;
    a = Math.min(1, (354 - t.hintT) / 18, t.hintT / 24); ctx.globalAlpha = Math.max(0, a);
    w = f && f.measure ? f.measure(t.hint, 1) : t.hint.length * 6;
    ctx.fillStyle = "rgba(20,18,28,0.75)"; ctx.fillRect(240 - (w >> 1) - 6, 207, w + 12, 18);
    text(ctx, t.hint, 240 - (w >> 1), 214, 1, "#FFE9A8"); ctx.globalAlpha = 1;
  }
  var api = { drawWorld: drawWorld, drawOverlay: drawOverlay };
  if (typeof window !== "undefined") window.PTutorialUI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
