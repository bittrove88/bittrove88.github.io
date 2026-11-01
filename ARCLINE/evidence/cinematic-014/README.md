# ARCLINE 0.14 — 画像演出の実装と確認

本編の採用23枚を元バイトのまま配置し、ショット別カメラ、保護構図、遷移、霧・光、四つの細部拡大を本編へ接続した。10機の詳細・加入・公開画面は、正式な名前／役割／モットーと実際の能力・所有・編成に接続。**個別原画10枚は未格納のため、既存Canvas描画をフォールバックとして確認した。** 未確認の画像をそれらしく割り当てていない。

原本抽出は `5a2e398`。実装の設計・再現方法は [IMPLEMENTATION](../../design/cinematics_014/IMPLEMENTATION.md)。初期の制作指示や画像採用が、実装済みという意味ではない。

## 自動確認

|根拠|今回の結果|
|---|---|
|[CONTENT](CONTENT.json)|3,625検査。採用23枚のSHA-256・順序・新版2枚、1,380の保護構図、低動作、限定した4拡大、正本10機ID。戦闘・保存・100面・機体描画など19モジュールが現行main `fc9b34e` とバイト一致|
|[CINEMATIC_BROWSER](CINEMATIC_BROWSER.json)|1,276検査。6横縦サイズで全23枚と10機、日英、Pauseとフォーカス、9加入と両方の保存選択、動作軽減／低能力設定、画像欠落と復帰。23枚×2サイズ＝46枚を保存|
|[PUBLIC_UI](PUBLIC_UI.json)|209検査。公開ページの10機×日英×4サイズ、44px以上のタイル、横スクロールなし、閲覧で保存を変えない、明示的な編成保存、実HTMLダウンロード、通信を切った自己完結HTMLの実行、23枚の確認ページ|
|[DELIVERY](DELIVERY.json)|14検査。Chromiumの4倍CPU制限と2コア／2GBの能力設定。公開相対パスとZIP展開先で最初・最後の原画を読み、タッチ停止・スキップ、最大3件の画像参照を確認。タイミング実測はJSONに記録し、実端末FPSの保証としない|
|[GENERATED](GENERATED.json)|17生成物を原稿から再生成してハッシュ完全一致|
|[BUNDLE_CHECK](BUNDLE_CHECK.json)|41実行ファイル＋23原画、64エントリ。Git外へZIP生成、原画の全バイトと配布全ファイルのハッシュを確認。indexだけにフラット配置のasset baseを指定|
|[EXPEDITION_BROWSER](EXPEDITION_BROWSER.json)|286検査。横6サイズ×100面の実描画、所有機体の変更、9加入、日英、設定・記録、実localStorageとSDKモックの失敗／再試行|
|[STORY_BROWSER](STORY_BROWSER.json)|1,514検査。100面の結果表示、6サイズの11ショットの結末、全文・送り・再生、保存失敗／中断からの結末、日英、縦画面で継続する物語、SDK停止、動作軽減|
|[CHARGE_PAUSE](CHARGE_PAUSE.json)|245検査。実タッチ・マウス・2本指・左右配置・チャージ取消、Pause、再挑戦、在庫、日英|
|[ORIENTATION_I18N](ORIENTATION_I18N.json)|57検査。縦のタイトルと物語を利用可能にし、実戦では縦回転で停止。実チャージ取消、弾・プレビューの停止、SDK停止との重なり、残留倍率、日英|
|[VIEWPORT](VIEWPORT.json)|179検査。残留倍率1.5/2/1、逆座標変換、実ピンチとダブルタップ、タップとスクロール|
|[FULLSCREEN](FULLSCREEN.json)|13検査。Chromium実Fullscreen出入、停止保持、拒否時の案内、PWA manifest|
|[MACHINE_WORKER](MACHINE_WORKER.json)|46検査。10機の必殺を実Workerの敵応答まで通し、フォールバック1件も確認|
|[SERVICE_SITE](SERVICE_SITE.json)|555検査。紹介サイト5サイズ、全10機、日英、実演の物理再計算、ダウンロード、ゲーム起動、外部要求なし|
|[FOUNDATION](FOUNDATION.json)|2,228検査。保存移行と失敗、加入・所有、機体変更のHP／資源、ターン解放、方向と砲口、転移後の位置保持|
|[CHAPTER_STOCK](CHAPTER_STOCK.json)|125検査。在庫と拾得、練習、中断／敗北／勝利、保存の順序|
|[STORY_CONTENT](STORY_CONTENT.json)|6,268検査。正本の物語、話者と加入、日英、段階解放、旧保存の書戻し防止。四つの意味段落を11の画像ショットへ展開しても、正本の結末と進行ゲートを保持|

現行ページの参照、配布版数、カタログ、空白ルート、`.nojekyll`、CNAME不在は [RELEASE_WEB](RELEASE_WEB.json)。実行入口は [CHECKS](CHECKS.json) と [テストREADME](../../game/tests/README.md)。0.13で行った416実戦を今回再実行したという報告はしない。

## 23枚の画面

左が844×390、右が390×844。実際の本編プレイヤーと採用JPEGを使う。安全構図と本文・操作を同時に確認する。

