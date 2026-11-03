/* Generated from game/ui/map-camera.js. Edit the source. */
(function (root) {
  "use strict";
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function bounds(state) {
    const points = [
      { x: 0, y: 400 },
      { x: 1000, y: 400 },
    ];
    const add = (p) => {
      if (Number.isFinite(p?.x) && Number.isFinite(p?.y)) points.push(p);
    };
    for (const solid of state.world.solids) solid.poly.forEach(add);
    for (const surface of state.world.surfaces) surface.points.forEach(add);
    for (const region of [
      ...state.world.regions,
      ...(state.world.waters || []),
    ]) {
      if (Number.isFinite(region.radius)) {
        add({ x: region.x - region.radius, y: region.y - region.radius });
        add({ x: region.x + region.radius, y: region.y + region.radius });
      } else {
        add({ x: region.x1, y: region.y1 });
        add({ x: region.x2, y: region.y2 });
      }
    }
    for (const item of [
      ...state.world.terminals,
      ...state.pickups,
      ...state.blink,
    ]) {
      if (item.collected) continue;
      add({ x: item.x - 24, y: item.y - 48 });
      add({ x: item.x + 24, y: item.y + 24 });
    }
    state.units.forEach((u, side) => {
      const boss = side && state.spec.boss;
      add({ x: u.x - (boss ? 145 : 60), y: u.y - (boss ? 170 : 110) });
      add({ x: u.x + (boss ? 145 : 60), y: u.y + 28 });
      add(root.ArcEngine.geometry.muzzle(state, side, side ? 52 : state.angle));
    });
    return {
      left: Math.min(...points.map((p) => p.x)) - 24,
      right: Math.max(...points.map((p) => p.x)) + 24,
      top: Math.min(...points.map((p) => p.y)) - 24,
      bottom: Math.max(...points.map((p) => p.y)) + 24,
    };
  }
  function fit(area, frame) {
    const scale = Math.min(
      frame.width / (area.right - area.left),
      frame.height / (area.bottom - area.top),
    );
    return {
      scale,
      x: frame.left + frame.width / 2 - ((area.left + area.right) * scale) / 2,
      y: frame.top + frame.height / 2 - ((area.top + area.bottom) * scale) / 2,
    };
  }
  function constrain(view, area, frame) {
    const next = { ...view };
    for (const [axis, start, end, size] of [
      ["x", "left", "right", "width"],
      ["y", "top", "bottom", "height"],
    ]) {
      const length = (area[end] - area[start]) * next.scale;
      next[axis] =
        length <= frame[size]
          ? frame[start] +
            frame[size] / 2 -
            ((area[start] + area[end]) * next.scale) / 2
          : clamp(
              next[axis],
              frame[start] + frame[size] - area[end] * next.scale,
              frame[start] - area[start] * next.scale,
            );
    }
    return next;
  }
  function zoom(view, factor, anchor, area, frame) {
    const base = fit(area, frame).scale;
    const scale = clamp(view.scale * factor, base, Math.max(2, base * 4));
    const ratio = scale / view.scale;
    return constrain(
      {
        scale,
        x: anchor.x - (anchor.x - view.x) * ratio,
        y: anchor.y - (anchor.y - view.y) * ratio,
      },
      area,
      frame,
    );
  }
  function create(hooks) {
    const $ = (id) => document.getElementById(id);
    const panel = $("mapCamera"),
      pan = $("mapCameraPan"),
      toggle = $("mapCameraToggle");
    let active = false,
      area = null,
      frame = null,
      view = null,
      pointer = null;
    const local = (ja, en) => (root.ArcI18n.language === "en" ? en : ja);
    const point = (event) => {
      const p = root.ArcViewport.point(event.clientX, event.clientY, $("app"));
      const c = root.ArcViewport.rect($("world"), $("app"));
      return { x: p.x - c.left, y: p.y - c.top };
    };
    let renderedLanguage = null;
    function sync() {
      toggle.disabled = !active && !hooks.allowed();
      if (renderedLanguage !== root.ArcI18n.language) {
        renderedLanguage = root.ArcI18n.language;
        toggle.textContent = local("マップ", "Map");
        toggle.setAttribute(
          "aria-label",
          local("マップ全体を見渡す", "Look around the map"),
        );
        $("mapCameraTitle").textContent = local(
          "マップを見渡す",
          "Look around",
        );
        $("mapCameraHint").textContent = local(
          "ドラッグで移動・＋／−で拡大縮小",
          "Drag to pan · + / − to zoom",
        );
        $("mapCameraFit").textContent = local("全体", "Fit map");
        $("mapCameraClose").textContent = local("戦闘に戻る", "Back to battle");
        pan.setAttribute(
          "aria-label",
          local(
            "マップ表示。ドラッグまたは矢印キーで移動、＋と−で拡大縮小、0で全体表示。",
            "Map view. Drag or use arrow keys to pan, + and − to zoom, 0 to fit the map.",
          ),
        );
        $("mapCameraIn").setAttribute("aria-label", local("拡大", "Zoom in"));
        $("mapCameraOut").setAttribute("aria-label", local("縮小", "Zoom out"));
      }
      if (active && frame) {
        $("mapCameraOut").disabled =
          view.scale <= fit(area, frame).scale + 0.00001;
        $("mapCameraIn").disabled =
          view.scale >= Math.max(2, fit(area, frame).scale * 4) - 0.00001;
      }
    }
    function changed() {
      sync();
      hooks.draw();
    }
    function refit() {
      pointer = null;
      if (!active) return;
      const r = root.ArcViewport.rect(pan, $("app")),
        c = root.ArcViewport.rect($("world"), $("app"));
      frame = {
        left: r.left - c.left + 12,
        top: r.top - c.top + 12,
        width: Math.max(1, r.width - 24),
        height: Math.max(1, r.height - 24),
      };
      view = fit(area, frame);
    }
    function open() {
      if (active || !hooks.allowed()) return;
      hooks.clearInput();
      area = bounds(hooks.state());
      active = true;
      $("battle").dataset.camera = "true";
      root.ArcScreens.open("mapCamera", {
        trigger: toggle,
        block: ["battle", "lobby"],
        onEscape: close,
        cycleFocus: true,
      });
      refit();
      hooks.changed();
      changed();
      pan.focus({ preventScroll: true });
    }
    function close(restoreFocus = true) {
      if (!active) return;
      active = false;
      pointer = null;
      delete $("battle").dataset.camera;
      root.ArcScreens.close("mapCamera", restoreFocus);
      hooks.clearInput();
      hooks.resetCamera();
      hooks.changed();
      changed();
    }
    function changeZoom(factor, anchor) {
      if (!active || !hooks.available()) return;
      pointer = null;
      view = zoom(
        view,
        factor,
        anchor || {
          x: frame.left + frame.width / 2,
          y: frame.top + frame.height / 2,
        },
        area,
        frame,
      );
      changed();
    }
    toggle.onclick = open;
    $("mapCameraClose").onclick = () => close();
    $("mapCameraClose").addEventListener("pointerdown", (event) => {
      // Keep the browser's compatibility mousedown from moving focus after we
      // explicitly restore it on touch release. Mouse/keyboard keep native focus.
      if (event.pointerType === "touch") event.preventDefault();
    });
    $("mapCameraClose").addEventListener("pointerup", (event) => {
      if (event.pointerType !== "touch" || !hooks.available()) return;
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      if (hit === event.currentTarget || event.currentTarget.contains(hit)) {
        // Commit a deliberate touch release even if a just-finished pan causes
        // the browser to suppress/delay its compatibility click.
        event.preventDefault();
        // Hiding a rotated button during pointerup can retarget the trailing
        // compatibility click to a weapon/skill button underneath. Consume only
        // that trailing click; a new pointerdown immediately clears the guard.
        let timer;
        const cleanup = () => {
          document.removeEventListener("click", trailingClick, true);
          document.removeEventListener("pointerdown", cleanup, true);
          root.clearTimeout(timer);
        };
        const trailingClick = (click) => {
          if (click.detail === 0) return;
          cleanup();
          click.preventDefault();
          click.stopImmediatePropagation();
        };
        document.addEventListener("click", trailingClick, true);
        document.addEventListener("pointerdown", cleanup, true);
        timer = root.setTimeout(cleanup, 400);
        close();
      }
    });
    $("mapCameraFit").onclick = () => {
      if (hooks.available()) {
        refit();
        changed();
      }
    };
    $("mapCameraIn").onclick = () => changeZoom(1.3);
    $("mapCameraOut").onclick = () => changeZoom(1 / 1.3);
    pan.onpointerdown = (event) => {
      event.preventDefault();
      if (
        !active ||
        pointer ||
        !hooks.available() ||
        (event.pointerType !== "touch" && event.button !== 0)
      )
        return;
      pan.focus({ preventScroll: true });
      pointer = { id: event.pointerId, point: point(event), view: { ...view } };
      try {
        pan.setPointerCapture(event.pointerId);
      } catch {}
    };
    pan.onpointermove = (event) => {
      if (pointer?.id !== event.pointerId || !hooks.available()) return;
      event.preventDefault();
      const p = point(event);
      view = constrain(
        {
          ...pointer.view,
          x: pointer.view.x + p.x - pointer.point.x,
          y: pointer.view.y + p.y - pointer.point.y,
        },
        area,
        frame,
      );
      changed();
    };
    pan.onpointerup =
      pan.onpointercancel =
      pan.onlostpointercapture =
        (event) => {
          if (pointer?.id === event.pointerId) pointer = null;
        };
    pan.oncontextmenu = (event) => event.preventDefault();
    pan.addEventListener(
      "wheel",
      (event) => {
        if (!active) return;
        event.preventDefault();
        changeZoom(
          Math.exp(-clamp(event.deltaY, -150, 150) * 0.002),
          point(event),
        );
      },
      { passive: false },
    );
    panel.addEventListener("keydown", (event) => {
      if (
        !active ||
        !hooks.available() ||
        event.key === "Tab" ||
        event.key === "Escape"
      )
        return;
      // A camera key must never reach the battle's arrow/Space handlers.
      event.stopPropagation();
      const directions = {
        ArrowLeft: [48, 0],
        ArrowRight: [-48, 0],
        ArrowUp: [0, 48],
        ArrowDown: [0, -48],
      };
      if (directions[event.key]) {
        event.preventDefault();
        pointer = null;
        const [dx, dy] = directions[event.key];
        view = constrain(
          { ...view, x: view.x + dx, y: view.y + dy },
          area,
          frame,
        );
        changed();
      } else if (["+", "=", "-", "_", "0"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "0") {
          refit();
          changed();
        } else
          changeZoom(event.key === "+" || event.key === "=" ? 1.3 : 1 / 1.3);
      }
    });
    root.addEventListener("arcline-language", sync);
    sync();
    return {
      open,
      close,
      sync,
      resize: () => {
        refit();
      },
      cancelGesture: () => {
        pointer = null;
      },
      get active() {
        return active;
      },
      get options() {
        return active
          ? {
              cameraView: { ...view },
              presentationFrame: {
                top: frame.top,
                bottom: frame.top + frame.height,
              },
            }
          : {};
      },
    };
  }
  const api = Object.freeze({ bounds, fit, constrain, zoom, create });
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcMapCamera = api;
})(globalThis);
