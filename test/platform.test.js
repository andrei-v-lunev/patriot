"use strict";
var assert = require("assert");
var calls = [];
var listeners = {};
var screen = "PLAY";

global.document = {
  hidden: false,
  addEventListener: function (name, fn) { listeners[name] = fn; },
  createElement: function () { return {}; }
};
global.window = {
  location: { hostname: "127.0.0.1" },
  addEventListener: function (name, fn) { listeners[name] = fn; },
  PScreens: { get: function () { return screen; }, set: function (next) { screen = next; calls.push("screen:" + next); } },
  PAudio: { suspend: function () { calls.push("audio:stop"); }, resume: function () { calls.push("audio:start"); } }
};
global.PScreens = global.window.PScreens;
global.PAudio = global.window.PAudio;
delete require.cache[require.resolve("../js/platform.js")];
var Platform = require("../js/platform.js");
var events = {};
var sdk = {
  on: function (name, fn) { events[name] = fn; },
  features: {
    LoadingAPI: { ready: function () { calls.push("ready"); } },
    GameplayAPI: { start: function () { calls.push("play"); }, stop: function () { calls.push("stop"); } }
  }
};

Platform.init();
Platform.attach(sdk);
Platform.ready();
Platform.screen("PLAY");
assert.deepStrictEqual(calls.slice(0, 2), ["ready", "play"], "Yandex readiness and gameplay start are marked once");
events.game_api_pause();
assert.strictEqual(screen, "PAUSE", "platform pause enters the pause screen");
assert(calls.indexOf("audio:stop") >= 0 && calls.indexOf("stop") >= 0, "platform pause stops audio and gameplay markup");
events.game_api_resume();
assert.strictEqual(screen, "PLAY", "platform resume returns only an externally paused game to play");
assert(calls.indexOf("audio:start") >= 0 && calls.filter(function (x) { return x === "play"; }).length === 2,
  "platform resume restarts audio and gameplay markup");
Platform.screen("PAUSE");
Platform.screen("PAUSE");
assert.strictEqual(calls.filter(function (x) { return x === "stop"; }).length, 2, "duplicate screen updates do not duplicate SDK stop calls");
console.log("ok optional Yandex readiness, gameplay, and lifecycle bridge");
