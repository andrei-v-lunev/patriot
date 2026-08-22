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

  /* Lazy lookup (mirrors js/sim.js): index.html loads combat.js BEFORE
     combat.grip/throw/ippon/hit, so window.PCombat* must be resolved at
     call time, never cached at IIFE-eval time. */
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

  function Grip() { return loadMod("./combat.grip", "PCombatGrip"); }
  function Throw() { return loadMod("./combat.throw", "PCombatThrow"); }
  function Ippon() { return loadMod("./combat.ippon", "PCombatIppon"); }
  function Hit() { return loadMod("./combat.hit", "PCombatHit"); }

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

  function consumedKey(name) {
    return "_consumed" + name.charAt(0).toUpperCase() + name.slice(1) + "At";
  }

  function bufferedPress(state, e, inn, name) {
    var at, age;
    if (!inn) return false;
    at = inn.pressedAtTick && inn.pressedAtTick[name];
    if (typeof at === "number" && e && e[consumedKey(name)] === at) return false;
    if (inn[name + "Pressed"]) return true;
    if (typeof at !== "number") return false;
    age = (state.tick | 0) - at;
    return age >= 0 && age <= (C.BUFFER_TICKS || 6);
  }

  function consumePress(state, e, inn, name) {
    var at = inn && inn.pressedAtTick && inn.pressedAtTick[name];
    if (e) e[consumedKey(name)] = typeof at === "number" ? at : (state.tick | 0);
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
      var G = Grip(), H = Hit();
      if (bufferedPress(state, h, inn, "grip") && G && G.startGrip && G.startGrip(state, h))
        consumePress(state, h, inn, "grip");
      else if (inn.throwPressed && H && H.startSweep) H.startSweep(state, h);
      else if (bufferedPress(state, h, inn, "special") && H && H.startSpecial && H.startSpecial(state, h))
        consumePress(state, h, inn, "special");
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
    var G = Grip(), T = Throw(), H = Hit();
    var st = e.combatState || "FREE";
    if (st === "APPROACH" && G) G.tickApproach(state, e);
    else if (st === "GRIPPED" && G) G.tickGripped(state, e);
    else if (st === "THROWING" && T) T.tickThrowing(state, e);
    else if (st === "THROWN_FLIGHT" && T) T.tickFlight(state, e);
    else if (st === "KNOCKDOWN" && H) H.tickKnockdown(state, e);
    else if (st === "GETUP" && H) H.tickGetup(e);
    else if (st === "UKEMI" && H) H.tickUkemi(e);
    else if (st === "HITSTUN" && H) H.tickHitstun(state, e);
    else if (st === "GRIP_BROKEN" && G) G.tickBroken(e);
    else if (st === "SPECIAL") {
      e.stateT = (e.stateT | 0) - 1;
      if (e.stateT <= 0) e.combatState = "FREE";
    } else if (st === "FREE" && H) H.tickFree(state, e);
    if (H && H.tryUkemi) H.tryUkemi(state, e);
  }

  function tick(state) {
    if (!state) return;
    var Ip = Ippon();
    if (Ip && Ip.tick) Ip.tick(state);
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
    var G = Grip();
    return G && G.startGrip ? G.startGrip(state, hero) : false;
  }
  function startThrow(state, hero, intent) {
    var T = Throw();
    return T && T.startThrow ? T.startThrow(state, hero, intent) : false;
  }
  function startSweep(state, hero) {
    var H = Hit();
    return H && H.startSweep ? H.startSweep(state, hero) : false;
  }
  function startSpecial(state, hero) {
    var H = Hit();
    return H && H.startSpecial ? H.startSpecial(state, hero) : false;
  }
  function applyDamage(state, target, amount, src, flags) {
    var H = Hit();
    return H && H.applyDamage ? H.applyDamage(state, target, amount, src, flags) : 0;
  }
  function extendChain(state, n) {
    var Ip = Ippon();
    return Ip && Ip.extendChain ? Ip.extendChain(state, n) : 0;
  }
  function breakChain(state) {
    var Ip = Ippon();
    if (Ip && Ip.breakChain) Ip.breakChain(state);
  }
  function pickThrowId(hero, intent) {
    var T = Throw();
    return T && T.pickThrowId ? T.pickThrowId(hero, intent) : "i1_ogoshi";
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
    var G = Grip();
    if (G && G.depthOk) return G.depthOk(a, b, tol);
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
    startSpecial: startSpecial,
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
