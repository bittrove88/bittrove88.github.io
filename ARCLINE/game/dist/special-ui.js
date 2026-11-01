/* Generated from game/ui/special-ui.js. Edit the source. */
(function (root) {
  "use strict";
  const key = "v6:special-charge",
    local = (ja, en) => (root.ArcI18n.language === "en" ? en : ja);
  const title = () => local("必殺技の使い方", "Using Special Attacks");
  function createLesson() {
    const screen = document.createElement("section");
    screen.id = "specialLesson";
    screen.className = "special-lesson";
    screen.hidden = true;
    screen.setAttribute("data-story-raw", "");
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-modal", "true");
    screen.setAttribute("aria-labelledby", "specialLessonTitle");
    screen.innerHTML =
      '<div><h2 id="specialLessonTitle"></h2><p data-copy="normal"></p><p data-copy="fire"></p><p data-copy="boss"></p><p data-copy="ready"></p><button type="button"></button></div>';
    document.getElementById("gameSurface").append(screen);
    const text = {
      normal: [
        "必殺技は、機体ごとに異なる特別な攻撃です。通常戦闘では、自分の第2・4・6ターンに1回分ずつチャージされます。1回分あれば、武器の切り替えから必殺技を選んで使えます。最大3回分までためられます。",
        "Each machine has its own special attack. In normal battles, you gain one use on your 2nd, 4th, and 6th turns. Choose it from the weapon selector when you have at least one charge. You can hold up to three uses.",
      ],
      fire: [
        "FIREの長押しは弾の威力調整。必殺技のチャージとは別です。",
        "Holding FIRE adjusts shot power. It does not charge your special attack.",
      ],
      boss: [
        "大ボス戦では最初から必殺技を3回分使えます。",
        "Guardian battles start with three special uses available.",
      ],
      ready: [
        "チャージ完了！ 武器切り替えから必殺技を選べます。",
        "Special ready! Open the weapon selector to use it.",
      ],
    };
    function paint() {
      document.getElementById("specialLessonTitle").textContent = title();
      for (const [id, pair] of Object.entries(text))
        screen.querySelector('[data-copy="' + id + '"]').textContent = local(
          ...pair,
        );
      screen.querySelector("button").textContent = local("わかった", "Got it");
    }
    root.addEventListener("arcline-language", paint);
    return {
      show(data, persist, done, state) {
        if (data.seenPreviewIds.includes(key)) return false;
        paint();
        screen.querySelector('[data-copy="boss"]').hidden = !state?.spec.boss;
        screen.querySelector('[data-copy="ready"]').hidden =
          !state?.specialAmmo;
        root.ArcScreens.open("specialLesson", {
          block: ["battle", "overlay"],
          onEscape() {},
          cycleFocus: true,
        });
        screen.querySelector("button").onclick = () => {
          if (screen.hidden) return;
          data.seenPreviewIds.push(key);
          persist();
          root.ArcScreens.close("specialLesson", false);
          done?.();
        };
        screen.querySelector("button").focus();
        return true;
      },
      get active() {
        return !screen.hidden;
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
  const api = { key, createLesson, createNotice };
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcSpecialUi = api;
})(globalThis);
