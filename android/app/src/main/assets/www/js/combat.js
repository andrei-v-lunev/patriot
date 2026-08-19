/* THE PATRIOT — combat dispatcher. Walks heroes then enemies by id. */
(function () {
  var C = typeof PConst !== "undefined" ? PConst : {};
  if (!C.SIM_HZ && typeof require === "function") {
    try {
      C = require("./constants");
    } catch (eC) {
      C = C || {};
    }
  }
  var D = typeof PData !== "undefined" ? PData : null;
  if (!D && typeof require === "function") {
    try {
      D = require("./data");
    } catch (eD) {
      D = null;
    }
  }

  function loadMod(path, glob) {
    if (typeof window !== "undefined" && window[glob]) return window[glob];
    if (typeof global !== "undefined" && global[glob]) return global[glob];
    if (typeof require === "function") {
      try {
        return require(path);
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  var Grip = loadMod("./combat.grip", "PCombatGrip");
  var Throw = loadMod("./combat.throw", "PCombatThrow");
  var Ippon = loadMod("./combat.ippon", "PCombatIppon");
  var Hit = loadMod("./combat.hit", "PCombatHit");

  function eachAlive(group, fn) {
    if (!group) return;
    var a = group.all || group, i, e, n = a.length | 0;
    for (i = 0; i < n; i++) {
      e = a[i];
      if (e && e.alive !== false) fn(e);
    }
  }

  function isHero(e) {
    return !!(e && (e.kind === "hero" || e.team === "hero"));
  }

  function thaw(state) {
    function clr(e) {
      e.frozen = false;
    }
    eachAlive(state.heroes, clr);
    eachAlive(state.enemies, clr);
  }

  function maybeAct(state, h) {
    if (!isHero(h)) return;
    var inn = h.intent || (state.intents && state.intents[h.player | 0]);
    if (!inn) return;
    var st = h.combatState || "FREE";
    if (st === "FREE") {
      if (inn.gripPressed && Grip && Grip.startGrip) Grip.startGrip(state, h);
      else if (inn.throwPressed && Hit && Hit.startSweep) Hit.startSweep(state, h);
    }
  }

  function tickTimers(e) {
    if ((e.iFrames | 0) > 0) e.iFrames--;
    if ((e.ukemiCdT | 0) > 0) e.ukemiCdT--;
    if ((e.recoveryT | 0) > 0) e.recoveryT--;
    if ((e.counterStanceT | 0) > 0) e.counterStanceT--;
    if ((e.staggeredT | 0) > 0) {
      e.staggeredT--;
      if (e.staggeredT <= 0 && e.combatState === "STAGGERED") e.combatState = "FREE";
    }
    if ((e.i6CdT | 0) > 0) e.i6CdT--;
  }

  function tickEnt(state, e) {
    if (!e) return;
    if (e.frozen && (state.hitstop | 0) > 0) return;
    tickTimers(e);
    maybeAct(state, e);
    var st = e.combatState || "FREE";
    if (st === "APPROACH" && Grip) Grip.tickApproach(state, e);
    else if (st === "GRIPPED" && Grip) Grip.tickGripped(state, e);
    else if (st === "THROWING" && Throw) Throw.tickThrowing(state, e);
    else if (st === "THROWN_FLIGHT" && Throw) Throw.tickFlight(state, e);
    else if (st === "KNOCKDOWN" && Hit) Hit.tickKnockdown(state, e);
    else if (st === "GETUP" && Hit) Hit.tickGetup(e);
    else if (st === "UKEMI" && Hit) Hit.tickUkemi(e);
    else if (st === "HITSTUN" && Hit) Hit.tickHitstun(state, e);
    else if (st === "GRIP_BROKEN" && Grip) Grip.tickBroken(e);
    else if (st === "SPECIAL") {
      e.stateT = (e.stateT | 0) - 1;
      if (e.stateT <= 0) e.combatState = "FREE";
    } else if (st === "FREE" && Hit) Hit.tickFree(state, e);
    if (Hit && Hit.tryUkemi) Hit.tryUkemi(state, e);
  }

  function tick(state) {
    if (!state) return;
    if (Ippon && Ippon.tick) Ippon.tick(state);
    eachAlive(state.heroes, function (h) {
      tickEnt(state, h);
    });
    eachAlive(state.enemies, function (en) {
      tickEnt(state, en);
    });
    if ((state.hitstop | 0) > 0) {
      state.hitstop--;
      if (state.hitstop <= 0) thaw(state);
    }
  }

  function startGrip(state, hero) {
    return Grip && Grip.startGrip ? Grip.startGrip(state, hero) : false;
  }
  function startThrow(state, hero, intent) {
    return Throw && Throw.startThrow ? Throw.startThrow(state, hero, intent) : false;
  }
  function startSweep(state, hero) {
    return Hit && Hit.startSweep ? Hit.startSweep(state, hero) : false;
  }
  function applyDamage(state, target, amount, src, flags) {
    return Hit && Hit.applyDamage ? Hit.applyDamage(state, target, amount, src, flags) : 0;
  }
  function extendChain(state, n) {
    return Ippon && Ippon.extendChain ? Ippon.extendChain(state, n) : 0;
  }
  function breakChain(state) {
    if (Ippon && Ippon.breakChain) Ippon.breakChain(state);
  }
  function pickThrowId(hero, intent) {
    return Throw && Throw.pickThrowId ? Throw.pickThrowId(hero, intent) : "i1_ogoshi";
  }
  function startMove(state, ent, id) {
    var def, total;
    if (id === "sweep_idris" || id === "sweep_otajon") return startSweep(state, ent);
    if (id === "i8_kesa") {
      ent.pinId = id;
      ent.combatState = "SPECIAL";
      ent.stateT = D && D.toTicks ? D.toTicks(24) : 48;
      return true;
    }
    def = D && D.getMove ? D.getMove(id) : null;
    total = def ? ((def.startup || 0) + (def.active || 0) + (def.recovery || 0)) : 12;
    ent.moveId = id;
    ent.moveT = 0;
    ent.moveLen = D && D.toTicks ? D.toTicks(total) : total * 2;
    ent.stateT = ent.moveLen;
    ent.combatState = "SPECIAL";
    ent.moveDone = false;
    return true;
  }
  function depthOk(a, b, tol) {
    if (Grip && Grip.depthOk) return Grip.depthOk(a, b, tol);
    if (!a || !b) return false;
    var dd = (a.d || 0) - (b.d || 0);
    if (dd < 0) dd = -dd;
    return dd <= (tol == null ? C.DEPTH_HIT || 10 : tol);
  }

  var api = {
    startGrip: startGrip,
    tick: tick,
    startThrow: startThrow,
    startSweep: startSweep,
    applyDamage: applyDamage,
    extendChain: extendChain,
    breakChain: breakChain,
    pickThrowId: pickThrowId,
    depthOk: depthOk,
    startMove: startMove
  };
  if (typeof window !== "undefined") window.PCombat = api;
  if (typeof global !== "undefined") global.PCombat = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
