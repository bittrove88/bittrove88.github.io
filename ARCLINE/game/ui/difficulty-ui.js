(function (root) {
  "use strict";
  const modes = ["easy", "normal", "hard"];
  function create(hooks) {
    const $ = (id) => document.getElementById(id),
      en = () => root.ArcI18n.language === "en",
      names = {
        ja: ["イージー", "ノーマル", "ハード"],
        en: ["Easy", "Normal", "Hard"],
      };
    let choice = "easy",
      after = null,
      state,
      plan,
      flight = null,
      frame = 0,
      busy = false,
      result = "";
    const title = () => names[en() ? "en" : "ja"][modes.indexOf(choice)];
    function sync() {
      for (const input of document.querySelectorAll('input[name="difficulty"]'))
        input.checked = input.value === hooks.data().difficulty;
      $("lobbyDifficulty").textContent =
        (en() ? "Difficulty: " : "難易度：") +
        names[en() ? "en" : "ja"][modes.indexOf(hooks.data().difficulty)] +
        (en() ? " · Change ›" : " · 変更 ›");
    }
    function arena() {
      const E = root.ArcEngine,
        s = E.campaign(1, { equippedCharacterId: "gun", matchSeed: 155 });
      s.spec = {
        ...s.spec,
        floors: [
          [
            [0, 10],
            [100, 10],
          ],
        ],
        components: [],
        features: [],
        staticFeatures: [],
        phaseFeatures: null,
      };
      s.world = E.geometry.world(s.spec);
      s.pickups = [];
      s.units = [160, 375].map((x, i) => ({
        ...E.geometry.safePosition(s.world, x, 400),
        hp: i ? 3 : 7,
        maxHp: i ? 3 : 7,
        range: [35, 965],
        parts: [],
        exposed: 0,
        facing: i ? -1 : 1,
      }));
      s.angle = Number($("trialAngle").value);
      s.power = Number($("trialPower").value);
      s.difficulty = choice;
      return s;
    }
    function reset() {
      cancelAnimationFrame(frame);
      flight = null;
      result = "";
      state = arena();
      plan = root.ArcEngine.trajectory(state, 0, state.angle, state.power);
      render();
    }
    function draw(now = performance.now()) {
      if (!state || !root.ArcScreens.isOpen("difficultyIntro")) return;
      const canvas = $("difficultyTrial"),
        ctx = canvas.getContext("2d"),
        w = canvas.clientWidth,
        h = canvas.clientHeight,
        dpr = Math.min(2, root.devicePixelRatio || 1);
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.scale((dpr * w) / 750, (dpr * h) / 500);
      ctx.fillStyle = "#163e50";
      ctx.fillRect(0, 0, 750, 500);
      ctx.fillStyle = "#627f70";
      ctx.fillRect(0, 400, 750, 100);
      for (const [i, u] of state.units.entries()) {
        ctx.save();
        ctx.translate(u.x, u.y);
        if (!i)
          root.ArcCharacters.draw(ctx, "gun", {
            angle: state.angle,
            dir: 1,
            artStyle: "matte",
          });
        else {
          ctx.strokeStyle = "#f3d291";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, -22, 24, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      const guides =
        choice === "hard"
          ? root.ArcAimGuide.direction(
              root.ArcEngine.geometry.muzzle(state, 0, state.angle),
            )
          : root.ArcAimGuide.paths(plan, choice);
      ctx.strokeStyle = "#e5edb6";
      ctx.lineWidth = 3;
      ctx.setLineDash([3, 8]);
      for (const { path } of guides) {
        ctx.beginPath();
        path.forEach((p, i) =>
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
        );
        ctx.stroke();
      }
      ctx.setLineDash([]);
      if (flight) {
        const age = Math.min(plan.duration, (now - flight.start) / 1000),
          path = plan.bullets[0].path,
          point = path.find((p) => p.t >= age) || path.at(-1);
        ctx.fillStyle = "#ffcc72";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
        ctx.fill();
        if (age >= plan.duration) finishShot();
        else frame = requestAnimationFrame(draw);
      } else if (result) {
        ctx.fillStyle = "#ffd287";
        ctx.beginPath();
        ctx.arc(plan.end.x, plan.end.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    function render() {
      $("difficultyIntroTitle").textContent = en()
        ? "Aim, fire, then choose your guide"
        : "狙って、撃って、射線を選ぼう";
      $("difficultyIntroText").textContent = en()
        ? "Gun’s heavy shot falls quickly. Adjust the angle and power, fire, then compare all three guides on the same range. Enemy strength and physics do not change."
        : "ガンの重い弾は早めに落ちます。照準と強さを調整して試射し、同じ目標で3つの射線を比べましょう。敵の強さと弾道は変わりません。";
      $("initialDifficultyOptions").innerHTML = modes
        .map(
          (id, i) =>
            `<label><input type="radio" name="initialDifficulty" value="${id}" ${id === choice ? "checked" : ""} ${flight || busy ? "disabled" : ""}><span><strong>${names[en() ? "en" : "ja"][i]}${hooks.data().onboarding.tried.includes(id) ? " ✓" : ""}</strong><small>${(en() ? ["Full dotted trajectory", "Half dotted trajectory", "Direction only"] : ["点線をすべて表示", "点線を半分まで表示", "発射方向のみ"])[i]}</small></span></label>`,
        )
        .join("");
      for (const input of $("initialDifficultyOptions").querySelectorAll(
        "input",
      ))
        input.onchange = () => {
          choice = input.value;
          reset();
        };
      $("confirmDifficulty").textContent = en()
        ? "Start the adventure with this difficulty"
        : "この難易度で冒険を始める";
      $("confirmDifficulty").disabled =
        !!flight || busy || hooks.data().onboarding.tried.length !== 3;
      $("trialFire").textContent = en() ? "Fire" : "試射";
      $("trialRetry").textContent = en() ? "Retry" : "再試行";
      $("trialFire").disabled =
        $("trialRetry").disabled =
        $("trialAngle").disabled =
        $("trialPower").disabled =
          !!flight || busy;
      $("trialResult").textContent =
        title() +
        " · " +
        (result ||
          (en()
            ? "Adjust aim, then fire. Try each guide."
            : "照準を合わせて試射。3つの射線を試そう。"));
      draw();
    }
    async function finishShot() {
      flight = null;
      busy = true;
      root.ArcEngine.resolve(state, plan);
      const data = hooks.data(),
        previous = [...data.onboarding.tried];
      if (!previous.includes(choice)) data.onboarding.tried.push(choice);
      const ok = await hooks.persist();
      if (!ok) data.onboarding.tried = previous;
      result = ok
        ? en()
          ? "Contact confirmed. Retry or try another guide."
          : "着弾を確認。再試行するか、別の射線を試そう。"
        : en()
          ? "Could not save. Retry this shot."
          : "保存できませんでした。もう一度試射してください。";
      busy = false;
      render();
    }
    function request(done = () => {}) {
      hooks.clearInput();
      after = done;
      choice =
        modes.find((id) => !hooks.data().onboarding.tried.includes(id)) ||
        hooks.data().difficulty;
      root.ArcScreens.open("difficultyIntro", {
        block: ["lobby", "battle"],
        onEscape: () => {},
      });
      reset();
      $("trialAngle").focus();
    }
    $("trialAngle").oninput = $("trialPower").oninput = () => {
      if (!flight && !busy) reset();
    };
    $("trialRetry").onclick = () => {
      $("trialAngle").value = "48";
      $("trialPower").value = "70";
      reset();
    };
    $("trialFire").onclick = () => {
      if (flight || busy) return;
      state = arena();
      plan = root.ArcEngine.launch(state, state.angle, state.power);
      flight = { start: performance.now() };
      result = "";
      render();
    };
    $("confirmDifficulty").onclick = async () => {
      if ($("confirmDifficulty").disabled) return;
      busy = true;
      render();
      const data = hooks.data(),
        old = {
          difficulty: data.difficulty,
          confirmed: data.difficultyConfirmed,
          step: data.onboarding.step,
          seen: [...data.seenPreviewIds],
        };
      data.difficulty = choice;
      data.difficultyConfirmed = true;
      data.onboarding.step = "done";
      const controls = root.ArcLessons.forStage(
        root.ArcEngine.campaign(1, data),
        data,
      ).find((x) => x.id === "controls");
      if (controls && !data.seenPreviewIds.includes(controls.key))
        data.seenPreviewIds.push(controls.key);
      if (!(await hooks.persist())) {
        data.difficulty = old.difficulty;
        data.difficultyConfirmed = old.confirmed;
        data.onboarding.step = old.step;
        data.seenPreviewIds = old.seen;
        $("difficultySaveError").hidden = false;
        $("difficultySaveError").textContent = en()
          ? "Could not save. Please retry."
          : "保存できませんでした。もう一度確定してください。";
        busy = false;
        render();
        return;
      }
      busy = false;
      root.ArcScreens.close("difficultyIntro", false);
      sync();
      const done = after;
      after = null;
      done?.();
    };
    for (const input of document.querySelectorAll('input[name="difficulty"]'))
      input.onchange = () => {
        if (!hooks.allowed()) {
          sync();
          return;
        }
        hooks.data().difficulty = root.ArcAimGuide.normalize(input.value);
        hooks.data().difficultyConfirmed = true;
        hooks.persist();
        sync();
      };
    $("lobbyDifficulty").onclick = () => {
      root.ArcMenus.openSettings($("lobbyDifficulty"));
      document
        .querySelector(".settings-difficulty")
        .scrollIntoView({ block: "nearest" });
    };
    root.addEventListener("resize", () => {
      if (root.ArcScreens.isOpen("difficultyIntro")) draw();
    });
    return {
      sync,
      request,
      refresh() {
        if (root.ArcScreens.isOpen("difficultyIntro")) render();
        sync();
      },
    };
  }
  root.ArcDifficultyUi = Object.freeze({ create });
})(globalThis);
