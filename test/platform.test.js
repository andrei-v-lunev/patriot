"use strict";
var assert = require("assert");
var calls = [];
var listeners = {};
var screen = "PLAY";

global.document = {
  hidden: false,
  referrer: "",
  documentElement: { classList: { add: function () {} }, requestFullscreen: function () { calls.push("native-full"); } },
  addEventListener: function (name, fn) { listeners[name] = fn; },
  createElement: function () { return {}; }
};
global.window = {
  location: { hostname: "127.0.0.1" },
  navigator: { userAgent: "test" },
  scrollTo: function () {},
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
  screen: { fullscreen: { request: function () { calls.push("yandex-full"); return Promise.resolve(); } } },
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
Platform.fullscreen();
assert.strictEqual(calls.filter(function (x) { return x === "yandex-full"; }).length, 1,
  "first user gesture delegates fullscreen to the Yandex host SDK");
Platform.fullscreen();
assert.strictEqual(calls.filter(function (x) { return x === "yandex-full"; }).length, 1,
  "fullscreen request is not spammed after the first accepted gesture");

var hostedSrc = "";
global.document = {
  hidden: false,
  referrer: "https://yandex.ru/games/app/12345",
  documentElement: { requestFullscreen: function () { calls.push("native-full"); return Promise.resolve(); }, classList: { add: function () {} } },
  addEventListener: function () {},
  createElement: function () { return {}; },
  head: { appendChild: function (el) { hostedSrc = el.src; } }
};
global.window = {
  location: { hostname: "patriot.up.railway.app" }, navigator: { userAgent: "test" },
  addEventListener: function () {}, scrollTo: function () {}
};
delete require.cache[require.resolve("../js/platform.js")];
var HostedPlatform = require("../js/platform.js");
HostedPlatform.init();
assert.strictEqual(hostedSrc, "https://sdk.games.s3.yandex.net/sdk.js",
  "self-hosted game embedded by Yandex loads the absolute SDK URL");
HostedPlatform.fullscreen();
assert(calls.indexOf("native-full") >= 0, "ordinary supported browsers use the native fullscreen API");
console.log("ok optional Yandex readiness, gameplay, and lifecycle bridge");
