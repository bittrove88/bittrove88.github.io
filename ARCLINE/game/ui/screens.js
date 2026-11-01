(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const entries = new Map(),
    order = [];
  const controlBlockers = [
    "collectionPanel",
    "battleMachinePicker",
    "difficultyIntro",
    "onboardingIntro",
    "installGuide",
    "lootPicker",
    "weaponPicker",
    "skillPicker",
    "specialLesson",
    "journeyStart",
    "chapterPlayback",
    "deleteSaveDialog",
  ];
  const isOpen = (id) => !!$(id) && !$(id).hidden;
  function open(id, options = {}) {
    const element = $(id);
    if (!element) throw Error("Unknown screen: " + id);
    if (!entries.has(id)) {
      const inert = (options.block || [])
        .map($)
        .filter((e) => e && e !== element && !e.contains(element))
        .map((e) => [e, e.inert]);
      entries.set(id, {
        ...options,
        trigger: options.trigger || document.activeElement,
        inert,
      });
      order.push(id);
      for (const [e] of inert) e.inert = true;
    }
    element.hidden = false;
  }
  function close(id, restoreFocus = true) {
    if (id === "storyCinema" && root.ArcStoryView?.state?.ending) return;
    const entry = entries.get(id);
    $(id).hidden = true;
    if (!entry) return;
    entries.delete(id);
    const index = order.indexOf(id);
    if (index >= 0) order.splice(index, 1);
    for (const [e, value] of entry.inert) e.inert = value;
    const target = entry.trigger;
    if (
      restoreFocus &&
      target?.isConnected &&
      target.getClientRects().length &&
      !target.closest("[hidden],[inert]")
    )
      target.focus({ preventScroll: true });
  }
  function focusables(element) {
    return [
      ...element.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]',
      ),
    ].filter(
      (e) =>
        e.getClientRects().length &&
        !e.closest("[hidden],[inert]") &&
        (e.type !== "radio" || e.checked),
    );
  }
  function trap(event, element, cycle = false) {
    const list = focusables(element),
      index = list.indexOf(document.activeElement);
    if (!list.length) return;
    if (
      cycle ||
      (event.shiftKey && index <= 0) ||
      (!event.shiftKey && index === list.length - 1)
    ) {
      event.preventDefault();
      list[
        (index + (event.shiftKey ? -1 : 1) + list.length) % list.length
      ].focus();
    }
  }
  document.addEventListener(
    "keydown",
    (event) => {
      if ($("app")?.inert || $("gameSurface")?.inert || isOpen("screenHelp"))
        return;
      const id = [...order]
        .reverse()
        .find((id) => isOpen(id) && !$(id).closest("[inert]"));
      if (!id) return;
      const entry = entries.get(id);
      if (event.key === "Escape") {
        if (document.fullscreenElement || document.webkitFullscreenElement)
          return;
        event.preventDefault();
        event.stopImmediatePropagation();
        entry.onEscape?.();
      } else if (event.key === "Tab") {
        trap(event, $(id), entry.cycleFocus);
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  root.ArcScreens = Object.freeze({
    open,
    close,
    isOpen,
    trap,
    controlsBlocked: () => controlBlockers.some(isOpen),
    get active() {
      return [...order].reverse().find(isOpen) || null;
    },
  });
})(globalThis);
