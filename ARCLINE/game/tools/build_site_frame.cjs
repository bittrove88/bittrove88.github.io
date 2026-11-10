"use strict";
// All public navigation and footer copies use the introduction's design and vocabulary.
const fs = require("node:fs"),
  path = require("node:path"),
  release = require("../runtime.json");
const root = path.resolve(__dirname, "../..");
const pages = [
  { file: "index.html", prefix: "", home: "#top", language: true },
  {
    file: "design/expedition_013/arcline_100_maps_atlas.html",
    prefix: "../../",
    home: "../../",
  },
  { file: "promo/index.html", prefix: "../", home: "../" },
];
const brand = (home) =>
  `<a class="brand" href="${home}" aria-label="ARCLINE">ARCLINE<span aria-hidden="true">◆</span></a>`;
const text = (ja, en) => `<span data-ja="${ja}" data-en="${en}">${ja}</span>`;
const destinations = [
  ["machines", "必殺技と相棒", "Special attacks"],
  ["play", "作戦をつくる", "Make your plan"],
  ["journey", "旅の先へ", "The journey"],
  ["how-to", "遊び方", "How to play"],
];
for (const page of pages) {
  const play = page.prefix + "game/dist/?v=" + release.version;
  const header = `<!-- SITE_HEADER_START -->
    <header class="site-header">
      <div class="site-shell">
        ${brand(page.home)}
        <button id="menuButton" class="menu-button" aria-expanded="false" aria-controls="mainNav" aria-label="メニューを開く">☰</button>
        <nav id="mainNav" class="site-nav" aria-label="メインナビゲーション">
          ${destinations.map(([id, ja, en]) => `<a href="${page.prefix}#${id}" data-ja="${ja}" data-en="${en}">${ja}</a>`).join("\n          ")}
          ${page.language ? '<button id="languageButton" class="language-button" aria-label="Switch to English">EN</button>' : ""}
        </nav>
        <a class="button header-play" href="${play}">${text("ゲームを遊ぶ", "Play ARCLINE")}<span aria-hidden="true">→</span></a>
      </div>
    </header>
    <!-- SITE_HEADER_END -->`;
  const footer = `<!-- SITE_FOOTER_START -->
    <footer class="site-footer">
      <div class="site-shell">
        <div class="footer-main">
          <div class="footer-identity">
            ${brand(page.home)}
            <p class="footer-tagline">${text("読み切れ。", "Read the battle.")}<span class="accent" data-ja="撃ち抜け。" data-en="Make your shot.">撃ち抜け。</span></p>
          </div>
          <nav class="footer-nav" aria-label="詳しく知る">
            <a href="${page.prefix}#machines" data-ja="必殺技と相棒" data-en="Special attacks">必殺技と相棒</a>
            <a href="${page.prefix}design/expedition_013/arcline_100_maps_atlas.html?v=${release.version}" data-ja="マップ総覧" data-en="Map atlas">マップ総覧</a>
            <a href="${page.prefix}promo/" data-ja="長編ムービー" data-en="Story movie">長編ムービー</a>
          </nav>
        </div>
        <div class="footer-meta">
          <p data-ja="ひとり用・ターン制砲撃アドベンチャー" data-en="A single-player, turn-based artillery adventure">ひとり用・ターン制砲撃アドベンチャー</p>
          <span id="siteVersion">ARCLINE · ${release.version}</span>
        </div>
      </div>
    </footer>
    <!-- SITE_FOOTER_END -->`;
  let html = fs.readFileSync(path.join(root, page.file), "utf8");
  for (const [kind, block] of [
    ["HEADER", header],
    ["FOOTER", footer],
  ]) {
    const re = new RegExp(
      "<!-- SITE_" +
        kind +
        "_START -->[\\s\\S]*?<!-- SITE_" +
        kind +
        "_END -->",
    );
    if (!re.test(html))
      throw Error("Missing shared frame markers in " + page.file);
    html = html.replace(re, () =>
      block
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n"),
    );
  }
  fs.writeFileSync(path.join(root, page.file), html);
}
console.log(
  "Built shared public header/footer for introduction, atlas and movie",
);
