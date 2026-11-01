/* Generated from game/ui/onboarding.js. Edit the source. */
(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id),
    local = (ja, en) => (root.ArcI18n.language === "en" ? en : ja);
  let hooks,
    active = false,
    after = null,
    busy = false,
    deleting = false;
  function syncDelete() {
    for (const id of ["deleteStartSave", "deleteLobbySave"]) {
      $(id).textContent = local("セーブデータを削除", "Delete save data");
      $(id).disabled = deleting || !hooks?.canDelete();
    }
    $("deleteSaveTitle").textContent = local(
      "セーブデータを削除しますか？",
      "Delete your save data?",
    );
    $("deleteSaveDescription").textContent = local(
      "クリア記録、仲間・武器の解放、章の持ち物、ストーリー閲覧を削除して最初から始めます。この操作は元に戻せません。言語・操作配置とホーム画面への追加案内の設定は維持します。",
      "Start over by deleting progress, unlocked companions and weapons, chapter stock and story records. This cannot be undone. Language, controls and installation-guide preferences are kept.",
    );
    $("cancelDeleteSave").textContent = local("キャンセル", "Cancel");
    $("confirmDeleteSave").textContent = deleting
      ? local("削除しています…", "Deleting…")
      : local("削除して最初から", "Delete and start over");
    $("cancelDeleteSave").disabled = $("confirmDeleteSave").disabled = deleting;
    $("deleteSaveError").textContent = local(
      "セーブデータを削除できませんでした。元の記録を保持しています。もう一度お試しください。",
      "Could not delete your save data. Your original record is kept. Please retry.",
    );
  }
  function cancelDelete() {
    if (!deleting) root.ArcScreens.close("deleteSaveDialog");
  }
  function requestDelete(event) {
    if (deleting || !hooks.canDelete()) return;
    $("deleteSaveError").hidden = true;
    syncDelete();
    root.ArcScreens.open("deleteSaveDialog", {
      trigger: event.currentTarget,
      block: ["lobby", "battle", "journeyStart"],
      onEscape: cancelDelete,
      cycleFocus: true,
    });
    $("cancelDeleteSave").focus();
  }
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
    for (const id of ["deleteStartSave", "deleteLobbySave"])
      $(id).onclick = requestDelete;
    $("cancelDeleteSave").onclick = cancelDelete;
    $("confirmDeleteSave").onclick = async () => {
      if (deleting || !hooks.canDelete()) return;
      deleting = true;
      syncDelete();
      const saved = await hooks.deleteSave();
      deleting = false;
      syncDelete();
      if (!saved) {
        $("deleteSaveError").hidden = false;
        $("cancelDeleteSave").focus();
        return;
      }
      root.ArcScreens.close("deleteSaveDialog", false);
      root.ArcScreens.close("journeyStart", false);
      active = false;
      after = null;
      hooks.deleted();
    };
    syncDelete();
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
      syncDelete();
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
    syncDelete,
    get active() {
      return active;
    },
  });
})(globalThis);
