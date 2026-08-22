/* Compact settings screen backed by PSettings; pure intent-driven navigation. */
(function () {
  var rows = ["master", "music", "sfx", "vo", "vibration", "scaleMode", "crt", "screenShake", "flashReduction", "reducedMotion", "colorblind", "hints", "subtitleSize", "touchLayout", "touchScale", "autoUkemi", "gripAssist", "slowTelegraph", "noPitDeath", "infiniteMeter", "holdToGrip", "damageTaken", "remapP1", "remapP2", "reset"];
  var labels = ["ОБЩАЯ ГРОМКОСТЬ", "МУЗЫКА", "ЭФФЕКТЫ", "ГОЛОС", "ВИБРАЦИЯ", "МАСШТАБ", "ЭФФЕКТ CRT", "ТРЯСКА ЭКРАНА", "МЕНЬШЕ ВСПЫШЕК", "МЕНЬШЕ ДВИЖЕНИЯ", "ПАЛИТРА ВСПЫШКИ", "ПОДСКАЗКИ", "РАЗМЕР СУБТИТРОВ", "СЕНСОРНОЕ УПРАВЛЕНИЕ", "РАЗМЕР КНОПОК", "ПОМОЩЬ С УКЭМИ", "ПОМОЩЬ С ЗАХВАТОМ", "МЕДЛЕННЫЕ АТАКИ", "БЕЗ СМЕРТИ В ЯМАХ", "БЕСКОНЕЧНЫЙ МЕТР", "ЗАХВАТ УДЕРЖАНИЕМ", "УРОН ИГРОКУ", "ПЕРЕНАЗНАЧИТЬ ИГРОК 1", "ПЕРЕНАЗНАЧИТЬ ИГРОК 2", "СБРОСИТЬ УПРАВЛЕНИЕ"];
  var settings = null;
  var cursor = 0;
  var navLock = false;
  var change = null;
  var remapPlayer = null;
  var remapAction = 0;
  var remapLock = false;
  var remapError = "";

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function api() { return (typeof window !== "undefined" && window.PSettings) || (typeof global !== "undefined" && global.PSettings); }
  function open(saved, onChange) {
    var p = api();
    settings = p && p.validate(saved || {}).length === 0 ? clone(saved) : (p ? p.defaults() : saved || {});
    if (p && p.use) p.use(settings);
    cursor = 0; navLock = false; change = onChange || null; remapPlayer = null; remapAction = 0; remapError = "";
    applyAudio();
    return settings;
  }
  function applyAudio() {
    if (typeof window !== "undefined" && window.PAudio && PAudio.setVolumes && settings && settings.audio) PAudio.setVolumes(settings.audio);
  }
  function emit() { var p = api(); if (p && p.use) p.use(settings); applyAudio(); if (change) change(clone(settings)); }
  function cycle(list, value, d) { var i = list.indexOf(value); if (i < 0) i = 0; return list[(i + d + list.length) % list.length]; }
  function adjust(d) {
    var key = rows[cursor], p = api(), r;
    if (!settings || !d) return;
    if (["master", "music", "sfx", "vo"].indexOf(key) >= 0) settings.audio[key] = Math.max(0, Math.min(1, Math.round((settings.audio[key] + d * 0.1) * 10) / 10));
    else if (key === "vibration") settings.vibration = cycle(["off", "weak", "full"], settings.vibration, d);
    else if (key === "scaleMode") settings.video.scaleMode = cycle(["integer", "fit"], settings.video.scaleMode, d);
    else if (key === "crt") settings.video.crt = cycle(["off", "scanlines", "full"], settings.video.crt, d);
    else if (key === "screenShake") settings.video.screenShake = cycle([0, 0.5, 1], settings.video.screenShake, d);
    else if (key === "flashReduction") settings.video.flashReduction = !settings.video.flashReduction;
    else if (key === "reducedMotion") settings.reducedMotion = !settings.reducedMotion;
    else if (key === "colorblind") settings.accessibility.colorblind = cycle(["off", "deutan", "protan", "tritan"], settings.accessibility.colorblind, d);
    else if (key === "hints") settings.accessibility.hints = cycle(["once", "always", "off"], settings.accessibility.hints, d);
    else if (key === "subtitleSize") settings.accessibility.subtitleSize = cycle(["s", "m", "l"], settings.accessibility.subtitleSize, d);
    else if (key === "touchLayout") settings.touch.layout = settings.touch.layout === "right" ? "mirrored" : "right";
    else if (key === "touchScale") settings.touch.scale = Math.max(0.8, Math.min(1.3, Math.round((settings.touch.scale + d * 0.1) * 10) / 10));
    else if (key === "autoUkemi") settings.assist.autoUkemi = !settings.assist.autoUkemi;
    else if (["gripAssist", "slowTelegraph", "noPitDeath", "infiniteMeter", "holdToGrip"].indexOf(key) >= 0) settings.assist[key] = !settings.assist[key];
    else if (key === "damageTaken") settings.assist.damageTaken = cycle([0.25, 0.5, 0.75, 1], settings.assist.damageTaken, d);
    else if (key === "remapP1" || key === "remapP2") { remapPlayer = key === "remapP2" ? "p2" : "p1"; remapAction = 0; remapError = ""; }
    else if (key === "reset" && p) { r = p.resetBindings(settings); if (r.ok) settings = r.settings; }
    emit();
  }
  function capture(binding, device) {
    var p = api(), action, result;
    if (!p || !remapPlayer) return false;
    action = p.ACTIONS[remapAction];
    result = p.remap(settings, remapPlayer, device, action, binding);
    if (!result.ok) { remapError = result.conflicts && result.conflicts.length ? "КОНФЛИКТ " + result.conflicts[0].binding : "НЕДОПУСТИМО"; return true; }
    settings = result.settings; remapError = ""; remapAction++;
    if (remapAction >= p.ACTIONS.length) remapPlayer = null;
    emit(); return true;
  }
  function pollPadCapture() {
    var list, i, j, gp;
    if (!remapPlayer || typeof navigator === "undefined" || !navigator.getGamepads) return;
    try { list = navigator.getGamepads() || []; } catch (e) { return; }
    for (i = 0; i < list.length; i++) {
      gp = list[i]; if (!gp || !gp.buttons) continue;
      for (j = 0; j < gp.buttons.length; j++) if (gp.buttons[j] && gp.buttons[j].pressed) {
        if (!remapLock) capture("Button" + j, "gamepad"); remapLock = true; return;
      }
    }
    remapLock = false;
  }
  function update(it) {
    var vertical, horizontal, confirm, back;
    if (!settings || !it) return { done: false };
    pollPadCapture();
    if (remapPlayer) {
      if (it.pausePressed) { remapPlayer = null; remapError = ""; }
      return { done: false, settings: settings, cursor: cursor };
    }
    vertical = it.moveD > 0.4 ? -1 : it.moveD < -0.4 ? 1 : 0;
    horizontal = it.moveX > 0.4 ? 1 : it.moveX < -0.4 ? -1 : 0;
    confirm = !!(it.startPressed || it.gripPressed);
    back = !!it.pausePressed;
    if (!vertical && !horizontal) navLock = false;
    if (!navLock && vertical) { cursor = (cursor + vertical + rows.length) % rows.length; navLock = true; }
    else if (!navLock && horizontal) { adjust(horizontal); navLock = true; }
    if (confirm) adjust(1);
    return { done: back, settings: settings, cursor: cursor };
  }
  function value(key) {
    if (["master", "music", "sfx", "vo"].indexOf(key) >= 0) return Math.round(settings.audio[key] * 10) + "/10";
    if (key === "vibration") return settings.vibration === "off" ? "ВЫКЛ" : settings.vibration === "weak" ? "СЛАБАЯ" : "ПОЛНАЯ";
    if (key === "scaleMode") return settings.video.scaleMode === "fit" ? "ПО ЭКРАНУ" : "ЦЕЛЫЙ";
    if (key === "crt") return settings.video.crt === "off" ? "ВЫКЛ" : settings.video.crt === "scanlines" ? "СКАНЛАЙНЫ" : "ПОЛНЫЙ";
    if (key === "screenShake") return Math.round(settings.video.screenShake * 100) + "%";
    if (key === "flashReduction") return settings.video.flashReduction ? "ВКЛ" : "ВЫКЛ";
    if (key === "reducedMotion") return settings.reducedMotion ? "ВКЛ" : "ВЫКЛ";
    if (key === "colorblind") return { off: "ВЫКЛ", deutan: "ДЕЙТАН", protan: "ПРОТАН", tritan: "ТРИТАН" }[settings.accessibility.colorblind];
    if (key === "hints") return { once: "ОДИН РАЗ", always: "ВСЕГДА", off: "ВЫКЛ" }[settings.accessibility.hints];
    if (key === "subtitleSize") return settings.accessibility.subtitleSize.toUpperCase();
    if (key === "touchLayout") return settings.touch.layout === "mirrored" ? "ЛЕВША" : "СПРАВА";
    if (key === "touchScale") return Math.round(settings.touch.scale * 100) + "%";
    if (key === "autoUkemi") return settings.assist.autoUkemi ? "ВКЛ" : "ВЫКЛ";
    if (["gripAssist", "slowTelegraph", "noPitDeath", "infiniteMeter", "holdToGrip"].indexOf(key) >= 0) return settings.assist[key] ? "ВКЛ" : "ВЫКЛ";
    if (key === "damageTaken") return Math.round(settings.assist.damageTaken * 100) + "%";
    if (key === "remapP1" || key === "remapP2") return "ВЫБРАТЬ";
    return "УДЕРЖИВАЙ";
  }
  function text(ctx, str, x, y, color) {
    if (typeof window !== "undefined" && window.PFont) PFont.draw(ctx, str, x, y, 1, color);
    else { ctx.fillStyle = color; ctx.font = "8px monospace"; ctx.fillText(str, x, y); }
  }
  function draw(ctx) {
    var i, y, col, val, start;
    if (!ctx || !settings) return false;
    ctx.fillStyle = "rgba(8,7,14,.94)"; ctx.fillRect(0, 0, 480, 270);
    text(ctx, "НАСТРОЙКИ", 190, 20, "#F2C14E");
    if (remapPlayer) {
      var p = api(), action = p.ACTIONS[remapAction], bind = settings.bindings[remapPlayer].keyboard[action][0] || "—";
      text(ctx, remapPlayer === "p1" ? "ИГРОК 1" : "ИГРОК 2", 205, 64, "#F2C14E");
      text(ctx, action.toUpperCase(), 190, 106, "#FFFFFF");
      text(ctx, bind, 190, 132, "#8FD3FF");
      text(ctx, "НАЖМИ КЛАВИШУ ИЛИ КНОПКУ", 108, 174, "#FFE9A8");
      if (remapError) text(ctx, remapError, 170, 204, "#E03B3B");
      text(ctx, "ESC НАЗАД", 196, 238, "#FFFFFF");
      return true;
    }
    start = Math.max(0, Math.min(rows.length - 10, cursor - 7));
    for (i = start; i < Math.min(rows.length, start + 10); i++) {
      y = 47 + (i - start) * 19; col = i === cursor ? "#F2C14E" : "#FFFFFF"; val = value(rows[i]);
      text(ctx, (i === cursor ? "> " : "  ") + labels[i], 42, y, col);
      text(ctx, val, 360, y, col);
    }
    text(ctx, "← → ИЗМЕНИТЬ   ESC НАЗАД", 128, 252, "#8FD3FF");
    return true;
  }
  var out = { open: open, update: update, draw: draw, get: function () { return settings && clone(settings); }, cursor: function () { return cursor; } };
  if (typeof window !== "undefined") window.addEventListener("keydown", function (e) {
    if (!remapPlayer || e.code === "Escape") return;
    if (capture(e.code || e.key, "keyboard")) { if (e.preventDefault) e.preventDefault(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); }
  }, true);
  if (typeof window !== "undefined") window.PSettingsUI = out;
  if (typeof global !== "undefined") global.PSettingsUI = out;
  if (typeof module !== "undefined" && module.exports) module.exports = out;
})();
