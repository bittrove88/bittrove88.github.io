(function (root) {
  "use strict";
  const node = typeof module !== "undefined",
    S = node ? require("./save.js") : root.ArcSave,
    C = node ? require("./crew.js") : root.ArcCrew,
    R = node ? require("./campaign-run.js") : root.ArcCampaignRun,
    W = node ? require("./weapons.js") : root.ArcWeapons,
    I = node ? require("./inventory.js") : root.ArcInventory,
    K = node ? require("./skills.js") : root.ArcSkills;
  const stock = Object.freeze({
    weapons: Object.freeze([...W.activeIds]),
    skills: Object.freeze([...K.activeIds]),
    count: I.limits.count,
  });
  function prepare(data, cleared, choices = {}) {
    if (!Number.isInteger(cleared) || cleared < 0 || cleared > 100)
      throw RangeError("Clear count must be0–100");
    if (
      !choices ||
      typeof choices !== "object" ||
      Array.isArray(choices) ||
      Object.keys(choices).some((k) => !["weapons", "skills"].includes(k))
    )
      throw TypeError("Unknown master stock choice");
    for (const value of Object.values(choices))
      if (!["none", "all", undefined].includes(value))
        throw RangeError("Stock choice must be none or all");
    const next = JSON.parse(JSON.stringify(data)),
      stage = Math.min(100, cleared + 1),
      old = R.decode(data.chapterRun);
    next.cleared = cleared;
    next.unlockedCharacterIds = C.normalize([
      ...data.unlockedCharacterIds,
      ...C.joinedAt(cleared),
    ]);
    next.joinedCharacterIds = C.normalize([
      ...data.joinedCharacterIds,
      ...C.joinedAt(cleared),
    ]);
    next.unlockedWeaponIds = [
      ...new Set([
        ...data.unlockedWeaponIds,
        ...Object.entries(W.coreUnlocks)
          .filter(([, at]) => cleared >= at)
          .map(([id]) => id),
      ]),
    ];
    next.pendingRecruit = null;
    next.journal = { ...data.journal, pendingMovie: null };
    next.journeyStarted = true;
    next.onboarding = { ...data.onboarding, step: "done" };
    next.difficultyConfirmed = true;
    next.chapterRun =
      cleared === 100
        ? null
        : R.checkpoint(
            stage,
            old && old.chapter === R.chapter(stage) ? old.inventory : {},
          );
    if (["weapons", "skills"].some((kind) => choices[kind] !== undefined)) {
      const inventory = I.normalize(old?.inventory || next.campaignInventory);
      for (const kind of ["weapons", "skills"])
        if (choices[kind] !== undefined) {
          inventory[kind] =
            choices[kind] === "none"
              ? {}
              : {
                  ...inventory[kind],
                  ...Object.fromEntries(
                    stock[kind].map((id) => [id, stock.count]),
                  ),
                };
        }
      next.campaignInventory = inventory;
      next.chapterRun = cleared === 100 ? null : R.checkpoint(stage, inventory);
      if (choices.weapons === "all")
        next.unlockedWeaponIds = [
          ...new Set([...next.unlockedWeaponIds, ...stock.weapons]),
        ];
      if (choices.weapons === "none") next.equippedWeaponId = "W01";
    }
    return S.decode(JSON.stringify(next));
  }
  const api = {
    prepare,
    stock,
    passwordMatches: (value) => value === "master",
  };
  if (node) module.exports = api;
  else root.ArcMasterProgress = api;
})(globalThis);
