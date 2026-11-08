"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const cp = require("node:child_process");
const {
  buildPlan,
  normalizeSuites,
  planPath,
} = require("../tools/plan-checks.cjs");
let checks = 0;
const ok = (value, message) => {
  checks++;
  assert.ok(value, message);
};
const catalog = {
  unit: ["chosen", "unrelated", "bad"],
  browser: ["browser-chosen", "browser-unrelated"],
  input: ["browser-chosen"],
  visual: ["browser-chosen"],
  delivery: ["delivery-chosen"],
};
const code = "ARCLINE/game/dist/game.js";
const sourcePlan = () => ({
  version: 1,
  change: "One controller correction",
  reason: "Exercise its own turn handoff",
  files: [code],
  suites: { unit: ["chosen"] },
  checks: {},
  excluded: [{ scope: "unrelated media", reason: "No media source changed" }],
});
const build = (plan) =>
  buildPlan({ changedFiles: [code, planPath], plan, catalog });
const docs = buildPlan({
  changedFiles: [
    "ARCLINE/docs/a.md",
    "ARCLINE/evidence/result.json",
    "gallery/other.js",
  ],
  plan: sourcePlan(),
  catalog,
});
ok(
  docs.mode === "documentation" &&
    docs.suiteCount === 0 &&
    !docs.needsBrowser &&
    !docs.needsPython,
  "documentation does not start archived game checks or install browser/Python",
);
ok(
  Object.values(docs.checks).every((value) => !value),
  "no hidden generation, packaging or audio probe",
);
assert.throws(
  () => buildPlan({ changedFiles: [code], plan: sourcePlan(), catalog }),
  /verification-plan/,
);
checks++;
assert.throws(() => build({ ...sourcePlan(), files: [] }), /未記載/);
checks++;
assert.throws(
  () => build({ ...sourcePlan(), files: [code, "ARCLINE/game/dist/other.js"] }),
  /今回未変更/,
);
checks++;
assert.throws(
  () => build({ ...sourcePlan(), suites: { unit: ["typo"] } }),
  /Unknown suite/,
);
checks++;
assert.throws(
  () => build({ ...sourcePlan(), checks: { generatd: true } }),
  /Unknown/,
);
checks++;
assert.throws(() => normalizeSuites([], catalog), /object/);
checks++;
assert.throws(() => build({ ...sourcePlan(), suites: undefined }), /object/);
checks++;
assert.throws(() => build({ ...sourcePlan(), checks: true }), /object/);
checks++;
assert.throws(
  () => build({ ...sourcePlan(), suitez: {} }),
  /Unknown plan field/,
);
checks++;
const minimal = build(sourcePlan());
ok(
  minimal.suiteCount === 1 && minimal.suites.unit[0] === "chosen",
  "the declared correction runs one suite",
);
ok(
  !minimal.needsBrowser && !minimal.needsPython,
  "unit-only plan has no unrelated capabilities",
);
const full = buildPlan({ changedFiles: [], plan: null, catalog, full: true });
ok(
  full.suiteCount === new Set(Object.values(catalog).flat()).size,
  "manual full run contains each script once",
);
ok(
  !full.suites.input.length && !full.suites.visual.length,
  "input and visual aliases do not rerun browser scripts",
);
ok(
  full.checks.baseline && full.checks.package && full.checks.nativeAudio,
  "explicit full verification retains its acceptance checks",
);
const manual = build({
  ...sourcePlan(),
  suites: {},
  manual: ["Inspect the changed label"],
});
ok(
  manual.suiteCount === 0 && manual.manual.length === 1,
  "explicit manual work is reported separately from automatic checks",
);

// Use the actual CLIs in an isolated fake project. Unrelated scripts leave a
// marker if they run, so these checks verify execution rather than source text.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "arcline-plan-"));
const app = path.join(temp, "ARCLINE"),
  tools = path.join(app, "game/tools"),
  tests = path.join(app, "game/tests");
const output = path.join(temp, "out"),
  markers = path.join(temp, "markers");
fs.mkdirSync(tools, { recursive: true });
fs.mkdirSync(tests, { recursive: true });
fs.mkdirSync(markers);
for (const name of [
  "test.cjs",
  "plan-checks.cjs",
  "run-check-plan.cjs",
  "select_browser.cjs",
])
  fs.copyFileSync(
    path.join(__dirname, "../tools", name),
    path.join(tools, name),
  );
fs.writeFileSync(path.join(tests, "suites.json"), JSON.stringify(catalog));
for (const name of [
  "chosen",
  "unrelated",
  "browser-chosen",
  "browser-unrelated",
])
  fs.writeFileSync(
    path.join(tests, name + ".test.cjs"),
    "require('node:fs').writeFileSync(require('node:path').join(process.env.CHECK_MARKERS," +
      JSON.stringify(name) +
      "),'ran');\n",
  );
