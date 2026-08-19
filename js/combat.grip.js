/* THE PATRIOT — kumi-kata: approach, lock, mash, E5/E6/E7/E8/boss quirks. */
(function () {
  function load(g, p) {
    if (typeof window !== "undefined" && window[g]) return window[g];
    if (typeof global !== "undefined") {
      if (global[g]) return global[g];
    }
    if (typeof require === "function") {
      try { return require(p); } catch (err) { return null; }
    }
    return null;
  }
  var C = load("PConst", "./constants") || {};
  var D = load("PData", "./data");
  function toTicks(f) { return D && D.toTicks ? D.toTicks(f) : (f | 0) * 2; }
  function isHero(e) { return !!(e && (e.kind === "hero" || e.team === "hero")); }
  function isOta(h) {
    var id = (h && (h.heroId || h.hero || h.charId || h.archetype)) || "";
    return id === "otajon" || (h && h.weight === "LIGHT");
  }
  function hdef(h) {
    var id = (h && (h.heroId || h.hero || h.archetype)) || (isOta(h) ? "otajon" : "idris");
    return (C.heroes && C.heroes[id]) || h || {};
  }
  function archOf(e) {
    if (!e) return null;
    if (e.arch && typeof e.arch === "object") return e.arch;
    var id = e.archetype || e.archId;
    return D && D.getEnemy && id ? D.getEnemy(id) : null;
  }
  function flag(e, name) {
    if (e && e[name]) return true;
    var a = archOf(e);
    return !!(a && a[name]);
  }
  function Hit() { return load("PCombatHit", "./combat.hit"); }
  function Throw() { return load("PCombatThrow", "./combat.throw"); }
  function eachAlive(group, fn) {
    if (!group) return;
    var a = group.all || group, i, e, n = a.length | 0;
    for (i = 0; i < n; i++) { e = a[i]; if (e && e.alive !== false) fn(e); }
  }
  function depthOk(a, b, tol) {
    if (!a || !b) return false;
    if (tol == null) tol = C.DEPTH_GRIP || 12;
    var dd = (a.d || 0) - (b.d || 0);
    if (dd < 0) dd = -dd;
    return dd <= tol;
  }
  function isFront(hero, t) {
    var f = t.facing >= 0 ? 1 : -1;
    return f > 0 ? hero.x > t.x : hero.x < t.x;
  }
  function isRearArc(hero, t) {
    var f = t.facing >= 0 ? 1 : -1;
    var dx = hero.x - t.x, dd = (hero.d || 0) - (t.d || 0);
    var len = Math.sqrt(dx * dx + dd * dd);
    return len >= 0.001 && dx * -f / len >= 0.5;
  }
  function startGrip(state, hero) {
    if (!hero) return false;
    if (hero.combatState && hero.combatState !== "FREE") return false;
    if ((hero.recoveryT | 0) > 0 || (hero.landRecT | 0) > 0 || (hero.sweepLen | 0) > 0) return false;
    var hd = hdef(hero);
    hero.combatState = "APPROACH";
    hero.gripStartupT = toTicks(hd.gripStartup || 7);
    hero.gripStartupN = hero.gripStartupT;
    hero.gripActiveT = toTicks(hd.gripActive || 6);
    hero.gripLunge = hd.gripLunge || 18;
    hero.gripPhase = 0;
    hero.vx = 0;
    return true;
  }
  function pickTarget(state, hero) {
    var hd = hdef(hero);
    var bw = hd.gripBoxW || 44, bh = hd.gripBoxH || 40, bz = hd.gripBoxZ || 34;
    var hw = hero.w || hd.w || 34, f = hero.facing >= 0 ? 1 : -1;
    var x0 = f > 0 ? hero.x + hw * 0.5 : hero.x - hw * 0.5 - bw;
    var z0 = (hero.z || 0) + bz - bh * 0.5;
    var best = null, bestS = 1e15, bestId = 1e15;
    eachAlive(state.enemies, function (e) {
      if (e === hero || (e.iFrames | 0) > 0) return;
      if (flag(e, "aerialOnly") && e.grounded !== true) return;
      if ((flag(e, "boss") || e.boss) && e.combatState !== "STAGGERED" && !(e.staggeredT > 0)) return;
      if (!depthOk(hero, e, C.DEPTH_GRIP || 12)) return;
      var tw = e.w || 30, th = e.h || 40, tx = e.x - tw * 0.5, tz = e.z || 0;
      var boxHit = x0 < tx + tw && tx < x0 + bw && z0 < tz + th && tz < z0 + bh;
      var bodyHit = Math.abs(hero.x - e.x) <= (hw + tw) * 0.5 + 8 &&
        (hero.z || 0) < tz + th && tz < (hero.z || 0) + (hero.h || hd.h || 62);
      if (!boxHit && !bodyHit) return;
      var dx = hero.x - e.x, dd = (hero.d || 0) - (e.d || 0);
      if (dx < 0) dx = -dx; if (dd < 0) dd = -dd;
      var s = dx + 2 * dd, id = e.id | 0;
      if (s < bestS || (s === bestS && id < bestId)) { best = e; bestS = s; bestId = id; }
    });
    return best;
  }
  function e6Fail(hero, t) {
    if (!flag(t, "unthrowableFront") && !t.unthrowableFront) return false;
    if (t.combatState === "KNOCKDOWN" || t.combatState === "GETUP") return false;
    if ((t.recoveryT | 0) > 0) return false;
    if (isRearArc(hero, t)) return false;
    return isFront(hero, t);
  }
  function hold(hero, t) {
    var hd = hdef(hero), f = hero.facing >= 0 ? 1 : -1;
    t.x = hero.x + f * (hd.gripAnchorX || 40);
    t.z = (hero.z || 0) + (hd.gripAnchorZ || 8);
    t.d = hero.d; t.vx = 0; t.vz = 0; t.vd = 0;
    t.facing = -f; t.grounded = true;
  }
  function lock(state, hero, t) {
    hero.combatState = "GRIPPED"; t.combatState = "GRIPPED";
    hero.gripTarget = t; t.gripTarget = hero;
    hero.gripperId = -1;
    hero.gripTier = 0;
    hero.gripTimerT = toTicks(C.GRIP_MAX_F || 300);
    hero.tightenT = 0; hero.gripIgnoreT = toTicks(4);
    t.breakPts = 0; t.e5RevT = 0;
    var H = Hit();
    if (H && H.addMeter) H.addMeter(state, hero, 2);
    else { hero.meter = (hero.meter || 0) + 2; if (hero.meter > 100) hero.meter = 100; }
    hold(hero, t);
  }
  function breakGrip(state, e, heroHit) {
    var a = e, b = e && e.gripTarget;
    if (a && b) {
      var sep = C.GRIP_SEP || 22, dir = a.x >= b.x ? 1 : -1;
      a.x += dir * sep * 0.5; b.x -= dir * sep * 0.5;
    }
    function go(x) {
      if (!x) return;
      x.gripTarget = null; x.gripTimerT = 0; x.breakPts = 0; x.tightenT = 0;
      if (heroHit && isHero(x)) {
        x.combatState = "HITSTUN"; x.stateT = toTicks(12); x.hitstunMax = x.stateT;
      } else {
        x.combatState = "GRIP_BROKEN"; x.stateT = toTicks(C.GRIP_BROKEN_F || 14);
      }
    }
    go(a); go(b);
  }
  function reverseE8(state, hero, t) {
    hero.combatState = "HITSTUN";
    hero.stateT = toTicks(12); hero.hitstunMax = hero.stateT; hero.recoveryT = 0;
    var H = Hit();
    if (H && H.applyDamage) H.applyDamage(state, hero, C.E8_REVERSE_DMG || 15, t, { isChip: true });
    else { hero.hp -= C.E8_REVERSE_DMG || 15; if (hero.hp < 0) hero.hp = 0; }
  }
  function reverseE5(state, hero, t) {
    breakGrip(state, hero, false);
    var H = Hit();
    if (H && H.applyDamage) H.applyDamage(state, hero, C.E5_REV_DMG || 14, t, { isThrow: true });
    var dir = hero.x >= t.x ? 1 : -1;
    hero.combatState = "THROWN_FLIGHT";
    hero.vx = dir * 280; hero.vz = 180;
    hero.flightT = ((C.FLIGHT_LIFE_S || 2.5) * (C.SIM_HZ || 120) + 0.5) | 0;
    hero.bounceN = 0; hero.ffN = 0; hero.grounded = false;
  }
  function mashTick(state, hero, t) {
    var a = archOf(t);
    var mash = t.mash != null ? t.mash : a && a.mash != null ? a.mash : 0;
    if (!mash) return;
    var resist = t.resist != null ? t.resist : a && a.resist != null ? a.resist : 1;
    var diff = state.difficultyMul != null ? state.difficultyMul : 1;
    if (state.diff && state.diff.mash != null) diff = state.diff.mash;
    t.breakPts = (t.breakPts || 0) + mash * diff / (C.SIM_HZ || 120);
    var tb = C.TIER_BREAK && C.TIER_BREAK[hero.gripTier | 0] != null ? C.TIER_BREAK[hero.gripTier | 0] : 0;
    if (t.breakPts >= 100 * (1 + tb) * resist) breakGrip(state, hero, false);
  }
  function tickApproach(state, hero) {
    var f = hero.facing >= 0 ? 1 : -1;
    if (hero.gripPhase === 0) {
      var n = hero.gripStartupT | 0;
      var tot = hero.gripStartupN || n;
      if (n > 0 && tot > 0) hero.x += f * (hero.gripLunge / tot);
      hero.gripStartupT = n - 1;
      if (hero.gripStartupT <= 0) hero.gripPhase = 1;
      return;
    }
    var t = pickTarget(state, hero);
    if (t) {
      if ((t.counterStanceT | 0) > 0) { reverseE8(state, hero, t); return; }
      if (e6Fail(hero, t)) {
        hero.combatState = "FREE";
        hero.recoveryT = toTicks((C.WHIFF_REC_F || 11) + (C.E6_FRONT_EXTRA_F || 8));
        hero.x += (hero.x >= t.x ? 1 : -1) * (C.E6_PUSH || 14);
        return;
      }
      lock(state, hero, t);
      return;
    }
    hero.gripActiveT = (hero.gripActiveT | 0) - 1;
    if (hero.gripActiveT <= 0) {
      hero.combatState = "FREE";
      hero.recoveryT = toTicks(C.WHIFF_REC_F || 11);
    }
  }
  /* Hero held BY an enemy (E5/B3 hero-grab sets hero.combatState="GRIPPED"
     + hero.gripperId, no gripTarget). PRD 4.3.6: escape by alternating
     left/right (12 inputs); the AI side auto-releases after 1.4 s. */
  function tickHeldByEnemy(state, h) {
    var g = null, gid = h.gripperId | 0;
    eachAlive(state.enemies, function (e) { if ((e.id | 0) === gid) g = e; });
    if (!g || g.alive === false || !g.holdingHero) {
      h.gripperId = -1; h.escN = 0; h.escLastDir = 0;
      if (h.combatState === "GRIPPED") h.combatState = "FREE";
      return;
    }
    h.vx = 0; h.vz = 0; h.vd = 0; h.grounded = true;
    var inn = h.intent || (state.intents && state.intents[h.player | 0]);
    var mx = inn && inn.moveX ? (inn.moveX > 0 ? 1 : -1) : 0;
    if (mx !== 0 && mx !== (h.escLastDir | 0)) {
      h.escN = (h.escN | 0) + 1;
      h.escLastDir = mx;
    }
    if ((h.escN | 0) >= 12) {
      h.escN = 0; h.escLastDir = 0; h.gripperId = -1;
      g.holdingHero = 0; g.heldId = -1; g.holdT = 0; g.holdDmgT = 0;
      h.combatState = "GRIP_BROKEN"; h.stateT = toTicks(C.GRIP_BROKEN_F || 14);
      var sep = C.GRIP_SEP || 22, dir = h.x >= g.x ? 1 : -1;
      h.x += dir * sep * 0.5; g.x -= dir * sep * 0.5;
    }
  }
  function tickGripped(state, e) {
    if (!isHero(e)) return;
    if (!e.gripTarget && e.gripperId != null && (e.gripperId | 0) >= 0) {
      tickHeldByEnemy(state, e);
      return;
    }
    var t = e.gripTarget;
    if (!t || t.alive === false) { breakGrip(state, e, false); return; }
    if (t.archetype === "E5" || flag(t, "reversal")) {
      t.e5RevT = (t.e5RevT | 0) + 1;
      var per = ((C.E5_REV_PERIOD || 0.5) * (C.SIM_HZ || 120) + 0.5) | 0;
      if (per < 1) per = 60;
      if (t.e5RevT >= per) {
        t.e5RevT = 0;
        if (state.rng && state.rng.chance(C.E5_REV_CHANCE || 0.35)) { reverseE5(state, e, t); return; }
      }
    }
    mashTick(state, e, t);
    if (e.combatState !== "GRIPPED") return;
    e.gripTimerT = (e.gripTimerT | 0) - 1;
    if (e.gripTimerT <= 0) { breakGrip(state, e, false); return; }
    if (e.tightenT > 0) e.tightenT--;
    if (e.gripIgnoreT > 0) e.gripIgnoreT--;
    var inn = e.intent || (state.intents && state.intents[e.player | 0]);
    if (inn) {
      if (inn.gripPressed && (e.tightenT | 0) <= 0 && (e.gripIgnoreT | 0) <= 0) {
        e.gripTier = Math.min(2, (e.gripTier | 0) + 1);
        e.tightenT = toTicks(12);
      } else if (inn.throwPressed) {
        var Th = Throw();
        if (Th && Th.startThrow) Th.startThrow(state, e, inn);
        return;
      }
    }
    hold(e, t);
  }
  function tickBroken(e) {
    e.stateT = (e.stateT | 0) - 1;
    if (e.stateT <= 0) { e.combatState = "FREE"; e.stateT = 0; }
  }

  var api = {
    startGrip: startGrip, tickApproach: tickApproach, tickGripped: tickGripped,
    tickBroken: tickBroken, breakGrip: breakGrip, depthOk: depthOk, lock: lock, hold: hold
  };
  if (typeof window !== "undefined") window.PCombatGrip = api;
  if (typeof global !== "undefined") global.PCombatGrip = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
