#!/usr/bin/env node
"use strict";

var cp = require("child_process");
var baseline = require("./visual-baselines.json");
var session = "patriot-e2e-" + process.pid;
var env = Object.assign({}, process.env, { AGENT_BROWSER_SESSION: session });
var url = process.env.PATRIOT_URL || "http://127.0.0.1:8088/";

function browser(args, quiet) {
  var out = cp.spawnSync("npx", ["agent-browser"].concat(args), { env: env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (out.status !== 0) throw new Error((out.stderr || out.stdout || "agent-browser failed").trim());
  if (!quiet && out.stdout) process.stdout.write(out.stdout);
  return (out.stdout || "").trim();
}

var scenario = String.raw`(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const hold=async code=>{window.dispatchEvent(new KeyboardEvent("keydown",{code,bubbles:true}));await sleep(135);window.dispatchEvent(new KeyboardEvent("keyup",{code,bubbles:true}));await sleep(180)};
  for(let i=0;i<7;i++)await hold("Enter");
  await sleep(1100);await hold("Enter");await sleep(300);
  if(PScreens.get()!=="PLAY")throw new Error("menu path stopped at "+PScreens.get());
  PScreens.set("PAUSE");
  await PLayers.preload([1,2,3,4,5]);
  const hashCtx=ctx=>{const d=ctx.getImageData(0,0,480,270).data;let h=2166136261;for(let i=0;i<d.length;i+=16){h^=d[i];h=Math.imul(h,16777619);h^=d[i+1];h=Math.imul(h,16777619);h^=d[i+2];h=Math.imul(h,16777619)}return h>>>0};
  const levels=[];
  for(const world of PDataRaw.campaign.worlds)for(const level of world.levels){
    PSim.loadLevel(PGame.state,level.id);PGame.state.tick=120;if(PGame.state.events)PGame.state.events.length=0;if(Array.isArray(PFx.particles))PFx.particles.length=0;PRender.draw(PGame.state,0);
    levels.push({id:level.id,loaded:!!PGame.state.level&&PGame.state.level.id===level.id,segment:!!PGame.state.segment,hash:hashCtx(PBoot.bctx)});
  }
  PSim.loadLevel(PGame.state,"w5l3");PGame.state.tick=120;if(PGame.state.events)PGame.state.events.length=0;if(Array.isArray(PFx.particles))PFx.particles.length=0;PGame.state.cage={walls:[0,0,0,0]};const hazards=[];
  for(const walls of [[0,0,0,0],[1,1,0,0],[0,0,1,1],[1,1,1,1]]){PGame.state.cage.walls=walls;PRender.draw(PGame.state,0);hazards.push({walls:walls.join(""),hash:hashCtx(PBoot.bctx)})}
  PGame.state.cage.shoveTel=60;PGame.state.cage.edge=2;PRender.draw(PGame.state,0);hazards.push({walls:"shove-near",hash:hashCtx(PBoot.bctx)});
  PGame.state.cage.shoveTel=0;PGame.state.cage.weightTel=84;PGame.state.cage.weightX=240;PGame.state.cage.weightD=24;PRender.draw(PGame.state,0);hazards.push({walls:"weight",hash:hashCtx(PBoot.bctx)});
  const canvas=document.createElement("canvas");canvas.width=480;canvas.height=270;const ctx=canvas.getContext("2d");
  const hash=()=>hashCtx(ctx);
  PGame.state.results={rank:"A",noHit:true,ippons:3};PGame.state.vs={id:"B5"};
  const names=["TITLE","ATTRACT","SAVE_SLOT","MODE","CHAR","DIFFICULTY","MAP","LEVEL_INTRO","PAUSE","SETTINGS","CONTINUE","RESULTS","GAME_OVER","VS","BOSS_DEFEAT","ENDING","CREDITS","POST_CREDIT"];
  const screens=[];for(const name of names){ctx.clearRect(0,0,480,270);PScreens.set(name);PScreens.draw(ctx,PGame.state);screens.push({name,hash:hash()})}
  return {ok:levels.every(x=>x.loaded&&x.segment)&&new Set(hazards.map(x=>x.hash)).size===hazards.length,levels,hazards,screens,atlas:PAnim.ready(),screenCount:screens.length};
})()`;

try {
  browser(["open", url]);
  browser(["wait", "900"], true);
  var result = browser(["eval", scenario], true);
  var errors = browser(["errors", "--json"], true);
  var consoleOut = browser(["console", "--json"], true);
  if (!/"ok"\s*:\s*true/.test(result)) throw new Error("scenario failed: " + result);
  var payload = JSON.parse(result), drift = [];
  payload.screens.forEach(function (row) { if (baseline.screens[row.name] !== row.hash) drift.push("screen " + row.name); });
  payload.levels.forEach(function (row) { if (baseline.levels[row.id] !== row.hash) drift.push("level " + row.id); });
  payload.hazards.forEach(function (row) { if (baseline.hazards[row.walls] !== row.hash) drift.push("hazard " + row.walls); });
  if (drift.length && process.env.PATRIOT_ACCEPT_VISUAL !== "1") {
    console.log(result); throw new Error("visual regression: " + drift.join(", "));
  }
  if (/"errors"\s*:\s*\[[^\]]/.test(errors) || /"messages"\s*:\s*\[[^\]]/.test(consoleOut)) {
    throw new Error("browser diagnostics not empty\n" + errors + "\n" + consoleOut);
  }
  console.log("browser e2e PASS: natural menus, 15 levels, 18 screens, six hazard states, exact visual baselines");
  console.log(result);
} finally {
  try { browser(["close"], true); } catch (closeError) {}
}
