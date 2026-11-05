/* ARCLINE atmosphere art direction v1: matte color fields, no gradients or images.
 * Theme 4 / stages 21–25 (霧の谷). All five stages share one quiet landscape.
 * The scene is purely decorative: no gameplay coordinates, collision or hit tests.
 */
(function (root) {
  'use strict';

  const MIST = Object.freeze({
    sky: '#D7C8D2',
    upper: '#D2C6D1',
    light: '#E9D7D4',
    lightCore: '#F4E7DC',
    upperMist: '#DAD0D4',
    farHill: '#B5B7C2',
    farHillShadow: '#A9ACB9',
    stoneMain: '#ABA9B5',
    stoneShade: '#9A9DAE',
    stoneInner: '#BFC1C9',
    middleMist: '#CED1D2',
    middleHill: '#98A8B5',
    middleFace: '#8799A9',
    nearMist: '#B7C3C5',
    nearHill: '#8298A4',
    nearFace: '#738B98',
    foregroundMist: '#9EAFB8'
  });

  const TAU = Math.PI * 2;

  function poly(ctx, color, points) {
    if (!points.length) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  // Coordinates are fractions of the drawing area. Curves keep the full-width
  // landscape smooth without introducing a pixel gradient or synthetic texture.
  function land(ctx, color, top, finish = 1.06) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (const part of top.slice(1)) {
      if (part.length === 2) ctx.lineTo(part[0], part[1]);
      else ctx.bezierCurveTo(...part);
    }
    ctx.lineTo(1.03, finish);
    ctx.lineTo(-.03, finish);
    ctx.closePath();
    ctx.fill();
  }

  function disk(ctx, w, h, x, y, radius, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x * w, y * h, radius * Math.min(w, h), 0, TAU);
    ctx.fill();
  }

  function arch(ctx, x, y, width, height) {
    // Pale cut-paper ruins sit behind the mist, not on the gameplay layer.
    const thick = width * .16;
    const half = width * .5;
    const crown = y - height;
    const bottom = y + .11;
    poly(ctx, MIST.stoneMain, [[x-half,y],[x-half,crown+.055],[x-half+.035,crown+.014],[x+.02,crown],
      [x+half-.02,crown+.012],[x+half,crown+.055],[x+half,bottom],[x+half-thick,bottom],
      [x+half-thick,crown+.085],[x-half+thick,crown+.085],[x-half+thick,bottom],[x-half,bottom]]);
    poly(ctx, MIST.stoneShade, [[x+half-thick,y],[x+half-thick,crown+.085],[x+half,crown+.055],
      [x+half,bottom],[x+half-thick,bottom]]);
    poly(ctx, MIST.stoneInner, [[x-half+thick,crown+.085],[x-half+.035,crown+.014],[x+.02,crown],
      [x+half-.02,crown+.012],[x+half-thick,crown+.085]]);
  }

  function mistValley(ctx, w, h) {
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    ctx.save();
    // All backgrounds are painted with flat opaque colors, never gradients.
    // Screen-space placement avoids fake interactive terrain and drifting aim cues.
    ctx.fillStyle = MIST.sky;
    ctx.fillRect(0, 0, w, h);
    ctx.scale(w, h);
    land(ctx, MIST.upper, [[-.02,.19],[.19,.15,.33,.17,.51,.23],[.73,.27,.85,.17,1.03,.20]],.39);
    ctx.restore();

    disk(ctx, w, h, .61, .32, .19, MIST.light);
    disk(ctx, w, h, .61, .32, .155, MIST.lightCore);

    ctx.save();
    ctx.scale(w, h);
    land(ctx, MIST.upperMist, [[-.03,.49],[.15,.44,.31,.46,.42,.49],[.60,.52,.70,.45,.85,.43],[.98,.42,1.04,.43,1.05,.46]]);
    land(ctx, MIST.farHill, [[-.04,.68],[.12,.61,.20,.54,.28,.56],[.37,.57,.42,.63,.50,.64],[.65,.63,.73,.53,.84,.56],[.96,.58,1.02,.62,1.06,.64]]);
    land(ctx, MIST.farHillShadow, [[.50,.65],[.64,.62,.74,.54,.84,.56],[.94,.59,.99,.63,1.06,.67]]);
    arch(ctx,.23,.61,.18,.26);
    arch(ctx,.84,.62,.13,.19);
    land(ctx, MIST.middleMist, [[-.04,.70],[.15,.66,.26,.70,.40,.69],[.54,.69,.66,.65,.80,.68],[.95,.71,1.01,.68,1.06,.70]]);
    land(ctx, MIST.middleHill, [[-.04,.90],[.10,.80,.15,.69,.26,.69],[.36,.70,.40,.79,.50,.79],[.64,.77,.74,.68,.85,.72],[.96,.75,1.02,.83,1.06,.87]]);
    land(ctx, MIST.middleFace, [[-.04,.92],[.10,.86,.19,.78,.28,.76],[.39,.80,.44,.84,.55,.85],[.70,.81,.76,.75,.86,.76],[.98,.79,1.02,.86,1.06,.91]]);
    // Broad central negative space preserves silhouettes and projectile guides.
    land(ctx, MIST.nearMist, [[-.05,.91],[.11,.86,.21,.89,.31,.90],[.51,.92,.64,.85,.79,.88],[.94,.90,1.02,.88,1.06,.89]]);
    land(ctx, MIST.nearHill, [[-.05,.96],[.05,.84,.12,.80,.20,.84],[.24,.87,.29,.93,.34,.97],[.44,1.0,.57,1.0,.65,.97],[.76,.89,.85,.83,.94,.88],[1.01,.91,1.04,.92,1.08,.95]]);
    poly(ctx, MIST.nearFace, [[-.04,.96],[.05,.84],[.12,.80],[.17,.85],[.14,.95],[.08,1.04],[-.04,1.05]]);
    poly(ctx, MIST.nearFace, [[.85,.83],[.94,.88],[1.05,.94],[1.05,1.05],[.90,1.05],[.88,.95]]);
    land(ctx, MIST.foregroundMist, [[-.04,1.01],[.11,.97,.21,.98,.33,.99],[.55,1.02,.70,.96,.87,.98],[.96,1.0,1.02,.99,1.06,1.0]],1.06);
    ctx.restore();
  }

  function draw(ctx, width, height, theme) {
    if (theme !== 4) return false;
    mistValley(ctx, width, height);
    return true;
  }

  const api = Object.freeze({draw, palette:MIST, supportedThemes:Object.freeze([4])});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ArcAtmosphere = api;
})(globalThis);
