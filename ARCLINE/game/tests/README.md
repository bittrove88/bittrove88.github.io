# 現行0.14.1の検証入口

専用検査は `story-emotion-0141.test.cjs`（正本キュー・読了待ち・十灯と静寂・公開順・保存互換）と `story-emotion-0141-browser.test.cjs`（4サイズの実画像・段階開示・日英の文の保持・音あり／なし・上映中断と再開）です。[今回の結果と限界](../../evidence/story-emotion-0141/README.md)を参照してください。

0.14の専用入口は `cinematic-014.test.cjs`（23原本・1,380構図・戦闘/保存18モジュール保持）、`cinematic-014-browser.test.cjs`（6横縦サイズ×23場面×10機、9加入、低動作と画像欠落）、`site-tests/cinematic-014-ui.test.cjs`（公開10機・実保存・ダウンロード・通信を切った自己完結HTML）、`site-tests/cinematic-014-delivery.test.cjs`（4倍CPU制限と配布ZIP）です。最後のテストは `ARCLINE_PACKAGE_DIR` に `build_playables.py` のGit外出力先を指定します。file://での起動は環境のブラウザー管理ポリシーで確認できず、HTTP不要の自己完結文書として実行を確認します。

以下の0.13からの重要な回帰も引き続き使います。戦闘と保存の仕様は0.14で変更していません。

各テストはリポジトリのルートから `node ARCLINE/game/tests/<名前>.test.cjs` で起動する。`ARCLINE_EVIDENCE_DIR` をGit外の出力ディレクトリに設定する。ブラウザー検査はNodeから `playwright` を解決でき、Chromiumが `/usr/bin/chromium` にある環境を使う。配布ゲームには含めない。

|テスト|確かめること|
|---|---|
|`expedition-foundation`|schema2〜7移行、一回性、所有、バックアップ失敗、加入、切替、必殺ターン、砲口、転移後の位置保持|
|`chapter-stock`|有限在庫、拾得台帳、練習、敗北、勝利、保存失敗と直列化|
|`machine-combat`|1000組の初期配置、固有武器、HPと操作係数、弾道の不変性|
|`special-damage` / `special-targeting`|最新の威力上限、クリティカル、ソラの頂点、モグの出力と間隔|
|`aim-guide`|難易度別点線、半分の長さ、ハードの方向、100面の乱数独立性|
|`expedition-routes`|全100面、ガン通常弾のみ、敵3乱数条件、歩行・破壊・転移を含む実戦300戦|
|`expedition-tactics`|加入済みの推奨機体で全100面。準備・転移・必殺を含む実戦|
|`expedition-showcases`|コロ11–14、ソラ21–24、リコ31–34、リン61–64の固有イベントを含む16戦|
|`expedition-early-tolerance`|序盤24通常面の角度±3°・出力±5の近傍9入力。合法な準備後の広い解|
|`story-012`|0.13へ更新した物語回帰。100結果・加入と話者・進行ゲート・四場面の結末・保護モジュール|
|`expedition-browser`|6サイズ、全100面描画、加入選択、戦闘中変更、設定、記録、ローカル／SDK移行|
|`story-012-browser`|0.14の画像演出へ更新した映像回帰。6サイズの結果、11ショットのエピローグ、保存再開、日英、動作軽減|
|`charge-pause`|実タッチのチャージ取消、2本指、左右操作、一時停止、在庫復帰、日英|
|`orientation-i18n` / `viewport` / `fullscreen`|回転・残留ズーム・実フルスクリーン・SDK停止の重なり|
|`machine-worker`|10機とフォールバックで実Web Workerを通る敵応答|
|`camera-framing`|100面×8サイズ、範囲外・非有限の拾得物で縮みすぎないカメラ|
|`effects-footprint`|不変の0.10配布物と、実Canvasの着弾・弾体の寸法比較|
|`../site-tests/service-site`|3実演を再シミュレーション、全10機、5サイズ、日英、ダウンロード|
|`../site-tests/expedition-release`|現行ページの参照・配布版数・設計図・カタログ・ルートの公開条件|

`effects-footprint` は `ARCLINE_BASELINE_DIR` に比較元の0.10配布ディレクトリが必要。未指定はSKIPを出し、その結果を合格数へ加えない。今回の比較元と実施結果は検証READMEへ記載する。

旧版からの試験ファイルも残している。初期の27外観・schema3・旧地形位置などを期待する全ファイル一括実行は、現在の受入基準ではない。上表の重要な回帰は現在の仕様に更新して検査する。過去の検証は `evidence/` の各版に保存し、現行結果と混在させない。

探索は敵の実HPと手番を使うが、人の狙いやすさ・楽しさ・勝率を測らない。全10機体×100面の完走、実端末Safari／Android、YouTube本番認証は別途確認が必要。
