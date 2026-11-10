"use strict";
// Record the current game's native, no-save attack demonstrations. No simulated
// particles, trajectories or victory edits are added. Attack timings are native;
// tactical replays preserve the site's documented 0.75x trajectory presentation.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const crypto = require("node:crypto"),
  { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "../../.."),
  site = path.join(root, "ARCLINE/site");
const output = path.join(site, "media"),
  release = require("../runtime.json");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const artOnly = process.argv.includes("--art-only");
const webmOnly = process.argv.includes("--webm-only");
const ids =
  artOnly || webmOnly
    ? []
    : process.argv.slice(2).length
      ? process.argv.slice(2)
      : [
          "hana",
          "sora",
          "rico",
          "gun",
          "rin",
          "ban",
          "hibari",
          "mogu",
          "koro",
          "yui",
          "destruction",
          "reflection",
          "teleport",
          "warning",
        ];
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  let file = path.resolve(root, "." + pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory())
    file += "/index.html";
  fs.readFile(file, (err, bytes) => {
    if (err) return res.writeHead(404).end();
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    res.end(bytes);
  });
});
(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const rows = [],
    errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1040, height: 660 },
    });
    // Any accidental access to campaign storage makes recording fail.
    await page.addInitScript(() => {
      globalThis.captureFrames = new Set();
      const nativeRAF = requestAnimationFrame;
      globalThis.requestAnimationFrame = (callback) => {
        const id = nativeRAF((time) => {
          captureFrames.delete(id);
          callback(time);
        });
        captureFrames.add(id);
        return id;
      };
      for (const key of ["getItem", "setItem", "removeItem"])
        Storage.prototype[key] = () => {
          throw Error("Showcase capture must not access campaign storage");
        };
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(
      "http://127.0.0.1:" +
        server.address().port +
        "/ARCLINE/game/attack-review/",
    );
    await page.waitForFunction(() => !!globalThis.review);
    await page.addStyleTag({
      content:
        "html,body{margin:0;padding:0;background:#153b46}main{padding:0!important;max-width:none!important}main>*{display:none!important}#canvas{display:block!important;width:1024px!important;height:576px!important;aspect-ratio:16/9!important;border:0!important;border-radius:0!important}",
    });
    await page.addScriptTag({ url: "/ARCLINE/site/scenes.js" });
    await page.addScriptTag({ url: "/ARCLINE/game/dist/map-camera.js" });
    await page.evaluate(() => {
      for (const id of captureFrames) cancelAnimationFrame(id);
      captureFrames.clear();
    });
    for (const id of ids) {
      const result = await page.evaluate(async (id) => {
        const canvas = document.getElementById("canvas");
        let c,
          duration,
          seekAge,
          posterAge,
          proof = null;
        const copy = (value) => JSON.parse(JSON.stringify(value));
        if (ArcSiteScenes[id]) {
          const scene = ArcSiteScenes[id],
            length = (step) => 0.9 + step.plan.duration / 0.75 + 1.2;
          duration = scene.steps.reduce(
            (total, step) => total + length(step),
            0,
          );
          const renderer = ArcRender.create(canvas),
            points = scene.steps.flatMap((step) => [
              ...step.plan.path.filter(
                (p) => p.x >= 0 && p.x <= (step.before.spec.worldWidth || 1000),
              ),
              ...[step.before, step.after].flatMap((state) =>
                state.units.flatMap((u) => [
                  { x: u.x - 85, y: u.y - 110 },
                  { x: u.x + 85, y: u.y + 45 },
                ]),
              ),
            ]);
          const area = {
            left: Math.min(...points.map((p) => p.x)) - 24,
            right: Math.max(...points.map((p) => p.x)) + 24,
            top: Math.min(...points.map((p) => p.y)) - 24,
            bottom: Math.max(...points.map((p) => p.y)) + 24,
          };
          seekAge = (elapsed) => {
            let time = elapsed,
              index = 0;
            while (
              index < scene.steps.length - 1 &&
              time >= length(scene.steps[index])
            )
              time -= length(scene.steps[index++]);
            const step = scene.steps[index],
              flight = Math.max(0, (time - 0.9) * 0.75),
              result = flight >= step.plan.duration,
              source = result ? step.after : step.before,
              state = {
                ...source,
                units: source.units.map((u) => ({ ...u })),
                angle: step.plan.side === 0 ? step.plan.angle : source.angle,
                power: step.plan.power,
              };
            if (step.walkFrom && time < 0.9) {
              const unit = state.units[step.walkSide],
                t = time / 0.9;
              unit.x = step.walkFrom.x + (unit.x - step.walkFrom.x) * t;
              unit.y = step.walkFrom.y + (unit.y - step.walkFrom.y) * t;
            }
            if (id === "teleport" && index === 0 && result) {
              const end = step.after.units[0],
                from = end.animation?.from || end,
                t = Math.min(1, (flight - step.plan.duration) * 3);
              Object.assign(state.units[0], {
                x: from.x + (end.x - from.x) * t,
                y: from.y + (end.y - from.y) * t,
              });
            }
            const cameraView = ArcMapCamera.fit(area, {
              left: 12,
              top: 12,
              width: 1000,
              height: 552,
            });
            renderer.draw(state, {
              cameraView,
              presentationFrame: { top: 0, bottom: 576 },
              canAim: false,
              reducedMotion: false,
              time: elapsed,
              shot: time >= 0.9 && !result ? step.plan : null,
              flight,
              tail: result
                ? { shot: step.plan, age: flight - step.plan.duration }
                : null,
            });
          };
          c = {
            row: { id: "tactic:" + id, name: id },
            before: scene.steps[0].before,
            plan: scene.steps[0].plan,
            scene: "campaign",
            motion: { duration },
          };
          posterAge = id === "reflection" ? 2.4 : 1.5;
          proof = scene.proof;
        } else if (id === "warning") {
          const original = ArcAttackReview.create("technique:E_60", "map"),
            before = copy(original.before),
            moved = copy(before);
          ArcEngine.geometry.move(moved, 0, 100);
          const plan = ArcEngine.cpuPlan(moved, () => 0.5),
            after = copy(moved);
          ArcEngine.resolve(after, plan);
          if (
            !(
              original.plan.damage[0] > 0 &&
              plan.damage[0] === 0 &&
              plan.angle === original.plan.angle &&
              plan.power === original.plan.power
            )
          )
            throw Error("No valid frozen-warning avoidance");
          const motion = ArcAttackMotion.create(plan),
            renderer = ArcRender.create(canvas),
            cameraView = ArcMapCamera.fit(ArcMapCamera.bounds(before), {
              left: 16,
              top: 20,
              width: 992,
              height: 536,
            });
          duration = 2 + motion.duration + 1.4;
          seekAge = (elapsed) => {
            const age = Math.max(0, elapsed - 2),
              flight = motion.at(age),
              result = age >= motion.duration;
            const state = copy(elapsed < 2 ? before : result ? after : moved);
            if (elapsed >= 0.8 && elapsed < 2)
              ArcEngine.geometry.move(
                state,
                0,
                100 * Math.min(1, (elapsed - 0.8) / 0.9),
              );
            renderer.draw(state, {
              cameraView,
              presentationFrame: { top: 0, bottom: 576 },
              canAim: false,
              time: elapsed,
              reducedMotion: false,
              shot: elapsed >= 2 && !result ? plan : null,
              flight,
              tail:
                elapsed >= 2 && result
                  ? { shot: plan, age: age - motion.duration }
                  : null,
            });
          };
          c = {
            row: { id: "tactic:warning", name: "予告回避" },
            before,
            plan,
            scene: "campaign",
            motion,
          };
          posterAge = 1.7;
          proof = {
            valid: true,
            stage: 60,
            walk: 100,
            from: before.units[0].x,
            to: moved.units[0].x,
            frozenTarget: before.telegraph.targetX,
            damageWithoutMove: original.plan.damage[0],
            damageAfterMove: plan.damage[0],
            sameAngle: plan.angle === original.plan.angle,
            samePower: plan.power === original.plan.power,
          };
        } else {
          c = review.select("special:" + id);
          review.seek(0);
          duration = 0.8 + c.motion.duration + 1.4;
          seekAge = (elapsed) => {
            const age = Math.max(0, elapsed - 0.8),
              physical = c.motion.at(Math.min(c.motion.duration, age));
            review.seek(
              age > c.motion.duration
                ? c.plan.duration + (age - c.motion.duration)
                : physical,
            );
          };
          posterAge = 0.8 + c.motion.duration * 0.65;
        }
        const stream = canvas.captureStream(30),
          recorder = new MediaRecorder(stream, {
            mimeType: "video/webm;codecs=vp9",
            videoBitsPerSecond: 2200000,
          }),
          chunks = [];
        const done = new Promise((resolve) => {
          recorder.ondataavailable = (e) => {
            if (e.data.size) chunks.push(e.data);
          };
          recorder.onstop = resolve;
        });
        recorder.start();
        const started = performance.now();
        await new Promise((resolve) => {
          function tick(now) {
            const elapsed = (now - started) / 1000;
            seekAge(elapsed);
            if (elapsed >= duration) return resolve();
            requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
        recorder.stop();
        await done;
        stream.getTracks().forEach((t) => t.stop());
        seekAge(posterAge);
        const bytes = new Uint8Array(
          await new Blob(chunks, { type: "video/webm" }).arrayBuffer(),
        );
        let binary = "";
        for (let n = 0; n < bytes.length; n += 8192)
          binary += String.fromCharCode(...bytes.subarray(n, n + 8192));
        return {
          base64: btoa(binary),
          proof,
          id,
          attackId: c.row.id,
          name: c.row.name,
          duration,
          physicalDuration: c.plan.duration,
          motionDuration: c.motion.duration,
          bullets: c.plan.bullets.filter((b) => !b.effect).length,
          damage: c.plan.damage,
          stage: c.before.stage,
          scene: c.scene,
          width: canvas.width,
          height: canvas.height,
        };
      }, id);
      const temp = path.join(output, id + ".webm"),
        file = id + ".mp4",
        poster = id + ".jpg";
      fs.writeFileSync(temp, Buffer.from(result.base64, "base64"));
      delete result.base64;
      execFileSync("ffmpeg", [
        "-y",
        "-loglevel",
        "error",
        "-i",
        temp,
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "25",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        path.join(output, file),
      ]);
      fs.unlinkSync(temp);
      await page.locator("#canvas").screenshot({
        path: path.join(output, poster),
        type: "jpeg",
        quality: 88,
      });
      rows.push({
        ...result,
        file: "media/" + file,
        poster: "media/" + poster,
        sha256: sha(fs.readFileSync(path.join(output, file))),
        posterSha256: sha(fs.readFileSync(path.join(output, poster))),
        source:
          "Native production attack demonstration, staged no-save example; not a campaign victory recording",
      });
      console.log("Recorded " + id + " " + result.duration.toFixed(2) + "s");
    }
    if (errors.length) throw Error(errors.join("\n"));
    const sources = [
      "game/runtime.json",
      ...require("../runtime.json").scripts.map((n) => "game/dist/" + n),
      "game/dist/attack-review-model.js",
      "game/attack-review/review.js",
      "site/scenes.js",
    ];
    const sourceHashes = Object.fromEntries(
      [...new Set(sources)].map((name) => [
        name,
        sha(fs.readFileSync(path.join(root, "ARCLINE", name))),
      ]),
    );
    const artwork = [];
    for (const id of [
      "gun",
      "hana",
      "sora",
      "rico",
      "rin",
      "ban",
      "hibari",
      "mogu",
      "koro",
      "yui",
    ]) {
      const source = "assets/ending/roll-cutouts/players/" + id + ".png",
        file = "media/" + id + "-art.webp";
      execFileSync("ffmpeg", [
        "-y",
        "-loglevel",
        "error",
        "-i",
        path.join(root, "ARCLINE", source),
        "-vf",
        "scale=256:160:force_original_aspect_ratio=decrease",
        "-c:v",
        "libwebp",
        "-quality",
        "85",
        path.join(site, file),
      ]);
      artwork.push({
        id,
        source,
        sourceSha256: sha(fs.readFileSync(path.join(root, "ARCLINE", source))),
        file,
        sha256: sha(fs.readFileSync(path.join(site, file))),
      });
    }
    const manifestPath = path.join(site, "showcase-captures.json"),
      previous = fs.existsSync(manifestPath)
        ? JSON.parse(fs.readFileSync(manifestPath))
        : null;
    if (previous && previous.version !== release.version && ids.length < 14)
      throw Error("Recapture every clip for a new version");
    const captures = [
      ...(previous?.captures || []).filter((row) => !ids.includes(row.id)),
      ...rows,
    ];
    if (!artOnly) {
      for (const row of captures) {
        row.webm = row.file.replace(/\.mp4$/, ".webm");
        execFileSync("ffmpeg", [
          "-y",
          "-loglevel",
          "error",
          "-i",
          path.join(site, row.file),
          "-an",
          "-c:v",
          "libvpx-vp9",
          "-b:v",
          "0",
          "-crf",
          "32",
          "-cpu-used",
          "4",
          "-row-mt",
          "1",
          "-threads",
          "2",
          path.join(site, row.webm),
        ]);
        row.webmSha256 = sha(fs.readFileSync(path.join(site, row.webm)));
        console.log("Encoded WebM " + row.id);
      }
    }
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          version: release.version,
          kind: "Native no-save attack demonstrations",
          recording:
            "1024x576, 30fps canvas recording, silent H.264 MP4 and VP9 WebM transcodes of the same frames. Specials use native crafted motion at 1x; terrain replays preserve documented 0.75x flight; warning example uses native motion at 1x.",
          sourceHashes,
          artwork,
          captures,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
