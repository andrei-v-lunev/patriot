/* Validated settings and remappable control defaults. Wiring is intentionally external. */
(function () {
  var VERSION = 1;
  var PLAYERS = ["p1", "p2"];
  var DEVICES = ["keyboard", "gamepad"];
  var ACTIONS = [
    "up", "down", "left", "right", "strike", "jump", "grip",
    "special", "tag", "ukemi", "guard", "dash", "pause", "peek"
  ];

  var KEYBOARD = {
    p1: {
      up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"],
      left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
      strike: ["KeyJ", "KeyZ"], jump: ["KeyK", "KeyX"],
      grip: ["KeyL", "KeyC"], special: ["KeyU", "KeyV"],
      tag: ["KeyI", "KeyB"], ukemi: ["KeyO", "KeyN"],
      guard: ["Space"], dash: ["ShiftLeft", "ShiftRight"],
      pause: ["Escape", "KeyP"], peek: []
    },
    p2: {
      up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"],
      strike: ["Numpad1", "Period"], jump: ["Numpad2", "Slash"],
      grip: ["Numpad3", "ShiftRight"], special: ["Numpad5", "Semicolon"],
      tag: ["Numpad6", "Quote"], ukemi: ["Numpad0", "Comma"],
      guard: ["NumpadEnter", "ControlRight"], dash: [], pause: ["Escape", "KeyP"], peek: []
    }
  };

  var GAMEPAD = {
    up: ["Axis1-", "Button12"], down: ["Axis1+", "Button13"],
    left: ["Axis0-", "Button14"], right: ["Axis0+", "Button15"],
    strike: ["Button2"], jump: ["Button0"], grip: ["Button1"],
    special: ["Button3"], tag: ["Button5"], ukemi: ["Button4"],
    guard: ["Button6"], dash: ["Button7"], pause: ["Button9"], peek: ["Button8"]
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function defaultBindings() {
    return {
      p1: { keyboard: clone(KEYBOARD.p1), gamepad: clone(GAMEPAD) },
      p2: { keyboard: clone(KEYBOARD.p2), gamepad: clone(GAMEPAD) }
    };
  }

  function defaults() {
    return {
      v: VERSION,
      audio: { master: 0.8, music: 0.7, sfx: 1, vo: 1 },
      vibration: "full",
      reducedMotion: false,
      video: { scaleMode: "integer", crt: "off", screenShake: 1, flashReduction: false, showFps: false },
      accessibility: { colorblind: "off", hints: "once", subtitleSize: "m" },
      touch: { layout: "right", scale: 1 },
      assist: {
        autoUkemi: false, gripAssist: false, slowTelegraph: false,
        noPitDeath: false, infiniteMeter: false, holdToGrip: false,
        damageTaken: 1
      },
      bindings: defaultBindings()
    };
  }

  function has(list, value) {
    return list.indexOf(value) >= 0;
  }

  function bindingValid(device, binding) {
    if (typeof binding !== "string" || binding.length < 2 || binding.length > 32) return false;
    if (device === "gamepad") return /^(Button([0-9]|[12][0-9]|3[01])|Axis([0-9]|1[0-5])[+-])$/.test(binding);
    return !/^(Button|Axis)/.test(binding) && /^[A-Za-z][A-Za-z0-9]{1,31}$/.test(binding);
  }

  function detectConflicts(settings, onlyPlayer, onlyDevice) {
    var out = [];
    var players = onlyPlayer ? [onlyPlayer] : PLAYERS;
    var devices = onlyDevice ? [onlyDevice] : DEVICES;
    var p, d, a, i, binding, seen, actions;
    if (!settings || !settings.bindings) return out;
    for (p = 0; p < players.length; p++) {
      for (d = 0; d < devices.length; d++) {
        seen = {};
        for (a = 0; a < ACTIONS.length; a++) {
          actions = settings.bindings[players[p]] && settings.bindings[players[p]][devices[d]];
          actions = actions && actions[ACTIONS[a]];
          if (!Array.isArray(actions)) continue;
          for (i = 0; i < actions.length; i++) {
            binding = actions[i];
            if (!seen[binding]) seen[binding] = [];
            if (seen[binding].indexOf(ACTIONS[a]) < 0) seen[binding].push(ACTIONS[a]);
          }
        }
        Object.keys(seen).sort().forEach(function (key) {
          if (seen[key].length > 1) {
            out.push({ player: players[p], device: devices[d], binding: key, actions: seen[key] });
          }
        });
      }
    }
    return out;
  }

  function validate(settings) {
    var errors = [];
    var p, d, a, i, map, values;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) return ["settings must be an object"];
    if (settings.v !== VERSION) errors.push("v must equal " + VERSION);
    if (!settings.audio || typeof settings.audio !== "object") errors.push("audio must be an object");
    else ["master", "music", "sfx", "vo"].forEach(function (key) {
      var value = settings.audio[key];
      if (typeof value !== "number" || !isFinite(value) || value < 0 || value > 1) errors.push("audio." + key + " must be 0..1");
    });
    if (!has(["off", "weak", "full"], settings.vibration)) errors.push("vibration must be off, weak, or full");
    if (typeof settings.reducedMotion !== "boolean") errors.push("reducedMotion must be boolean");
    if (!settings.video || typeof settings.video !== "object") errors.push("video must be an object");
    else {
      if (!has(["integer", "fit"], settings.video.scaleMode)) errors.push("video.scaleMode must be integer or fit");
      if (!has(["off", "scanlines", "full"], settings.video.crt)) errors.push("video.crt is invalid");
      if (!has([0, 0.5, 1], settings.video.screenShake)) errors.push("video.screenShake is invalid");
      if (typeof settings.video.flashReduction !== "boolean") errors.push("video.flashReduction must be boolean");
      if (typeof settings.video.showFps !== "boolean") errors.push("video.showFps must be boolean");
    }
    if (!settings.accessibility || typeof settings.accessibility !== "object") errors.push("accessibility must be an object");
    else {
      if (!has(["off", "deutan", "protan", "tritan"], settings.accessibility.colorblind)) errors.push("accessibility.colorblind is invalid");
      if (!has(["once", "always", "off"], settings.accessibility.hints)) errors.push("accessibility.hints is invalid");
      if (!has(["s", "m", "l"], settings.accessibility.subtitleSize)) errors.push("accessibility.subtitleSize is invalid");
    }
    if (!settings.touch || !has(["right", "mirrored"], settings.touch.layout)) errors.push("touch.layout must be right or mirrored");
    if (!settings.touch || typeof settings.touch.scale !== "number" || !isFinite(settings.touch.scale) || settings.touch.scale < 0.8 || settings.touch.scale > 1.3) errors.push("touch.scale must be 0.8..1.3");
    if (!settings.assist || typeof settings.assist !== "object") errors.push("assist must be an object");
    else {
      ["autoUkemi", "gripAssist", "slowTelegraph", "noPitDeath", "infiniteMeter", "holdToGrip"].forEach(function (key) {
        if (typeof settings.assist[key] !== "boolean") errors.push("assist." + key + " must be boolean");
      });
      if ([0.25, 0.5, 0.75, 1].indexOf(settings.assist.damageTaken) < 0) errors.push("assist.damageTaken is invalid");
    }
    if (!settings.bindings || typeof settings.bindings !== "object") errors.push("bindings must be an object");
    else for (p = 0; p < PLAYERS.length; p++) {
      for (d = 0; d < DEVICES.length; d++) {
        map = settings.bindings[PLAYERS[p]] && settings.bindings[PLAYERS[p]][DEVICES[d]];
        if (!map || typeof map !== "object") { errors.push("bindings." + PLAYERS[p] + "." + DEVICES[d] + " is missing"); continue; }
        for (a = 0; a < ACTIONS.length; a++) {
          values = map[ACTIONS[a]];
          if (!Array.isArray(values)) { errors.push(PLAYERS[p] + "." + DEVICES[d] + "." + ACTIONS[a] + " must be an array"); continue; }
          for (i = 0; i < values.length; i++) if (!bindingValid(DEVICES[d], values[i])) errors.push("invalid " + DEVICES[d] + " binding: " + values[i]);
          if (values.length !== values.filter(function (value, index) { return values.indexOf(value) === index; }).length) errors.push(PLAYERS[p] + "." + DEVICES[d] + "." + ACTIONS[a] + " has duplicates");
        }
      }
    }
    detectConflicts(settings).forEach(function (conflict) {
      errors.push(conflict.player + "." + conflict.device + "." + conflict.binding + " conflicts: " + conflict.actions.join(","));
    });
    return errors;
  }

  function remap(settings, player, device, action, binding) {
    var next, conflicts, errors;
    if (!has(PLAYERS, player) || !has(DEVICES, device) || !has(ACTIONS, action) || !bindingValid(device, binding)) {
      return { ok: false, settings: settings, errors: ["invalid remap request"], conflicts: [] };
    }
    errors = validate(settings);
    if (errors.length) return { ok: false, settings: settings, errors: errors, conflicts: [] };
    next = clone(settings);
    next.bindings[player][device][action] = [binding];
    conflicts = detectConflicts(next, player, device);
    if (conflicts.length) return { ok: false, settings: settings, errors: ["binding conflict"], conflicts: conflicts };
    return { ok: true, settings: next, errors: [], conflicts: [] };
  }

  function resetBindings(settings, player, device) {
    var errors = validate(settings);
    var next, fresh;
    if (errors.length || (player && !has(PLAYERS, player)) || (device && !has(DEVICES, device))) return { ok: false, settings: settings, errors: errors.length ? errors : ["invalid reset scope"] };
    next = clone(settings);
    fresh = defaultBindings();
    if (!player) next.bindings = fresh;
    else if (!device) next.bindings[player] = fresh[player];
    else next.bindings[player][device] = fresh[player][device];
    return { ok: true, settings: next, errors: [] };
  }

  function serialize(settings) {
    var errors = validate(settings);
    if (errors.length) throw new Error("Invalid settings: " + errors.join("; "));
    return JSON.stringify(settings);
  }

  function deserialize(text) {
    var value, errors;
    try { value = JSON.parse(text); } catch (e) { return { ok: false, settings: null, errors: ["invalid JSON"] }; }
    errors = validate(value);
    return { ok: errors.length === 0, settings: errors.length ? null : clone(value), errors: errors };
  }

  var active = null;
  function use(settings) {
    if (validate(settings).length) return false;
    active = clone(settings);
    return true;
  }
  function get() {
    if (!active) active = defaults();
    return clone(active);
  }

  var api = {
    VERSION: VERSION, PLAYERS: PLAYERS.slice(), DEVICES: DEVICES.slice(), ACTIONS: ACTIONS.slice(),
    defaults: defaults, reset: defaults, validate: validate, detectConflicts: detectConflicts,
    remap: remap, resetBindings: resetBindings, serialize: serialize, deserialize: deserialize,
    use: use, get: get
  };
  if (typeof window !== "undefined") window.PSettings = api;
  if (typeof global !== "undefined") global.PSettings = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
