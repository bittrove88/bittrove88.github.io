/* Battle presentation and gestures. Native commands and live state are owned by game.js. */
(function (root) {
  "use strict";
  function install(hooks) {
    const byId = (id) => document.getElementById(id),
      local = (ja, en) => ArcI18n.local(ja, en),
      E = ArcEngine,
      G = E.geometry,
      K = ArcSkills;
    const svg = (paths) =>
      '<svg class="battle-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      paths +
      "</svg>";
    const menuSvg = (paths) =>
      '<svg class="battle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      paths +
      "</svg>";
    const chevron =
      '<svg class="battle-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const icons = {
      move: svg(
        '<ellipse cx="20" cy="20" rx="11" ry="14" transform="rotate(22 20 20)"/><ellipse cx="20" cy="20" rx="6" ry="9" transform="rotate(22 20 20)"/>',
      ),
      pin: menuSvg(
        '<path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0Z"/><circle cx="12" cy="9" r="2.5"/>',
      ),
      weapon: menuSvg(
        '<path d="M4 8h8c4 0 7 4 7 4s-3 4-7 4H4zm3 0v8M2 10h2m-2 4h2"/>',
      ),
      skill: menuSvg(
        '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM12 8v8m-4-4h8"/>',
      ),
      fire: svg(
        '<g transform="translate(1 -4)"><path d="m13 27 10-10c4-4 10-5 12-5 0 3-1 8-5 12L20 34l-7-7Zm10-10 7 7M8 22l-5 5m9 3-5 5m9-3-5 5"/></g>',
      ),
      pan: svg('<path d="M7 21a13 13 0 1 0 7-12M7 21V8m0 0h13M7 8l13 13"/>'),
    };
    let aimDesign = "barrel",
      lastState = null,
      lastWorld = null,
      quickView = null,
      panGesture = null;
    function addLabel(parent, text) {
      const label = document.createElement("span");
      label.className = "battle-label";
      label.textContent = text;
      label.dataset.storyRaw = "";
      parent.prepend(label);
    }
    function syncAimVisual() {
      const group = byId("aimStickKnob").querySelector("[data-aim-barrel]");
      if (!group) return;
      const shown = hooks.preview(),
        state = shown?.state || hooks.state();
      if (!state) return;
      const muzzle = G.muzzle(
        state,
        0,
        shown?.pose?.angle ?? hooks.state().angle,
      );
      group.setAttribute(
        "transform",
        "rotate(" + (muzzle.theta * 180) / Math.PI + " 20 20)",
      );
    }
    function pickAim(id) {
      aimDesign = ArcBattleAim.get(id).id;
      byId("aimStickKnob").innerHTML = ArcBattleAim.get(id).svg;
      syncAimVisual();
    }
    let topChange, coach;
    function closeCoach() {
      if (!coach.hidden) {
        const key = "v7:character-change";
        if (!hooks.save.data.seenPreviewIds.includes(key)) {
          hooks.save.data.seenPreviewIds.push(key);
          hooks.save.save();
        }
      }
      ArcScreens.close("battleCoach");
      hooks.refresh();
    }
    function paintCoach() {
      coach.dataset.kind = "characters";
      coach.innerHTML =
        '<div><header><h2 id="battleCoachTitle">' +
        local("キャラチェンジ", "Change character") +
        '</h2><button class="coach-close" aria-label="' +
        local("閉じる", "Close guide") +
        '">✕</button></header><div class="battle-coach-content"><p>' +
        local(
          "マップの横の「キャラチェンジ」から、仲間のキャラを選べます。一時停止からも同じ画面を開けます。",
          "Use Change Char. beside Map to choose a companion. You can open the same screen from Pause.",
        ) +
        "</p><p>" +
        local(
          "HPの割合と必殺技の残数は引き継ぎます。",
          "Your HP percentage and remaining special ammo carry over.",
        ) +
        '</p></div><button class="coach-done">' +
        local("キャラを選ぶ", "Choose a character") +
        "</button></div>";
      coach.querySelector(".coach-close").onclick = closeCoach;
      coach.querySelector(".coach-done").onclick = () => {
        closeCoach();
        hooks.machinePicker.open();
      };
    }
    function openCoach() {
      if (
        !byId("battleCoach").hidden ||
        hooks.charge() ||
        hooks.demo() ||
        hooks.paused() ||
        ArcScreens.controlsBlocked()
      )
        return false;
      hooks.clearInput();
      paintCoach();
      ArcScreens.open("battleCoach", {
        block: ["battle", "overlay"],
        cycleFocus: true,
        onEscape: closeCoach,
      });
      coach.querySelector(".coach-close").focus();
      return true;
    }
    document.documentElement.classList.add("battle-ui");
    topChange = document.createElement("button");
    topChange.id = "characterChange";
    topChange.type = "button";
    topChange.innerHTML = local("キャラ<br>チェンジ", "Change<br>Char.");
    topChange.dataset.storyRaw = "";
    topChange.setAttribute(
      "aria-label",
      local("キャラチェンジ", "Change character"),
    );
    topChange.setAttribute("aria-haspopup", "dialog");
    byId("mapCameraToggle").after(topChange);
    byId("pause").innerHTML = menuSvg('<path d="M9 6v12M15 6v12"/>');
    topChange.onclick = () => {
      if (hooks.canAim()) hooks.machinePicker.open();
    };
    const move = byId("stick").parentElement,
      aim = byId("aimStick").parentElement,
      fire = byId("fire").parentElement;
    aim.querySelector(".control-label").remove();
    move.append(byId("moveBudget"));
    aim.append(byId("angleText"));
    addLabel(move, "移動");
    addLabel(aim, "斜角");
    addLabel(fire, "発射");
    byId("stickKnob").innerHTML = icons.move;
    pickAim("barrel");
    byId("fire").insertAdjacentHTML("afterbegin", icons.fire);
    fire.append(byId("shotBudget"));
    byId("warpToggle").innerHTML =
      icons.pin +
      '<span class="battle-menu-copy" data-story-raw><small>テレポート</small><strong id="battleTeleportState">OFF</strong></span>';
    byId("weaponToggle").insertAdjacentHTML("afterbegin", icons.weapon);
    byId("weaponToggle").append(byId("weaponStock"));
    byId("weaponToggle").insertAdjacentHTML("beforeend", chevron);
    const skillCopy = document.createElement("span");
    skillCopy.className = "battle-menu-copy";
    skillCopy.innerHTML = "<small data-story-raw>スキル</small>";
    skillCopy.append(byId("skillName"));
    byId("skillToggle").prepend(skillCopy);
    byId("skillToggle").insertAdjacentHTML("afterbegin", icons.skill);
    byId("skillToggle").insertAdjacentHTML("beforeend", chevron);
    coach = document.createElement("section");
    coach.id = "battleCoach";
    coach.className = "battle-coach";
    coach.hidden = true;
    coach.setAttribute("role", "dialog");
    coach.setAttribute("aria-modal", "true");
    coach.setAttribute("aria-labelledby", "battleCoachTitle");
    coach.dataset.storyRaw = "";
    byId("app").append(coach);

    const originalOpen = hooks.machinePicker.open;
    let pickerTrigger = null;
    hooks.machinePicker.open = function () {
      pickerTrigger = document.activeElement;
      originalOpen();
      if (byId("battleMachinePicker").hidden) return;
      topChange.setAttribute("aria-expanded", "true");
      if (ArcFinalTeam.active(hooks.state())) {
        byId("battleCharacterResources")?.remove();
        return;
      }
      syncCharacterLanguage();
      let summary = byId("battleCharacterResources");
      if (!summary) {
        summary = document.createElement("p");
        summary.id = "battleCharacterResources";
        summary.dataset.storyRaw = "";
        byId("battleMachineChoices").before(summary);
      }
      summary.textContent = characterResources();
      byId("battleMachineChoices").dataset.count = byId(
        "battleMachineChoices",
      ).children.length;
      byId("battleMachineChoices").style.setProperty(
        "--battle-columns",
        Math.min(3, byId("battleMachineChoices").children.length),
      );
      const ratio =
        Math.floor(
          Math.min(
            1,
            hooks.state().units[0].hp / hooks.state().units[0].maxHp,
          ) *
            1e6 +
            1e-8,
        ) / 1e6;
      for (const b of byId("battleMachineChoices").children) {
        const profile = ArcCombat.get(b.dataset.quickMachine),
          hp = document.createElement("span");
        hp.className = "battle-character-hp";
        hp.textContent =
          "HP " +
          ArcCombat.points((profile.hp / ArcCombat.pointsPerUnit) * ratio) +
          " / " +
          profile.hp;
        b.querySelector("strong").after(hp);
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.quickMachine === hooks.state().characterId),
        );
        const role = b.querySelector("span:not(.battle-character-hp)");
        if (role) {
          role.classList.add("battle-character-role");
          role.title = role.textContent;
        }
        const state = b.querySelector("small"),
          status = state.textContent;
        state.textContent = ArcI18n.t(profile.special.name);
        state.classList.add("battle-character-special");
        if (
          b.disabled &&
          b.dataset.quickMachine !== hooks.state().characterId
        ) {
          const badge = document.createElement("span");
          badge.className = "battle-character-status";
          badge.textContent = status;
          b.append(badge);
        }
      }
      syncCharacterLanguage();
      ArcCharacters.paintAll(byId("battleMachineChoices"));
    };
    function characterResources() {
      const u = hooks.state().units[0],
        name = ArcCharacters.get(hooks.state().characterId);
      return local(
        "現在：" +
          name.nameJa +
          "　HP " +
          E.combat.points(u.hp) +
          " / " +
          E.combat.points(u.maxHp) +
          "　必殺技 残り" +
          hooks.state().specialAmmo +
          "発",
        "Current: " +
          name.name +
          " · HP " +
          E.combat.points(u.hp) +
          " / " +
          E.combat.points(u.maxHp) +
          " · Special ammo: " +
          hooks.state().specialAmmo,
      );
    }
    function syncCharacterLanguage() {
      if (
        byId("battleMachinePicker").hidden ||
        ArcFinalTeam.active(hooks.state())
      )
        return;
      byId("battleMachineTitle").textContent = local(
        "キャラチェンジ",
        "Change character",
      );
      byId("battleMachineNote").textContent = local(
        "HP割合・必殺技残数は引き継ぎ",
        "HP percentage and special ammo carry over.",
      );
      byId("battleMachineNote").setAttribute(
        "aria-label",
        local(
          "HPの残り割合と必殺技の残数は引き継ぎます",
          "Your HP percentage and remaining special ammo carry over.",
        ),
      );
      if (byId("battleCharacterResources"))
        byId("battleCharacterResources").textContent = characterResources();
      for (const card of byId("battleMachineChoices").children) {
        const id = card.dataset.quickMachine,
          c = ArcCharacters.get(id),
          p = ArcCombat.get(id);
        card.querySelector("strong").textContent = local(c.nameJa, c.name);
        const role = card.querySelector(".battle-character-role");
        if (role) {
          role.textContent = local(c.roleJa, c.role);
          role.title = role.textContent;
        }
        const special = card.querySelector(".battle-character-special");
        if (special) {
          special.dataset.storyRaw = "";
          special.textContent = ArcI18n.t(p.special.name);
          special.title = special.textContent;
        }
        const badge = card.querySelector(".battle-character-status");
        if (badge) {
          const left = ArcCrewUsage.remaining(hooks.save.data, id);
          badge.dataset.storyRaw = "";
          badge.textContent = local(
            "補充あと" + left + "面",
            "Resupply: " + left + " stages",
          );
        }
      }
    }
    function syncMapCopy() {
      byId("mapCameraHint").textContent = local(
        "ドラッグで移動 · 二本指または＋／−で拡大縮小",
        "Drag to pan · 2-finger pinch or + / − to zoom",
      );
      byId("mapCameraPan").setAttribute(
        "aria-label",
        local(
          "マップ表示。ドラッグまたは矢印キーで移動。二本指または＋と−で拡大縮小、0で全体表示。",
          "Map view. Drag or use arrow keys to pan. Pinch with two fingers or use + and − to zoom. Press 0 to fit the map.",
        ),
      );
    }
    function syncBattleLanguage() {
      syncMapCopy();
      byId("world").setAttribute(
        "aria-label",
        local(
          "戦場。左4/5で斜角、右1/5でマップ移動。二本指で拡大縮小。下の発射を長押し。矢印キーとスペースでも操作できます。",
          "Battlefield. Left 80% adjusts aim; right 20% pans the map. Pinch with two fingers to zoom. Hold Fire below. Arrow keys and Space are also available.",
        ),
      );
      topChange.innerHTML = local("キャラ<br>チェンジ", "Change<br>Char.");
      topChange.setAttribute(
        "aria-label",
        local("キャラチェンジ", "Change character"),
      );
      move.querySelector(".battle-label").textContent = local("移動", "Move");
      aim.querySelector(".battle-label").textContent = local("斜角", "Aim");
      byId("warpToggle").querySelector("small").textContent = local(
        "テレポート",
        "Teleport",
      );
      byId("skillToggle").querySelector("small").textContent = local(
        "スキル",
        "Skill",
      );
      if (byId("quickViewReset"))
        byId("quickViewReset").textContent = local("視点を戻す", "Reset view");
      syncCharacterLanguage();
      if (!coach.hidden) paintCoach(coach.dataset.kind);
    }
    new MutationObserver(() => {
      if (byId("battleMachinePicker").hidden)
        topChange.setAttribute("aria-expanded", "false");
      if (
        byId("battleMachinePicker").hidden &&
        pickerTrigger?.isConnected &&
        !pickerTrigger.closest("[hidden],[inert]")
      ) {
        pickerTrigger.focus({ preventScroll: true });
        pickerTrigger = null;
      }
    }).observe(byId("battleMachinePicker"), {
      attributes: true,
      attributeFilter: ["hidden"],
    });
    const catalog = ArcBattleCatalog;
    const skillActions = new Map();
    let skillChoice = null,
      toastTimer = 0;
    const en = () => ArcI18n.language === "en";
    const method = (id) =>
      id === "BLINK"
        ? "target"
        : /^S_(CHARGE_SLOW|POWER_UP)_/.test(id) ||
            ["S_LOW_GRAVITY", "S_HIGH_GRAVITY"].includes(id)
          ? "enhance"
          : K.activeIds.includes(id)
            ? "instant"
            : "shot";
    const costsAction = (id) =>
      ["S_REPAIR", "S_FULL_REPAIR", "S_ALL_ATTACK"].includes(id);
    const methodLabel = (id) =>
      method(id) === "enhance"
        ? en()
          ? "Set for firing"
          : "発射にセット"
        : method(id) === "shot"
          ? en()
            ? "Set for firing"
            : "発射にセット"
          : method(id) === "target"
            ? en()
              ? "Choose destination"
              : "行き先を選ぶ"
            : en()
              ? "Use now"
              : "すぐ使う";
    const skillName = (id) =>
      (en() ? catalog.skillRows[id]?.nameEn : catalog.skillRows[id]?.nameJa) ||
      ArcI18n.t(K.get(id)?.name || id);
    function heading(text) {
      const h = document.createElement("h3");
      h.className = "battle-inventory-group";
      h.dataset.storyRaw = "";
      h.textContent = text;
      return h;
    }
    const baseShowWeapons = ArcPresentation.showWeapons;
    ArcPresentation.showWeapons = function (...args) {
      baseShowWeapons(...args);
      if (args[3]?.library) return;
      const list = byId("weaponChoices"),
        cards = [...list.querySelectorAll("[data-choose-weapon]")];
      list.querySelectorAll("h3").forEach((h) => h.remove());
      for (const card of cards) {
        const id = card.dataset.chooseWeapon,
          note = card.querySelector(".weapon-choice-copy small");
        if (catalog.weaponNames[id]) {
          const label = card.querySelector("strong");
          label.dataset.storyRaw = "";
          label.textContent = en()
            ? catalog.weaponNames[id].en
            : catalog.weaponNames[id].ja;
          card.setAttribute(
            "aria-label",
            label.textContent +
              ", " +
              card.querySelector(".weapon-choice-stock span").textContent,
          );
        }
        if (note) {
          note.dataset.storyRaw = "";
          note.textContent = ArcWeapons.get(id).special
            ? en()
              ? ArcCombat.get(hooks.state().characterId).specialNote
              : catalog.specialNotes[hooks.state().characterId]
            : en()
              ? catalog.weaponNotesEn[id] || ""
              : catalog.weaponNotes[id] || note.textContent;
        }
      }
      const machine = cards
        .filter(
          (card) =>
            card.dataset.chooseWeapon === "W01" ||
            ArcWeapons.get(card.dataset.chooseWeapon).special,
        )
        .sort(
          (a, b) =>
            Number(b.dataset.chooseWeapon === "W01") -
            Number(a.dataset.chooseWeapon === "W01"),
        );
      if (machine.length) {
        list.append(heading(local("自身武器", "Character weapons")));
        machine.forEach((card) => list.append(card));
      }
      const acquired = cards.filter((card) => !machine.includes(card)),
        order = catalog.weaponGroups.flatMap((group) => group.ids);
      acquired.sort(
        (a, b) =>
          (order.indexOf(a.dataset.chooseWeapon) < 0
            ? order.length
            : order.indexOf(a.dataset.chooseWeapon)) -
          (order.indexOf(b.dataset.chooseWeapon) < 0
            ? order.length
            : order.indexOf(b.dataset.chooseWeapon)),
      );
      if (acquired.length) {
        list.append(heading(local("取得武器", "Acquired weapons")));
        acquired.forEach((card) => list.append(card));
      }
      if (hooks.state()?.teleportMode && !args[3]?.library)
        for (const card of cards) {
          card.setAttribute("aria-pressed", "false");
          card.classList.remove("selected");
        }
      const selected = list.querySelector(
        '[aria-pressed="true"]:not(:disabled)',
      );
      selected?.focus({ preventScroll: true });
      if (selected && !machine.includes(selected))
        selected.scrollIntoView({ block: "nearest" });
    };
    const inspector = document.createElement("section");
    inspector.id = "battleSkillInspector";
    inspector.dataset.storyRaw = "";
    inspector.innerHTML =
      '<div class="battle-skill-detail"><div class="battle-skill-detail-title"><span id="battleSkillIcon" aria-hidden="true"></span><strong id="battleSkillTitle"></strong></div><p id="battleSkillDescription"></p><small id="battleSkillHow"></small></div><button type="button" id="battleSkillUse"></button>';
    byId("skillPicker").querySelector(".weapon-panel").append(inspector);
    const toast = document.createElement("div");
    toast.id = "battleSkillToast";
    toast.setAttribute("role", "status");
    toast.dataset.storyRaw = "";
    toast.hidden = true;
    byId("battle").append(toast);
    function showSkillToast(id) {
      clearTimeout(toastTimer);
      toast.textContent =
        skillName(id) +
        (method(id) === "enhance"
          ? en()
            ? " set · Press Skill to fire"
            : "をセット · 発射ボタンから使用"
          : en()
            ? " used · No shot needed"
            : "を使用 · 発射は不要");
      toast.hidden = false;
      toastTimer = setTimeout(() => {
        toast.hidden = true;
      }, 2400);
    }
    function skillReason(id) {
      if (id === "BLINK" && !hooks.state().blink.length)
        return en()
          ? "No destinations on this stage"
          : "このステージには行き先がありません";
      return (
        E.skillReason(hooks.state(), id) ||
        (K.activeIds.includes(id) &&
        hooks.state().shotCount >= hooks.state().shotLimit
          ? en()
            ? "No actions remaining"
            : "行動回数がありません"
          : "")
      );
    }
    function syncSkillInspector() {
      if (byId("skillPicker").hidden) return;
      inspector.hidden = !byId("repairConfirm").hidden;
      if (inspector.hidden) return;
      const id = skillChoice,
        info = id && catalog.skillRows[id],
        reason = id && skillReason(id);
      for (const card of byId("skillChoices").querySelectorAll(
        "[data-skill]",
      )) {
        const selected = card.dataset.skill === id;
        card.disabled = false;
        card.setAttribute("aria-disabled", "false");
        card.setAttribute("aria-pressed", String(selected));
        card.dataset.unavailable = String(!!skillReason(card.dataset.skill));
        card.setAttribute(
          "aria-label",
          skillName(card.dataset.skill) +
            ", " +
            hooks.state().skills[card.dataset.skill] +
            (skillReason(card.dataset.skill)
              ? ", " + ArcI18n.t(skillReason(card.dataset.skill))
              : ""),
        );
      }
      inspector.dataset.empty = String(!id);
      byId("battleSkillIcon").innerHTML = id ? catalog.icon(id) : "";
      byId("battleSkillIcon").style.color = id
        ? catalog.groups[info.group].color
        : "";
      byId("battleSkillTitle").textContent = id
        ? skillName(id)
        : en()
          ? "Choose a card to inspect"
          : "カードを選んで内容を確認";
      byId("battleSkillDescription").textContent = id
        ? en()
          ? (K.get(id)?.note || info.shortEn).replace(/^Legacy \w+: /, "")
          : (K.get(id)?.noteJa || info.shortJa).replace(/^旧スキル。/, "")
        : en()
          ? "Selecting a card does not use it. Confirm with the button."
          : "カードを選ぶだけでは使用しません。右のボタンで確定します。";
      let how = "",
        action = "";
      if (id) {
        if (method(id) === "enhance") {
          how = en()
            ? "Consumes 1 use when set, with no action cost. Applies when you fire."
            : "セット時に1回消費・行動消費なし。次の発射から効果が乗ります。";
          action = en() ? "Set for firing" : "発射にセット";
        } else if (method(id) === "shot") {
          how = en()
            ? "Reserve, then hold and release the Skill button to fire."
            : "セット後、スキルボタンを長押しして離すと発射。";
          action =
            hooks.state().selectedSkill === id
              ? en()
                ? "Unset"
                : "セットを解除"
              : en()
                ? "Set for firing"
                : "発射にセット";
        } else if (method(id) === "target") {
          how = en()
            ? "Choose a landing spot twice. No firing needed."
            : "セット後、行き先を2回タップ。発射は不要です。";
          action = en() ? "Choose destination" : "行き先を選ぶ";
        } else if (id === "S_REPAIR") {
          how = en()
            ? "Confirm repair next. Uses one action."
            : "次の画面で回復を確定。1行動を消費します。";
          action = en() ? "Confirm repair" : "回復内容を確認";
        } else {
          how = costsAction(id)
            ? en()
              ? "No firing needed. Uses one action; the rival then acts."
              : "発射は不要。1行動を消費し、相手のターンへ。"
            : en()
              ? "Applied immediately. Does not use an action."
              : "発射は不要。すぐに効果が出ます。行動消費なし。";
          action = costsAction(id)
            ? en()
              ? "Use · 1 action"
              : "使う（1行動）"
            : en()
              ? "Use now"
              : "今すぐ使う";
        }
      }
      byId("battleSkillHow").textContent = reason ? ArcI18n.t(reason) : how;
      byId("battleSkillUse").textContent =
        action || (en() ? "Choose a skill" : "スキルを選択");
      byId("battleSkillUse").disabled = !id || !!reason;
    }
    byId("battleSkillUse").onclick = () => {
      const id = skillChoice;
      if (!id || skillReason(id)) return;
      const before = hooks.state().skills[id];
      skillActions.get(id)?.();
      if (
        ["instant", "enhance"].includes(method(id)) &&
        hooks.state().skills[id] < before
      )
        showSkillToast(id);
    };
    // Rearrange native nodes and retain every native action callback behind an explicit confirmation.
    const baseBuildSkills = hooks.baseBuildSkills;
    hooks.setBuildSkills(function () {
      baseBuildSkills();
      skillChoice = hooks.state().selectedSkill || null;
      skillActions.clear();
      const list = byId("skillChoices"),
        cards = [...list.querySelectorAll("[data-skill]")];
      const rank = (id) => {
        const index = catalog.skillOrder.indexOf(id);
        return index < 0 ? catalog.skillOrder.length : index;
      };
      cards.sort(
        (a, b) =>
          Number(!!K.get(b.dataset.skill)?.rare) -
            Number(!!K.get(a.dataset.skill)?.rare) ||
          rank(a.dataset.skill) - rank(b.dataset.skill),
      );
      let section = null;
      for (const card of cards) {
        const id = card.dataset.skill,
          info = catalog.skillRows[id],
          rare = !!K.get(id)?.rare,
          key = rare ? "rare" : "regular";
        if (key !== section) {
          section = key;
          list.append(
            heading(
              rare
                ? local("レアスキル", "Rare skills")
                : local("スキル", "Skills"),
            ),
          );
        }
        skillActions.set(id, card.onclick);
        card.onclick = () => {
          skillChoice = id;
          syncSkillInspector();
          requestAnimationFrame(() => {
            if (!byId("skillPicker").hidden)
              card.scrollIntoView({ block: "nearest" });
          });
        };
        card.style.setProperty(
          "--battle-skill-color",
          catalog.groups[info.group].color,
        );
        card.querySelector(".skill-icon").innerHTML = catalog.icon(id);
        const copy = document.createElement("span");
        copy.className = "battle-skill-copy";
        const title = document.createElement("span");
        title.className = "battle-skill-heading";
        const name = card.querySelector(".skill-name");
        name.dataset.storyRaw = "";
        name.textContent = skillName(id);
        title.append(name);
        if (rare) {
          const badge = document.createElement("small");
          badge.className = "battle-rare-tag";
          badge.dataset.storyRaw = "";
          badge.textContent = en() ? "RARE" : "レア";
          title.append(badge);
        }
        const note =
          card.querySelector(".skill-note") || document.createElement("span");
        note.className = "skill-note";
        note.dataset.storyRaw = "";
        note.textContent = en() ? info.shortEn : info.shortJa;
        copy.append(title, note);
        const stock = document.createElement("span");
        stock.className = "battle-skill-stock";
        const type = document.createElement("small");
        type.className = "battle-skill-method";
        type.dataset.storyRaw = "";
        type.textContent = methodLabel(id);
        stock.append(card.querySelector(".skill-count"), type);
        card
          .querySelector(".skill-state")
          .classList.add("battle-native-skill-state");
        stock.append(card.querySelector(".skill-state"));
        card.append(copy, stock);
        list.append(card);
      }
    });
    const baseHud = hooks.baseHud;
    hooks.setHud(function () {
      // Reset views at the native stage update, before the next gesture can begin.
      const state = hooks.state(),
        world = state?.spec || null;
      if (state !== lastState || world !== lastWorld) {
        lastState = state;
        lastWorld = world;
        quickView = null;
        clearGestures();
        reset.hidden = true;
      }
      baseHud();
      if (!hooks.state()) return;
      byId("pauseMachineChange").textContent = ArcFinalTeam.active(
        hooks.state(),
      )
        ? local("出撃順を確認", "View fixed order")
        : local("キャラチェンジ", "Change character");
      topChange.hidden = ArcFinalTeam.active(hooks.state());
      topChange.disabled = !hooks.canAim();
      byId("moveBudget").textContent = byId("moveBudget").textContent.replace(
        /^(MOVE |移動 )/,
        "",
      );
      const remaining = hooks.state().shotLimit - hooks.state().shotCount;
      byId("shotBudget").textContent = local(
        remaining + "行動",
        remaining + (remaining === 1 ? " action" : " actions"),
      );
      if (
        ArcI18n.language === "en" &&
        byId("app").clientWidth <= 650 &&
        hooks.state().mode === "W01"
      ) {
        byId("weaponStock").textContent = "∞";
        byId("weaponStock").setAttribute("aria-label", "Unlimited ammo");
      } else byId("weaponStock").removeAttribute("aria-label");
      const shown = hooks.preview(),
        ds = shown
          ? (shown.effectProgress >= 0.5 ? shown.after : shown.before) ||
            shown.state
          : hooks.state();
      byId("php").textContent =
        E.combat.points(ds.units[0].hp) +
        " / " +
        E.combat.points(ds.units[0].maxHp);
      byId("ehp").textContent =
        E.combat.points(ds.units[1].hp) +
        " / " +
        E.combat.points(ds.units[1].maxHp);
      syncAimVisual();
      const english = ArcI18n.language === "en";
      if (
        catalog.weaponNames[hooks.state().mode] &&
        !hooks.state().teleportMode
      ) {
        byId("weaponName").dataset.storyRaw = "";
        byId("weaponName").textContent = english
          ? catalog.weaponNames[hooks.state().mode].en
          : catalog.weaponNames[hooks.state().mode].ja;
        byId("weaponToggle").setAttribute(
          "aria-label",
          byId("weaponName").textContent,
        );
      } else delete byId("weaponName").dataset.storyRaw;
      byId("weaponState").textContent = english ? "Weapon" : "武器";
      byId("weaponToggle").dataset.selected = String(
        !hooks.state().teleportMode,
      );
      topChange.setAttribute(
        "aria-expanded",
        String(!byId("battleMachinePicker").hidden),
      );
      byId("battleTeleportState").textContent = hooks.state().teleportMode
        ? "ON"
        : "OFF";
      const owned = Object.keys(hooks.state().skills).filter(
          (id) => hooks.state().skills[id] > 0,
        ),
        selected = hooks.state().guardActive
          ? "S_GUARD"
          : hooks.state().selectedSkill;
      byId("skillName").textContent = selected
        ? ArcI18n.t(
            K.get(selected)?.shortName || K.get(selected)?.name || selected,
          )
        : english
          ? "Choose"
          : "選ぶ";
      byId("skillStock").textContent = hooks.state().skillUsed
        ? english
          ? "Used"
          : "使用済み"
        : selected
          ? english
            ? hooks.state().skills[selected] + " left"
            : "残り" + hooks.state().skills[selected] + "回"
          : owned.length + (english ? " types" : "種");
      byId("skillToggle").dataset.selected = String(!!selected);
      byId("skillToggle").dataset.used = String(!!hooks.state().skillUsed);
      byId("actionRow").dataset.teleport = String(!byId("warpToggle").hidden);
      byId("actionRow").dataset.skills = String(!byId("skills").hidden);
      syncSkillInspector();
      const shotSkill =
        !!hooks.state().selectedSkill ||
        ["charge", "power", "gravity"].some(
          (key) => hooks.state().skillEffects[key]?.turns > 0,
        );
      fire.querySelector(".battle-label").textContent = hooks.charge()?.cancel
        ? english
          ? "Cancel"
          : "キャンセル"
        : shotSkill
          ? english
            ? "Skill"
            : "スキル"
          : hooks.state().teleportMode
            ? english
              ? "Teleport"
              : "テレポート"
            : english
              ? "Fire"
              : "発射";
    });
    syncBattleLanguage();
    window.addEventListener("arcline-language", () => {
      syncBattleLanguage();
      if (!byId("skillPicker").hidden && byId("repairConfirm").hidden) {
        const selected = skillChoice,
          scroll = byId("skillStockScroll").scrollTop,
          focus =
            document.activeElement?.closest("[data-skill]")?.dataset.skill;
        hooks.buildSkills();
        skillChoice = selected;
        syncSkillInspector();
        byId("skillStockScroll").scrollTop = scroll;
        if (focus)
          byId("skillChoices")
            .querySelector('[data-skill="' + focus + '"]')
            .focus({ preventScroll: true });
        if (selected)
          byId("skillChoices")
            .querySelector('[data-skill="' + selected + '"]')
            ?.scrollIntoView({ block: "nearest" });
      }
      hooks.refresh();
    });
    /* Extend the existing camera options; neither battle state nor physics is altered. */
    const cameraOptions = Object.getOwnPropertyDescriptor(
      hooks.mapCamera,
      "options",
    ).get;
    Object.defineProperty(hooks.mapCamera, "options", {
      configurable: true,
      get() {
        return quickView && hooks.canAim() && !hooks.charge()
          ? {
              cameraView: { ...quickView },
              presentationFrame: {
                top: 44,
                bottom: byId("app").clientHeight - 110,
              },
            }
          : cameraOptions.call(hooks.mapCamera);
      },
    });
    const reset = document.createElement("button");
    reset.id = "quickViewReset";
    reset.textContent = local("視点を戻す", "Reset view");
    reset.hidden = true;
    reset.dataset.storyRaw = "";
    byId("battle").append(reset);
    const world = byId("world"),
      point = (e) => ArcViewport.point(e.clientX, e.clientY, byId("app")),
      touches = new Map();
    let pinch = null,
      multiHeld = false;
    const frame = () => ({
      left: 0,
      top: 44,
      width: byId("app").clientWidth,
      height: Math.max(1, byId("app").clientHeight - 154),
    });
    function clearGestures() {
      touches.clear();
      pinch = null;
      multiHeld = false;
      panGesture = null;
      hooks.input.cancelGesture();
    }
    function resetView() {
      quickView = null;
      clearGestures();
      reset.hidden = true;
      hooks.renderer.resetCamera();
      hooks.draw();
    }
    reset.onclick = resetView;
    byId("mapCameraToggle").addEventListener("click", resetView, true);
    byId("fire").addEventListener("pointerdown", resetView, true);
    window.addEventListener("resize", resetView);
    window.addEventListener("blur", clearGestures);
    const consume = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const pair = () => {
      const [a, b] = [...touches.values()];
      return {
        distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    };
    world.addEventListener(
      "pointerdown",
      (e) => {
        if (
          e.pointerType !== "touch" ||
          !hooks.canAim() ||
          hooks.charge() ||
          hooks.state().selectedSkill === "BLINK"
        )
          return;
        const p = point(e);
        touches.set(e.pointerId, p);
        if (touches.size >= 2) {
          consume(e);
          hooks.input.cancelGesture();
          panGesture = null;
          multiHeld = true;
          pinch =
            touches.size === 2
              ? { ...pair(), view: { ...hooks.renderer.view } }
              : null;
          try {
            world.setPointerCapture(e.pointerId);
          } catch {}
          return;
        }
        if (multiHeld) {
          consume(e);
          return;
        }
        if (p.x < byId("app").clientWidth * 0.8) return;
        consume(e);
        hooks.input.cancelGesture();
        panGesture = { id: e.pointerId, p, view: { ...hooks.renderer.view } };
        try {
          world.setPointerCapture(e.pointerId);
        } catch {}
      },
      true,
    );
    world.addEventListener(
      "pointermove",
      (e) => {
        if (touches.has(e.pointerId)) touches.set(e.pointerId, point(e));
        if (multiHeld) {
          consume(e);
          if (!pinch || touches.size !== 2 || !hooks.canAim() || hooks.charge())
            return;
          const next = pair(),
            area = ArcMapCamera.bounds(hooks.state()),
            box = frame(),
            view = ArcMapCamera.zoom(
              pinch.view,
              next.distance / pinch.distance,
              pinch.center,
              area,
              box,
            );
          quickView = ArcMapCamera.constrain(
            {
              ...view,
              x: view.x + next.center.x - pinch.center.x,
              y: view.y + next.center.y - pinch.center.y,
            },
            area,
            box,
          );
          reset.hidden = false;
          hooks.draw();
          return;
        }
        if (panGesture?.id !== e.pointerId) return;
        consume(e);
        if (!hooks.canAim() || hooks.charge()) {
          panGesture = null;
          return;
        }
        const p = point(e);
        quickView = ArcMapCamera.constrain(
          {
            ...panGesture.view,
            x: panGesture.view.x + p.x - panGesture.p.x,
            y: panGesture.view.y + p.y - panGesture.p.y,
          },
          ArcMapCamera.bounds(hooks.state()),
          frame(),
        );
        reset.hidden = false;
        hooks.draw();
      },
      true,
    );
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      world.addEventListener(
        event,
        (e) => {
          const blocked = multiHeld,
            wasPan = panGesture?.id === e.pointerId;
          touches.delete(e.pointerId);
          if (blocked) {
            pinch = null;
            if (!touches.size) multiHeld = false;
          }
          if (wasPan) panGesture = null;
          if (blocked || wasPan) consume(e);
        },
        true,
      );
    // The full-map screen reuses its native anchored zoom handler for the same two-finger gesture.
    const mapPan = byId("mapCameraPan"),
      mapTouches = new Map();
    let mapDistance = null,
      mapMulti = false;
    const clearMapTouches = () => {
      mapTouches.clear();
      mapDistance = null;
      mapMulti = false;
      hooks.mapCamera.cancelGesture();
    };
    window.addEventListener("blur", clearMapTouches);
    window.addEventListener("resize", clearMapTouches);
    mapPan.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType !== "touch" || !hooks.mapCamera.active) return;
        mapTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (mapTouches.size >= 2) {
          consume(e);
          hooks.mapCamera.cancelGesture();
          mapMulti = true;
          const [a, b] = [...mapTouches.values()];
          mapDistance =
            mapTouches.size === 2
              ? Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
              : null;
          try {
            mapPan.setPointerCapture(e.pointerId);
          } catch {}
        }
      },
      true,
    );
    mapPan.addEventListener(
      "pointermove",
      (e) => {
        if (mapTouches.has(e.pointerId))
          mapTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (!mapMulti) return;
        consume(e);
        if (!hooks.mapCamera.active || mapTouches.size !== 2 || !mapDistance)
          return;
        const [a, b] = [...mapTouches.values()],
          distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
          delta = -Math.log(distance / mapDistance) / 0.002,
          steps = Math.max(1, Math.ceil(Math.abs(delta) / 150));
        mapDistance = distance;
        for (let i = 0; i < steps; i++)
          mapPan.dispatchEvent(
            new WheelEvent("wheel", {
              deltaY: delta / steps,
              clientX: (a.x + b.x) / 2,
              clientY: (a.y + b.y) / 2,
              cancelable: true,
            }),
          );
      },
      true,
    );
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      mapPan.addEventListener(
        event,
        (e) => {
          const blocked = mapMulti;
          mapTouches.delete(e.pointerId);
          if (blocked) {
            mapDistance = null;
            if (!mapTouches.size) mapMulti = false;
            consume(e);
          }
        },
        true,
      );
    new MutationObserver(() => {
      if (byId("mapCamera").hidden) clearMapTouches();
      else syncMapCopy();
    }).observe(byId("mapCamera"), {
      attributes: true,
      attributeFilter: ["hidden"],
    });
    // Card taps choose; dragging scrolls. Native wheel and keyboard scrolling remain available.
    let cardDrag = null,
      suppressCardClick = null;
    document.addEventListener(
      "pointerdown",
      (e) => {
        suppressCardClick = null;
        const scroller = e.target.closest?.(
          "#weaponStockScroll,#skillStockScroll,#battleMachineChoices",
        );
        if (
          !scroller ||
          scroller.closest("[hidden]") ||
          (e.button !== 0 && e.pointerType !== "touch")
        )
          return;
        if (cardDrag) {
          cardDrag = null;
          return;
        }
        const p = point(e);
        cardDrag = {
          id: e.pointerId,
          scroller,
          start: p,
          last: p,
          dragged: false,
        };
      },
      true,
    );
    document.addEventListener(
      "pointermove",
      (e) => {
        const g = cardDrag;
        if (g?.id !== e.pointerId) return;
        const p = point(e),
          dy = p.y - g.start.y,
          dx = p.x - g.start.x;
        if (!g.dragged) {
          if (Math.abs(dy) < 7 || Math.abs(dy) < Math.abs(dx)) return;
          g.dragged = true;
          try {
            g.scroller.setPointerCapture(e.pointerId);
          } catch {}
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        g.scroller.scrollTop += g.last.y - p.y;
        g.last = p;
      },
      true,
    );
    function endCardDrag(e) {
      const g = cardDrag;
      if (
        g?.id !== e.pointerId ||
        (e.type === "lostpointercapture" && e.target !== g.scroller)
      )
        return;
      cardDrag = null;
      if (g.dragged) {
        e.preventDefault();
        suppressCardClick = {
          scroller: g.scroller,
          until: performance.now() + 450,
        };
        try {
          g.scroller.releasePointerCapture(e.pointerId);
        } catch {}
      }
    }
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      document.addEventListener(event, endCardDrag, true);
    document.addEventListener(
      "click",
      (e) => {
        const g = suppressCardClick;
        if (
          g &&
          e.detail !== 0 &&
          performance.now() < g.until &&
          g.scroller.contains(e.target)
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
          suppressCardClick = null;
        }
      },
      true,
    );
    window.addEventListener("blur", () => {
      cardDrag = null;
      suppressCardClick = null;
    });
    /* Show each guide once per save, after the existing native lessons. */
    setInterval(() => {
      if (!hooks.canAim() || hooks.charge()) {
        clearGestures();
        return;
      }
      if (
        hooks.state().stage === 9 &&
        !hooks.save.data.seenPreviewIds.includes("v7:character-change")
      )
        openCoach();
    }, 300);
  }
  root.ArcBattleUi = Object.freeze({ install });
})(globalThis);
