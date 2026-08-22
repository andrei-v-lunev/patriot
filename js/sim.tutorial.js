/* W1L1 diegetic dojo onboarding: deterministic progression, no modal pages. */
(function () {
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
  function hint(t, text) { t.hint = text; t.hintT = 354; }
  function enter(t, phase, text) { t.phase = phase; t.phaseT = 0; if (text) hint(t, text); }
  function ensureDummy(state) {
    var list = dummies(state), d, sim;
    if (list.length) { d = list[0]; }
    else {
      sim = S(); if (!sim || !sim.spawnEnemy) return null;
      d = sim.spawnEnemy(state, { archetype: "DUMMY", x: 260, d: 24, z: 16 });
    }
    if (d) { d.tutorialGripOnly = true; d.hp = d.maxHp = Math.max(d.maxHp || 0, 999); }
    return d;
  }
  function init(state) {
    if (!state || state.levelId !== "w1l1" || state.segIndex !== 0) return;
    if (!state.tutorial) {
      state.tutorial = { phase: 0, phaseT: 0, hint: "", hintT: 0, throws: 0,
        forward: false, back: false, sandbagT: 0, startHero: state.activeHero | 0, done: false };
    }
    ensureDummy(state);
  }
  function countThrow(state, t, d) {
    var h = hero(state), dir;
    if (!d) return;
    if (d.combatState === "THROWN_FLIGHT" && !d._tutorialFlightSeen) {
      d._tutorialFlightSeen = true;
      if (t.phase === 2) {
        t.throws++;
        hint(t, t.throws < 3 ? "ИППОН. ЕЩЁ РАЗ." : "ТРИ ИППОНА");
        if (t.throws >= 3) enter(t, 3, "БРОСЬ ВПЕРЁД");
      } else if (t.phase === 3) {
        dir = h ? h.throwWorldDir | 0 : -1;
        if (dir === 3 || dir === 4 || dir === 5 || dir === 6) t.back = true;
        else t.forward = true;
        if (!t.forward) hint(t, "БРОСЬ ВПЕРЁД");
        else if (!t.back) hint(t, "БРОСЬ НАЗАД");
        else enter(t, 4, "ПАДАЙ ПРАВИЛЬНО");
      }
    } else if (d.combatState !== "THROWN_FLIGHT") d._tutorialFlightSeen = false;
    if (d.combatState !== "THROWN_FLIGHT" && d.combatState !== "GRIPPED" && (d.x < 180 || d.x > 420)) {
      d.x = 260; d.d = 24; d.z = 16; d.vx = d.vd = d.vz = 0; d.grounded = true;
    }
  }
  function tick(state, intents) {
    var t = state && state.tutorial, h, d, inn, hit;
    if (!t || t.done || state.levelId !== "w1l1" || state.segIndex !== 0) return;
    h = hero(state); if (!h) return;
    inn = intents && intents[h.playerIndex | 0] || {};
    t.phaseT++; if (t.hintT > 0) t.hintT--;
    if (t.phase === 0) {
      if (h.x >= 160) enter(t, 1, "ХВАТАЙ ЕГО");
      return;
    }
    if (t.phase <= 3) d = ensureDummy(state);
    if (t.phase === 1) {
      if ((h.gripTarget && h.gripTarget.archetype === "DUMMY") || (d && d.combatState === "GRIPPED")) enter(t, 2, "СМАХНИ — БРОСОК");
      return;
    }
    if (t.phase === 2 || t.phase === 3) { countThrow(state, t, d); return; }
    if (t.phase === 4) {
      if (h.combatState === "UKEMI") { enter(t, 5, "СМЕНИ БОЙЦА"); return; }
      if (t.sandbagT > 0) t.sandbagT--;
      else if (h.combatState === "FREE") {
        hit = H(); if (hit && hit.enterKnockdown) hit.enterKnockdown(h);
        t.sandbagT = 180; hint(t, "ЖМИ — УКЭМИ");
      }
      return;
    }
    if (t.phase === 5) {
      if (state.players === 2 || (state.activeHero | 0) !== (t.startHero | 0)) { enter(t, 6, "ПРИЁМЫ"); t.revealT = 480; }
      return;
    }
    if (t.phase === 6) {
      if (inn.throwPressed || inn.jumpPressed || inn.gripPressed || inn.specialPressed) t.revealT = 0;
      else t.revealT--;
      if (t.revealT <= 0) { t.done = true; hint(t, "ВПЕРЁД, НЕ СТОЙ"); }
    }
  }
  var api = { init: init, tick: tick };
  if (typeof window !== "undefined") window.PTutorialSim = api;
  if (typeof global !== "undefined") global.PTutorialSim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
