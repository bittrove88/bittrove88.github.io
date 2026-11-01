/* Generated from game/ui/battle-input.js. Edit the source. */
(function (root) {
  "use strict";
  function create(hooks) {
    const $ = (id) => document.getElementById(id),
      E = root.ArcEngine,
      V = root.ArcViewport;
    let move = null,
      aim = null,
      gesture = null,
      keyMove = 0;
    const point = (e) => V.point(e.clientX, e.clientY, $("app"));
    function vector(id, e) {
      const r = V.rect($(id), $("app")),
        p = point(e);
      return { dx: p.x - r.left - r.width / 2, dy: p.y - r.top - r.height / 2 };
    }
    function activate(e) {
      e.preventDefault();
      hooks.activate();
    }
    function capture(id, e) {
      try {
        $(id).setPointerCapture(e.pointerId);
      } catch {}
    }
    function resetMove() {
      move = null;
      keyMove = 0;
      $("stickKnob").style.transform = "translate(0px,0px)";
      $("stick").setAttribute("aria-valuenow", 0);
    }
    function resetAim() {
      aim = null;
      $("aimStickKnob").style.transform = "translate(0px,0px)";
    }
    function movePointer(e) {
      if (move?.id !== e.pointerId) return;
      const { dx, dy } = vector("stick", e),
        mag = Math.hypot(dx, dy),
        scale = mag ? Math.min(mag, 27) / mag : 0;
      move.axis = Math.abs(dx) < 8 ? 0 : E.clamp(dx / 27, -1, 1);
      $("stickKnob").style.transform =
        `translate(${dx * scale}px,${dy * scale}px)`;
      $("stick").setAttribute("aria-valuenow", Math.round(move.axis * 100));
    }
    function aimPointer(e) {
      if (aim?.id !== e.pointerId) return;
      const { dx, dy } = vector("aimStick", e),
        mag = Math.hypot(dx, dy),
        scale = mag ? Math.min(mag, 27) / mag : 0;
      aim.axis =
        Math.abs(dy) <= 6
          ? 0
          : E.clamp((-Math.sign(dy) * (Math.abs(dy) - 6)) / 21, -1, 1);
      $("aimStickKnob").style.transform =
        `translate(${dx * scale}px,${dy * scale}px)`;
    }
    function chargePointer(e) {
      const charge = hooks.charge();
      if (charge?.id !== e.pointerId) return;
      e.preventDefault();
      const { dx, dy } = vector("fire", e),
        r = V.rect($("fire"), $("app")),
        radius = Math.min(r.width, r.height) / 2;
      charge.cancel = Math.hypot(dx, dy) > radius + (charge.cancel ? 4 : 14);
      hooks.changed();
    }
    $("fire").onpointerdown = (e) => {
      activate(e);
      if (hooks.charge() || (e.button !== 0 && e.pointerType !== "touch"))
        return;
      hooks.startCharge(e.pointerId);
      capture("fire", e);
    };
    $("fire").onpointermove = chargePointer;
    $("fire").onpointerup = (e) => {
      chargePointer(e);
      hooks.releaseCharge(e.pointerId);
    };
    $("fire").onpointercancel = $("fire").onlostpointercapture = (e) => {
      if (hooks.charge()?.id === e.pointerId) hooks.clearInput();
      hooks.changed();
    };
    $("stick").onpointerdown = (e) => {
      activate(e);
      if (!hooks.allowed() || move) return;
      move = { id: e.pointerId, axis: 0 };
      capture("stick", e);
      movePointer(e);
    };
    $("stick").onpointermove = movePointer;
    $("stick").onpointerup =
      $("stick").onpointercancel =
      $("stick").onlostpointercapture =
        (e) => {
          if (move?.id === e.pointerId) resetMove();
        };
    $("aimStick").onpointerdown = (e) => {
      activate(e);
      if (
        !hooks.allowed() ||
        aim ||
        (e.button !== 0 && e.pointerType !== "touch")
      )
        return;
      aim = { id: e.pointerId, axis: 0 };
      gesture = null;
      capture("aimStick", e);
      aimPointer(e);
    };
    $("aimStick").onpointermove = aimPointer;
    $("aimStick").onpointerup =
      $("aimStick").onpointercancel =
      $("aimStick").onlostpointercapture =
        (e) => {
          if (aim?.id === e.pointerId) resetAim();
        };
    $("world").onpointerdown = (e) => {
      activate(e);
      if (hooks.previewing()) return;
      if (hooks.worldAction(e)) return;
      if (gesture || hooks.charge()) return;
      const p = point(e),
        s = hooks.state();
      gesture = {
        id: e.pointerId,
        x: p.x,
        y: p.y,
        angle: s?.angle ?? 48,
        lobby: !s,
      };
      capture("world", e);
    };
    $("world").onpointermove = (e) => {
      if (gesture?.id !== e.pointerId || !hooks.allowed()) return;
      const p = point(e);
      hooks.setAngle(gesture.angle + (gesture.y - p.y) * 0.4);
    };
    $("world").onpointerup = (e) => {
      if (gesture?.id !== e.pointerId) return;
      const g = gesture,
        p = point(e);
      gesture = null;
      if (g.lobby && Math.abs(p.x - g.x) > 40)
        hooks.switchMap(p.x < g.x ? 1 : -1);
    };
    $("world").onpointercancel = $("world").onlostpointercapture = (e) => {
      if (gesture?.id === e.pointerId) gesture = null;
    };
    for (const id of ["world", "stick", "aimStick", "fire"])
      $(id).oncontextmenu = (e) => e.preventDefault();
    function keydown(e) {
      if (
        hooks.previewing() ||
        (e.target?.matches?.("input,select,button") &&
          e.target.id !== "fire") ||
        !hooks.allowed()
      )
        return;
      const s = hooks.state();
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)
      )
        e.preventDefault();
      if (e.key === " " && !e.repeat) hooks.startCharge("keyboard");
      if (e.key === "ArrowLeft") keyMove = -1;
      if (e.key === "ArrowRight") keyMove = 1;
      if (e.key === "ArrowUp") hooks.setAngle(s.angle + 1);
      if (e.key === "ArrowDown") hooks.setAngle(s.angle - 1);
      if (e.target?.id === "aimStick" && ["Home", "End"].includes(e.key)) {
        e.preventDefault();
        hooks.setAngle(
          e.key === "Home" ? hooks.minimumAngle() : hooks.maximumAngle(),
        );
      }
      hooks.changed();
    }
    document.addEventListener("keyup", (e) => {
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) keyMove = 0;
      if (e.key === " ") {
        if (
          !e.target?.matches?.("input,select,button") ||
          e.target.id === "fire" ||
          hooks.charge()?.id === "keyboard"
        )
          e.preventDefault();
        hooks.releaseCharge("keyboard");
      }
    });
    return {
      keydown,
      clear() {
        gesture = null;
        resetMove();
        resetAim();
      },
      cancelGesture() {
        gesture = null;
      },
      get movementAxis() {
        return move ? move.axis : keyMove;
      },
      get aimAxis() {
        return aim?.axis || 0;
      },
      get active() {
        return !!(move || aim);
      },
    };
  }
  root.ArcBattleInput = Object.freeze({ create });
})(globalThis);
