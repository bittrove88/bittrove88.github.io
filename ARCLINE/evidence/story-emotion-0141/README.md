# ARCLINE 0.14.1 — 字幕と感情の時間の確認

物語正本のrevision更新、日英の文章改訂、27字幕キュー、実際のゲームへの接続を実施した。[実装と再現方法](../../design/story_emotion_0141/IMPLEMENTATION.md) ／ [日英の変更前後](../../design/story_emotion_0141/TEXT_DIFF.md)。前版は公開コミット `3bdbf4f` に保持する。

## 検証済み

|結果|確認範囲|
|---|---|
|[EMOTION_CONTENT](EMOTION_CONTENT.json)|正本からの字幕と読了余裕、十灯→静寂→挨拶→返信、進行ゲート、短い加入台詞、schema8の既読・保留映画の互換|
|[EMOTION_BROWSER](EMOTION_BROWSER.json)|Chromiumで568×240、844×390、390×844、1440×900。70/80/90/95面の結果、実原画の点灯と完全に止まる静寂、独立した挨拶と2.8秒の余韻。日英、4機の加入字幕と恒久モットー、動作軽減、実WebAudioの有効／ミュート、上映中の再読込と再開|
|[CONTENT](CONTENT.json)|採用23原画のSHA-256と新版2枚、1,380構図、限定した4拡大、18の戦闘・保存・地形・機体モジュールが0.14とバイト一致。story.jsは正本からの意図した改訂|
|[CINEMATIC_BROWSER](CINEMATIC_BROWSER.json)|横縦6サイズで全23画像と10機、9加入と両方の保存選択、操作・Pause・日英、低能力設定、原画欠落と復帰|
|[STORY_CONTENT](STORY_CONTENT.json)|100面の正本・話者・加入順・記録と開示の境界、保存失敗と再試行、旧クライアントの書戻し防止|
|[STORY_BROWSER](STORY_BROWSER.json)|100面の結果fixtures、6横サイズ×11枚のエピローグ、実射撃6件、初回・自動送り・再視聴、保存失敗・中断・SDK停止、縦の物語と日英|
|[CHARGE_PAUSE](CHARGE_PAUSE.json)|チャージ取消、実タッチ・2本指、左右操作、Pause・再挑戦・在庫と日英|
|[ORIENTATION_I18N](ORIENTATION_I18N.json)|回転時の実チャージ取消と停止、残留倍率、日英、SDK停止との重なり|
|[PUBLIC_UI](PUBLIC_UI.json)|10機×日英×4サイズ、実HTMLダウンロード、閲覧時の保存保持と明示的な編成、通信を切った自己完結HTML、制作確認ページ|
|[DELIVERY](DELIVERY.json)|4倍CPU制限、2コア／2GB設定、公開相対パスとZIP展開先で原画URL、タッチ停止・スキップ、最大3件の画像参照。ローカルの時間実測は実端末・広域通信の保証ではない|
|[GENERATED](GENERATED.json)|19生成物の再構築と完全一致。字幕とstory、物語全文、日英差分も含む|
|[BUNDLE_CHECK](BUNDLE_CHECK.json)|41実行ファイル＋23原画の64エントリ。原画は全バイト一致。配布ZIPはGit外で生成|
|[RELEASE_WEB](RELEASE_WEB.json)|現行ページのローカル参照、告知、カタログ1件と4サイズ、空白ルート・.nojekyll・CNAME不在、他コンテンツへの導線|

[CHECKS](CHECKS.json)に実行コマンド、検査数、最終実行ファイルのハッシュを保存。100面の結果fixturesは実際の100戦完走とは区別し、0.13の416実戦を今回再実行したという報告はしない。

## 画面

|場面|スマホ横|スマホ縦|
|---|---|---|
|旅の予感|[P03-02](symbolic-gathering-844.jpg)|[縦](symbolic-gathering-390.jpg)|
|十個目の点灯|[十灯](tenth-lamp-844.jpg)|[縦](tenth-lamp-390.jpg)|
|静寂|[停止した画面](quiet-844.jpg)|[縦](quiet-390.jpg)|
|おかえり|[独立表示](welcome-844.jpg)|[縦](welcome-390.jpg)|
|ただいま|[ガンの返信](reply-844.jpg)|[縦](reply-390.jpg)|

[70面の空欄](reveal-70-844.jpg) ／ [80面の信号](reveal-80-844.jpg) ／ [90面の名前](reveal-90-844.jpg) ／ [95面の封蝋](reveal-95-844.jpg)。568×240と1440×900でも同じ4場面を保存した。

採用23枚は、それぞれ `shot-{ID}-844.jpg` と `shot-{ID}-390.jpg` を保存し、[CINEMATIC_BROWSER](CINEMATIC_BROWSER.json)のshotScreensから参照できる。合計46枚。原画や別版のスクリーンショットと混在させない。

## 未確認・残る評価

- 物理端末のiPhone Safari／Android、ホーム画面インストール、YouTube本番SDK／認証、広域通信の読み込み速度。
- 初見プレイヤーによる通し視聴と主観的な感情の評価。点灯順や時間・文章を実装し検査したことは、感動の検証完了を意味しない。
- 管理ブラウザーがfile://起動を拒否するため、そのプロトコル自体は未確認。実際にダウンロードしたものと同一のHTMLを、通信を無効にした自己完結文書として実行した。
- 候補キャラPNG10枚はmain `b9d718a` から受領済み。機体との目視対応と登録は未確認で、Canvas表示を継続する。専用前景α素材は未格納。既存の4部分拡大を今回の専用素材完成扱いにしない。

公開の配信結果はGitHub Pagesの対象コミットのデプロイ状態で別途確認する。公開リポジトリ・配布データへの直接アクセスを制限したとは説明しない。
