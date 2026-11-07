/* Approved component art. Geometry is read-only; the engine owns all collisions. */
(function (root) {
  "use strict";
  const node = typeof module !== "undefined";
  const backgrounds = node ? require("./backgrounds.js") : root.ArcBackgrounds;
  const geometry = node ? require("./geometry.js") : root.ArcGeometry;
  const vector = root.ArcComponentCollection;
  const data = root.ArcComponentMaterials;
  const shared = data.shared,
    style = data.renderStyle;
  const cache = new WeakMap();
  function freeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  freeze(data);
  function sceneFor(state) {
    const id = backgrounds.sceneFor(state).id,
      scene = data.scenes[id];
    if (!scene) throw new Error("Missing component scene: " + id);
    return scene;
  }
  const group = (children, extra = {}) => ({
    type: "group",
    children,
    ...extra,
  });
  const path = (
    d,
    fill = "none",
    stroke,
    strokeWidth = 1,
    screenStroke = false,
    extra = {},
  ) => ({
    type: "path",
    d,
    fill,
    ...(stroke ? { stroke, strokeWidth, screenStroke } : {}),
    ...extra,
  });
  const pointsPath = (points) =>
    "M" + points.map((p) => p.join(" ")).join(" L") + " Z";
  const poly = (points, fill, stroke, width, screen = true, extra = {}) =>
    path(pointsPath(points), fill, stroke, width, screen, extra);
  const line = (points, color, width) =>
    path(
      "M" + points.map((p) => p.join(" ")).join(" L"),
      "none",
      color,
      width,
      true,
    );
  const rect = (x, y, w, h, color) =>
    poly(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      color,
    );
  const text = (x, y, value, size, fill, weight = 600, extra = {}) => ({
    type: "text",
    x,
    y,
    text: value,
    size,
    fill,
    weight,
    ...extra,
  });
  const outline = (color, scale) =>
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(parseInt(color.slice(i, i + 2), 16) * scale)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  function material(points, mat, caps = [], fragile = false, id) {
    const colors = fragile ? shared.breakable : mat.palette;
    const xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    const x = Math.min(...xs),
      y = Math.min(...ys),
      w = Math.max(...xs) - x,
      h = Math.max(...ys) - y;
    const planes = fragile
      ? [
          {
            color: "shade",
            points: [
              [0.55, 0],
              [1, 0],
              [1, 1],
              [0.45, 1],
              [0.63, 0.45],
            ],
          },
          {
            color: "light",
            points: [
              [0, 0],
              [0.35, 0],
              [0.49, 0.27],
              [0.12, 0.38],
              [0, 0.23],
            ],
          },
        ]
      : mat.planes;
    const fill = [poly(points, colors.face)];
    for (const plane of planes)
      fill.push(
        poly(
          plane.points.map(([a, b]) => [x + w * a, y + h * b]),
          colors[plane.color],
        ),
      );
    if (fragile) {
      fill.push(
        line(
          [
            [x + w * 0.53, y + h * 0.15],
            [x + w * 0.45, y + h * 0.4],
            [x + w * 0.54, y + h * 0.59],
            [x + w * 0.46, y + h * 0.85],
          ],
          colors.cap,
          2.6,
        ),
      );
      fill.push(
        line(
          [
            [x + w * 0.45, y + h * 0.4],
            [x + w * 0.25, y + h * 0.48],
          ],
          colors.cap,
          1.7,
        ),
      );
    }
    for (const cap of caps)
      fill.push(line(cap, colors.cap, style.contactEdgeWidth));
    const rule = fragile ? style.functionalOutline : style.naturalOutline;
    return group(
      [
        group(fill, { clip: pointsPath(points), role: "materialFill" }),
        poly(
          points,
          "none",
          outline(colors.face, rule.valueScale),
          rule.width,
          true,
          { role: "materialOutline" },
        ),
      ],
      {
        role: "solid",
        solidId: id,
        collider: points,
        material: fragile ? "shared-breakable" : mat.name,
      },
    );
  }
  function reflector(points) {
    const p = shared.reflector,
      [a, b] = points,
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      length = Math.hypot(dx, dy) || 1;
    const inner = [
      poly(points, p.body),
      line([a, b], p.edge, style.reflectiveEdgeWidth),
    ];
    for (let k = 1; k < 4; k++) {
      const x = a[0] + (dx * k) / 4,
        y = a[1] + (dy * k) / 4;
      inner.push(
        line(
          [
            [x - (dx / length) * 4, y - (dy / length) * 4],
            [x - (dy / length) * 4, y + (dx / length) * 4],
          ],
          p.marks,
          1.3,
        ),
      );
    }
    return group(
      [
        group(inner, { clip: pointsPath(points) }),
        poly(
          points,
          "none",
          outline(p.body, style.functionalOutline.valueScale),
          style.functionalOutline.width,
        ),
      ],
      { role: "reflector", collider: points },
    );
  }
  function bridge(points, hinge) {
    const p = shared.bridge,
      rule = style.functionalOutline;
    return group(
      [
        poly(points, p.body, outline(p.body, rule.valueScale), rule.width),
        line(points.slice(0, 2), p.contact, style.bridgeContactWidth),
        {
          type: "ellipse",
          cx: hinge.x,
          cy: hinge.y,
          rx: 7,
          ry: 7,
          fill: p.hinge,
          stroke: outline(p.hinge, rule.valueScale),
          strokeWidth: rule.width,
        },
      ],
      { role: "bridge", collider: points },
    );
  }
  function solidNode(solid, world, scene) {
    const points = solid.poly.map((p) => [p.x, p.y]);
    if (["reflector", "crystal"].includes(solid.kind)) return reflector(points);
    if (solid.kind === "bridge") return bridge(points, solid.hinge);
    const mat =
        scene.materials[
          ["floor", "bedrock", "floor-fragment"].includes(solid.kind)
            ? "terrain"
            : "structure"
        ],
      caps = [];
    for (const surface of world.surfaces) {
      if ((surface.solidId || surface.id) !== solid.id) continue;
      for (let i = 1; i < surface.points.length; i++) {
        const a = surface.points[i - 1],
          b = surface.points[i];
        if (
          Math.abs(Math.atan2(b.y - a.y, b.x - a.x)) <=
          (70 * Math.PI) / 180 + 1e-7
        )
          caps.push([
            [a.x, a.y],
            [b.x, b.y],
          ]);
      }
    }
    return material(points, mat, caps, solid.kind === "fragile", solid.id);
  }
  function fieldState(region) {
    const key =
      region.kind +
      (["F", "M"].includes(region.kind)
        ? region.direction < 0
          ? "-"
          : "+"
        : "");
    return {
      active: region.on !== false && (region.strength ?? 1) > 0,
      color: shared.fieldKinds[key],
      accent: shared.fieldAccents[key],
    };
  }
  function regionNode(region, unit = 1) {
    const current = fieldState(region),
      children = [];
    if (current.active && region.kind === "M") {
      const { x, y, radius: r } = region;
      children.push(
        path(
          `M${x - r} ${y} A${r} ${r} 0 0 1 ${x} ${y - r} M${x} ${y + r} A${r} ${r} 0 0 0 ${x + r} ${y}`,
          "none",
          current.color,
          style.fieldStateWidth,
          true,
          { opacity: style.fieldFrameOpacity, role: "fieldFrame" },
        ),
      );
      children.push(
        text(
          x - 6 * unit,
          y + 6 * unit,
          region.direction < 0 ? "−" : "＋",
          18 * unit,
          current.color,
          700,
          {
            stroke: current.accent,
            strokeWidth: 2,
            screenStroke: true,
            role: "fieldPolarity",
          },
        ),
      );
    }
    const settings = {};
    for (const key of [
      "cloudOpacity",
      "thinCloudOpacity",
      "cueOpacity",
      "cueWidth",
      "cueHaloWidth",
      "cueHaloOpacity",
      "cloudEdgeWidth",
      "cloudEdgeOpacity",
      "flowCueWidth",
      "flowCueOpacity",
      "flowHaloWidth",
      "flowHaloOpacity",
      "flowBandOpacity",
      "offscreenFlowSourceHint",
    ])
      settings[key] = style[key];
    return group(children, {
      role: "field",
      sourceState: {
        kind: region.kind,
        direction: region.direction,
        on: region.on,
        strength: region.strength,
      },
      motion: {
        ...region,
        color: current.color,
        accent: current.accent,
        ...settings,
      },
    });
  }
  function terminalNode(terminal, scene) {
    const { x, y } = terminal,
      p = shared.terminal;
    return group(
      [
        material(
          [
            [x - 23, y + 18],
            [x + 23, y + 18],
            [x + 23, y + 30],
            [x - 23, y + 30],
          ],
          scene.materials.structure,
        ),
        rect(x - 17, y - 14, 34, 33, p.body),
        rect(x - 12, y - 8, 24, 20, p.display),
        text(x - 8, y + 9, "＋", 18, p.symbol),
      ],
      { role: "terminal" },
    );
  }
  function paint(ctx, node, options) {
    vector.draw(
      ctx,
      1,
      1,
      { width: 1, height: 1, nodes: [node] },
      { pixelRatio: options.dpr || 1, ...options },
    );
  }
  function exterior(ctx, solid, world, scene, options) {
    const v = options.view;
    if (!v) return;
    const left = (-v.x - 16) / v.scale,
      right = (options.width - v.x + 16) / v.scale,
      bottom = (options.height - v.y + 16) / v.scale,
      points = solid.poly.map((p) => [p.x, p.y]);
    let extended = null;
    if (solid.kind === "floor") {
      const surface = points.slice(0, -2),
        a = surface[0],
        b = surface.at(-1);
      if (a[0] <= 0.001 && left < a[0]) surface.unshift([left, a[1]]);
      if (b[0] >= (world.width || 1000) - 0.001 && right > b[0])
        surface.push([right, b[1]]);
      const y = Math.max(bottom, ...points.map((p) => p[1]));
      extended = [...surface, [surface.at(-1)[0], y], [surface[0][0], y]];
    } else if (solid.kind === "bedrock" && points.some((p) => p[1] >= 525)) {
      extended = points.map((p) => [...p]);
      if (points.filter((p) => p[0] <= 0.001).length >= 2 && left < 0)
        for (const p of extended) if (p[0] <= 0.001) p[0] = left;
      if (
        points.filter((p) => p[0] >= (world.width || 1000) - 0.001).length >=
          2 &&
        right > (world.width || 1000)
      )
        for (const p of extended)
          if (p[0] >= (world.width || 1000) - 0.001) p[0] = right;
    }
    if (extended)
      paint(ctx, poly(extended, scene.materials.terrain.palette.face), options);
  }
  function drawSolid(ctx, solid, world, options) {
    const scene = sceneFor(options.state);
    if (solid.kind === "reflector" && !solid.underside) {
      const [a, b] = solid.poly,
        mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 0.5 };
      if (
        world.solids.some(
          (other) =>
            other !== solid &&
            other.kind !== "reflector" &&
            geometry.inside(mid, other.poly),
        )
      )
        return;
    }
    exterior(ctx, solid, world, scene, options);
    let cached = cache.get(solid);
    if (!cached || cached.world !== world || cached.scene !== scene) {
      cached = { world, scene, node: solidNode(solid, world, scene) };
      cache.set(solid, cached);
    }
    paint(ctx, cached.node, options);
  }
  function drawRegion(ctx, region, options) {
    if (options.labelOnly) return;
    const m = ctx.getTransform(),
      unit = (options.dpr || 1) / Math.max(0.0001, Math.hypot(m.a, m.b));
    paint(ctx, regionNode(region, unit), {
      ...options,
      fieldMotion: true,
      fieldBounds: options.bounds,
      language: root.ArcI18n?.language || "ja",
    });
  }
  function drawTerminal(ctx, terminal, state, options) {
    paint(ctx, terminalNode(terminal, sceneFor(state)), options);
    if (state.effects.pendingPolarity === undefined) return;
    const m = ctx.getTransform(),
      u = (options.dpr || 1) / Math.max(0.0001, Math.hypot(m.a, m.b));
    const value = state.effects.pendingPolarity > 0 ? "＋" : "−",
      label =
        (root.ArcI18n?.language === "en" ? "NEXT TURN " : "次の手番 ") + value;
    ctx.save();
    try {
      ctx.font = `600 ${12 * u}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const w = ctx.measureText(label).width + 8 * u,
        h = 20 * u,
        b = options.bounds;
      let x = terminal.x,
        y = terminal.y - 30 * u;
      if (b) {
        x = Math.max(
          b.left + w / 2 + 3 * u,
          Math.min(b.right - w / 2 - 3 * u, x),
        );
        y = Math.max(
          b.top + h / 2 + 3 * u,
          Math.min(b.bottom - h / 2 - 3 * u, y),
        );
      }
      const box = (yy) => ({
          left: x - w / 2,
          right: x + w / 2,
          top: yy - h / 2,
          bottom: yy + h / 2,
        }),
        overlap = (a, c) =>
          a.left < c.right + 3 * u &&
          a.right > c.left - 3 * u &&
          a.top < c.bottom + 3 * u &&
          a.bottom > c.top - 3 * u,
        obstacles = [...(options.avoid || []), ...(options.labels || [])];
      if (b && obstacles.some((a) => overlap(box(y), a)))
        for (let n = 1; n <= 8; n++) {
          const yy = y + n * (h + 4 * u);
          if (
            yy + h / 2 < b.bottom &&
            !obstacles.some((a) => overlap(box(yy), a))
          ) {
            y = yy;
            break;
          }
        }
      options.labels?.push(box(y));
      ctx.lineWidth = 2 * u;
      ctx.lineJoin = "round";
      ctx.strokeStyle = shared.fieldAccents["F-"];
      ctx.strokeText(label, x, y);
      ctx.fillStyle = shared.fieldKinds["F-"];
      ctx.fillText(label, x, y);
    } finally {
      ctx.restore();
    }
  }
  const api = Object.freeze({
    sceneFor,
    solidNode,
    regionNode,
    terminalNode,
    fieldState,
    drawSolid,
    drawRegion,
    drawTerminal,
    materials: data,
    runtimeIntegrated: true,
  });
  if (node) module.exports = api;
  root.ArcComponentArt = api;
})(globalThis);
