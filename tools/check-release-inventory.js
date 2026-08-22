#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var inventory = JSON.parse(fs.readFileSync(path.join(__dirname, "release-inventory.json"), "utf8"));

function inspect(data) {
  var errs = [];
  var seen = {};
  var domains = {};
  if (!data || data.schema !== 1 || !Array.isArray(data.requirements)) {
    return { errors: ["release inventory must use schema 1 with requirements[]"], pending: [], complete: [] };
  }
  data.requirements.forEach(function (req, i) {
    var at = "requirements[" + i + "]";
    if (!req || typeof req.id !== "string" || !/^[a-z0-9-]+$/.test(req.id)) errs.push(at + " has invalid id");
    else if (seen[req.id]) errs.push("duplicate requirement id " + req.id);
    else seen[req.id] = true;
    if (!req || typeof req.domain !== "string" || !req.domain) errs.push(at + " has no domain");
    else domains[req.domain] = true;
    if (!req || (req.status !== "pending" && req.status !== "complete")) errs.push(at + " has invalid status");
    if (!req || typeof req.gate !== "string" || !req.gate.trim()) errs.push(at + " has no evidence gate");
    (req && req.files || []).forEach(function (file) {
      if (!fs.existsSync(path.join(root, file))) errs.push(req.id + " missing evidence file " + file);
    });
  });
  ["audio", "systems", "environment", "art", "presentation", "qa", "release"].forEach(function (domain) {
    if (!domains[domain]) errs.push("missing release domain " + domain);
  });
  return {
    errors: errs,
    pending: data.requirements.filter(function (r) { return r.status === "pending"; }),
    complete: data.requirements.filter(function (r) { return r.status === "complete"; })
  };
}

function main() {
  var result = inspect(inventory);
  if (result.errors.length) {
    result.errors.forEach(function (e) { console.error("release inventory: " + e); });
    process.exitCode = 1;
    return;
  }
  console.log("release inventory: " + result.complete.length + " complete, " + result.pending.length + " pending");
  result.pending.forEach(function (r) { console.log("PENDING " + r.id + " — " + r.gate); });
  if (process.argv.indexOf("--strict") >= 0 && result.pending.length) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { inspect: inspect };
