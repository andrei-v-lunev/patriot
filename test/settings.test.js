var assert = require("assert");
var PSettings = require("../js/settings.js");

var total = 0;
function test(name, fn) {
  fn();
  total++;
  process.stdout.write("ok - " + name + "\n");
}

test("exports the same API globally and through CommonJS", function () {
  assert.strictEqual(global.PSettings, PSettings);
});

test("defaults include audio, accessibility, touch, and assist settings", function () {
  var value = PSettings.defaults();
  assert.deepStrictEqual(value.audio, { master: 0.8, music: 0.7, sfx: 1, vo: 1 });
  assert.strictEqual(value.vibration, "full");
  assert.strictEqual(value.reducedMotion, false);
  assert.deepStrictEqual(value.video, { scaleMode: "integer", crt: "off", screenShake: 1, flashReduction: false, showFps: false });
  assert.deepStrictEqual(value.accessibility, { colorblind: "off", hints: "once", subtitleSize: "m" });
  assert.deepStrictEqual(value.touch, { layout: "right", scale: 1 });
  assert.deepStrictEqual(value.assist, {
    autoUkemi: false, gripAssist: false, slowTelegraph: false,
    noPitDeath: false, infiniteMeter: false, holdToGrip: false, damageTaken: 1
  });
});

test("defaults expose independent P1/P2 keyboard and gamepad maps", function () {
  var value = PSettings.defaults();
  assert.deepStrictEqual(value.bindings.p1.keyboard.strike, ["KeyJ", "KeyZ"]);
  assert.deepStrictEqual(value.bindings.p2.keyboard.strike, ["Numpad1", "Period"]);
  assert.deepStrictEqual(value.bindings.p1.gamepad.grip, ["Button1"]);
  assert.deepStrictEqual(value.bindings.p2.gamepad.grip, ["Button1"]);
  value.bindings.p1.gamepad.grip[0] = "Button20";
  assert.deepStrictEqual(value.bindings.p2.gamepad.grip, ["Button1"]);
  assert.deepStrictEqual(PSettings.defaults().bindings.p1.gamepad.grip, ["Button1"]);
});

test("canonical defaults validate without conflicts", function () {
  var value = PSettings.defaults();
  assert.deepStrictEqual(PSettings.validate(value), []);
  assert.deepStrictEqual(PSettings.detectConflicts(value), []);
});

test("remap returns a validated copy and leaves its input unchanged", function () {
  var source = PSettings.defaults();
  var result = PSettings.remap(source, "p1", "keyboard", "strike", "KeyQ");
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(result.settings.bindings.p1.keyboard.strike, ["KeyQ"]);
  assert.deepStrictEqual(source.bindings.p1.keyboard.strike, ["KeyJ", "KeyZ"]);
  assert.deepStrictEqual(PSettings.validate(result.settings), []);
});

test("same player/device conflicts are detected and blocked", function () {
  var source = PSettings.defaults();
  var result = PSettings.remap(source, "p1", "keyboard", "jump", "KeyJ");
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.errors[0], "binding conflict");
  assert.deepStrictEqual(result.conflicts, [{
    player: "p1", device: "keyboard", binding: "KeyJ", actions: ["strike", "jump"]
  }]);
  assert.deepStrictEqual(result.settings.bindings.p1.keyboard.jump, ["KeyK", "KeyX"]);
});

test("intentional cross-player keyboard overlap is allowed", function () {
  var result = PSettings.remap(PSettings.defaults(), "p2", "keyboard", "jump", "KeyK");
  assert.strictEqual(result.ok, true);
});

test("invalid selectors and device-specific binding tokens are rejected", function () {
  var source = PSettings.defaults();
  assert.strictEqual(PSettings.remap(source, "p3", "keyboard", "jump", "KeyQ").ok, false);
  assert.strictEqual(PSettings.remap(source, "p1", "mouse", "jump", "Button0").ok, false);
  assert.strictEqual(PSettings.remap(source, "p1", "keyboard", "fly", "KeyQ").ok, false);
  assert.strictEqual(PSettings.remap(source, "p1", "gamepad", "jump", "KeyQ").ok, false);
  assert.strictEqual(PSettings.remap(source, "p1", "keyboard", "jump", "Button0").ok, false);
});

test("validation rejects malformed settings and imported conflicts", function () {
  var value = PSettings.defaults();
  value.audio.music = 2;
  value.vibration = "strong";
  value.video.screenShake = 0.25;
  value.accessibility.colorblind = "rainbow";
  value.touch.scale = 2;
  value.assist.autoUkemi = "yes";
  value.bindings.p1.keyboard.jump = ["KeyJ"];
  var errors = PSettings.validate(value).join("\n");
  assert.match(errors, /audio.music/);
  assert.match(errors, /vibration/);
  assert.match(errors, /video.screenShake/);
  assert.match(errors, /accessibility.colorblind/);
  assert.match(errors, /touch.scale/);
  assert.match(errors, /assist.autoUkemi/);
  assert.match(errors, /KeyJ conflicts/);
});

test("binding reset can target a device, player, or all maps", function () {
  var changed = PSettings.remap(PSettings.defaults(), "p1", "keyboard", "strike", "KeyQ").settings;
  changed.audio.music = 0.25;
  var device = PSettings.resetBindings(changed, "p1", "keyboard");
  assert.strictEqual(device.ok, true);
  assert.deepStrictEqual(device.settings.bindings.p1.keyboard.strike, ["KeyJ", "KeyZ"]);
  assert.strictEqual(device.settings.audio.music, 0.25);
  assert.deepStrictEqual(changed.bindings.p1.keyboard.strike, ["KeyQ"]);
  assert.deepStrictEqual(PSettings.resetBindings(changed).settings.bindings, PSettings.defaults().bindings);
});

test("serialization round-trips validated settings", function () {
  var value = PSettings.remap(PSettings.defaults(), "p2", "gamepad", "jump", "Button10").settings;
  var text = PSettings.serialize(value);
  var parsed = PSettings.deserialize(text);
  assert.strictEqual(parsed.ok, true);
  assert.deepStrictEqual(parsed.settings, value);
  assert.strictEqual(PSettings.serialize(parsed.settings), text);
});

test("serialization and deserialization fail closed", function () {
  var bad = PSettings.defaults();
  bad.reducedMotion = "false";
  assert.throws(function () { PSettings.serialize(bad); }, /Invalid settings/);
  assert.deepStrictEqual(PSettings.deserialize("{"), { ok: false, settings: null, errors: ["invalid JSON"] });
  var parsed = PSettings.deserialize(JSON.stringify(bad));
  assert.strictEqual(parsed.ok, false);
  assert.strictEqual(parsed.settings, null);
  assert.match(parsed.errors.join("\n"), /reducedMotion/);
});

process.stdout.write(total + " settings tests passed\n");
