/* THE PATRIOT — pickups, lives, continue / gameover. */
(function () {
  function G(n) {
    if (typeof window !== "undefined" && window[n]) return window[n];
    if (typeof global !== "undefined" && global[n]) return global[n];
    return null;
  }
  function C() { return G("PConst") || {}; }
  function hz() { return C().SIM_HZ || 120; }
  function ents(s, n) {
    if (s.pools && s.pools[n] && s.pools[n].all) return s.pools[n].all;
    return s[n] || [];
  }
  function is2P(s) { return s.players === 2 || s.coop === true || s.p2 === true; }
  function maxHp(h) {
    var c, id, rec;
    if (!h) return 120;
    if (h.maxHp) return h.maxHp;
    c = C();
    id = h.kind || h.heroId || h.archetype || "idris";
    rec = c.heroes && c.heroes[id];
    return rec ? rec.hp : (id === "otajon" ? 90 : 120);
  }

  function spawn(s, opts) {
    var pool, p, c;
    if (!s || !opts) return null;
    pool = s.pools && s.pools.pickups;
    if (!pool || !pool.alloc) return null;
    p = pool.alloc();
    if (!p) return null;
    c = C();
    p.kind = opts.kind || "tea";
    p.x = opts.x || 0;
    p.z = opts.z || 0;
    p.d = opts.d || 0;
    p.w = 24;
    p.h = 24;
    p.life = (c.PICKUP_LIFE_S || 12) * hz();
    p.blink = 0;
    /* Pool storage is the authoritative tick list, while state.pickups is
       the compact render list consumed by render.js. Keep both wired. */
    if (s.pickups && s.pickups.indexOf(p) < 0) s.pickups.push(p);
    return p;
  }

  function healHero(h, n, full) {
    var m;
    if (!h) return;
    m = maxHp(h);
    if (full) h.hp = m;
    else {
      h.hp = (h.hp || 0) + n;
      if (h.hp > m) h.hp = m;
    }
    if (h.hp > 0 && h.alive === false) h.alive = true;
  }

  function apply(s, p, taker) {
    var hs, i, h, c = C();
    if (p.kind === "tea") healHero(taker, c.TEA_HP || 30, false);
    else if (p.kind === "plov") {
      hs = ents(s, "heroes");
      for (i = 0; i < hs.length; i++) healHero(hs[i], 0, true);
    } else if (p.kind === "charm") {
      if (is2P(s)) {
        taker.meter = (taker.meter || 0) + 50;
        if (s.meter && s.meter.length) s.meter[taker.id] = taker.meter;
      } else {
        s.meter = (typeof s.meter === "number" ? s.meter : 0) + 50;
      }
    } else if (p.kind === "medal") s.score = (s.score || 0) + 500;
    if (s.events && s.events.length < 32) {
      s.events.push({ name: "audio_only", audio: p.kind === "medal" ? "coin" : "pickup", alive: true });
    }
    p.alive = false;
    if (s.pools && s.pools.pickups && s.pools.pickups.release) s.pools.pickups.release(p);
  }

  function hits(p, h, depth) {
    var hw, dx, dd;
    if (!h || !h.alive || h.hp <= 0 || h.benched || h.combatState === "DOWN") return false;
    hw = (h.w || 28) * 0.5;
    dx = Math.abs((h.x || 0) - p.x);
    dd = Math.abs((h.d || 0) - (p.d || 0));
    return dx <= 12 + hw && dd <= depth;
  }

  function tickPickups(s) {
    var ps = ents(s, "pickups"), hs = ents(s, "heroes"), depth, i, j, p, c;
    c = C();
    depth = c.DEPTH_PICKUP || 14;
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      if (!p || !p.alive) continue;
      p.life--;
      p.blink = p.life < 3 * hz() ? 1 : 0;
      if (p.life <= 0) {
        p.alive = false;
        if (s.pools && s.pools.pickups && s.pools.pickups.release) s.pools.pickups.release(p);
        continue;
      }
      for (j = 0; j < hs.length; j++) {
        if (hits(p, hs[j], depth)) { apply(s, p, hs[j]); break; }
      }
    }
  }

  function bothDead(s) {
    var hs = ents(s, "heroes"), i, h, live = 0;
    for (i = 0; i < hs.length; i++) {
      h = hs[i];
      if (h && h.alive && h.hp > 0 && h.combatState !== "DOWN" && !h.respawnT) live++;
    }
    return live === 0 && hs.length > 0;
  }

  function tickLives(s) {
    var c = C();
    if (s.lives == null) s.lives = c.LIVES || 3;
    if (!s.lifeState) s.lifeState = "playing";
    if (s.lifeState === "continue") {
      if (s.continueT == null) s.continueT = (c.CONTINUE_S || 10) * hz();
      s.continueT--;
      if (s.continueT <= 0) s.lifeState = "gameover";
      return;
    }
    if (s.lifeState === "gameover") return;
    if (bothDead(s) && (s.lives || 0) <= 0 && (!is2P(s) || (s.lives2 || 0) <= 0)) {
      s.lifeState = "continue";
      s.continueT = (c.CONTINUE_S || 10) * hz();
    }
  }

  function tick(s) {
    if (!s) return;
    tickPickups(s);
    tickLives(s);
  }

  var api = { tick: tick, spawn: spawn };
  if (typeof window !== "undefined") window.PPickups = api;
  if (typeof global !== "undefined") global.PPickups = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
