/* Generated from game/ui/experience.js. Edit the source. */
(function (root) {
  "use strict";
  const clamp = (t) => Math.max(0, Math.min(1, t)),
    ease = (t) => {
      t = clamp(t);
      return t * t * (3 - 2 * t);
    },
    mix = (a, b, t) =>
      Object.fromEntries(
        ["x", "y", "scale"].map((k) => [k, a[k] + (b[k] - a[k]) * t]),
      );
  const introPhase = (age) =>
    age < 0.65 ? "field" : age < 2.1 ? "name" : "return";
  function bossView(normal, state, age, frame) {
    const { width, top, bottom } = frame,
      height = bottom - top;
    const low =
        Math.min(...state.units.map((u, i) => u.y - (i ? 150 : 80))) - 18,
      high = Math.max(...state.units.map((u) => u.y)) + 24;
    const scale = Math.min(width / 1060, height / Math.max(180, high - low));
    const overview = {
      scale,
      x: width / 2 - 500 * scale,
      y: (top + bottom) / 2 - ((low + high) / 2) * scale,
    };
    const boss = state.units[1],
      closeScale = Math.min(
        width / 310,
        height / 190,
        Math.max(scale, normal.scale * 1.32),
      );
    const close = {
      scale: closeScale,
      x: width * 0.55 - boss.x * closeScale,
      y: (top + bottom) / 2 - (boss.y - 65) * closeScale,
    };
    if (age >= 3.2) return { ...normal };
    if (age < 0.65) return overview;
    if (age < 1.35) return mix(overview, close, ease((age - 0.65) / 0.7));
    if (age < 2.1) return close;
    return mix(close, normal, ease((age - 2.1) / 1.1));
  }
  let horizon = null,
    renderer = null,
    nextState = null,
    last = "";
  function chapter(stage, lang) {
    if (!root.document) return;
    if (!horizon) {
      horizon = document.createElement("div");
      horizon.id = "chapterHorizon";
      horizon.className = "chapter-horizon";
      horizon.innerHTML =
        '<canvas aria-hidden="true"></canvas><div><small></small><strong></strong><span class="chapter-route" aria-hidden="true">● ━━━ ● ━━━ ◇</span></div>';
      document.getElementById("chapterMessage").before(horizon);
      renderer = root.ArcRender.create(horizon.querySelector("canvas"));
    }
    const spec = root.ArcLevels[stage - 1];
    horizon.hidden = !(stage < 100 && spec?.boss && !spec.midboss);
    if (horizon.hidden) return;
    const next = stage + 1,
      key = next + ":" + lang;
    if (last !== key) {
      nextState = root.ArcEngine.campaign(next);
      last = key;
      horizon.querySelector("small").textContent =
        lang === "en"
          ? "NEXT CHAPTER · " + (stage / 10 + 1)
          : "次の旅へ · 第" + (stage / 10 + 1) + "章";
      horizon.querySelector("strong").textContent = root.ArcStory.stageName(
        nextState.spec,
        lang,
        false,
        stage,
      );
      requestAnimationFrame(drawChapter);
    }
  }
  function drawChapter() {
    if (!nextState || horizon?.hidden || !horizon?.getClientRects().length)
      return;
    const canvas = horizon.querySelector("canvas");
    renderer.draw(nextState, {
      lobby: true,
      reducedMotion: true,
      characterId: nextState.characterId,
      presentationFrame: { top: 4, bottom: canvas.clientHeight - 4 },
    });
  }
  if (root.document) {
    const logo = document.querySelector("[data-brand-logo]");
    if (logo)
      logo.src = new URL(
        "assets/ending/cutouts/brand/logo_arcline.png",
        new URL(root.ArcAssetBase || "../../", document.baseURI),
      ).href;
    root.addEventListener("resize", drawChapter);
  }
  const api = { bossView, introPhase, chapter };
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcExperience = api;
})(globalThis);
