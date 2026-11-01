(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id),
    local = (ja, en) => (root.ArcI18n.language === "en" ? en : ja);
  let hooks,
    active = false,
    after = null,
    busy = false;
  function introduce() {
    $("gunIntroTitle").textContent = local("ガン", "GUN");
    $("gunIntroLead").textContent = local(
      "重い一撃を放つ、最初の仲間。",
      "Your first companion, with a heavy shot.",
    );
    $("gunIntroText").textContent = local(
      "ガンの弾は重く、遠くまでは飛びにくい。角度と距離を見極めて、近くの目標を狙おう。",
      "Gun’s heavy shot falls quickly and travels a shorter distance. Judge the angle and distance, and aim at a nearby target.",
    );
    $("gunIntroContinue").textContent = local(
      "照準と発射を体験する",
      "Try aiming and firing",
    );
    $("gunIntroArt").innerHTML = root.ArcCharacterHero.art("gun", {
      lang: root.ArcI18n.language,
    });
    root.ArcCharacterHero.hydrate($("gunIntroArt"));
    root.ArcScreens.open("onboardingIntro", {
      block: ["lobby", "battle"],
      onEscape: () => {},
    });
    $("gunIntroContinue").focus();
  }
  async function stage(step) {
    const old = hooks.data().onboarding.step;
    hooks.data().onboarding.step = step;
    if (await hooks.persist()) return true;
    hooks.data().onboarding.step = old;
    $("onboardingError").textContent = local(
      "保存できませんでした。もう一度お試しください。",
      "Could not save. Please retry.",
    );
    $("onboardingError").hidden = false;
    return false;
  }
  function resume() {
    const data = hooks.data(),
      step = data.onboarding.step;
    if (step === "done") {
      active = false;
      const done = after;
      after = null;
      done?.();
      return;
    }
    if (step === "prologue") {
      const next = async () => {
        if (await stage("gun")) resume();
        else introduce();
      };
      if (!data.journal.moviesSeen.includes("prologue")) hooks.playMovie(next);
      else next();
    } else if (step === "gun") introduce();
    else hooks.trial(resume);
  }
  function install(options) {
    hooks = options;
    $("gunIntroContinue").onclick = async () => {
      if (busy) return;
      busy = true;
      $("gunIntroContinue").disabled = true;
      if (await stage("trial")) {
        root.ArcScreens.close("onboardingIntro", false);
        resume();
      }
      $("gunIntroContinue").disabled = false;
      busy = false;
    };
    root.addEventListener("arcline-language", () => {
      if (root.ArcScreens.isOpen("onboardingIntro")) introduce();
    });
  }
  function begin(done) {
    if (active) return;
    active = true;
    after = done;
    resume();
  }
  function prepare(done) {
    if (
      hooks.data().onboarding.step !== "prologue" ||
      hooks.data().journal.moviesSeen.includes("prologue")
    ) {
      begin(done);
      return;
    }
    active = true;
    after = done;
    root.ArcDevice.offer(() => {
      $("beginJourney").textContent = local("はじめる。", "Begin.");
      root.ArcScreens.open("journeyStart", {
        block: ["lobby", "battle"],
        onEscape() {},
        cycleFocus: true,
      });
      $("beginJourney").focus();
      $("beginJourney").onclick = () => {
        root.ArcFullscreen?.enter?.();
        root.ArcScreens.close("journeyStart", false);
        resume();
      };
    });
  }
  root.ArcOnboarding = Object.freeze({
    install,
    begin,
    prepare,
    get active() {
      return active;
    },
  });
})(globalThis);
