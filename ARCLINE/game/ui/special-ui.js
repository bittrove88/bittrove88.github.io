(function (root) {
  "use strict";
  const key = "v6:special-charge",
    mapKey = "v7:touch-controls";
  const local = (ja, en) => (root.ArcI18n.language === "en" ? en : ja);
  function remaining(data, state) {
    const pages = [];
    if (!data.seenPreviewIds.includes(key))
      pages.push({ kind: "special", key });
    if (state?.stage >= 2 && !data.seenPreviewIds.includes(mapKey))
      pages.push({ kind: "map", key: mapKey });
    return pages;
  }
  function pagesFor(id, data, state) {
    return remaining(data, state).filter((page) =>
      page.kind === "special"
        ? id === "controls"
        : id === "aim" || id === "controls",
    );
  }
  function createLesson(options = {}) {
    const $ = (id) => document.getElementById(id),
      panel = $("tutorial");
    const details = document.createElement("div");
    details.id = "tutorialDetails";
    details.className = "tutorial-details";
    details.dataset.storyRaw = "";
    details.tabIndex = 0;
    details.hidden = true;
    panel.querySelector(".preview-copy").append(details);
    const actions = document.createElement("div"),
      mapButton = document.createElement("button"),
      confirmButton = $("previewOK");
    actions.className = "tutorial-actions";
    confirmButton.replaceWith(actions);
    actions.append(confirmButton);
    mapButton.id = "tutorialOpenMap";
    mapButton.type = "button";
    mapButton.hidden = true;
    mapButton.dataset.storyRaw = "";
    mapButton.onclick = () => options.openMap?.();
    actions.append(mapButton);
    let current = null,
      currentState = null;
    function paint(page, state) {
      current = page;
      currentState = state;
      panel.dataset.page = page.kind;
      details.replaceChildren();
      details.hidden = false;
      panel.setAttribute("aria-describedby", "tutorialName tutorialDetails");
      $("tutorialInstruction").hidden = true;
      $("tutorialOutcome").hidden = true;
      $("previewCharge").hidden = true;
      $("tutorialStep").textContent = local("確認", "GUIDE");
      $("tutorialContext").textContent = local("操作ガイド", "CONTROLS");
      let copy;
      if (page.kind === "special") {
        $("tutorialName").textContent = local(
          "必殺技の使い方",
          "Using Special Attacks",
        );
        copy = [
          local(
            "必殺技は機体ごとに異なる攻撃です。通常戦は自分の第2・4・6ターンに1回分ずつ増え、最大3回分までためられます。",
            "Each machine has its own special attack. Gain one use on your 2nd, 4th and 6th turns in normal battles; hold up to three uses.",
          ),
          local(
            "1回分あれば「武器」から選択できます。FIREの長押しは弾の威力調整で、必殺技のチャージとは別です。",
            "With one use available, choose it from Weapons. Holding FIRE adjusts shot power; it does not charge your special attack.",
          ),
        ];
        if (state?.spec.boss || state?.spec.midboss)
          copy.push(
            local(
              "ボス戦では最初から3回分使えます。",
              "Guardian battles start with three special uses.",
            ),
          );
      } else if (page.kind === "map") {
        $("tutorialName").textContent = local(
          "斜角とマップの操作",
          "Aim and explore the map",
        );
        const ratio = document.createElement("div");
        ratio.className = "battle-touch-ratio";
        for (const text of [
          local("左4/5：斜角", "Left 80%: Aim"),
          local("右1/5：見渡し", "Right 20%: Pan"),
        ]) {
          const span = document.createElement("span");
          span.textContent = text;
          ratio.append(span);
        }
        details.append(ratio);
        copy = [
          local(
            "斜角は左4/5の上下操作か下のボタン。右1/5は見渡し、二本指は拡大縮小。発射で視点が戻ります。",
            "Aim using the left 80% or the Aim control below. Pan on the right 20%; pinch to zoom. Fire returns the view.",
          ),
          local(
            "「マップ」は全体確認。ドラッグで移動、＋／−で拡大縮小、「全体」で全景、「戦闘に戻る」で復帰。",
            "Open Map for the overview. Drag to pan, + / − to zoom, Fit map for the full view, and Back to battle to return.",
          ),
        ];
      } else {
        const lesson = page.lesson;
        $("tutorialName").textContent = root.ArcI18n.t(lesson.title);
        $("tutorialContext").textContent = local(
          "この面の仕組み",
          "THIS LEVEL",
        );
        copy = [
          root.ArcI18n.t(lesson.instruction),
          root.ArcI18n.t(lesson.outcome),
        ];
      }
      for (const text of copy) {
        const p = document.createElement("p");
        p.textContent = text;
        details.append(p);
      }
      if (page.kind === "map") {
        mapButton.textContent = local("マップ", "Open Map");
        mapButton.setAttribute("aria-label", local("マップを開く", "Open Map"));
        mapButton.hidden = false;
      }
    }
    function reset() {
      current = null;
      currentState = null;
      details.hidden = true;
      mapButton.hidden = true;
      delete panel.dataset.page;
      $("previewCharge").hidden = false;
      panel.setAttribute(
        "aria-describedby",
        "tutorialName tutorialInstruction tutorialOutcome",
      );
    }
    root.addEventListener("arcline-language", () => {
      if (current) paint(current, currentState);
    });
    return {
      paint,
      reset,
      get active() {
        return !!current;
      },
    };
  }
  function createNotice(host, clock = () => performance.now() / 1000) {
    const element = document.createElement("div");
    element.id = "specialChargeNotice";
    element.className = "special-charge-notice";
    element.setAttribute("data-story-raw", "");
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    element.setAttribute("aria-atomic", "true");
    element.hidden = true;
    host.append(element);
    let battle = 0,
      queue = [],
      seen = new Set(),
      remaining = 0,
      tick = clock(),
      serial = null,
      frozen = true;
    function clear() {
      queue = [];
      remaining = 0;
      serial = null;
      element.hidden = true;
      element.textContent = "";
    }
    return {
      reset(token) {
        battle = token;
        seen = new Set();
        clear();
        tick = clock();
      },
      gain(before, state, token, beforeSerial) {
        if (
          token !== battle ||
          state.spec.boss ||
          state.spec.midboss ||
          state.result ||
          state.turn ||
          state.specialAmmo <= before ||
          state.specialChargeSerial === beforeSerial ||
          seen.has(state.specialChargeSerial)
        )
          return;
        seen.add(state.specialChargeSerial);
        queue.push(state.specialChargeSerial);
      },
      update({ paused, suppressed, aim, enemy, result, token }) {
        const now = clock(),
          dt = frozen ? 0 : Math.max(0, now - tick);
        tick = now;
        frozen = paused || suppressed;
        if (token !== battle || result) {
          clear();
          return;
        }
        if (enemy) {
          remaining = 0;
          serial = null;
          element.hidden = true;
          element.textContent = "";
          return;
        }
        if (paused || suppressed) {
          element.hidden = true;
          return;
        }
        if (!remaining && aim && queue.length) {
          serial = queue.shift();
          remaining = 1.5;
          element.textContent = local(
            "必殺技チャージ完了",
            "SPECIAL CHARGE READY",
          );
          element.dataset.serial = serial;
        } else if (remaining) remaining = Math.max(0, remaining - dt);
        element.hidden = !remaining;
        if (!remaining) {
          element.textContent = "";
          return;
        }
        const elapsed = 1.5 - remaining;
        element.style.opacity = String(
          Math.min(1, elapsed / 0.2, remaining / 0.3),
        );
        const top =
          document.querySelector(".battle-top")?.getBoundingClientRect()
            .bottom || host.getBoundingClientRect().top;
        const bottom = document
          .getElementById("battleControls")
          .getBoundingClientRect().top;
        const rect = host.getBoundingClientRect();
        element.style.top =
          (((top + bottom) / 2 - rect.top) * host.clientHeight) / rect.height +
          "px";
      },
      get state() {
        return { battle, queued: queue.length, remaining, serial };
      },
    };
  }
  const api = { key, mapKey, remaining, pagesFor, createLesson, createNotice };
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcSpecialUi = api;
})(globalThis);
