(function (root) {
  "use strict";
  function create(hooks) {
    const $ = (id) => document.getElementById(id),
      local = (ja, en) => (root.ArcI18n.language === "en" ? en : ja);
    let taps = 0,
      lastTap = 0,
      unlocked = false,
      busy = false;
    function labels() {
      $("masterPasswordLabel").textContent = local("パスワード", "Password");
      $("masterUnlock").textContent = local("開く", "Unlock");
      $("masterClearedLabel").textContent = local(
        "クリア済み面数",
        "Cleared stages",
      );
      $("masterNote").textContent = local(
        "設定した次の面から再開します。獲得記録・難易度・操作設定は維持します。",
        "Resume at the next stage. Earned records, difficulty and controls are kept.",
      );
      $("masterWeaponsLabel").textContent = local("武器の所持", "Weapon stock");
      $("masterSkillsLabel").textContent = local("スキルの所持", "Skill stock");
      const stock = root.ArcMasterProgress.stock;
      for (const id of ["masterWeapons", "masterSkills"]) {
        const select = $(id);
        select.options[0].textContent = local("保有を維持", "Keep current");
        select.options[1].textContent = local("なし", "None");
        select.options[2].textContent = local("すべて保有", "Own all");
        select.disabled = busy;
      }
      $("masterStockNote").textContent = local(
        `すべて保有：現行の取得武器${stock.weapons.length}種・スキル${stock.skills.length}種を各${stock.count}回分。通常弾と必殺技は従来どおりです。`,
        `Own all: ${stock.weapons.length} current weapons and ${stock.skills.length} skills, ${stock.count} uses each. Standard shots and specials keep their usual rules.`,
      );
      $("masterApply").hidden = !unlocked;
      $("masterApply").textContent = busy
        ? local("保存中…", "Saving…")
        : local("設定を保存", "Save settings");
      $("masterClose").textContent = local("閉じる", "Close");
      $("masterClose").disabled =
        $("masterApply").disabled =
        $("masterCleared").disabled =
          busy;
    }
    function close() {
      if (busy) return;
      unlocked = false;
      $("masterPassword").value = "";
      root.ArcScreens.close("masterMode");
    }
    function reveal(e) {
      const now = performance.now();
      taps = now - lastTap < 2500 ? taps + 1 : 1;
      lastTap = now;
      if (taps < 5 || !hooks.allowed()) return;
      taps = 0;
      unlocked = false;
      labels();
      $("masterPassword").value = "";
      $("masterPasswordForm").hidden = false;
      $("masterProgressForm").hidden = true;
      $("masterError").hidden = true;
      root.ArcScreens.open("masterMode", {
        trigger: e.currentTarget,
        block: ["lobby", "battle", "journeyStart"],
        onEscape: close,
        cycleFocus: true,
      });
      $("masterPassword").focus();
    }
    for (const id of ["masterStartEntry", "masterLobbyEntry"])
      $(id).onclick = reveal;
    $("masterClose").onclick = close;
    $("masterPasswordForm").onsubmit = (e) => {
      e.preventDefault();
      if (busy) return;
      if (!root.ArcMasterProgress.passwordMatches($("masterPassword").value)) {
        $("masterError").textContent = local(
          "パスワードが違います。",
          "Incorrect password.",
        );
        $("masterError").hidden = false;
        return;
      }
      unlocked = true;
      labels();
      $("masterPassword").value = "";
      $("masterPasswordForm").hidden = true;
      $("masterProgressForm").hidden = false;
      $("masterCleared").value = hooks.data().cleared;
      for (const id of ["masterWeapons", "masterSkills"]) $(id).value = "";
      $("masterError").hidden = true;
      $("masterCleared").focus();
    };
    $("masterProgressForm").onsubmit = async (e) => {
      e.preventDefault();
      if (!unlocked || busy || !hooks.allowed()) return;
      const raw = $("masterCleared").value,
        n = Number(raw);
      if (raw.trim() === "" || !Number.isInteger(n) || n < 0 || n > 100) {
        $("masterError").textContent = local(
          "0〜100の整数を入力してください。",
          "Enter an integer from0 to100.",
        );
        $("masterError").hidden = false;
        return;
      }
      busy = true;
      labels();
      $("masterError").hidden = true;
      let saved = false;
      try {
        saved = await hooks.replace(
          root.ArcMasterProgress.prepare(
            hooks.data(),
            n,
            Object.fromEntries(
              [
                ["weapons", $("masterWeapons").value],
                ["skills", $("masterSkills").value],
              ].filter(([, value]) => value),
            ),
          ),
        );
      } catch {}
      busy = false;
      labels();
      if (!saved) {
        $("masterError").textContent = local(
          "保存できませんでした。元の記録を保持しています。",
          "Could not save. Your original record is kept.",
        );
        $("masterError").hidden = false;
        return;
      }
      close();
      hooks.changed();
    };
    root.addEventListener("arcline-language", labels);
    return { close };
  }
  root.ArcMasterMode = { create };
})(globalThis);
