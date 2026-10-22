# Bittrove

公開URL: https://bittrove88.github.io/

カタログ: https://bittrove88.github.io/catalog/

## ディレクトリ構成

```text
bittrove88.github.io/
├── index.html                         # 空白ページ（リンクなし）
├── catalog/index.html                 # 全公開コンテンツの一覧
├── unite-roulette/
│   ├── index.html
│   └── img/
│       ├── ogp.png
│       └── ogp-s.png
├── character-roulette-30/index.html
├── switch2-rpg-catalog/index.html
├── portfolio/                         # 内田隼人のポートフォリオ
├── anzu20251007/                      # あんずのアルバム（全4ページ）
├── AGENTS.md                          # カタログ更新などの共通ルール
├── favicon.svg
├── .nojekyll
└── README.md
```

## 公開・運用

GitHub Pages の Source は「Deploy from a branch」、ブランチは `main`、ディレクトリは `/(root)`。`main` へのプッシュで公開されます。ビルドツールは不要です。`.nojekyll` を維持し、独自ドメインや `CNAME` は設定しません。

アプリ・サイト・ポートフォリオ・アルバムを追加または移行する場合はルート直下に固有名のディレクトリと `index.html` を置き、`catalog/index.html` の `.grid` に既存と同じ `<a class="card">` を1件追加します。改名・URL変更・削除時も、必ず同じコミットでカタログと下記公開コンテンツ一覧を更新します。詳細ルールは [AGENTS.md](AGENTS.md) を参照してください。カードはアイコン、名前、説明のみ。PCは3列、601〜900pxは2列、600px以下は1列です。`apps/` 階層は使用しません。

ルートの `index.html` は空白ページとし、リンク・リダイレクト・OGPは配置しません。`noindex,nofollow` を指定しています。カタログと各アプリは直接URLでアクセスできます。この設定はアクセス制限ではなく、公開リポジトリからもURLは確認できます。

カタログと各アプリの canonical、OGP、Twitter URL は公開URLに合わせます。UNITEのOGP画像は `unite-roulette/img/` に配置しています。ポートフォリオとアルバムは、それぞれの `assets/ogp.jpg` を使用します。専用画像のないページはタイトル・説明によるカードを使用します。

## ローカル確認

```sh
python3 -m http.server 8000
```

http://localhost:8000/ が空白でリンクがないことを確認し、`/catalog/` と各アプリを直接開きます。PC・タブレット・スマートフォンの表示、カードリンク、各ルーレットの抽選、RPGカタログの検索・絞り込み・お気に入り・比較を確認してください。

## 移行情報

移行元: https://github.com/bittrovelab/PU-TR

取得コミット: `ca92fbbd3b1705cf99a9fce7a4e83ad67df1ff1d` (`main`)

移行日: 2026-10-22

`index.html` → `unite-roulette/index.html`、`cr.html` → `character-roulette-30/index.html`、`Switch2_RPG_Catalog.html` → `switch2-rpg-catalog/index.html` と画像2件を移行。元リポジトリとドメイン設定には変更を加えていません。アプリの処理・スタイル・RPGの埋め込み画像は維持し、公開先URLとhead内メタデータのみ調整しています。RPG作品情報は移行元の内容をそのまま保持しています。

UNITEの既存GA4測定ID `G-CHKNB5BK2H` と共有イベントを保持しています。新しいページや他アプリへの計測追加は行っていません。Google Analytics側のデータストリームURL・ドメイン条件はリポジトリでは管理していません。

UNITEは既存どおりReact・ReactDOM（unpkg）、Tailwind CDN、Google Fonts、ポケモン画像の外部配信元を利用します。通信環境によって読み込みが影響を受けます。お気に入り等のブラウザ保存データはオリジンごとに保存され、旧ドメインから自動移行されません。

## ポートフォリオ

`/portfolio/` にCanvaサイトから移行した内田隼人のポートフォリオを配置しています。構成と更新方法は [portfolio/README.md](portfolio/README.md) を参照してください。ルートは空白のまま維持します。

## 公開コンテンツ一覧

カタログは公開コンテンツを常に網羅します。追加・移行・改名・URL変更・削除時は **必ず同じコミットでカタログも更新** してください。

| コンテンツ | URL |
| --- | --- |
| UNITE Roulette | [/unite-roulette/](https://bittrove88.github.io/unite-roulette/) |
| キャラルーレット30 | [/character-roulette-30/](https://bittrove88.github.io/character-roulette-30/) |
| Switch 2 RPG Catalog | [/switch2-rpg-catalog/](https://bittrove88.github.io/switch2-rpg-catalog/) |
| Hayato Uchida Portfolio | [/portfolio/](https://bittrove88.github.io/portfolio/) |
| あんず・ひだまりスケッチ | [/anzu20251007/](https://bittrove88.github.io/anzu20251007/) |

アルバムの構成・更新方法は [anzu20251007/README.md](anzu20251007/README.md) を参照してください。