fs.writeFileSync(path.join(tests, "bad.test.cjs"), "process.exitCode=7;\n");
const stub = path.join(app, "node_modules/playwright");
fs.mkdirSync(stub, { recursive: true });
fs.writeFileSync(
  path.join(stub, "index.js"),
  "exports.chromium={executablePath:()=>process.execPath,launch:()=>{throw Error('Unplanned audio probe')}};\n",
);
const env = {
  ...process.env,
  ARCLINE_EVIDENCE_DIR: output,
  ARCLINE_CHROMIUM: process.execPath,
  ARCLINE_PLAN_BASE: "",
  ARCLINE_FULL_CHECKS: "false",
  CHECK_MARKERS: markers,
  GITHUB_OUTPUT: path.join(temp, "outputs"),
  GITHUB_STEP_SUMMARY: path.join(temp, "summary"),
};
const node = (script, args = []) =>
  cp.spawnSync(process.execPath, [path.join(tools, script), ...args], {
    cwd: app,
    env,
    encoding: "utf8",
  });
const git = (args) =>
  cp.execFileSync("git", args, {
    cwd: temp,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  let result = node("test.cjs", ["unit", "chosen"]);
  ok(
    result.status === 0 && fs.existsSync(path.join(markers, "chosen")),
    "named suite executes",
  );
  ok(
    !fs.existsSync(path.join(markers, "unrelated")),
    "unrelated archived unit suite is not executed",
  );
  let report = JSON.parse(
    fs.readFileSync(path.join(output, "SUITE_UNIT.json")),
  );
  ok(
    report.rows.length === 1 && report.selection === "explicit",
    "report shows the executed scope",
  );
  fs.unlinkSync(path.join(markers, "chosen"));
  result = node("test.cjs", ["unit", "typo"]);
  ok(
    result.status !== 0 && !fs.readdirSync(markers).length,
    "unknown suite fails without falling back to all",
  );
  result = node("test.cjs", ["browser", "browser-chosen", "--list"]);
  ok(
    result.status === 0 &&
      JSON.parse(result.stdout).suites.length === 1 &&
      !fs.readdirSync(markers).length,
    "planning preview performs no test or browser/audio access",
  );
  result = node("test.cjs", ["unit", "bad", "unrelated", "--fail-fast"]);
  report = JSON.parse(fs.readFileSync(path.join(output, "SUITE_UNIT.json")));
  ok(
    result.status !== 0 &&
      report.status === "FAIL" &&
      report.skipped[0] === "unrelated",
    "failure stops scoped execution and records unexecuted suites",
  );
  ok(
    !fs.existsSync(path.join(markers, "unrelated")),
    "failure does not continue into unrelated work",
  );

  fs.mkdirSync(path.dirname(path.join(temp, code)), { recursive: true });
  fs.writeFileSync(path.join(temp, code), "module.exports=1;\n");
  git(["init", "--quiet"]);
  git(["add", "."]);
  git([
    "-c",
    "user.name=CI test",
    "-c",
    "user.email=ci@example.invalid",
    "-c",
    "commit.gpgSign=false",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  ]);
  fs.writeFileSync(path.join(temp, code), "module.exports=2;\n");
  const scoped = {
    ...sourcePlan(),
    suites: {
      unit: ["chosen"],
      browser: ["browser-chosen"],
      input: ["browser-chosen"],
    },
  };
  fs.writeFileSync(path.join(temp, planPath), JSON.stringify(scoped));
  const planFile = path.join(output, "CHECK_PLAN.json");
  result = node("plan-checks.cjs", ["--base", "HEAD", "--output", planFile]);
  ok(
    result.status === 0,
    "CLI validates a new plan against actual tracked and untracked Git changes: " +
      result.stderr,
  );
  const planned = JSON.parse(fs.readFileSync(planFile));
  ok(
    planned.suiteCount === 2 && planned.needsBrowser && !planned.needsPython,
    "overlapping browser/input selections run once",
  );
  result = node("run-check-plan.cjs", [planFile]);
  ok(result.status === 0, "planned execution succeeds: " + result.stderr);
  ok(
    fs.existsSync(path.join(markers, "chosen")) &&
      fs.existsSync(path.join(markers, "browser-chosen")),
    "declared unit and browser scripts both execute",
  );
  ok(
    !fs.existsSync(path.join(markers, "unrelated")) &&
      !fs.existsSync(path.join(markers, "browser-unrelated")),
    "planned execution never starts unselected suites",
  );
  ok(
    !fs.existsSync(path.join(output, "BROWSER_AAC_PROBE.json")),
    "non-audio plan performs no native audio probe",
  );
  ok(
    JSON.parse(fs.readFileSync(path.join(output, "BROWSER_SELECTION.json")))
      .nativeAudio === false,
    "browser selection explicitly reports audio as unchecked",
  );
  report = JSON.parse(
    fs.readFileSync(path.join(output, "CHECK_PLAN_RUN.json")),
  );
  ok(
    report.rows.length === 2 &&
      report.rows.every((row) => row.status === "PASS"),
    "no generation, baseline, package or duplicate browser stage ran",
  );

  git(["add", path.relative(temp, path.join(temp, code)), planPath]);
  git([
    "-c",
    "user.name=CI test",
    "-c",
    "user.email=ci@example.invalid",
    "-c",
    "commit.gpgSign=false",
    "commit",
    "--quiet",
    "-m",
    "planned correction",
  ]);
  fs.writeFileSync(path.join(temp, code), "module.exports=3;\n");
  result = node("plan-checks.cjs", ["--base", "HEAD", "--output", planFile]);
  ok(
    result.status !== 0 && result.stderr.includes("verification-plan"),
    "a later code correction cannot silently reuse an old committed plan",
  );
  console.log("PASS verification planning: " + checks + " checks");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
