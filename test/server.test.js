"use strict";
var assert = require("assert");
var http = require("http");
var Server = require("../server.js");

function request(port, target, method) {
  return new Promise(function (resolve, reject) {
    var req = http.request({ host: "127.0.0.1", port: port, path: target, method: method || "GET" }, function (res) {
      var chunks = [];
      res.on("data", function (chunk) { chunks.push(chunk); });
      res.on("end", function () { resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }); });
    });
    req.on("error", reject); req.end();
  });
}

(async function () {
  var server = await new Promise(function (resolve, reject) {
    Server.listen(0, "127.0.0.1", function (err, next) { if (err) reject(err); else resolve(next); });
  });
  var port = server.address().port;
  try {
    var health = await request(port, "/health");
    assert.strictEqual(health.status, 200); assert.strictEqual(health.body, "ok");
    assert.strictEqual((await request(port, "/health", "HEAD")).body, "");
    var index = await request(port, "/");
    assert.strictEqual(index.status, 200); assert(index.body.indexOf("<canvas") >= 0);
    assert.strictEqual(index.headers["x-content-type-options"], "nosniff");
    var runtimeJs = await request(port, "/js/game.js");
    assert.strictEqual(runtimeJs.status, 200); assert.strictEqual(runtimeJs.headers["cache-control"], "no-cache");
    assert.strictEqual((await request(port, "/assets/ui/club-crest.png")).status, 200);
    var manifest = await request(port, "/assets/manifest.webmanifest");
    assert.strictEqual(manifest.status, 200); assert(/application\/manifest\+json/.test(manifest.headers["content-type"]));
    assert.strictEqual(manifest.headers["cache-control"], "no-cache");
    assert.strictEqual((await request(port, "/server.js")).status, 404, "server source must not be public");
    assert.strictEqual((await request(port, "/package.json")).status, 404, "package metadata must not be public");
    assert.strictEqual((await request(port, "/test/sim.test.js")).status, 404, "tests must not be public");
    assert.strictEqual((await request(port, "/%2e%2e/package.json")).status, 404, "encoded traversal must be rejected");
    assert.strictEqual((await request(port, "/", "POST")).status, 405);
    console.log("ok Railway healthcheck and public static-file allowlist");
  } finally {
    await new Promise(function (resolve) { server.close(resolve); });
  }
}()).catch(function (err) { console.error(err); process.exit(1); });
