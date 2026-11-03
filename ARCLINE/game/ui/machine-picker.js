(function (root) {
  "use strict";
  function create(hooks) {
    const $ = (id) => document.getElementById(id);
    function close() {
      root.ArcScreens.close("battleMachinePicker", false);
      hooks.changed();
      (root.ArcFinalTeam.active(hooks.state())?$("finalTeamHUD"):$("pauseMachineChange")).focus();
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
      const fixed=root.ArcFinalTeam.active(s);$("battleMachinePicker").dataset.fixedOrder=String(fixed);
      if(fixed){$("battleMachineTitle").textContent=en?"Fixed sortie order":"固定の出撃順";$("battleMachineNote").textContent=en?"Each machine has70 HP and must deal100 body damage. Automatic handoff; every third machine changes the arena. Durability is70 HP; one special per machine.":"各機体HP70で本体へ100ダメージ。達成後に自動交代し、3機ごとに戦場が変わります。耐久は全機体70、必殺は各1発。";}
      $("battleMachineChoices").innerHTML = (fixed?s.spec.finalBattle.order.map(id=>root.ArcCrew.get(id)):root.ArcCrew.rows.filter(c=>root.ArcCrew.owned(data,c.id)))
        .map((c) => {
          const a = root.ArcCharacters.get(c.id),
            p = root.ArcCombat.get(c.id);
          return `<button type="button" data-quick-machine="${c.id}" ${fixed||s.restingCharacterIds?.includes(c.id)||s.characterId === c.id ? "disabled" : ""} data-team-complete="${fixed&&s.finalTeam.damage[c.id]>=s.spec.finalBattle.requiredDamage-1e-7}" data-team-current="${s.characterId===c.id}">${root.ArcCharacters.markup(c.id)}<strong>${en ? a.name : a.nameJa}</strong><span>${en ? a.role : a.roleJa}</span><small>${fixed?(s.finalTeam.damage[c.id]>=s.spec.finalBattle.requiredDamage-1e-7?(en?"Complete":"達成済み"):(en?"Need ":"あと")+Math.max(0,Math.ceil((s.spec.finalBattle.requiredDamage-s.finalTeam.damage[c.id])*root.ArcCombat.pointsPerUnit-1e-7))):(s.restingCharacterIds?.includes(c.id)?(en?"Resupply ":"補充あと")+root.ArcCrewUsage.remaining(data,c.id)+(en?" stages":"面"):s.characterId===c.id?(en?"Current machine":"使用中"):root.ArcI18n.t(p.special.name))}</small></button>`;
        })
        .join("");
      root.ArcScreens.open("battleMachinePicker", {
        block: ["battle", "overlay"],
        trigger: $("pauseMachineChange"),
        onEscape: close,
        cycleFocus: true,
      });
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
