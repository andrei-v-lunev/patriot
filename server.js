"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var ROOT = path.resolve(__dirname);
var DEFAULT_PORT = 8088;
var DEFAULT_HOST = "127.0.0.1";
var PUBLIC_DIRS = { assets: true, css: true, data: true, js: true };
var TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function urlPath(url) {
  var raw = (url || "/").split("?")[0];
  try {
    raw = decodeURIComponent(raw);
  } catch (err) {
    raw = "/";
  }
  if (raw === "/") return "/index.html";
  return raw;
}

function safeFile(url) {
  var rel = urlPath(url).replace(/^\/+/, "");
  var first = rel.split(/[\\/]/)[0];
  if (rel !== "index.html" && !PUBLIC_DIRS[first]) return null;
  var file = path.resolve(ROOT, rel);
  if (file !== ROOT && file.indexOf(ROOT + path.sep) !== 0) return null;
  return file;
}

function createServer() {
  return http.createServer(function (req, res) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      res.end("Method Not Allowed");
      return;
    }
    if (urlPath(req.url) === "/health") {
      res.writeHead(200, {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      });
      res.end(req.method === "HEAD" ? undefined : "ok");
      return;
    }
    var file = safeFile(req.url);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    var type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "cache-control": file === path.join(ROOT, "index.html") ? "no-cache" : "public, max-age=3600",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff"
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  });
}

function listen(port, host, cb) {
  if (typeof port === "function") {
    cb = port;
    port = undefined;
    host = undefined;
  } else if (typeof host === "function") {
    cb = host;
    host = undefined;
  }
  var bindPort = port == null ? Number(process.env.PORT || DEFAULT_PORT) : Number(port);
  var bindHost = host || process.env.HOST || DEFAULT_HOST;
  var server = createServer();
  server.listen(bindPort, bindHost, function () {
    if (cb) cb(null, server);
  });
  server.on("error", function (err) {
    if (cb) cb(err);
  });
  return server;
}

if (require.main === module) {
  listen(undefined, undefined, function (err, server) {
    if (err) {
      console.error(err.message || err);
      process.exit(1);
    }
    var addr = server.address();
    console.log("THE PATRIOT http://" + addr.address + ":" + addr.port + "/");
  });
}

module.exports = {
  createServer: createServer,
  listen: listen,
  DEFAULT_PORT: DEFAULT_PORT,
  ROOT: ROOT
};
