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
      s.angle = 48;
      s.power = 30;
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
      const scale = Math.min(w / 460, h / 220);
      ctx.fillStyle = "#102d3e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(
        dpr * scale,
        0,
        0,
        dpr * scale,
        dpr * ((w - 460 * scale) / 2 - 80 * scale),
        dpr * ((h - 220 * scale) / 2 - 230 * scale),
      );
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
          ctx.arc(0, -22, 32, 0, Math.PI * 2);
          ctx.moveTo(16, -22);
          ctx.arc(0, -22, 16, 0, Math.PI * 2);
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
        const age = Math.min(
            plan.duration,
            ((now - flight.start) / 1000) * 0.55,
          ),
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
        ? "Choose enemy aim and trajectory guide"
        : "敵の狙いと射線を選ぼう";
      $("difficultyIntroText").textContent = en()
        ? "Easy shows the full trajectory, Normal half, and Hard only the firing direction. Enemy aim also gets more accurate from Easy to Hard. Progress and machines are saved per mode; test shots are optional."
        : "イージーは射線を全表示、ノーマルは半分、ハードは発射方向のみ。敵の狙いも難易度に応じて正確になります。攻略記録と保有機体は難易度別に保存します。試撃は任意です。";
      $("initialDifficultyOptions").innerHTML = modes
        .map(
          (id, i) =>
            `<label><input type="radio" name="initialDifficulty" value="${id}" ${id === choice ? "checked" : ""} ${flight || busy ? "disabled" : ""}><span><strong>${names[en() ? "en" : "ja"][i]}</strong><small>${(en() ? ["Loose enemy aim · full guide", "Standard enemy aim · half guide", "Precise enemy aim · direction only"] : ["敵の狙い：ゆるめ／射線すべて", "敵の狙い：標準／射線半分", "敵の狙い：正確／方向のみ"])[i]}</small></span></label>`,
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
      $("confirmDifficulty").disabled = !!flight || busy;
      $("trialFire").textContent = en() ? "Test shot" : "試撃";
      $("trialFire").disabled = !!flight || busy;
      $("trialResult").textContent =
        title() +
        " · " +
        (result ||
          (en()
            ? [
                "Guide to the target.",
                "Only the first half of the guide.",
                "Only the firing direction.",
              ][modes.indexOf(choice)] +
              " Compare the same shot. Testing is optional."
            : [
                "着弾までの射線を表示。",
                "射線の前半だけを表示。",
                "発射方向だけを表示。",
              ][modes.indexOf(choice)] +
              "同じ弾を撃ち比べよう。試撃は任意です。"));
      draw();
    }
    async function finishShot() {
      flight = null;
      busy = true;
      root.ArcEngine.resolve(state, plan);
      result = en()
        ? "Target hit. Compare another difficulty."
        : "標的に命中。別の難易度でも比べよう。";
      busy = false;
      render();
    }
    function request(done = () => {}) {
      hooks.clearInput();
      after = done;
      choice = hooks.data().difficulty;
      root.ArcScreens.open("difficultyIntro", {
        block: ["lobby", "battle"],
        onEscape: () => {},
      });
      $("difficultySaveError").hidden = true;
      reset();
      $("confirmDifficulty").focus();
    }
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
      if (!(await hooks.change(choice, true))) {
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
      input.onchange = async () => {
        if (busy || !hooks.allowed()) {
          sync();
          return;
        }
        const mode = input.value;
        busy = true;
        $("difficultyChoice").disabled = true;
        $("closeSettings").disabled = true;
        await hooks.change(mode, false);
        busy = false;
        $("difficultyChoice").disabled = false;
        $("closeSettings").disabled = false;
        sync();
      };
    $("lobbyDifficulty").onclick = () => {
      root.ArcMenus.openSettings($("lobbyDifficulty"), "difficulty");
    };
    function resized() {
      if (!root.ArcScreens.isOpen("difficultyIntro")) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    }
    root.addEventListener("resize", resized);
    if (root.ResizeObserver)
      new root.ResizeObserver(resized).observe(
        $("difficultyTrial").parentElement,
      );
    return {
      sync,
      request,
      get busy() {
        return busy;
      },
      get trial() {
        return state
          ? {
              angle: state.angle,
              power: state.power,
              difficulty: choice,
              flying: !!flight,
            }
          : null;
      },
      refresh() {
        if (root.ArcScreens.isOpen("difficultyIntro")) render();
        sync();
      },
    };
  }
  root.ArcDifficultyUi = Object.freeze({ create });
})(globalThis);
