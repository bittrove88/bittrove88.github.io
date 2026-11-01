(function (root) {
  "use strict";
  function create(hooks) {
    const $ = (id) => document.getElementById(id),
      names = {
        ja: { easy: "イージー", normal: "ノーマル", hard: "ハード" },
        en: { easy: "Easy", normal: "Normal", hard: "Hard" },
      };
    const english = () => root.ArcI18n.language === "en";
    let choice = "normal",
      after = null;
    function sync() {
      for (const input of document.querySelectorAll('input[name="difficulty"]'))
        input.checked = input.value === hooks.data().difficulty;
      $("lobbyDifficulty").textContent =
        (english() ? "Difficulty: " : "難易度：") +
        names[english() ? "en" : "ja"][hooks.data().difficulty] +
        (english() ? " · Change ›" : " · 変更 ›");
    }
    function render() {
      const en = english();
      $("difficultyIntroTitle").textContent = en
        ? "Choose your difficulty"
        : "難易度を選んでください";
      $("difficultyIntroText").textContent = en
        ? "You can change this on the start screen at any time."
        : "開始画面からいつでも変更できます。";
      $("initialDifficultyOptions").innerHTML = ["easy", "normal", "hard"]
        .map(
          (id, i) =>
            `<label><input type="radio" name="initialDifficulty" value="${id}" ${choice === id ? "checked" : ""}><span><strong>${names[en ? "en" : "ja"][id]}</strong><small>${(en ? ["Full dotted trajectory", "Half dotted trajectory", "Direction only"] : ["点線の射線をすべて表示", "点線の射線を半分まで表示", "発射方向だけ表示"])[i]}</small></span></label>`,
        )
        .join("");
      for (const input of $("initialDifficultyOptions").querySelectorAll(
        "input",
      ))
        input.onchange = () => (choice = input.value);
      $("confirmDifficulty").textContent = en
        ? "Confirm and continue"
        : "この難易度ではじめる";
    }
    function request(done = () => {}) {
      hooks.clearInput();
      after = done;
      choice = hooks.data().difficulty;
      root.ArcScreens.open("difficultyIntro");
      render();
      $("confirmDifficulty").focus();
    }
    $("confirmDifficulty").onclick = async () => {
      if ($("confirmDifficulty").disabled) return;
      $("confirmDifficulty").disabled = true;
      hooks.data().difficulty = choice;
      hooks.data().difficultyConfirmed = true;
      await hooks.persist();
      $("confirmDifficulty").disabled = false;
      root.ArcScreens.close("difficultyIntro", false);
      sync();
      const done = after;
      after = null;
      done?.();
      if (!$("lobby").hidden) $("play").focus();
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
