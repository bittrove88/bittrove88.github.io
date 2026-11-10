(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const revision = "20261110";
  const machines = [
    {
      id: "gun",
      name: ["ガン", "Gun"],
      attack: ["破砕砲", "Demolition Cannon"],
      tag: ["重爆", "Blast"],
      headline: [
        "重い一撃。爆発は、二度来る。",
        "A heavy hit. Two explosive bursts.",
      ],
      description: [
        "重い接触から、二段の爆発へ。近い射点から破砕砲を叩き込む。",
        "A heavy impact leads into two bursts. Bring the Demolition Cannon to bear from a close position.",
      ],
    },
    {
      id: "hana",
      name: ["ハナ", "Hana"],
      attack: ["連華砲", "Flower Salvo"],
      tag: ["連射", "Salvo"],
      headline: ["撃ち込め、咲き誇る連射。", "Let a blooming salvo fly."],
      description: [
        "三度の連射で、九発の弾を送り込む。広がる弾道を、幅のある目標へ。",
        "Nine rounds in three volleys. Send a spreading salvo toward a broad target.",
      ],
    },
    {
      id: "sora",
      name: ["ソラ", "Sora"],
      attack: ["流星砲", "Meteor Cannon"],
      tag: ["分裂", "Meteors"],
      headline: [
        "空に放て。流星となって降り注げ。",
        "Send it skyward. Bring down the meteors.",
      ],
      description: [
        "上空で分かれた弾が、流星となって落ちる。壁の向こうへ、上から攻める。",
        "The shot divides in the sky and falls as meteors. Attack from above, beyond the wall.",
      ],
    },
    {
      id: "rico",
      name: ["リコ", "Rico"],
      attack: ["跳弾砲", "Ricochet Cannon"],
      tag: ["跳弾", "Ricochet"],
      headline: [
        "跳ねるたび、攻め筋になる。",
        "Every bounce opens another angle.",
      ],
      description: [
        "反射する弾道をつなぎ、敵へ向かう跳弾を放つ。地形の角度を味方にしよう。",
        "Read the surfaces and send a ricocheting shot toward your rival. Make the angles work for you.",
      ],
    },
    {
      id: "rin",
      name: ["リン", "Rin"],
      attack: ["収束砲", "Focus Cannon"],
      tag: ["収束", "Piercing"],
      headline: ["収束。その先まで、貫け。", "Focus. Pierce through."],
      description: [
        "光を収束し、速い一撃を射ち出す。開いた射線から、狭い弱点を狙う。",
        "Gather the light into a fast, piercing shot. Find a narrow weak point along an open line of fire.",
      ],
    },
    {
      id: "ban",
      name: ["バン", "Ban"],
      attack: ["衝撃砲", "Shockwave Cannon"],
      tag: ["衝撃", "Shockwave"],
      headline: [
        "前へ、前へ。衝撃を叩き込め。",
        "Drive a wave of impact forward.",
      ],
      description: [
        "前方へ三つの衝撃波を放つ。近い間合いから、押し出す空間も読んで攻める。",
        "Release three forward shockwaves. Read the close-range opening and the space beyond the target.",
      ],
    },
    {
      id: "hibari",
      name: ["ヒバリ", "Hibari"],
      attack: ["光輪砲", "Ribbon Ring Cannon"],
      tag: ["光輪", "Rings"],
      headline: [
        "広がる光で、捉えろ。",
        "Catch your target in expanding light.",
      ],
      description: [
        "二つの光輪が広がり、敵の輪郭へ届く。遠い相手の近くへ、光の中心を運ぼう。",
        "Two rings expand toward the rival. Place the center of light close to your distant target.",
      ],
    },
    {
      id: "mogu",
      name: ["モグ", "Mogu"],
      attack: ["掘削砲", "Excavation Cannon"],
      tag: ["掘削", "Drill"],
      headline: ["阻む壁へ、掘り進め。", "Drill into what stands in your way."],
      description: [
        "段階的な掘削で、ひび割れた遮蔽を攻める。壊す順番が、次の一射を変える。",
        "A sequence of drilling pulses attacks cracked cover. What you break first can change your next shot.",
      ],
    },
    {
      id: "koro",
      name: ["コロ", "Koro"],
      attack: ["爆走砲", "Rolling Blast Cannon"],
      tag: ["転がる", "Rolling"],
      headline: [
        "地を走れ。爆発を連れて。",
        "Race along the ground. Bring the blasts.",
      ],
      description: [
        "地面を転がりながら、爆発を刻む。連続する床と、低い天井の下を攻める。",
        "A rolling shot leaves bursts along its route. Follow connected ground beneath low ceilings.",
      ],
    },
    {
      id: "yui",
      name: ["ユイ", "Yui"],
      attack: ["重力砲", "Gravity Cannon"],
      tag: ["吸引", "Pull"],
      headline: [
        "引き寄せて、好機をつくれ。",
        "Pull the rival into your opportunity.",
      ],
      description: [
        "着弾点へ敵を引き寄せる。どこへ当てるかが、その後の位置取りにつながる。",
        "Pull the rival toward the impact. Where you land the shot shapes the position that follows.",
      ],
    },
  ];
  const regions = {
    shore: { stage: "01 — 05", name: ["はじまりの入江", "First Inlet"] },
    volcano: { stage: "61 — 65", name: ["火山の外縁", "Volcanic Rim"] },
    garden: { stage: "81 — 85", name: ["空中庭園", "Sky Gardens"] },
    fortress: { stage: "91 — 95", name: ["要塞の重層門", "Fortress Gates"] },
  };
  const features = {
    destruction: {
      stage: 7,
      description: [
        "一射目で遮蔽を外し、相手の手番を経て、開いた射線を次の一射で使う。",
        "Remove the cover, give the rival their turn, then use the open lane for your next shot.",
      ],
    },
    reflection: {
      stage: 31,
      description: [
        "入口の結晶で一度返し、岩肩の奥の敵へ弾を通す。",
        "Bounce once from the entrance crystal to reach the rival behind the ridge.",
      ],
    },
    teleport: {
      stage: 4,
      description: [
        "歩いて渡れない谷を越えて転移。相手の手番の後、対岸から次の一射を通す。",
        "Teleport across a gap you cannot walk over. After the rival’s turn, fire from the far bank.",
      ],
    },
    warning: {
      stage: 60,
      description: [
        "予告された場所から移動。敵の狙いが固定されたまま、攻撃が旧位置を通る。",
        "Move away from the warned target. The rival’s frozen aim sends the attack through your old position.",
      ],
    },
  };
  let language = "ja",
    machineId = "gun",
    heroId = "hana",
    featureId = "destruction",
    regionId = "shore",
    heroAuto = true;
  try {
    if (localStorage.getItem("arcline-language") === "en") language = "en";
  } catch {}
  const local = (pair) => pair[language === "ja" ? 0 : 1];
  const findMachine = (id) => machines.find((row) => row.id === id);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const players = [...document.querySelectorAll("video")].map((video) => ({
    video,
    ratio: 0,
    intent: null,
    failed: false,
  }));
  const playerFor = (video) => players.find((row) => row.video === video);
  const videoURL = (id, extension) =>
    "site/media/" + id + "." + extension + "?v=" + revision;
  function updatePlaybackLabels() {
    for (const { video, failed } of players) {
      const button = document.querySelector('[data-video="' + video.id + '"]');
      button.textContent = video.paused ? "▶︎" : "Ⅱ";
      button.setAttribute(
        "aria-label",
        local(
          video.paused
            ? ["映像を再生", "Play video"]
            : ["映像を一時停止", "Pause video"],
        ),
      );
      button.setAttribute("aria-pressed", String(!video.paused));
      button.disabled = failed;
    }
  }
  function syncPlayback() {
    const eligible = players.filter(
      (row) =>
        row.ratio > 0.15 &&
        !row.failed &&
        row.intent !== false &&
        (!reduced.matches || row.intent === true) &&
        !document.hidden,
    );
    const active = eligible.sort(
      (a, b) =>
        Number(b.intent === true) - Number(a.intent === true) ||
        b.ratio - a.ratio,
    )[0];
    for (const row of players) {
      if (row !== active) {
        row.video.pause();
        continue;
      }
      if (!row.video.getAttribute("src")) row.video.src = row.video.dataset.src;
      if (row.video.paused)
        row.video.play().catch(() => {
          updatePlaybackLabels();
        });
    }
    updatePlaybackLabels();
  }
  function setVideo(video, id) {
    const row = playerFor(video);
    video.pause();
    video.removeAttribute("src");
    video.dataset.src = videoURL(id, "mp4");
    video.poster = videoURL(id, "jpg");
    row.failed = false;
    video.closest("figure").querySelector(".media-error").hidden = true;
    video.load();
    syncPlayback();
  }
  for (const row of players) {
    row.video.addEventListener("play", () => {
      for (const other of players) if (other !== row) other.video.pause();
      updatePlaybackLabels();
    });
    row.video.addEventListener("pause", updatePlaybackLabels);
    row.video.addEventListener("error", () => {
      row.failed = true;
      row.video.pause();
      row.video.closest("figure").querySelector(".media-error").hidden = false;
      updatePlaybackLabels();
    });
    document.querySelector('[data-video="' + row.video.id + '"]').onclick =
      () => {
        row.intent = row.video.paused;
        if (row.intent) {
          for (const other of players)
            if (other !== row && other.intent === true) other.intent = null;
        }
        syncPlayback();
      };
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          playerFor(entry.target).ratio = entry.isIntersecting
            ? entry.intersectionRatio
            : 0;
        syncPlayback();
      },
      { threshold: [0, 0.15, 0.4, 0.7, 1] },
    );
    for (const { video } of players) observer.observe(video);
  } else {
    function updateVisibility() {
      for (const row of players) {
        const r = row.video.getBoundingClientRect();
        row.ratio =
          Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) /
          r.height;
      }
      syncPlayback();
    }
    addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility();
  }
  reduced.addEventListener("change", () => {
    for (const row of players) row.intent = null;
    syncPlayback();
  });
  document.addEventListener("visibilitychange", syncPlayback);
  $("machinePicker").replaceChildren();
  for (const machine of machines) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "machine-thumb";
    button.dataset.machine = machine.id;
    const image = document.createElement("img");
    image.src = "site/media/" + machine.id + "-art.webp";
    image.alt = "";
    image.loading = "lazy";
    image.width = 60;
    image.height = 36;
    const label = document.createElement("strong");
    button.append(image, label);
    button.onclick = () => selectMachine(machine.id);
    $("machinePicker").append(button);
  }
  function updateMachine() {
    const row = findMachine(machineId);
    $("machineName").textContent = row.id.toUpperCase();
    $("machineJapanese").textContent = local(row.name);
    $("machineSpecial").textContent = local(row.attack);
    $("machineMotto").textContent = local(row.headline);
    $("machineDescription").textContent = local(row.description);
    $("machineCounter").textContent =
      String(machines.indexOf(row) + 1).padStart(2, "0") + " / 10";
    $("machineArt").src = "site/media/" + row.id + "-art.webp";
    $("machineArt").alt = local([
      row.name[0] + "のキャラクター原画",
      row.name[1] + " character artwork",
    ]);
    $("machineVideo").setAttribute(
      "aria-label",
      local([
        row.name[0] + "の" + row.attack[0] + "のゲーム内実演",
        row.name[1] + ": " + row.attack[1] + " in-game demonstration",
      ]),
    );
    for (const button of document.querySelectorAll("[data-machine]")) {
      const machine = findMachine(button.dataset.machine);
      button.setAttribute("aria-pressed", String(machine.id === machineId));
      button.setAttribute(
        "aria-label",
        local(machine.name) + " / " + local(machine.attack),
      );
      button.querySelector("strong").textContent = local(machine.name);
    }
  }
  function selectMachine(id) {
    if (!findMachine(id)) return;
    machineId = id;
    updateMachine();
    setVideo($("machineVideo"), id);
  }
  function updateHero() {
    const row = findMachine(heroId),
      index = ["hana", "sora", "rico"].indexOf(heroId);
    $("heroAttack").textContent = local(row.attack);
    $("heroMachine").textContent =
      row.id.toUpperCase() + " / " + local(row.name);
    $("heroCount").textContent = String(index + 1).padStart(2, "0") + " — 03";
    $("heroVideo").setAttribute(
      "aria-label",
      local([
        row.name[0] + "の" + row.attack[0] + "のゲーム内実演",
        row.name[1] + ": " + row.attack[1] + " in-game demonstration",
      ]),
    );
    for (const button of document.querySelectorAll("[data-hero]"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.hero === heroId),
      );
  }
  function selectHero(id, automatic = false) {
    if (!["hana", "sora", "rico"].includes(id)) return;
    heroId = id;
    if (!automatic) heroAuto = false;
    $("heroVideo").loop = !heroAuto;
    updateHero();
    setVideo($("heroVideo"), id);
  }
  for (const button of document.querySelectorAll("[data-hero]"))
    button.onclick = () => selectHero(button.dataset.hero);
  $("heroVideo").addEventListener("ended", () => {
    if (heroAuto) {
      const ids = ["hana", "sora", "rico"];
      selectHero(ids[(ids.indexOf(heroId) + 1) % ids.length], true);
    }
  });
  function updateFeature() {
    const row = features[featureId];
    $("demoIndex").textContent =
      "STAGE " +
      String(row.stage).padStart(2, "0") +
      " / " +
      local(["攻略の一例", "ONE POSSIBLE APPROACH"]);
    $("demoCaption").textContent = local(row.description);
    $("featureVideo").setAttribute("aria-label", local(row.description));
    $("featurePanel").setAttribute("aria-labelledby", "feature-" + featureId);
    for (const button of document.querySelectorAll("[data-feature]")) {
      const selected = button.dataset.feature === featureId;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
  }
  function selectFeature(id) {
    if (!features[id]) return;
    featureId = id;
    updateFeature();
    setVideo($("featureVideo"), id);
  }
  for (const button of document.querySelectorAll("[data-feature]")) {
    button.onclick = () => selectFeature(button.dataset.feature);
    button.onkeydown = (event) => {
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      const buttons = [...document.querySelectorAll("[data-feature]")],
        index = buttons.indexOf(button);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (index +
                (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) +
                buttons.length) %
              buttons.length;
      selectFeature(buttons[next].dataset.feature);
      buttons[next].focus();
    };
  }
  function updateLandscape() {
    const row = regions[regionId];
    $("landscapeImage").src =
      "site/gameplay-" +
      regionId +
      ".jpg?v=" +
      (globalThis.ArcRelease?.version || "0.33.1");
    $("landscapeImage").alt = local([
      row.name[0] + "の実際のゲーム画面",
      "Actual game screen: " + row.name[1],
    ]);
    $("landscapeStage").textContent = row.stage;
    $("landscapeName").textContent = local(row.name);
    for (const button of document.querySelectorAll("[data-landscape]"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.landscape === regionId),
      );
  }
  for (const button of document.querySelectorAll("[data-landscape]"))
    button.onclick = () => {
      regionId = button.dataset.landscape;
      updateLandscape();
    };
  function closeMenu() {
    document.querySelector(".site-header").classList.remove("menu-open");
    $("menuButton").setAttribute("aria-expanded", "false");
  }
  $("menuButton").onclick = () => {
    const open = $("menuButton").getAttribute("aria-expanded") !== "true";
    document.querySelector(".site-header").classList.toggle("menu-open", open);
    $("menuButton").setAttribute("aria-expanded", String(open));
  };
  for (const anchor of $("mainNav").querySelectorAll("a"))
    anchor.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      $("menuButton").getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      $("menuButton").focus();
    }
  });
  function translate() {
    document.documentElement.lang = language;
    document.title = local([
      "ARCLINE — 読み切れ。撃ち抜け。",
      "ARCLINE — Read the battle. Make your shot.",
    ]);
    for (const element of document.querySelectorAll("[data-ja][data-en]"))
      element.textContent = element.dataset[language];
    for (const image of document.querySelectorAll("[data-alt-ja]"))
      image.alt = language === "ja" ? image.dataset.altJa : image.dataset.altEn;
    $("languageButton").textContent = language === "ja" ? "EN" : "日本語";
    $("languageButton").setAttribute(
      "aria-label",
      local(["Switch to English", "日本語に切り替え"]),
    );
    $("menuButton").setAttribute(
      "aria-label",
      local(["メニューを開く", "Open navigation"]),
    );
    $("mainNav").setAttribute(
      "aria-label",
      local(["メインナビゲーション", "Main navigation"]),
    );
    $("machinePicker").setAttribute(
      "aria-label",
      local(["紹介する機体を選ぶ", "Choose a machine to explore"]),
    );
    document
      .querySelector(".hero-tabs")
      .setAttribute(
        "aria-label",
        local(["冒頭で見る必殺技", "Choose a featured special attack"]),
      );
    document
      .querySelector(".tactic-options")
      .setAttribute(
        "aria-label",
        local(["攻略の一例", "Choose a tactical example"]),
      );
    document
      .querySelector(".landscape-options")
      .setAttribute(
        "aria-label",
        local(["旅の風景を選ぶ", "Choose a landscape"]),
      );
    document
      .querySelector(".site-footer nav")
      .setAttribute("aria-label", local(["詳しく知る", "Explore ARCLINE"]));
    updateMachine();
    updateHero();
    updateFeature();
    updateLandscape();
    updatePlaybackLabels();
  }
  $("languageButton").onclick = () => {
    language = language === "ja" ? "en" : "ja";
    try {
      localStorage.setItem("arcline-language", language);
    } catch {}
    translate();
  };
  if (globalThis.ArcRelease)
    $("siteVersion").textContent = "ARCLINE · " + ArcRelease.version;
  translate();
  globalThis.ArcSite = Object.freeze({
    get version() {
      return globalThis.ArcRelease?.version || "0.33.1";
    },
    get language() {
      return language;
    },
    get machine() {
      return machineId;
    },
    get hero() {
      return heroId;
    },
    get feature() {
      return featureId;
    },
    get landscape() {
      return regionId;
    },
    selectMachine,
    selectFeature,
  });
})();
