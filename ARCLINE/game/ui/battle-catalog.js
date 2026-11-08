/* Battle-only vector language and display grouping; combat definitions stay native. */
(function (root) {
  "use strict";
  const groups = {
    attack: { label: "攻撃・発射補助", en: "Attack", color: "#ffae87" },
    defense: { label: "防御", en: "Defense", color: "#91caff" },
    heal: { label: "回復", en: "Recovery", color: "#8fe0b4" },
    motion: {
      label: "移動・弾道",
      en: "Movement & trajectory",
      color: "#77dcdf",
    },
    control: { label: "妨害・位置操作", en: "Control", color: "#c5b3ff" },
    charge: { label: "チャージ・補充", en: "Charge", color: "#ffd287" },
  };
  const rows = [
    [
      "BURST",
      "attack",
      "爆発範囲1.5倍",
      "Blast radius ×1.5",
      "M5 9h8l4 4-4 4H5Z M8 9v8M18 7l2-2m-1 7h3m-4 5 2 2",
    ],
    [
      "BLINK",
      "motion",
      "行き先を2回タップ",
      "Tap a destination twice",
      "M16 3a4 4 0 0 1 4 4c0 3-4 7-4 7s-4-4-4-7a4 4 0 0 1 4-4ZM4 18h11m-4-3 4 3-4 3M16 7h.01",
    ],
    [
      "PUSH",
      "control",
      "命中した相手を押す",
      "Push the target on hit",
      "M3 9h5l3 3-3 3H3Zm11-5h6v16h-6M12 12h7m-3-3 3 3-3 3",
    ],
    [
      "PULL",
      "control",
      "命中した相手を引く",
      "Pull the target on hit",
      "M16 9h5v6h-5l-3-3Zm-6-5H4v16h6m3-8H5m3-3-3 3 3 3",
    ],
    [
      "BOUNCE",
      "motion",
      "壁で弾を跳ね返す",
      "Ricochet off a wall",
      "M3 19 10 6l10 11M7 6h3v3m8 3 2 5-5-1M3 22h18",
    ],
    [
      "SPLIT",
      "motion",
      "弾を3つに分裂",
      "Split into three projectiles",
      "M3 10h5l3 2-3 2H3Zm10 2h7m-7-2 6-6m-6 10 6 6M18 3h3v3m-3 15h3v-3",
    ],
    [
      "PHASE",
      "motion",
      "通常の壁をすり抜ける",
      "Pass through ordinary walls",
      "M3 9h6l4 3-4 3H3Zm12-6v5m0 8v5m4-18v5m0 8v5m-6-9h8",
    ],
    [
      "SWAP",
      "control",
      "命中で位置を交換",
      "Swap positions on hit",
      "M3 5h5v5H3Zm13 9h5v5h-5ZM10 6h8l3 5m-3-1 3 1v-4M14 18H6l-3-5m3 1-3-1v4",
    ],
    [
      "S_CHARGE_SLOW_I",
      "charge",
      "チャージ70%・2ターン",
      "Charge speed70% ·2 turns",
      "M6 17a8 8 0 1 1 12 0M12 6v3m-6 1 2 2m10-2-2 2m-4 4 3-4M6 20h12",
    ],
    [
      "S_CHARGE_SLOW_II",
      "charge",
      "チャージ40%・次の1射",
      "Charge speed40% ·next shot",
      "M5 16a8 8 0 1 1 14 0M8 19h8M8 22h8m4-13v5m-4-4v4m-3-3v3",
    ],
    [
      "S_POWER_UP_I",
      "attack",
      "威力1.2倍・2ターン",
      "Damage ×1.2 · 2 turns",
      "M3 14h8l4 3-4 3H3Zm4 0v6m7-10 4-5 4 5m-4-5v10",
    ],
    [
      "S_POWER_UP_II",
      "attack",
      "威力1.4倍・次の1射",
      "Damage ×1.4 · Next shot",
      "M3 15h8l4 3-4 3H3Zm4 0v6m7-11 4-4 4 4m-8-5 4-4 4 4m-4 2v7",
    ],
    [
      "S_SPECIAL_REFILL",
      "charge",
      "必殺技を3回分に補充",
      "Refill special ammo to 3",
      "M4 12V7l3-3 3 3v5m2 0V7l3-3 3 3v5M4 15h14m-7 3v5m-3-2 3 2 3-2M21 5v9",
    ],
    [
      "S_FREE_MOVE",
      "motion",
      "歩行制限なし・2ターン",
      "Unlimited move · 2 turns",
      "M10 4a7 8 0 1 0 0 16 7 8 0 1 0 0-16Zm0 5a3 3 0 1 0 0 6 3 3 0 1 0 0-6M18 8h4m-3 4h3m-4 4h4",
    ],
    [
      "S_BARRIER",
      "defense",
      "被ダメージ半減・2ターン",
      "Damage taken ×0.5 · 2 turns",
      "M5 19V11a7 7 0 0 1 14 0v8M3 19h18M9 9l3 3 3-3m-3 3v5",
    ],
    [
      "S_ENEMY_WEAKEN",
      "control",
      "敵の威力60%・2ターン",
      "Enemy damage ×0.6 · 2 turns",
      "M3 5h8l4 3-4 3H3Zm4 0v6m11 1v9m-4-4 4 4 4-4",
    ],
    [
      "S_ENEMY_SKIP",
      "control",
      "次の敵行動をスキップ",
      "Skip the next enemy action",
      "M4 5h5v5H4Zm2 8a8 8 0 1 0 8-9M12 9v8m4-8v8M3 15l3-2 2 3",
    ],
    [
      "S_LOW_GRAVITY",
      "motion",
      "弾の重力50%・2ターン",
      "Shot gravity ×0.5 · 2 turns",
      "M3 19c2-10 9-12 17-12m-4-4 4 4-4 4M4 22h15m0-5 2-3 2 3",
    ],
    [
      "S_HIGH_GRAVITY",
      "motion",
      "弾の重力2倍・2ターン",
      "Shot gravity ×2 · 2 turns",
      "M3 5c11 0 15 5 15 14m-4-4 4 4 4-4M3 22h18m-14-9-2 3-2-3",
    ],
    [
      "S_REPAIR",
      "heal",
      "最大HPの30%を回復",
      "Restore 30% max HP",
      "M5 7h14v13H5ZM9 4h6v3M12 11v6m-3-3h6M3 11h2m14 0h2",
    ],
    [
      "S_FULL_REPAIR",
      "heal",
      "HPをすべて回復",
      "Restore all HP",
      "M4 6h16v15H4ZM8 3h8v3M12 10v7m-4-3h8M1 9v9m22-9v9",
    ],
    [
      "S_INVINCIBLE",
      "defense",
      "次の被ダメージを無効化",
      "No damage next enemy turn",
      "M12 3 4 7v6c0 5 8 9 8 9s8-4 8-9V7ZM8 9v4c0 2 4 5 4 5s4-3 4-5V9Z",
    ],
    [
      "S_ALL_ATTACK",
      "attack",
      "敵全体を攻撃",
      "Attack all enemies",
      "M9 3h6v5H9Zm-6 13h5v5H3Zm13 0h5v5h-5ZM12 9v3m-2 0-4 3m8-3 4 3",
    ],
    [
      "S_GUARD",
      "defense",
      "次の敵攻撃を半減",
      "Halve the next enemy attack",
      "M10 4 3 7v6c0 4 7 8 7 8s7-4 7-8V7ZM15 10h5l3 3-3 3h-5m3-6v6",
    ],
    [
      "S_BREACH",
      "attack",
      "着弾付近の遮蔽物を破壊",
      "Break nearby cover on impact",
      "M14 3h7v18h-7m3-18-2 6 4 3-4 4 2 5M2 9h7l4 3-4 3H2Zm4 0v6",
    ],
  ];
  const skillRows = Object.fromEntries(
    rows.map(([id, group, shortJa, shortEn, path]) => [
      id,
      { id, group, shortJa, shortEn, path },
    ]),
  );
  skillRows.S_CHARGE_SLOW_I.shortJa = "効果は2ターン持続";
  skillRows.S_CHARGE_SLOW_I.shortEn = "Lasts 2 turns";
  skillRows.S_CHARGE_SLOW_II.shortJa = "効果は次の1射まで";
  skillRows.S_CHARGE_SLOW_II.shortEn = "Until the next shot";
  skillRows.S_CHARGE_SLOW_I.nameJa = "チャージ速度70％";
  skillRows.S_CHARGE_SLOW_I.nameEn = "Charge speed 70%";
  skillRows.S_CHARGE_SLOW_II.nameJa = "チャージ速度40％";
  skillRows.S_CHARGE_SLOW_II.nameEn = "Charge speed 40%";
  const skillOrder = [
    "S_FULL_REPAIR",
    "S_INVINCIBLE",
    "S_ALL_ATTACK",
    "S_REPAIR",
    "S_BARRIER",
    "S_SPECIAL_REFILL",
    "S_POWER_UP_I",
    "S_POWER_UP_II",
    "S_ENEMY_WEAKEN",
    "S_CHARGE_SLOW_I",
    "S_CHARGE_SLOW_II",
    "S_FREE_MOVE",
    "S_ENEMY_SKIP",
    "S_LOW_GRAVITY",
    "S_HIGH_GRAVITY",
  ];
  const weaponNames = { W19: { ja: "爆風弾", en: "Blast Shell" } };
  const weaponNotes = {
    W01: "残数制限のない基本の弾",
    W21: "時間差で2波の弾雨",
    W22: "頂点で広い範囲に炸裂",
    W02: "広い爆風の重い一撃",
    W07: "地面を転がって炸裂",
    W09: "3方向へ同時に発射",
    W10: "3発に分裂して広がる",
    W11: "2発を連続で発射",
    W12: "敵に近づくと空中で炸裂",
    W14: "低い弾道の高速弾",
    W16: "地面に沿う衝撃波",
    W19: "爆風で敵を浮かせる",
    W23: "与ダメージの一部をHPに吸収",
  };
  const weaponNotesEn = {
    W01: "Basic shot with unlimited stock",
    W21: "Two delayed waves of falling shots",
    W22: "Wide blast at the trajectory apex",
    W02: "Heavy impact with a broad blast",
    W07: "Rolls along the ground before exploding",
    W09: "Fires in three directions at once",
    W10: "Splits into three spreading shots",
    W11: "Fires two shots in sequence",
    W12: "Bursts in midair near the target",
    W14: "High-speed shot with a low arc",
    W16: "Sends a shockwave along the ground",
    W19: "Lifts the target with the blast",
    W23: "Restores HP from a share of damage",
  };
  const specialNotes = {
    gun: "広い爆風で遮蔽物を破壊",
    ban: "前方に広がる衝撃波",
    hibari: "敵の近くで空中炸裂",
    hana: "角度を変えて3発を発射",
    rin: "中心への命中で大ダメージ",
    mogu: "3回の爆破で遮蔽物を破壊",
    koro: "地面を走り、谷を落ちて転がる",
    sora: "高い弾から8発を降らせる",
    rico: "跳弾を重ねて威力が増す",
    yui: "敵を着弾点へ引き寄せて爆発",
  };
  const weaponGroups = [
    {
      label: "直撃・貫通",
      en: "Direct & piercing",
      ids: ["W03", "W13", "W14"],
    },
    {
      label: "爆発・範囲",
      en: "Blast & area",
      ids: ["W02", "W12", "W19", "W22"],
    },
    {
      label: "分裂・連射",
      en: "Split & multiple shots",
      ids: ["W09", "W10", "W11", "W21"],
    },
    {
      label: "跳弾・地走り",
      en: "Ricochet & ground",
      ids: ["W05", "W06", "W07", "W08", "W16", "W20"],
    },
    { label: "高軌道", en: "High arc", ids: ["W04", "W15"] },
    {
      label: "移動・吸収",
      en: "Displacement & drain",
      ids: ["W17", "W18", "W23"],
    },
  ];
  function icon(id) {
    const info = skillRows[id];
    return (
      '<svg class="battle-skill-vector" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
      info.path +
      '"/></svg>'
    );
  }
  const api = Object.freeze({
    groups,
    skillRows,
    skillOrder,
    weaponGroups,
    weaponNames,
    weaponNotes,
    weaponNotesEn,
    specialNotes,
    icon,
  });
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcBattleCatalog = api;
})(globalThis);
