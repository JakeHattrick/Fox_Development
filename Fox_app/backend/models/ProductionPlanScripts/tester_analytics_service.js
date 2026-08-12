// tester_analytics_service.js
// Simulated Wareconn / Fixture / Tester analytics processing service
// Pop-out terminal + typewriter streaming logs

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

/* =========================================================
   POP-OUT TERMINAL
========================================================= */
if (!process.env.TESTER_MONITOR_CHILD) {
  const scriptPath = path.resolve(__filename);
  const scriptDir = path.dirname(scriptPath);

  spawn(
    "wt.exe",
    [
      "cmd",
      "/k",
      `cd /d "${scriptDir}" && set TESTER_MONITOR_CHILD=1 && title Tester Analytics Service && node "${scriptPath}"`
    ],
    { detached: true, stdio: "ignore" }
  ).unref();

  process.exit();
}

/* =========================================================
   TYPEWRITER ENGINE
========================================================= */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function typeLine(text) {
  const full = `[${ts()}] ${text}`;
  fs.appendFileSync("tester_analytics.log", full + "\n");

  for (let i = 0; i < full.length; i++) {
    process.stdout.write(full[i]);
    await sleep(5 + Math.random() * 15); // typing jitter
  }
  process.stdout.write("\n");
}

async function typeBlank() {
  process.stdout.write("\n");
  await sleep(10);
}

/* =========================================================
   ANALYTICS SERVICE
========================================================= */

const FIXTURES = [
  "NCT005-01","NCT005-02","NCT010-01",
  "G5-FTA-07","G5-ASSY2-02","G5-ASSY2-04"
];

const STATIONS = ["ASSY1","ASSY2","FINAL_TEST","PACKOUT"];
const GEN = ["Gen3","Gen5"];

function r(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function sn(){ return "SN" + Math.floor(100000 + Math.random()*900000); }
function ts(){ return new Date().toISOString().replace("T"," ").split(".")[0]; }

async function section(title){
  await typeLine("==============================================================");
  await typeLine(title);
  await typeLine("==============================================================");
}

async function simulateQueryBlock(fixture, station, genType){
  const windowHrs = [24,48,72][Math.floor(Math.random()*3)];
  const runtime = (Math.random()*4000+2000).toFixed(2);
  const pass = Math.floor(Math.random()*120+80);
  const fail = Math.floor(Math.random()*15);

  await typeLine(`Executing runtime aggregation query...`);
  await typeLine(`SELECT fixture_no, station, SUM(runtime_sec)`);
  await typeLine(`FROM testboard_master_log`);
  await typeLine(`WHERE fixture_no='${fixture}'`);
  await typeLine(`AND station='${station}'`);
  await typeLine(`AND gen_type='${genType}'`);
  await typeLine(`AND start_time >= NOW() - INTERVAL '${windowHrs} hours'`);

  await typeLine(`→ rows scanned: ${Math.floor(Math.random()*9000+2000)}`);
  await typeLine(`→ runtime_sec: ${runtime}`);
  await typeLine(`→ pass_count: ${pass}`);
  await typeLine(`→ fail_count: ${fail}`);
  await typeLine(`→ yield: ${(pass/(pass+fail)*100).toFixed(2)} %`);
}

async function simulateSNFlow(fixture, station){
  const serial = sn();
  await typeLine(`SN_TRACK: ${serial} ENTER ${station} (${fixture})`);
  await typeLine(`SN_TRACK: ${serial} PROCESSING`);
  const rt = (Math.random()*25+8).toFixed(2);
  const ok = Math.random()>0.1;
  await typeLine(`SN_TRACK: ${serial} EXIT ${station} runtime=${rt}s result=${ok?"PASS":"FAIL"}`);
}

async function simulateUtil(fixture){
  const util = (Math.random()*30+60).toFixed(2);
  const idle = (100-util).toFixed(2);
  await typeLine(`UTIL_METRIC: fixture=${fixture}`);
  await typeLine(`  active=${util}% idle=${idle}%`);
  await typeLine(`  status=${util>85?"SATURATED":"NORMAL"}`);
}

async function simulateCycle(){
  const fixture = r(FIXTURES);
  const station = r(STATIONS);
  const genType = r(GEN);

  await section(`PROCESSING FIXTURE ${fixture} (${genType})`);

  await typeLine(`Loading fixture configuration...`);
  await typeLine(`Resolving station map...`);
  await typeLine(`Wareconn stream sync OK`);
  await typeLine(`Gen classification → ${genType}`);

  await simulateQueryBlock(fixture, station, genType);

  await typeLine(`Computing rolling utilization window...`);
  await simulateUtil(fixture);

  await typeLine(`Updating station yield cache...`);
  await typeLine(`Cache commit OK`);

  await simulateSNFlow(fixture, station);

  if(Math.random()>0.6){
    await typeLine(`WEEKLY_ROLLUP: recomputing 7d aggregates`);
    await typeLine(`GROUP BY week_start, fixture_no`);
    await typeLine(`Aggregation complete`);
  }

  await typeLine(`Persisting analytics snapshot...`);
  await typeLine(`Write → tester_fixture_daily_stats`);
  await typeLine(`Write → tester_station_yield`);
  await typeLine(`Write → tester_sn_history`);

  await typeLine(`Cycle complete`);
  await typeBlank();
}

/* =========================================================
   STARTUP LOOP
========================================================= */

async function main(){
  await section("TESTER ANALYTICS SERVICE START");
  await typeLine("Mode: PRODUCTION");
  await typeLine("Source: Wareconn event bus");
  await typeLine("DB: postgres://tester_analytics");
  await typeLine("Fixtures loaded: " + FIXTURES.length);
  await typeLine("Stations loaded: " + STATIONS.length);
  await typeLine("Gen types: Gen3, Gen5");
  await typeLine("Service heartbeat: 5s");
  await typeBlank();

  while (true) {
    await simulateCycle();
    await sleep(1500 + Math.random()*2000); // natural pause
  }
}

main();