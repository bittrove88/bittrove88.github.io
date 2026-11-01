/* Generated from game/ui/device.js. Edit the source. */
(function (root) {
  "use strict";
  const key = "arcline-install-guide-v1",
    $ = (id) => document.getElementById(id),
    media = (q) => !!root.matchMedia?.(q).matches,
    local = (ja, en) => (root.ArcI18n.language === "en" ? en : ja);
  let promptEvent = null,
    after = null;
  function environment(
    nav = root.navigator,
    standalone = media("(display-mode: standalone)"),
  ) {
    const ua = nav.userAgent || "",
      ios =
        /iPad|iPhone|iPod/.test(ua) ||
        (nav.platform === "MacIntel" && nav.maxTouchPoints > 1),
      os = ios ? "ios" : /Android/.test(ua) ? "android" : "desktop",
      browser = /Edg/.test(ua)
        ? "edge"
        : /SamsungBrowser/.test(ua)
          ? "samsung"
          : /FxiOS|Firefox/.test(ua)
            ? "firefox"
            : /CriOS|Chrome\//.test(ua)
              ? "chrome"
              : /Safari/.test(ua)
                ? "safari"
                : "other";
    return {
      os,
      browser,
      standalone: standalone || nav.standalone === true,
      touch: (nav.maxTouchPoints || 0) > 0 || media("(pointer: coarse)"),
      reducedMotion: media("(prefers-reduced-motion: reduce)"),
      width: root.visualViewport?.width || root.innerWidth,
      height: root.visualViewport?.height || root.innerHeight,
      landscape: root.innerWidth >= root.innerHeight,
      installable: !!promptEvent,
    };
  }
  function sync() {
    const e = environment(),
      html = document.documentElement;
    html.dataset.os = e.os;
    html.dataset.browser = e.browser;
    html.dataset.input = e.touch ? "touch" : "pointer";
    html.dataset.launch = e.standalone ? "standalone" : "browser";
    html.style.setProperty("--visible-height", e.height + "px");
    root.dispatchEvent(new Event("arcline-device"));
  }
  function read() {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }
  function record(state) {
    try {
      localStorage.setItem(key, JSON.stringify({ state, at: Date.now() }));
    } catch {}
  }
  function render() {
    const e = environment(),
      safari = e.os === "ios" && e.browser === "safari",
      android = e.os === "android";
    $("installTitle").textContent = local(
      android ? "ARCLINEをアプリとして楽しむ" : "ARCLINEを全画面で楽しむ",
      "Enjoy ARCLINE from your home screen",
    );
    $("installDescription").textContent = local(
      safari
        ? "Safariからホーム画面に追加すると、対応環境ではブラウザの操作バーを表示せずにゲームを楽しめます。"
        : android
          ? "インストール、またはホーム画面に追加すると、対応環境ではアプリのように起動できます。"
          : e.os === "ios"
            ? "追加方法はブラウザにより異なります。追加項目がない場合はSafariでこのURLを開いてください。"
            : "インストール対応時はブラウザのメニューから追加できます。そのまま遊ぶこともできます。",
      safari
        ? "Add ARCLINE to your home screen from Safari to play without browser bars where supported."
        : android
          ? "Install or add ARCLINE to your home screen where supported."
          : e.os === "ios"
            ? "Browser support varies. If no add option is available, open this URL in Safari."
            : "Use your browser menu if installation is supported, or keep playing in the browser.",
    );
    const steps = safari
      ? [
          local("Safariの共有ボタンをタップ。", "Tap Share in Safari."),
          local("「ホーム画面に追加」を選択。", "Choose Add to Home Screen."),
          local(
            "ホーム画面からARCLINEを起動。",
            "Launch ARCLINE from its icon.",
          ),
        ]
      : android && e.browser === "chrome"
        ? [
            local("Chromeのメニューを開く。", "Open the Chrome menu."),
            local(
              "利用可能なら「インストール」または「ホーム画面に追加」を選択。",
              "Choose Install or Add to Home Screen if available.",
            ),
            local(
              "ホーム画面からARCLINEを起動。",
              "Launch ARCLINE from its icon.",
            ),
          ]
        : [
            local(
              "共有・メニューで、ホーム画面への追加に対応しているか確認してください。",
              "Check your browser Share or menu for supported installation options.",
            ),
            local(
              "追加操作がなくても、そのまま遊べます。",
              "You can play without installing.",
            ),
          ];
    $("installSteps").replaceChildren(
      ...steps.map((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        return li;
      }),
    );
    $("installStorageNote").textContent = local(
      "今の進行はこのブラウザに残ります。ホーム画面のアプリでは進行が別になる場合があります。",
      "Progress stays in this browser. The home-screen app may have separate progress.",
    );
    $("installLater").textContent = local("あとで", "Later");
    $("installClose").textContent = local("案内を閉じる", "Close guide");
    $("installPrompt").textContent = local("インストール", "Install");
    $("installPrompt").hidden = !promptEvent || e.standalone;
  }
  function close(state) {
    record(state);
    root.ArcScreens.close("installGuide");
    const done = after;
    after = null;
    done?.();
  }
  function offer(done = () => {}, force = false) {
    const e = environment();
    if (root.ArcScreens.isOpen("installGuide")) return;
    if (!force && (e.standalone || read().state)) {
      done();
      return;
    }
    after = done;
    record("shown");
    render();
    root.ArcScreens.open("installGuide", {
      block: ["lobby", "battle", "lobbySettings"],
      onEscape: () => close("closed"),
    });
    $("installLater").focus();
  }
  root.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptEvent = e;
    sync();
    if (root.ArcScreens.isOpen("installGuide")) render();
  });
  root.addEventListener("appinstalled", () => {
    promptEvent = null;
    record("installed");
    sync();
    if (root.ArcScreens.isOpen("installGuide")) close("installed");
  });
  root.addEventListener("resize", sync);
  root.visualViewport?.addEventListener("resize", sync);
  root.addEventListener("arcline-language", () => {
    if (root.ArcScreens.isOpen("installGuide")) render();
  });
  $("installLater").onclick = () => close("deferred");
  $("installClose").onclick = () => close("closed");
  $("installPrompt").onclick = async () => {
    const e = promptEvent;
    if (!e) return;
    promptEvent = null;
    render();
    await e.prompt();
    await e.userChoice; /* appinstalled alone establishes completion. */
  };
  root.ArcDevice = Object.freeze({ key, environment, sync, offer });
  sync();
})(globalThis);
