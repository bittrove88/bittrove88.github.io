/* Decorative artwork only. No gameplay imports, image assets or network calls. */
(function (root) {
  'use strict';
  const compiled = new WeakMap();
  function validate(scene) {
    if (!scene || scene.schema !== 'arcline.background-art/v3' ||
        !Array.isArray(scene.size) || scene.size.length !== 2 ||
        !scene.size.every(n => Number.isFinite(n) && n > 0) ||
        !Array.isArray(scene.shapes) || !scene.shapes.length ||
        !Array.isArray(scene.layerOrder) || !scene.layerOrder.length ||
        new Set(scene.layerOrder).size !== scene.layerOrder.length ||
        !Number.isInteger(scene.themeIndex) || scene.themeIndex < 0 || scene.themeIndex > 19 ||
        !['normal', 'boss', 'final'].includes(scene.kind) ||
        !scene.palette || !Object.values(scene.palette).every(c => /^#[0-9a-f]{6}$/i.test(c))) {
      throw new Error('Invalid background scene');
    }
    const ids = new Set();
    for (const shape of scene.shapes) {
      if (!shape || typeof shape.id !== 'string' || ids.has(shape.id) ||
          !scene.layerOrder.includes(shape.layer) || !scene.palette[shape.fill]) {
        throw new Error('Invalid background shape identity, layer or fill');
      }
      ids.add(shape.id);
      if (shape.kind === 'path') {
        if (typeof shape.d !== 'string' || !/^M/i.test(shape.d) || /[^MmLlHhVvCcSsQqTtAaZz0-9.,eE+\s-]/.test(shape.d)) {
          throw new Error('Invalid vector path');
        }
      } else if (shape.kind === 'ellipse') {
        if (![shape.cx, shape.cy, shape.rx, shape.ry].every(Number.isFinite) || shape.rx <= 0 || shape.ry <= 0) {
          throw new Error('Invalid ellipse');
        }
      } else throw new Error('Unsupported vector shape');
    }
    return true;
  }
  function prepare(scene) {
    if (!compiled.has(scene)) {
      validate(scene);
      const items = [];
      for (const layer of scene.layerOrder) for (const shape of scene.shapes) {
        if (shape.layer !== layer) continue;
        const path = new Path2D();
        if (shape.kind === 'path') path.addPath(new Path2D(shape.d));
        else path.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2);
        items.push({path, color: scene.palette[shape.fill]});
      }
      compiled.set(scene, items);
    }
    return compiled.get(scene);
  }
  function draw(ctx, width, height, scene, options = {}) {
    if (!ctx || ![width,height].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid viewport');
    const items = prepare(scene);
    const [w,h] = scene.size;
    const scale = (options.fit === 'contain' ? Math.min : Math.max)(width/w,height/h);
    ctx.save();
    try {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
      ctx.shadowColor = '#00000000';
      ctx.fillStyle = scene.palette.sky || scene.palette.skyBase || Object.values(scene.palette)[0];
      ctx.fillRect(0,0,width,height);
      ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
      ctx.translate((width-w*scale)/2,(height-h*scale)/2);ctx.scale(scale,scale);
      for (const item of items) {ctx.fillStyle=item.color;ctx.fill(item.path);}
    } finally {ctx.restore();}
  }
  function select(scenes, stage, mapIndex = null) {
    if (!Number.isInteger(stage) || stage < 1 || stage > 100) return null;
    if (stage === 100) {
      if (!Number.isInteger(mapIndex) || mapIndex < 0 || mapIndex > 3) return null;
      return scenes.find(s => s.kind === 'final' && s.mapIndex === mapIndex) || null;
    }
    if (stage % 10 === 0) return scenes.find(s => s.kind === 'boss' && s.stage === stage) || null;
    return scenes.find(s => s.kind === 'normal' && s.themeIndex === Math.floor((stage-1)/5)) || null;
  }
  // Preview-only timing follows final-travel.js: old scene until t=.55.
  // The actual falling terrain is owned by the game, never by this renderer.
  function transition(ctx,width,height,from,to,progress,reduced=false) {
    const t = Math.max(0,Math.min(1,progress));
    draw(ctx,width,height,t < .55 ? from : to);
    if (reduced) return;
    const close=t < .55 ? Math.min(1,Math.max(0,(t-.35)/.20)) : Math.max(0,1-(t-.55)/.28);
    if (!close) return;
    ctx.save();
    try {
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
      ctx.shadowBlur=ctx.shadowOffsetX=ctx.shadowOffsetY=0;
      ctx.fillStyle=from.palette.deep || '#607570';
      ctx.fillRect(0,0,width,height*.5*close);
      ctx.fillRect(0,height-height*.5*close,width,height*.5*close);
    } finally {ctx.restore();}
  }
  const api=Object.freeze({validate,draw,select,transition,version:'1.0',runtimeIntegrated:false});
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  root.ArcBackgroundCollection=api;
})(globalThis);
