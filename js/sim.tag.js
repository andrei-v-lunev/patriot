/* THE PATRIOT — tag-team swap, bench regen, 2P revive, lives. */
(function () {
  function G(n) {
    if (typeof window !== "undefined" && window[n]) return window[n];
    if (typeof global !== "undefined" && global[n]) return global[n];
    return null;
  }
  function C() { return G("PConst") || {}; }
  function hz() { return C().SIM_HZ || 120; }
  function tt(f) {
    var d = G("PData");
    return d && d.toTicks ? d.toTicks(f) : (f | 0) * 2;
  }
  function ents(s, n) {
    if (s[n] && s[n].length) return s[n];
    if (s.pools && s.pools[n] && s.pools[n].all) return s.pools[n].all;
    return [];
  }
  function is2P(s) { return s.players === 2 || s.coop === true || s.p2 === true; }
  function heroOf(s, i) { return ents(s, "heroes")[i] || null; }
  function maxHp(h) {
    var c, id, rec;
    if (!h) return 120;
    if (h.maxHp) return h.maxHp;
    c = C();
    id = h.kind || h.heroId || h.archetype || "idris";
    rec = c.heroes && c.heroes[id];
    return rec ? rec.hp : (id === "otajon" ? 90 : 120);
  }
  function ensure(s) {
    var c = C();
    if (s.lives == null) s.lives = c.LIVES || 3;
    if (is2P(s) && s.lives2 == null) s.lives2 = c.LIVES || 3;
    if (!s.lifeState) s.lifeState = "playing";
    if (s.activeHero == null) s.activeHero = 0;
    if (s.tagCd == null) s.tagCd = 0;
    if (s.meter == null) s.meter = is2P(s) ? [0, 0] : 0;
  }

  function transferGrip(s, from, to) {
    var es = ents(s, "enemies"), i, e, t;
    t = from.gripTarget;
    to.combatState = "GRIPPED";
    to.gripTier = 0;
    to.gripperId = from.gripperId;
    to.gripTarget = t;
    to.gripTimerT = from.gripTimerT || 0;
    from.combatState = "FREE";
    from.gripperId = -1;
    from.gripTarget = null;
    if (t) t.gripTarget = to;
    for (i = 0; i < es.length; i++) {
      e = es[i];
      if (!e) continue;
      if (e.heldId === from.id || e.grippeeId === from.id || e.gripTarget === from) {
        e.heldId = to.id;
        e.grippeeId = to.id;
        e.gripTarget = to;
      }
    }
  }

  function applySwap(s, outgoing, incoming, cd, entrance) {
    var idris;
    outgoing.exitT = tt(8);
    outgoing.iFrames = Math.max(outgoing.iFrames || 0, tt(8));
    outgoing.benched = true;
    incoming.exitT = 0;
    incoming.benched = false;
    incoming.alive = true;
    incoming.x = outgoing.x;
    incoming.d = outgoing.d;
    incoming.z = outgoing.z;
    incoming.facing = outgoing.facing;
    if (entrance) {
      idris = incoming.kind === "idris" || incoming.heroId === "idris" || incoming.archetype === "idris";
      incoming.entranceT = tt(idris ? 12 : 8);
      incoming.iFrames = Math.max(incoming.iFrames || 0, tt(20));
    } else incoming.entranceT = 0;
    s.tagCd = cd;
    s.tagCdMax = cd;
    s.activeHero = incoming === heroOf(s, 0) ? 0 : 1;
    s.benchHp = outgoing.hp;
  }

  function trySwap(s, playerIndex, intent) {
    var a, b, gripped, hitstun, cd, c;
    if (!s) return false;
    ensure(s);
    if (is2P(s)) return false;
    if (s.lifeState !== "playing") return false;
    a = heroOf(s, s.activeHero || 0);
    if (!a || a.benched) {
      a = heroOf(s, 0);
      if (a && a.benched) a = heroOf(s, 1);
    }
    if (a && a.combatState !== "GRIPPED") {
      var hsFind = ents(s, "heroes"), fi, cand;
      for (fi = 0; fi < hsFind.length; fi++) {
        cand = hsFind[fi];
        if (cand && cand.alive && !cand.benched && cand.combatState === "GRIPPED") { a = cand; break; }
      }
    }
    b = null;
    var hsAll = ents(s, "heroes"), bi;
    for (bi = 0; bi < hsAll.length; bi++) {
      if (hsAll[bi] && hsAll[bi] !== a && hsAll[bi].alive !== false) b = hsAll[bi];
    }
    if (!b) b = heroOf(s, a === heroOf(s, 0) ? 1 : 0);
    if (!a || !b) return false;
    if ((s.tagCd || 0) > 0) return false;
    if (b.hp <= 0) return false;
    if (a.exitT > 0) return false;
    gripped = a.combatState === "GRIPPED";
    hitstun = a.combatState === "HITSTUN";
    c = C();
    if (gripped) {
      transferGrip(s, a, b);
      cd = (c.TAG_GRIP_CD || 8) * hz();
      applySwap(s, a, b, cd, false);
      return true;
    }
    if (hitstun) {
      cd = ((c.TAG_CD || 12) + (c.TAG_EMERGENCY_EXTRA || 6)) * hz();
      applySwap(s, a, b, cd, false);
      return true;
    }
    if (intent && intent.tagPressed === false) return false;
    cd = (c.TAG_CD || 12) * hz();
    applySwap(s, a, b, cd, true);
    return true;
  }

  function regen(s) {
    var b, cap, step;
    if (is2P(s)) return;
    b = heroOf(s, 1 - (s.activeHero || 0));
    if (!b || b.hp <= 0) { s.benchHp = b ? b.hp : 0; return; }
    cap = 0.5 * maxHp(b);
    step = (C().BENCH_REGEN || 2) / hz();
    if (b.hp < cap) {
      b.hp += step;
      if (b.hp > cap) b.hp = cap;
    }
    s.benchHp = b.hp;
  }

  function syncMeter(s) {
    var hs, a, b;
    hs = ents(s, "heroes");
    a = hs[0]; b = hs[1];
    if (is2P(s)) {
      if (!(s.meter && s.meter.length)) s.meter = [a && a.meter || 0, b && b.meter || 0];
      if (a && a.meter == null) a.meter = s.meter[0] || 0;
      if (b && b.meter == null) b.meter = s.meter[1] || 0;
      if (a) s.meter[0] = a.meter;
      if (b) s.meter[1] = b.meter;
      return;
    }
    if (typeof s.meter !== "number") s.meter = 0;
    if (a && a.meter != null && a.meter !== s.meter) s.meter = a.meter;
    else if (b && b.meter != null && b.meter !== s.meter) s.meter = b.meter;
    if (a) a.meter = s.meter;
    if (b) b.meter = s.meter;
  }

  function reviveBoth(s, frac, ifr) {
    var i, h;
    for (i = 0; i < 2; i++) {
      h = heroOf(s, i);
      if (!h) continue;
      h.hp = frac * maxHp(h);
      h.alive = true;
      h.combatState = "FREE";
      h.iFrames = ifr;
      h.downT = 0;
      h.reviveHoldT = 0;
      h.benched = !is2P(s) && i !== (s.activeHero || 0);
    }
  }

  function loseLife(s, idx) {
    var left;
    if (is2P(s) && idx === 1) { s.lives2 = (s.lives2 || 0) - 1; left = s.lives2; }
    else { s.lives = (s.lives || 0) - 1; left = s.lives; }
    if (left < 0) { if (is2P(s) && idx === 1) s.lives2 = 0; else s.lives = 0; left = 0; }
    if (left > 0) return true;
    if (!is2P(s) || ((s.lives || 0) <= 0 && (s.lives2 || 0) <= 0)) {
      s.lifeState = "continue";
      s.continueT = (C().CONTINUE_S || 10) * hz();
    }
    return false;
  }

  function death1P(s) {
    var a = heroOf(s, s.activeHero || 0), b = heroOf(s, 1 - (s.activeHero || 0));
    if (!a) return;
    if (a.hp > 0) return;
    if (b && b.hp > 0) {
      applySwap(s, a, b, 0, false);
      b.iFrames = Math.max(b.iFrames || 0, tt(30));
      s.tagCd = 0;
      return;
    }
    if (loseLife(s, 0)) reviveBoth(s, 0.6, tt(120));
  }

  function downed(s, h, idx, intents) {
    var partner, pin, holding, dx, dd, dist, dmg;
    if (!h) return;
    if (h.respawnT > 0) {
      h.respawnT--;
      if (h.respawnT === 0) {
        h.hp = 0.6 * maxHp(h);
        h.alive = true;
        h.combatState = "FREE";
        h.iFrames = tt(120);
      }
      return;
    }
    if (h.hp > 0 && h.combatState !== "DOWN") {
      h.reviveWatchHp = h.hp;
      h.reviveHoldT = 0;
      h.downT = 0;
      return;
    }
    h.combatState = "DOWN";
    h.downT = (h.downT || 0) + 1;
    partner = heroOf(s, 1 - idx);
    pin = intents && intents[1 - idx];
    holding = pin && (pin.special || pin.grip || pin.revive);
    if (partner && partner.hp > 0 && holding) {
      dx = (partner.x || 0) - (h.x || 0);
      dd = (partner.d || 0) - (h.d || 0);
      dist = dx * dx + dd * dd;
      dmg = partner.combatState === "HITSTUN" || h.combatState === "HITSTUN";
      if (partner._tagHp != null && partner.hp < partner._tagHp) dmg = true;
      if (h._tagHp != null && h.hp < h._tagHp) dmg = true;
      if (dist <= 60 * 60 && !dmg) {
        h.reviveHoldT = (h.reviveHoldT || 0) + 1;
        if (h.reviveHoldT >= (C().REVIVE_HOLD || 5) * hz()) {
          h.hp = 0.5 * maxHp(h);
          h.alive = true;
          h.combatState = "FREE";
          h.iFrames = tt(90);
          h.downT = 0;
          h.reviveHoldT = 0;
          return;
        }
      } else h.reviveHoldT = 0;
    } else h.reviveHoldT = 0;
    if (h.downT >= 10 * hz()) {
      if (loseLife(s, idx)) {
        h.respawnT = 3 * hz();
        h.downT = 0;
      }
    }
  }

  function tickExit(s) {
    var i, h;
    for (i = 0; i < 2; i++) {
      h = heroOf(s, i);
      if (!h) continue;
      if (h.exitT > 0) h.exitT--;
      if (h.entranceT > 0) h.entranceT--;
    }
    if (s.tagCd > 0) s.tagCd--;
  }

  function stampHp(s) {
    var i, h;
    for (i = 0; i < 2; i++) { h = heroOf(s, i); if (h) h._tagHp = h.hp; }
  }

  function tick(s, intents) {
    var i, h;
    if (!s) return;
    ensure(s);
    if (s.lifeState === "continue" || s.lifeState === "gameover") return;
    regen(s);
    tickExit(s);
    syncMeter(s);
    if (is2P(s)) {
      for (i = 0; i < 2; i++) {
        h = heroOf(s, i);
        if (h) downed(s, h, i, intents);
      }
    } else {
      if (intents && intents[0] && intents[0].tagPressed) trySwap(s, 0, intents[0]);
      death1P(s);
    }
    stampHp(s);
  }

  var api = { tick: tick, trySwap: trySwap };
  if (typeof window !== "undefined") window.PTag = api;
  if (typeof global !== "undefined") global.PTag = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
