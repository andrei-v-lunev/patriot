/* Render-side state-to-audio cues. Never mutates deterministic sim state. */
(function () {
  var seen = {};
  var projectiles = {};
  var lastLevel = "";

  function audio() {
    if (typeof window !== "undefined" && window.PAudio) return window.PAudio;
    if (typeof global !== "undefined" && global.PAudio) return global.PAudio;
    return null;
  }

  function play(name) {
    var out = audio();
    if (out && out.playEvent) out.playEvent(name);
  }

  function surface(levelId) {
    if (/^w2/.test(levelId)) return "stone";
    if (/^w3/.test(levelId)) return "metal";
    if (/^w4/.test(levelId)) return "shipdeck";
    if (/^w5/.test(levelId)) return "casino";
    return "dojo";
  }

  function key(e, index, group) { return group + ":" + (e.id == null ? index : e.id); }

  function entities(state, group, stepBudget) {
    var list = state[group] || [], next = {}, i, e, id, old, moving, grounded, stepTick;
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (!e || !e.alive || e.benched) continue;
      id = key(e, i, group); old = seen[id]; grounded = e.grounded !== false;
      moving = Math.abs(e.vx || 0) + Math.abs(e.vd || 0) > 35;
      if (group === "heroes" && old) {
        if (old.grounded && !grounded && (e.vz || 0) > 0) play("jump");
        if (!old.grounded && grounded) play("land");
        if (e.hp < old.hp && /^w5/.test(state.levelId || "")) play("crowd_boo");
      }
      if (!old && group === "enemies" && stepBudget.alerts < 2) { play("enemy_alert"); stepBudget.alerts++; }
      stepTick = old && old.stepTick != null ? old.stepTick : -999;
      if (moving && grounded && (state.tick | 0) - stepTick >= 24 && stepBudget.steps < 2) {
        play("step_" + surface(state.levelId || "")); stepBudget.steps++; stepTick = state.tick | 0;
      }
      next[id] = { grounded: grounded, hp: e.hp, stepTick: stepTick };
    }
    Object.keys(seen).forEach(function (id) {
      if (id.indexOf(group + ":") === 0 && !next[id]) delete seen[id];
    });
    Object.keys(next).forEach(function (id) { seen[id] = next[id]; });
  }

  function projectileCues(state) {
    var next = {}, list = state.projectiles || [], i, p, id;
    for (i = 0; i < list.length; i++) {
      p = list[i]; if (!p || !p.alive || p.kind !== "melon") continue;
      id = "melon:" + (p.id == null ? i : p.id); next[id] = true;
      if (!projectiles[id]) play("melon_whoosh");
    }
    Object.keys(projectiles).forEach(function (id) { if (!next[id]) play("melon_splat"); });
    projectiles = next;
  }

  function update(state) {
    if (!state || !state.levelId) return;
    if (lastLevel !== state.levelId) { seen = {}; projectiles = {}; lastLevel = state.levelId; }
    var budget = { steps: 0, alerts: 0 };
    entities(state, "heroes", budget);
    entities(state, "enemies", budget);
    projectileCues(state);
  }

  function reset() { seen = {}; projectiles = {}; lastLevel = ""; }

  var api = { update: update, reset: reset, surface: surface };
  if (typeof window !== "undefined") window.PAudioEvents = api;
  if (typeof global !== "undefined") global.PAudioEvents = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}());
