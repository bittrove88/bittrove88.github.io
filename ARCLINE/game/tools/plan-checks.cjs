"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process");
const modes = ["unit", "browser", "input", "visual", "delivery"];
const planPath = "ARCLINE/verification-plan.json";
const workflowPath = ".github/workflows/arcline-checks.yml";
const checkNames = [
  "generated",
  "baseline",
  "package",
  "python",
  "nativeAudio",
];
const inScope = (file) => file.startsWith("ARCLINE/") || file === workflowPath;
const documentation = (file) =>
  /\.md$/i.test(file) || file.startsWith("ARCLINE/evidence/");
function text(value, field) {
  if (typeof value !== "string" || !value.trim())
    throw Error(field + " must explain the change");
  return value;
}
function normalizeSuites(requested, catalog) {
  if (!requested || typeof requested !== "object" || Array.isArray(requested))
    throw Error("suites must be an object of named selections");
  const seen = new Set(),
    selected = {};
  for (const key of Object.keys(requested))
    if (!modes.includes(key)) throw Error("Unknown test mode: " + key);
  for (const mode of modes) {
    const names = requested[mode] || [];
    if (!Array.isArray(names))
      throw Error("Suite selection must be an array: " + mode);
    selected[mode] = [];
    for (const name of names) {
      if (!(catalog[mode] || []).includes(name))
        throw Error("Unknown suite: " + mode + "/" + name);
      if (!seen.has(name)) {
        seen.add(name);
        selected[mode].push(name);
      }
    }
  }
  return selected;
}
function buildPlan({ changedFiles, plan, catalog, full = false }) {
  const files = [...new Set(changedFiles.filter(inScope))].sort();
  const code = files.filter(
    (file) => file !== planPath && !documentation(file),
  );
  let mode,
    change,
    reason,
    requested,
    checks,
    manual = [],
    excluded = [];
  if (full) {
    mode = "full";
    change = "手動で指定した全体検証";
    reason = "Workflow dispatchで全件実行を明示指定";
    requested = catalog;
    checks = {
      generated: true,
      baseline: true,
      package: true,
      python: true,
      nativeAudio: true,
    };
  } else if (!code.length && !files.includes(planPath)) {
    mode = "documentation";
    change = "文書・検証記録の変更";
    reason = "実行コードの差分がないため差分の形式を確認";
    requested = {};
    checks = {};
  } else {
    if (!files.includes(planPath))
      throw Error(
        "実行コードの変更には、今回の修正に合わせた " +
          planPath +
          " を更新してください。全件実行への自動切替は行いません。",
      );
    if (!plan || plan.version !== 1)
      throw Error("verification-plan.json must use version 1");
    for (const key of Object.keys(plan))
      if (
        ![
          "version",
          "change",
          "reason",
          "files",
          "suites",
          "checks",
          "manual",
          "excluded",
        ].includes(key)
      )
        throw Error("Unknown plan field: " + key);
    mode = "planned";
    change = text(plan.change, "change");
    reason = text(plan.reason, "reason");
    if (
      !Array.isArray(plan.files) ||
      plan.files.some((file) => typeof file !== "string" || !inScope(file))
    )
      throw Error(
        "files must list changed code paths relative to the repository",
      );
    const declared = new Set(plan.files),
      missing = code.filter((file) => !declared.has(file)),
      stale = [...declared].filter((file) => !code.includes(file));
    if (missing.length || stale.length)
      throw Error(
        "計画とコード差分が不一致: 未記載=" +
          JSON.stringify(missing) +
          " 今回未変更=" +
          JSON.stringify(stale),
      );
    requested = plan.suites;
    checks = plan.checks ?? {};
    manual = plan.manual ?? [];
    excluded = plan.excluded ?? [];
    if (
      !Array.isArray(manual) ||
      manual.some((value) => typeof value !== "string")
    )
      throw Error("manual must list separately reported manual checks");
    if (
      !Array.isArray(excluded) ||
      excluded.some(
        (value) =>
          !value ||
          typeof value.scope !== "string" ||
          typeof value.reason !== "string",
      )
    )
      throw Error("excluded must list scope and reason");
  }
  if (!checks || typeof checks !== "object" || Array.isArray(checks))
    throw Error("checks must be an object of boolean options");
  for (const [key, value] of Object.entries(checks))
    if (!checkNames.includes(key) || typeof value !== "boolean")
      throw Error("Unknown or non-boolean check: " + key);
  const selected = normalizeSuites(requested, catalog);
  const flags = Object.fromEntries(
    checkNames.map((key) => [key, checks[key] === true]),
  );
  flags.baseline ||= !!requested.visual?.length;
  flags.package ||= !!selected.delivery.length;
  return {
    version: 1,
    mode,
    change,
    reason,
    files,
    suites: selected,
    checks: flags,
    manual,
    excluded,
    suiteCount: Object.values(selected).reduce(
      (total, names) => total + names.length,
      0,
    ),
    needsBrowser: modes.some((key) => key !== "unit" && selected[key].length),
    needsPython:
      flags.python || flags.generated || flags.baseline || flags.package,
  };
}
function main() {
  const root = path.resolve(__dirname, "../../.."),
    args = process.argv.slice(2);
  const arg = (name, fallback) =>
    args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  let base = arg("--base", process.env.ARCLINE_PLAN_BASE || "HEAD^");
  if (/^0+$/.test(base)) base = "HEAD^";
  base = cp
    .execFileSync(
      "git",
      ["rev-parse", "--verify", "--end-of-options", base + "^{commit}"],
      { cwd: root, encoding: "utf8" },
    )
    .trim();
  const git = (values) =>
    cp
      .execFileSync("git", values, { cwd: root, encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
  const files = [
    ...git(["diff", "--name-only", "--no-renames", "-z", base]),
    ...git(["ls-files", "--others", "--exclude-standard", "-z"]),
  ];
  const config = path.join(root, planPath);
  const plan = buildPlan({
    changedFiles: files,
    plan: fs.existsSync(config)
      ? JSON.parse(fs.readFileSync(config, "utf8"))
      : null,
    catalog: require("../tests/suites.json"),
    full: args.includes("--full") || process.env.ARCLINE_FULL_CHECKS === "true",
  });
  cp.execFileSync("git", ["diff", "--check", base], {
    cwd: root,
    stdio: "inherit",
  });
  const output = arg(
    "--output",
    path.join(
      process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-ci",
      "CHECK_PLAN.json",
    ),
  );
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ ...plan, base }, null, 2) + "\n");
  if (process.env.GITHUB_OUTPUT)
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      "needs_tests=" +
        (plan.suiteCount > 0) +
        "\nneeds_browser=" +
        plan.needsBrowser +
        "\nneeds_python=" +
        plan.needsPython +
        "\n",
    );
  const summary =
    [
      "### ARCLINE 検証計画",
      "",
      plan.change,
      "",
      plan.reason,
      "",
      ...modes
        .filter((key) => plan.suites[key].length)
        .map((key) => "- " + key + ": " + plan.suites[key].join(", ")),
      "- 生成物: " +
        plan.checks.generated +
        " / 画面基準: " +
        plan.checks.baseline +
        " / 配布物: " +
        plan.checks.package,
      "- 選択スイート数: " + plan.suiteCount,
      ...plan.manual.map((value) => "- 手動確認（CIとは別）: " + value),
      ...plan.excluded.map(
        (value) => "- 対象外: " + value.scope + " — " + value.reason,
      ),
    ].join("\n") + "\n";
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
}
module.exports = { buildPlan, normalizeSuites, modes, planPath, documentation };
if (require.main === module)
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
