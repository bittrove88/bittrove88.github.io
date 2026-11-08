"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const { spawnSync } = require("node:child_process");
const { modes, normalizeSuites } = require("./plan-checks.cjs");
const root = path.resolve(__dirname, "../.."),
  file = process.argv[2];
if (!file) throw Error("Pass the CHECK_PLAN.json produced by plan-checks.cjs");
const plan = JSON.parse(fs.readFileSync(file, "utf8"));
plan.suites = normalizeSuites(plan.suites, require("../tests/suites.json"));
const output = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-ci";
fs.mkdirSync(output, { recursive: true });
const report = {
  status: "PASS",
  change: plan.change,
  reason: plan.reason,
  rows: [],
  manual: plan.manual || [],
  excluded: plan.excluded || [],
};
function run(label, command, args) {
  const started = Date.now(),
    result = spawnSync(command, args, {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
  report.rows.push({
    label,
    status: result.status === 0 ? "PASS" : "FAIL",
    ms: Date.now() - started,
  });
  if (result.status !== 0) throw result.error || Error(label + " failed");
}
function suites(mode) {
  const names = plan.suites[mode];
  if (!names.length) return;
  const args = [path.join(__dirname, "test.cjs"), mode, ...names];
  if (!plan.checks.nativeAudio) args.push("--skip-aac-probe");
  if (plan.mode !== "full") args.push("--fail-fast");
  run(mode + ": " + names.join(", "), process.execPath, args);
}
try {
  suites("unit");
  if (plan.checks.baseline)
    run("layout baseline", "python3", [
      "game/tools/create_layout_baseline.py",
      "--output",
      process.env.ARCLINE_BASELINE_ROOT || "/tmp/arcline-baseline",
    ]);
  for (const mode of modes.filter(
    (key) => key !== "unit" && key !== "delivery",
  ))
    suites(mode);
  if (plan.checks.generated)
    run("generated output", "python3", [
      "game/tools/check_generated.py",
      "--output",
      path.join(output, "GENERATED.json"),
    ]);
  if (plan.checks.package)
    run("package", "python3", [
      "game/tools/build_playables.py",
      "--output",
      process.env.ARCLINE_PACKAGE_DIR || "/tmp/arcline-package",
    ]);
  suites("delivery");
} catch (error) {
  report.status = "FAIL";
  console.error(error.message);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    path.join(output, "CHECK_PLAN_RUN.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    report.status + " planned verification (" + report.rows.length + " steps)",
  );
}