|ID|横画面|縦画面|
|---|---|---|
|P01-01|[横](shot-P01-01-844.jpg)|[縦](shot-P01-01-390.jpg)|
|P01-02|[横](shot-P01-02-844.jpg)|[縦](shot-P01-02-390.jpg)|
|P01-03|[横](shot-P01-03-844.jpg)|[縦](shot-P01-03-390.jpg)|
|P02-01|[横](shot-P02-01-844.jpg)|[縦](shot-P02-01-390.jpg)|
|P02-02|[横](shot-P02-02-844.jpg)|[縦](shot-P02-02-390.jpg)|
|P03-01|[横](shot-P03-01-844.jpg)|[縦](shot-P03-01-390.jpg)|
|P03-02|[横](shot-P03-02-844.jpg)|[縦](shot-P03-02-390.jpg)|
|P03-03|[横](shot-P03-03-844.jpg)|[縦](shot-P03-03-390.jpg)|
|I30-01|[横](shot-I30-01-844.jpg)|[縦](shot-I30-01-390.jpg)|
|I30-02|[横](shot-I30-02-844.jpg)|[縦](shot-I30-02-390.jpg)|
|I60-01|[横](shot-I60-01-844.jpg)|[縦](shot-I60-01-390.jpg)|
|I60-02|[横](shot-I60-02-844.jpg)|[縦](shot-I60-02-390.jpg)|
|E01-01|[横](shot-E01-01-844.jpg)|[縦](shot-E01-01-390.jpg)|
|E01-02|[横](shot-E01-02-844.jpg)|[縦](shot-E01-02-390.jpg)|
|E01-03|[横](shot-E01-03-844.jpg)|[縦](shot-E01-03-390.jpg)|
|E02-01|[横](shot-E02-01-844.jpg)|[縦](shot-E02-01-390.jpg)|
|E02-02|[横](shot-E02-02-844.jpg)|[縦](shot-E02-02-390.jpg)|
|E02-03|[横](shot-E02-03-844.jpg)|[縦](shot-E02-03-390.jpg)|
|E03-01|[横](shot-E03-01-844.jpg)|[縦](shot-E03-01-390.jpg)|
|E03-02|[横](shot-E03-02-844.jpg)|[縦](shot-E03-02-390.jpg)|
|E04-01|[横](shot-E04-01-844.jpg)|[縦](shot-E04-01-390.jpg)|
|E04-02|[横](shot-E04-02-844.jpg)|[縦](shot-E04-02-390.jpg)|
|E04-03|[横](shot-E04-03-844.jpg)|[縦](shot-E04-03-390.jpg)|

## 10機の表示

個別原画がない現在は、全て正しいCanvas機体を使用する。名前・役割・モットー・状態を同時に切り替えて確認。

|機体|横画面|縦画面|
|---|---|---|
|gun|[横](character-gun-844.jpg)|[縦](character-gun-390.jpg)|
|ban|[横](character-ban-844.jpg)|[縦](character-ban-390.jpg)|
|hibari|[横](character-hibari-844.jpg)|[縦](character-hibari-390.jpg)|
|hana|[横](character-hana-844.jpg)|[縦](character-hana-390.jpg)|
|rin|[横](character-rin-844.jpg)|[縦](character-rin-390.jpg)|
|mogu|[横](character-mogu-844.jpg)|[縦](character-mogu-390.jpg)|
|koro|[横](character-koro-844.jpg)|[縦](character-koro-390.jpg)|
|sora|[横](character-sora-844.jpg)|[縦](character-sora-390.jpg)|
|rico|[横](character-rico-844.jpg)|[縦](character-rico-390.jpg)|
|yui|[横](character-yui-844.jpg)|[縦](character-yui-390.jpg)|

[公開キャラ画面・PC](characters-public-1440.jpg) ／ [スマートフォン](characters-public-390.jpg)

## 方法と限界

- 実ブラウザーはPlaywright＋Chromium。横縦6サイズは568×240、844×390、390×844、360×780、1280×720、1440×900。GPU向けのtransform/opacityを共有の映画時計で進め、停止時は同じ構図を保つ。
- メイン画像を意図的に失敗させ、概略Canvas・案内・本文・スキップ・実際の戦闘への復帰を確認。低能力設定と4倍CPU制限はエミュレーションであり、物理的な低性能端末の測定ではない。
- ブラウザー環境の管理ポリシーがfile://ナビゲーションを拒否するため、そのプロトコルでの起動自体は未確認。ダウンロードしたものと同一のHTMLを、ネットワークを無効にした自己完結文書として実行した。
- 未格納の個別原画10枚は、画像としての構図・トンマナの検収ができない。Canvasフォールバックを原画完成扱いにしない。専用前景α原画も未提供であり、架空のマスクファイルを要求しない。
- 物理端末Safari／Android、ホーム画面インストール、YouTube本番SDK／認証、広域通信での読み込み速度は未確認。既存のSDKモックとChromiumの結果で代用して合格としない。

公開URLは[ゲーム](../../game/dist/?v=0.14.0)、[キャラ画面](../../characters/)、[23ショット確認・ネタバレ](../../cinematics/)。公開への反映は別途GitHub Pagesのデプロイ状態と応答で確認する。
