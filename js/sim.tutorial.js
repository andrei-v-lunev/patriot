/* Deterministic dojo progression + PRD 5.5 contextual first-time hints. */
(function () {
  var HINT_T = 354;
  function S() { return (typeof window !== "undefined" && window.PSim) || (typeof global !== "undefined" && global.PSim) || null; }
  function H() { return (typeof window !== "undefined" && window.PCombatHit) || (typeof global !== "undefined" && global.PCombatHit) || null; }
  function hero(state) {
    var i, e;
    for (i = 0; i < (state.heroes || []).length; i++) { e = state.heroes[i]; if (e && e.alive && !e.benched) return e; }
    return null;
  }
  function dummies(state) {
    return (state.enemies || []).filter(function (e) { return e && e.alive && e.archetype === "DUMMY"; });
  }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function setHint(t, text) { t.hint = text; t.hintT = HINT_T; }
  function enter(t, phase, text) { t.phase = phase; t.phaseT = 0; if (text) setHint(t, text); }
  function remember(t, id) {
    if (t.seen.indexOf(id) >= 0) return;
    t.seen.push(id); t.seen.sort();
  }
  function show(t, id, text) {
    if (t.mode === "off" || t.hintT > 0 || own(t.shown, id)) return false;
    if (t.mode === "once" && t.seen.indexOf(id) >= 0) return false;
    t.shown[id] = true;
    if (t.mode === "once") remember(t, id);
    t.currentId = id; setHint(t, text);
    return true;
  }
  function ensureDummy(state) {
    var list = dummies(state), d, sim;
    if (list.length) d = list[0];
    else {
      sim = S(); if (!sim || !sim.spawnEnemy) return null;
      d = sim.spawnEnemy(state, { archetype: "DUMMY", x: 260, d: 24, z: 16 });
    }
    if (d) { d.tutorialGripOnly = true; d.hp = d.maxHp = Math.max(d.maxHp || 0, 999); }
    return d;
  }
  function init(state) {
    var seen = Array.isArray(state && state.hintsSeen) ? state.hintsSeen.slice(0, 32) : [];
    if (!state) return;
    if (!state.tutorial) {
      state.tutorial = {
        phase: 0, phaseT: 0, hint: "", hintT: 0, currentId: "", throws: 0,
        forward: false, back: false, sandbagT: 0, startHero: state.activeHero | 0, done: false,
        mode: /^(once|always|off)$/.test(state.hintMode) ? state.hintMode : "once",
        seen: seen, shown: {}, performed: {}, gripHoldT: 0,
        prevStocks: (state.lives || 0) + (state.lives2 || 0), deathCp: "", deathN: 0
      };
    }
    if (state.levelId === "w1l1" && state.segIndex === 0) ensureDummy(state);
  }
  function countThrow(state, t, d) {
    var h = hero(state), dir;
    if (!d) return;
    if (d.combatState === "THROWN_FLIGHT" && !d._tutorialFlightSeen) {
      d._tutorialFlightSeen = true;
      if (t.phase === 2) {
        t.throws++;
        setHint(t, t.throws < 3 ? "ИППОН. ЕЩЁ РАЗ." : "ТРИ ИППОНА");
        if (t.throws >= 3) enter(t, 3, "БРОСЬ ВПЕРЁД");
      } else if (t.phase === 3) {
        dir = h ? h.throwWorldDir | 0 : -1;
        if (dir === 3 || dir === 4 || dir === 5 || dir === 6) t.back = true;
        else t.forward = true;
        if (!t.forward) setHint(t, "БРОСЬ ВПЕРЁД");
        else if (!t.back) setHint(t, "БРОСЬ НАЗАД");
        else enter(t, 4, "ПАДАЙ ПРАВИЛЬНО");
      }
    } else if (d.combatState !== "THROWN_FLIGHT") d._tutorialFlightSeen = false;
    if (d.combatState !== "THROWN_FLIGHT" && d.combatState !== "GRIPPED" && (d.x < 180 || d.x > 420)) {
      d.x = 260; d.d = 24; d.z = 16; d.vx = d.vd = d.vz = 0; d.grounded = true;
    }
  }
  function tickDojo(state, intents, t, h) {
    var d, inn = intents && intents[h.playerIndex | 0] || {}, hit;
    if (t.done || state.levelId !== "w1l1" || state.segIndex !== 0) return false;
    t.phaseT++;
    if (t.phase === 0) { if (h.x >= 160) enter(t, 1, "ХВАТАЙ ЕГО"); return true; }
    if (t.phase <= 3) d = ensureDummy(state);
    if (t.phase === 1) {
      if ((h.gripTarget && h.gripTarget.archetype === "DUMMY") || (d && d.combatState === "GRIPPED")) enter(t, 2, "СМАХНИ — БРОСОК");
      return true;
    }
    if (t.phase === 2 || t.phase === 3) { countThrow(state, t, d); return true; }
    if (t.phase === 4) {
      if (h.combatState === "UKEMI") { enter(t, 5, "СМЕНИ БОЙЦА"); return true; }
      if (t.sandbagT > 0) t.sandbagT--;
      else if (h.combatState === "FREE") {
        hit = H(); if (hit && hit.enterKnockdown) hit.enterKnockdown(h);
        t.sandbagT = 180; setHint(t, "ЖМИ — УКЭМИ");
      }
      return true;
    }
    if (t.phase === 5) {
      if (state.players === 2 || (state.activeHero | 0) !== (t.startHero | 0)) { enter(t, 6, "ПРИЁМЫ"); t.revealT = 480; }
      return true;
    }
    if (t.phase === 6) {
      if (inn.throwPressed || inn.jumpPressed || inn.gripPressed || inn.specialPressed) t.revealT = 0;
      else t.revealT--;
      if (t.revealT <= 0) { t.done = true; setHint(t, "ВПЕРЁД, НЕ СТОЙ"); }
      return true;
    }
    return false;
  }
  function track(t, state, h, inn) {
    var p = t.performed;
    if (inn.gripPressed || h.gripTarget) p.grip = true;
    if (inn.gripReleased || inn.throwPressed || h.combatState === "THROWING") p.throw = true;
    if ((inn.gripReleased || inn.throwPressed) && (inn.throwDir | 0) === 2 || h.combatState === "THROWING" && (h.throwWorldDir | 0) === 2) p.downThrow = true;
    if (inn.ukemiPressed || h.combatState === "UKEMI") p.ukemi = true;
    if (inn.specialPressed || h.combatState === "SPECIAL") p.special = true;
    if (inn.tagPressed || (state.activeHero | 0) !== (t.startHero | 0)) p.tag = true;
    if (inn.jumpPressed || inn.jump || h.grounded === false) p.jump = true;
  }
  function inGripRange(state, h) {
    var i, e, dx, dd;
    for (i = 0; i < (state.enemies || []).length; i++) {
      e = state.enemies[i]; if (!e || !e.alive || e.archetype === "DUMMY") continue;
      dx = Math.abs(e.x - h.x); dd = Math.abs((e.d || 0) - (h.d || 0));
      if (dx <= 56 && dd <= 12) return true;
    }
    return false;
  }
  function lowPartner(state, h) {
    var i, e;
    if (state.players === 2) return false;
    for (i = 0; i < (state.heroes || []).length; i++) {
      e = state.heroes[i];
      if (e && e !== h && e.alive && e.maxHp > 0 && e.hp < e.maxHp * 0.3) return true;
    }
    return false;
  }
  function tallLedge(state, h) {
    var ss = state.solids || [], i, s, top, edge, f = h.facing < 0 ? -1 : 1, j, n, nt;
    if (state.mode !== "plat" || h.grounded === false) return false;
    for (i = 0; i < ss.length; i++) {
      s = ss[i]; top = (s.z || 0) + (s.h || 0);
      if (h.x < s.x || h.x > s.x + s.w || Math.abs((h.z || 0) - top) > 3) continue;
      edge = f > 0 ? s.x + s.w : s.x;
      if (Math.abs(edge - h.x) > 48) continue;
      for (j = 0; j < ss.length; j++) {
        n = ss[j]; if (n === s) continue; nt = (n.z || 0) + (n.h || 0);
        if ((f > 0 ? n.x <= edge + 12 && n.x + n.w >= edge : n.x <= edge && n.x + n.w >= edge - 12) && nt >= top - 48) return false;
      }
      return true;
    }
    return false;
  }
  function guarding(state) {
    var i, e;
    for (i = 0; i < (state.enemies || []).length; i++) {
      e = state.enemies[i];
      if (e && e.alive && (e.tutorialGuard || e.counterStanceT > 0 || e.aiState === "COUNTER_STANCE")) return true;
    }
    return false;
  }
  function firstWaveCleared(state) {
    var c = state.wave && state.wave.cleared, keys = c ? Object.keys(c) : [];
    return !!(state.go && state.go.active) || keys.length > 0;
  }
  function secondDeath(state, t) {
    var stocks = (state.lives || 0) + (state.lives2 || 0), cp;
    if (stocks >= t.prevStocks) { t.prevStocks = stocks; return t.deathN >= 2; }
    cp = String(state.checkpointIndex || 0) + ":" + String(state.currentCheckpoint && state.currentCheckpoint.x || 0);
    t.deathN = cp === t.deathCp ? t.deathN + 1 : 1; t.deathCp = cp; t.prevStocks = stocks;
    return t.deathN >= 2;
  }
  function tickGeneral(state, intents, t, h) {
    var inn = intents && intents[h.playerIndex | 0] || {}, meter = Math.max(h.meter || 0, typeof state.meter === "number" ? state.meter : 0);
    track(t, state, h, inn);
    if (h.combatState === "GRIPPED" && h.gripTarget && Math.abs(inn.moveX || 0) < 0.2 && Math.abs(inn.moveD || 0) < 0.2 && (inn.throwDir | 0) < 0) t.gripHoldT++;
    else t.gripHoldT = 0;
    if (!t.performed.grip && inGripRange(state, h) && show(t, "grip-range", "ХВАТАЙ ЕГО")) return;
    if (!t.performed.throw && t.gripHoldT > 48 && show(t, "grip-held", "СМАХНИ — БРОСОК")) return;
    if (!t.performed.ukemi && (h.combatState === "KNOCKDOWN" || h.combatState === "DOWN") && show(t, "knockdown", "ЖМИ — УКЭМИ")) return;
    if (!t.performed.special && meter >= 100 && show(t, "meter-full", "СПЕЦПРИЁМ ГОТОВ")) return;
    if (!t.performed.tag && lowPartner(state, h) && show(t, "partner-low", "СМЕНИ БОЙЦА")) return;
    if (!t.performed.jump && tallLedge(state, h) && show(t, "ledge", "ДЕРЖИ ПРЫЖОК")) return;
    if (!t.performed.downThrow && guarding(state) && show(t, "guard", "БРОСЬ ВНИЗ")) return;
    if (firstWaveCleared(state) && show(t, "wave-clear", "ВПЕРЁД, НЕ СТОЙ")) return;
    if (!t.performed.throw && secondDeath(state, t) && show(t, "second-death", "ПОПРОБУЙ БРОСОК")) return;
    if (state.players === 1 && inn.padDetected && show(t, "pad-2p", "НАЖМИ СТАРТ")) return;
  }
  function tick(state, intents) {
    var t = state && state.tutorial, h;
    if (!t) return;
    if (t.hintT > 0) t.hintT--;
    h = hero(state); if (!h) return;
    if (tickDojo(state, intents, t, h)) return;
    tickGeneral(state, intents, t, h);
  }
  var api = { init: init, tick: tick, HINT_T: HINT_T };
  if (typeof window !== "undefined") window.PTutorialSim = api;
  if (typeof global !== "undefined") global.PTutorialSim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
