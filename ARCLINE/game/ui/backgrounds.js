/* 背景は画面座標のみ。地形・物理・保存・カメラには触れない。 */
(function (root) {
  "use strict";
  const artwork = root.ArcBackgroundCollection;
  const scenes = root.ArcBackgroundScenes;
  const team =
    typeof module !== "undefined"
      ? require("./final-team.js")
      : root.ArcFinalTeam;
  for (const scene of scenes) artwork.validate(scene);

  function sceneFor(state) {
    const scene = artwork.select(
      scenes,
      state.stage,
      state.stage === 100 ? team.mapIndex(state) : null,
    );
    if (!scene) throw new Error("Missing stage background: " + state.stage);
    return scene;
  }

  function draw(ctx, width, height, state) {
    const scene = sceneFor(state);
    artwork.draw(ctx, width, height, scene);
    return scene.id;
  }

  const api = Object.freeze({
    sceneFor,
    draw,
    scenes,
    runtimeIntegrated: true,
  });
  if (typeof module !== "undefined") module.exports = api;
  root.ArcBackgrounds = api;
})(globalThis);
