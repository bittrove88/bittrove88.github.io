/* ARCLINE | 1–5面「はじまりの入江」| shared background renderer.
 * Scene source: ARCLINE_BG_001_005_FirstCove.json
 * Opaque flat color fields; no gradients, image requests, textures or blur.
 * Usage: ArcFirstCoveBackground.draw(ctx, widthCssPx, heightCssPx, scene, {fit:'cover'})
 * This file does NOT modify the game, terrain, physics, units, guides or HUD.
 */
(function(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ArcFirstCoveBackground = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const CACHE = new Map();
  const COLOR = /^#[0-9a-f]{6}$/i;
  const VALID_KINDS = new Set(['path','ellipse']);

  function validate(scene) {
    if (!scene || scene.schema !== 'arcline.colorfield-background/v2' ||
        scene.themeIndex !== 0 || !Array.isArray(scene.stageRange) ||
        scene.stageRange[0] !== 1 || scene.stageRange[1] !== 5 ||
        !Array.isArray(scene.size) || scene.size.length !== 2 ||
        !scene.size.every(x => Number.isFinite(x) && x > 0) ||
        !scene.palette || !Array.isArray(scene.layerOrder) ||
        !Array.isArray(scene.shapes)) {
      throw Error('Invalid First Cove background schema');
    }
    const layers = new Set(scene.layerOrder);
    const ids = new Set();
    for (const s of scene.shapes) {
      if (ids.has(s.id)) throw Error('Duplicate shape ID: ' + s.id);
      ids.add(s.id);
      if (!layers.has(s.layer) || !VALID_KINDS.has(s.kind) || !COLOR.test(scene.palette[s.fill] || '')) {
        throw Error('Invalid shape/layer/color: ' + s.id);
      }
      if (s.kind === 'path' && !(typeof s.d === 'string' && /^M[-\d.]/.test(s.d))) {
        throw Error('Invalid vector path: ' + s.id);
      }
      if (s.kind === 'ellipse' && ![s.cx,s.cy,s.rx,s.ry].every(Number.isFinite)) {
        throw Error('Invalid ellipse: ' + s.id);
      }
    }
    return true;
  }

  function getPath(d) {
    if (!CACHE.has(d)) CACHE.set(d, new Path2D(d));
    return CACHE.get(d);
  }

  function draw(ctx, width, height, scene, options={}) {
    validate(scene);
    if (!ctx || !Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0) {
      throw Error('Expected a Canvas 2D context and positive CSS-pixel viewport');
    }
    const [baseW,baseH] = scene.size;
    const scale = options.fit === 'contain'
      ? Math.min(width/baseW,height/baseH)
      : Math.max(width/baseW,height/baseH);
    const dx = (width-baseW*scale)*.5;
    const dy = (height-baseH*scale)*.5;
    ctx.save();
    try {
      ctx.fillStyle = scene.palette.sky;
      ctx.fillRect(0,0,width,height);
      ctx.beginPath();
      ctx.rect(0,0,width,height);
      ctx.clip();
      ctx.translate(dx,dy);
      ctx.scale(scale,scale);
      for (const layer of scene.layerOrder) {
        for (const s of scene.shapes) {
          if (s.layer !== layer) continue;
          ctx.fillStyle = scene.palette[s.fill];
          if (s.kind === 'path') {
            ctx.fill(getPath(s.d));
          } else {
            ctx.beginPath();
            ctx.ellipse(s.cx,s.cy,s.rx,s.ry,0,0,Math.PI*2);
            ctx.fill();
          }
        }
      }
    } finally {
      ctx.restore();
    }
  }

  function appliesToStage(stage) { return Number.isInteger(stage) && stage>=1 && stage<=5; }
  return Object.freeze({draw,validate,appliesToStage,version:'2.0',rendering:'opaque-matte-vector-paths'});
});
