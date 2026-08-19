/* JSON load + 60fps-frame → 120 Hz tick conversion. Never convert twice. */
(function () {
  function toTicks(frames60) {
    return (frames60 | 0) * 2;
  }

  function convertMove(def) {
    if (def._ticks) {
      throw new Error("frame conversion applied twice: " + (def.id || def.name));
    }
    var keys = [
      "startup",
      "active",
      "recovery",
      "hitstop",
      "hitstun",
      "blockstun",
      "gripHold",
      "throwArc",
      "iFrames",
      "cooldown"
    ];
    var i;
    for (i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (typeof def[k] === "number") def[k + "T"] = toTicks(def[k]);
    }
    if (def.iFrames && typeof def.iFrames === "object") {
      def.iFrames.fromT = toTicks(def.iFrames.from);
      def.iFrames.toT = toTicks(def.iFrames.to);
    }
    if (def.throw && typeof def.throw.arcFrames === "number") {
      def.throw.arcFramesT = toTicks(def.throw.arcFrames);
    }
    def._ticks = true;
    return def;
  }

  function convertAll(raw) {
    var moves = raw.moves || {};
    var id;
    for (id in moves) {
      if (Object.prototype.hasOwnProperty.call(moves, id)) {
        moves[id].id = id;
        convertMove(moves[id]);
      }
    }
    return raw;
  }

  function loadNode() {
    var path = require("path");
    var root = path.join(__dirname, "..", "data");
    return {
      moves: require(path.join(root, "moves.json")),
      enemies: require(path.join(root, "enemies.json")),
      strings: require(path.join(root, "strings.ru.json")),
      campaign: require(path.join(root, "campaign.json")),
      audio: require(path.join(root, "audio.json")),
      levels: {
        w1l1: require(path.join(root, "levels", "w1l1.json")),
        w1l2: require(path.join(root, "levels", "w1l2.json")),
        w1l3: require(path.join(root, "levels", "w1l3.json")),
        w2l1: require(path.join(root, "levels", "w2l1.json")),
        w2l2: require(path.join(root, "levels", "w2l2.json")),
        w2l3: require(path.join(root, "levels", "w2l3.json")),
        w3l1: require(path.join(root, "levels", "w3l1.json")),
        w3l2: require(path.join(root, "levels", "w3l2.json")),
        w3l3: require(path.join(root, "levels", "w3l3.json")),
        w4l1: require(path.join(root, "levels", "w4l1.json")),
        w4l2: require(path.join(root, "levels", "w4l2.json")),
        w4l3: require(path.join(root, "levels", "w4l3.json")),
        w5l1: require(path.join(root, "levels", "w5l1.json")),
        w5l2: require(path.join(root, "levels", "w5l2.json")),
        w5l3: require(path.join(root, "levels", "w5l3.json"))
      }
    };
  }

  var _raw = null;
  var _ready = null;

  function raw() {
    if (_raw) return _raw;
    if (typeof window !== "undefined" && window.PDataRaw) _raw = window.PDataRaw;
    else if (typeof require !== "undefined" && typeof module !== "undefined") _raw = loadNode();
    return _raw;
  }

  function ready() {
    if (_ready) return _ready;
    var r = raw();
    if (!r) return null;
    _ready = convertAll(r);
    return _ready;
  }

  function getMove(id) {
    var r = ready();
    return r && r.moves ? r.moves[id] : null;
  }

  function getEnemy(id) {
    var r = ready();
    return r && r.enemies && r.enemies.archetypes ? r.enemies.archetypes[id] : null;
  }

  function getLevel(id) {
    var r = ready();
    return r && r.levels ? r.levels[id] : null;
  }

  function getString(key) {
    var r = ready();
    if (!r || !r.strings) return key;
    return r.strings[key] != null ? r.strings[key] : key;
  }

  function validate(data) {
    var errs = [];
    data = data || ready();
    if (!data) {
      errs.push("no data");
      return errs;
    }
    var id, mv, arch, lid, lv, si, seg, wi, wave, spi, sp;
    for (id in data.moves) {
      if (!Object.prototype.hasOwnProperty.call(data.moves, id)) continue;
      mv = data.moves[id];
      var total = (mv.startup || 0) + (mv.active || 0) + (mv.recovery || 0);
      if (total < 1 && !mv.throw) errs.push(id + ": empty timing");
    }
    if (data.enemies && data.enemies.archetypes) {
      for (id in data.enemies.archetypes) {
        if (!Object.prototype.hasOwnProperty.call(data.enemies.archetypes, id)) continue;
        arch = data.enemies.archetypes[id];
        if (!arch.hp) errs.push(id + ": no hp");
      }
    }
    if (data.levels) {
      for (lid in data.levels) {
        if (!Object.prototype.hasOwnProperty.call(data.levels, lid)) continue;
        lv = data.levels[lid];
        for (si = 0; si < (lv.segments || []).length; si++) {
          seg = lv.segments[si];
          if (seg.mode === "belt" && seg.arena) {
            if (seg.arena.xMax - seg.arena.xMin < 464) errs.push(lid + " arena too narrow");
          }
          var waves = seg.waves || [];
          for (wi = 0; wi < waves.length; wi++) {
            wave = waves[wi];
            var n = 0;
            var sps = wave.spawns || [];
            for (spi = 0; spi < sps.length; spi++) {
              sp = sps[spi];
              n += sp.count || 1;
              if (sp.archetype && data.enemies && data.enemies.archetypes && !data.enemies.archetypes[sp.archetype]) {
                errs.push(lid + " unknown archetype " + sp.archetype);
              }
            }
            if (n > 12) errs.push(lid + " wave " + (wave.id || wi) + " has " + n + " spawns");
          }
        }
      }
    }
    return errs;
  }

  var api = {
    toTicks: toTicks,
    convertMove: convertMove,
    raw: raw,
    ready: ready,
    getMove: getMove,
    getEnemy: getEnemy,
    getLevel: getLevel,
    getString: getString,
    validate: validate
  };
  if (typeof window !== "undefined") window.PData = api;
  if (typeof global !== "undefined") global.PData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
