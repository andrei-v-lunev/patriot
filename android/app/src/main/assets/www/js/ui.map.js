/* Campaign world map: pure progress model, deterministic navigation, 480x270 draw. */
(function () {
  var WORLD_Y = [48, 88, 128, 168, 208];
  var LEVEL_X = [282, 350, 418];
  var WORLD_COLORS = ["#8A6242", "#2E9EA8", "#45577B", "#6B7785", "#8E2658"];
  var WORLD_DARK = ["#241C18", "#13292C", "#11172A", "#1C2229", "#261027"];

  function data() {
    if (typeof window !== "undefined" && window.PData) return window.PData;
    if (typeof global !== "undefined" && global.PData) return global.PData;
    return null;
  }

  function font() {
    if (typeof window !== "undefined" && window.PFont) return window.PFont;
    if (typeof global !== "undefined" && global.PFont) return global.PFont;
    return null;
  }

  function campaignOf(source) {
    var r;
    if (source && source.worlds) return source;
    if (source && source.campaign) return source.campaign;
    if (source && source.ready) {
      r = source.ready();
      return r && r.campaign;
    }
    source = source || data();
    if (!source) return null;
    if (source.ready) {
      r = source.ready();
      return r && r.campaign;
    }
    if (source.raw) {
      r = source.raw();
      return r && r.campaign;
    }
    return null;
  }

  function clearedSet(save) {
    var p = (save && (save.progress || save.campaign)) || {};
    var list = p.levelsCleared || p.completedLevels || p.cleared || (save && save.levelsCleared) || [];
    var out = {}, i;
    if (Array.isArray(list)) {
      for (i = 0; i < list.length; i++) out[String(list[i])] = true;
    } else if (list && typeof list === "object") {
      for (i in list) if (Object.prototype.hasOwnProperty.call(list, i) && list[i]) out[i] = true;
    }
    return out;
  }

  function copyRecord(rec) {
    var out = {}, k;
    if (!rec || typeof rec !== "object") return null;
    for (k in rec) if (Object.prototype.hasOwnProperty.call(rec, k)) out[k] = rec[k];
    return out;
  }

  function build(source, save) {
    var campaign = campaignOf(source);
    var worlds = campaign && campaign.worlds ? campaign.worlds : [];
    var cleared = clearedSet(save);
    var scores = (save && (save.scores || save.records)) || {};
    var progress = (save && (save.progress || save.campaign)) || {};
    var flat = [], wi, li, w, l;
    for (wi = 0; wi < worlds.length; wi++) {
      w = worlds[wi] || {};
      for (li = 0; li < (w.levels || []).length; li++) {
        l = w.levels[li] || {};
        flat.push({ world: w, level: l, worldIndex: wi, levelIndex: li });
      }
    }
    var wanted = progress.level || progress.levelId || progress.currentLevel || (save && save.levelId) || "";
    var currentIndex = -1, i;
    for (i = 0; i < flat.length; i++) if (flat[i].level.id === wanted) currentIndex = i;
    if (currentIndex < 0) {
      currentIndex = 0;
      while (currentIndex < flat.length - 1 && cleared[flat[currentIndex].level.id]) currentIndex++;
    }
    var nodes = [], worldModels = [], rec, unlocked, isCurrent, state;
    for (i = 0; i < flat.length; i++) {
      l = flat[i].level;
      unlocked = i === 0 || !!cleared[flat[i - 1].level.id] || (currentIndex >= 0 && i <= currentIndex);
      isCurrent = i === currentIndex;
      state = isCurrent ? "current" : cleared[l.id] ? "cleared" : unlocked ? "open" : "locked";
      rec = copyRecord(scores[l.id]);
      nodes.push({
        id: l.id,
        name: l.name || l.id,
        boss: l.boss || null,
        worldId: flat[i].world.id || "W" + (flat[i].worldIndex + 1),
        worldName: flat[i].world.name || "",
        worldIndex: flat[i].worldIndex,
        levelIndex: flat[i].levelIndex,
        index: i,
        x: LEVEL_X[flat[i].levelIndex] || (282 + flat[i].levelIndex * 68),
        y: WORLD_Y[flat[i].worldIndex] || (48 + flat[i].worldIndex * 40),
        state: state,
        locked: !unlocked,
        cleared: !!cleared[l.id],
        current: isCurrent,
        record: rec,
        hasRecord: !!rec,
        states: { locked: !unlocked, cleared: !!cleared[l.id], current: isCurrent, record: !!rec }
      });
    }
    for (wi = 0; wi < worlds.length; wi++) {
      w = worlds[wi] || {};
      var wn = nodes.filter(function (n) { return n.worldIndex === wi; });
      worldModels.push({
        id: w.id || "W" + (wi + 1), name: w.name || "", index: wi,
        nodes: wn, locked: wn.length > 0 && wn.every(function (n) { return n.locked; }),
        cleared: wn.length > 0 && wn.every(function (n) { return n.cleared; }),
        current: wn.some(function (n) { return n.current; })
      });
    }
    return { title: (campaign && campaign.title) || "ПАТРИОТ", worlds: worldModels, nodes: nodes,
      currentId: nodes[currentIndex] ? nodes[currentIndex].id : null };
  }

  function findNode(model, id) {
    var nodes = (model && model.nodes) || [], i;
    for (i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i];
    return null;
  }

  function direction(key) {
    if (key === "ArrowLeft" || key === "KeyA" || key === "left") return [-1, 0];
    if (key === "ArrowRight" || key === "KeyD" || key === "right") return [1, 0];
    if (key === "ArrowUp" || key === "KeyW" || key === "up") return [0, -1];
    if (key === "ArrowDown" || key === "KeyS" || key === "down") return [0, 1];
    return null;
  }

  function navigate(model, selectedId, key) {
    var nodes = (model && model.nodes) || [];
    var from = findNode(model, selectedId) || findNode(model, model && model.currentId);
    var dir = direction(key), i, n, targetWorld, targetLevel;
    if (!from || !dir) return from ? from.id : null;
    targetWorld = from.worldIndex + dir[1];
    targetLevel = from.levelIndex + dir[0];
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.worldIndex === targetWorld && n.levelIndex === targetLevel) return n.locked ? from.id : n.id;
    }
    return from.id;
  }

  function text(ctx, str, x, y, scale, color) {
    var f = font();
    if (f && f.draw) return f.draw(ctx, str, x, y, scale || 1, color);
    if (!ctx || !ctx.fillText) return 0;
    ctx.fillStyle = color || "#FFFFFF";
    ctx.font = (7 * (scale || 1)) + "px monospace";
    ctx.textBaseline = "top";
    ctx.fillText(String(str), x, y);
    return String(str).length * 6 * (scale || 1);
  }

  function measure(str, scale) {
    var f = font();
    return f && f.measure ? f.measure(str, scale || 1) : String(str).length * 6 * (scale || 1);
  }

  function line(ctx, x1, y1, x2, y2, color) {
    if (!ctx.beginPath || !ctx.stroke) return;
    ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function circle(ctx, x, y, r, fill, stroke) {
    if (!ctx.beginPath || !ctx.arc) return;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    if (stroke && ctx.stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function landmark(ctx, world, x, y, color) {
    ctx.fillStyle = color;
    if (world === 0) {
      ctx.fillRect(x - 12, y + 4, 24, 3); ctx.fillRect(x - 8, y, 16, 4);
      ctx.fillRect(x - 4, y - 4, 8, 4); ctx.fillRect(x - 1, y - 8, 2, 4);
    } else if (world === 1) {
      ctx.fillRect(x - 10, y, 20, 8); ctx.fillRect(x - 7, y - 4, 14, 4);
      ctx.fillRect(x - 1, y - 10, 2, 10); ctx.fillRect(x + 7, y - 8, 2, 8);
    } else if (world === 2) {
      ctx.fillRect(x - 12, y - 2, 24, 7); ctx.fillRect(x - 9, y - 5, 5, 3);
      ctx.fillRect(x + 4, y - 5, 5, 3); ctx.fillRect(x - 8, y + 6, 3, 2); ctx.fillRect(x + 5, y + 6, 3, 2);
    } else if (world === 3) {
      ctx.fillRect(x - 10, y + 5, 20, 2); ctx.fillRect(x + 4, y - 9, 3, 14);
      ctx.fillRect(x - 6, y - 8, 12, 2); ctx.fillRect(x - 6, y - 8, 2, 8);
    } else {
      ctx.fillRect(x - 10, y - 8, 2, 16); ctx.fillRect(x + 8, y - 8, 2, 16);
      ctx.fillRect(x - 10, y - 8, 20, 2); ctx.fillRect(x - 10, y + 6, 20, 2);
      ctx.fillRect(x - 4, y - 6, 2, 12); ctx.fillRect(x + 2, y - 6, 2, 12);
    }
  }

  function recordText(rec) {
    if (!rec) return "";
    var best = rec.best != null ? rec.best : rec.score;
    var s = best != null ? "РЕКОРД " + best : "РЕКОРД";
    if (rec.rank) s += "  РАНГ " + rec.rank;
    return s;
  }

  function draw(ctx, model, selectedId, tick) {
    if (!ctx || !model) return false;
    var nodes = model.nodes || [], worlds = model.worlds || [], selected = findNode(model, selectedId) ||
      findNode(model, model.currentId), i, n, w, color, label;
    ctx.fillStyle = "#0B0A10"; ctx.fillRect(0, 0, 480, 270);
    ctx.fillStyle = "#111827"; ctx.fillRect(8, 28, 464, 210);
    label = "КАРТА"; text(ctx, label, (480 - measure(label, 2)) >> 1, 7, 2, "#F2C14E");
    for (i = 0; i < worlds.length; i++) {
      w = worlds[i];
      ctx.fillStyle = WORLD_DARK[i] || "#17233A"; ctx.fillRect(12, WORLD_Y[i] - 15, 448, 30);
      ctx.fillStyle = WORLD_COLORS[i] || "#75849A"; ctx.fillRect(12, WORLD_Y[i] + 13, 448, 2);
      color = w.locked ? "#596070" : w.cleared ? "#8ED081" : w.current ? "#F2C14E" : "#FFFFFF";
      text(ctx, (i + 1) + ". " + w.name, 18, WORLD_Y[i] - 4, 1, color);
      landmark(ctx, i, 246, WORLD_Y[i], w.locked ? "#343B49" : WORLD_COLORS[i]);
    }
    for (i = 1; i < nodes.length; i++) line(ctx, nodes[i - 1].x, nodes[i - 1].y,
      nodes[i].x, nodes[i].y, nodes[i].locked ? "#343B49" : "#75849A");
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      color = n.locked ? "#343B49" : n.cleared ? "#4D9F63" : n.current ? "#D79B2D" : "#5275A8";
      circle(ctx, n.x, n.y, n.boss ? 8 : 6, color, n.id === (selected && selected.id) ? "#FFFFFF" : "#121722");
      if (n.cleared) text(ctx, "✓", n.x - 3, n.y - 4, 1, "#FFFFFF");
      else if (n.locked) text(ctx, "×", n.x - 3, n.y - 4, 1, "#9AA0AA");
      else text(ctx, String(n.levelIndex + 1), n.x - 3, n.y - 4, 1, "#FFFFFF");
    }
    if (selected) {
      if (((tick || 0) >> 4) & 1) circle(ctx, selected.x, selected.y, selected.boss ? 11 : 9, "rgba(0,0,0,0)", "#F2C14E");
      text(ctx, selected.name, 18, 244, 1, selected.locked ? "#777D88" : "#FFFFFF");
      label = selected.locked ? "ЗАКРЫТО" : selected.current ? "ТЕКУЩИЙ" : selected.cleared ? "ПРОЙДЕНО" : "ДОСТУПНО";
      text(ctx, label, 300, 244, 1, selected.locked ? "#777D88" : "#F2C14E");
      if (selected.record) text(ctx, recordText(selected.record), 18, 257, 1, "#8ED081");
    }
    return true;
  }

  var api = { build: build, fromData: function (save) { return build(data(), save); }, find: findNode,
    navigate: navigate, draw: draw, recordText: recordText };
  if (typeof window !== "undefined") window.PMap = api;
  if (typeof global !== "undefined") global.PMap = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
