(function (root) {
  "use strict";
  function create(hooks) {
    const $ = (id) => document.getElementById(id);
    function close() {
      root.ArcScreens.close("battleMachinePicker", false);
      hooks.changed();
      $("battleCharacters").focus();
    }
    function open() {
      if (!hooks.allowed()) return;
      hooks.clearInput();
      const s = hooks.state(),
        data = hooks.data(),
        en = root.ArcI18n.language === "en";
      $("battleMachineTitle").textContent = en
        ? "Switch machine"
        : "機体を変更";
      $("battleMachineNote").textContent = en
        ? "Tap to switch. HP ratio and special ammo carry over."
        : "タップで変更。HPの割合・必殺弾の残数は引き継ぎます。";
      $("battleMachineChoices").innerHTML = root.ArcCrew.rows
        .filter((c) => root.ArcCrew.owned(data, c.id))
        .map((c) => {
          const a = root.ArcCharacters.get(c.id),
            p = root.ArcCombat.get(c.id);
          return `<button type="button" data-quick-machine="${c.id}" ${s.characterId === c.id ? "disabled" : ""}>${root.ArcCharacters.markup(c.id)}<strong>${en ? a.name : a.nameJa}</strong><span>${en ? a.role : a.roleJa}</span><small>${s.characterId === c.id ? (en ? "Current machine" : "使用中") : root.ArcI18n.t(p.special.name)}</small></button>`;
        })
        .join("");
      root.ArcScreens.open("battleMachinePicker", { onEscape: close });
      root.ArcCharacters.paintAll($("battleMachineChoices"));
      for (const b of $("battleMachineChoices").querySelectorAll("button"))
        b.onclick = () => {
          if (!hooks.change(b.dataset.quickMachine)) return;
          close();
        };
      $("closeBattleMachines").focus();
    }
    $("closeBattleMachines").onclick = close;
    return { open, close };
  }
  root.ArcMachinePicker = Object.freeze({ create });
})(globalThis);
