#!/usr/bin/env node
"use strict";

var cp = require("child_process");
var session = "patriot-perf-" + process.pid;
var env = Object.assign({}, process.env, { AGENT_BROWSER_SESSION: session });
var url = process.env.PATRIOT_URL || "http://127.0.0.1:8088/";

function browser(args) {
  var out = cp.spawnSync("npx", ["agent-browser"].concat(args), { env: env, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  if (out.status !== 0) throw new Error((out.stderr || out.stdout || "agent-browser failed").trim());
  return (out.stdout || "").trim();
}

var scenario = String.raw`(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const hold=async code=>{dispatchEvent(new KeyboardEvent("keydown",{code,bubbles:true}));await sleep(135);dispatchEvent(new KeyboardEvent("keyup",{code,bubbles:true}));await sleep(180)};
  for(let i=0;i<7;i++)await hold("Enter");await sleep(900);await hold("Enter");await sleep(300);
  if(PScreens.get()!=="PLAY")throw new Error("menu path stopped at "+PScreens.get());
  const original=CanvasRenderingContext2D.prototype.drawImage;let calls=0,maxCalls=0;
  CanvasRenderingContext2D.prototype.drawImage=function(){calls++;return original.apply(this,arguments)};
  const frames=[],heap0=performance.memory?performance.memory.usedJSHeapSize:0;let heapMax=heap0,last=performance.now();
  await new Promise(resolve=>{function frame(now){frames.push(now-last);last=now;maxCalls=Math.max(maxCalls,calls);calls=0;if(performance.memory)heapMax=Math.max(heapMax,performance.memory.usedJSHeapSize);if(frames.length>=360)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)});
  CanvasRenderingContext2D.prototype.drawImage=original;frames.shift();frames.sort((a,b)=>a-b);
  return {frames:frames.length,p50:frames[Math.floor(frames.length*.50)],p95:frames[Math.floor(frames.length*.95)],p99:frames[Math.floor(frames.length*.99)],max:frames[frames.length-1],maxDrawCalls:maxCalls,heapGrowth:heapMax-heap0};
})()`;

try {
  browser(["open", url]); browser(["wait", "700"]);
  var out = JSON.parse(browser(["eval", scenario]));
  var errors = [];
  if (out.p99 > 20) errors.push("p99 frame " + out.p99.toFixed(2) + "ms exceeds desktop smoke budget");
  if (out.maxDrawCalls > 220) errors.push("draw calls " + out.maxDrawCalls + " exceed PRD cap");
  if (out.heapGrowth > 32 * 1024 * 1024) errors.push("browser heap grew more than 32 MiB");
  console.log("browser perf: p50=" + out.p50.toFixed(2) + "ms p95=" + out.p95.toFixed(2) + "ms p99=" + out.p99.toFixed(2) +
    "ms max=" + out.max.toFixed(2) + "ms drawCalls=" + out.maxDrawCalls + " heapDelta=" + (out.heapGrowth / 1048576).toFixed(1) + "MiB");
  errors.forEach(function (error) { console.error("browser perf error: " + error); });
  if (errors.length) process.exitCode = 1;
} finally {
  try { browser(["close"]); } catch (closeError) {}
}
