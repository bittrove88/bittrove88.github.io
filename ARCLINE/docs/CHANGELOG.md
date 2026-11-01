# ARCLINE 0.15.5 実装・検証記録

復旧元：`9f908c38880922b78c4a767663abdbdc4b2bc267`。要求の正本は [全21章のv0.15.5仕様書](change-requests/ARCLINE_CHANGE_REQUEST_v0.15.5.md)。仕様書の原文は維持する。

| ID | 実装結果 | 主な変更ファイル | 自動検証 |
|---|---|---|---|
| AR-01 | 実装完了：同じ試射場で3難易度を体験して確定。途中再開、再試行、保存失敗から復帰 | game/ui/difficulty-ui.js、onboarding.js、dist/save.js、game.js | journey-0155、journey-0155-browser、journey-0155-resilience |
| AR-02 | 実装完了：coverを下回らない縮尺、各ショットの焦点、固定ズーム・単軸一方向パン、回転・演出軽減 | dist/cinematic-player.js、styles/journey-update.css | cinematic-014、journey-0155-browser/resilience |
| AR-03 | 実装完了：背景の封蝋と追加装飾を削除。原本ZIPは復旧用に維持。画像ハッシュで旧キャッシュを区別 | assets/cinematics/edits/P03-01.jpeg、配布JPEG、shots.json、extract_cinematics.py | ハッシュ・生成一致、画像目視、manifestと配布検査 |
| AR-04 | 実装完了：プロローグ後にガンの原画・重い弾の説明を表示し試射へ | ui/onboarding.js、dist/index.html | 初回順序、既存ユーザー回避、試射・中断再開 |
| AR-05 | 実装完了：モグの通常弾を速度0.78・重力1.5の短距離型へ。固有必殺・他9機は維持 | dist/combat.js、i18n.js | 旧版との全プロフィール比較、同条件弾道、敵AI、既存戦闘・100面進行 |
| AR-06 | 実装完了：iOS/Android別案内、延期・閉じる・設定から再表示。実際のイベントがある場合だけインストール操作 | ui/device.js、dist/menus.js、fullscreen.js | UA・タッチエミュレーション、standalone判定、案内と進行の分離 |
| AR-07 | 実装完了：OS・ブラウザ・タッチ・画面・起動モードを判定。既存viewport補正を維持 | ui/device.js、styles/journey-update.css | 6サイズ、回転、タッチ・マウス・キーボード、CPU制限 |
| AR-08 | 実装完了：既存のAGENTS/UPDATE_RULESを維持し、構造・公開復旧・検証・履歴を文書化 | docs/ARCHITECTURE.md、DEPLOYMENT.md、TEST_CHECKLIST.md、本書 | 文書・参照パスと現行ビルドの照合 |
| AR-09 | 点検完了：大規模移動は不要。既存ui/stylesへ追加し、画像編集元のみeditsへ分離 | docs/ARCHITECTURE.md、runtime.json、extract_cinematics.py | 正式生成、相対参照、ZIP、既存URLのパス保持 |
| AR-10 | 実装完了：Canvas非表示で原画の親を隠すCSSを削除。原画約43%・本文スクロール・固定操作行 | styles/gameplay.css、journey-update.css、dist/expedition-ui.js | 全9加入×6サイズ、原画失敗・復帰、加入・編成保存、演出スキップ |
| AR-11 | 実装完了：全10機の一覧も原画へ。原画成功時はCanvasのみ非表示、旧画像との重複を廃止 | dist/character-hero.js、presentation.js、journey-update.css | 一覧10枚、詳細1枚、Canvasとの排他、ロック状態、6サイズ |
| AR-12 | 実装完了：「章ボス戦まで持ち越し可能」と撃破後リセットを説明。通常弾・必殺を区別 | dist/presentation.js、menus.js、game.js、i18n.js | 日英文言、既存chapter-stockと戦闘の回帰検査 |
| AR-13 | 実装完了：「練習で使う武器」、既クリア面の再プレイと本編在庫への非反映を明記。選択状態・解放条件・操作・通知を更新 | dist/presentation.js、i18n.js | 本編と練習の分離、通常弾の常時利用、データ由来の解放条件、日英 |

## 保存・互換性

保存キー、schema8、resetVersion2を維持。既存の進行、難易度、解放、編成、章の残数、物語閲覧・チュートリアル記録を保持する。追加のonboardingだけを独立管理し、既存ユーザーを再初期化しない。PWAのid・scopeと両公開入口は維持。要求外の戦闘モジュール、原画10枚、残り22枚の映像素材を維持する。

## 検証結果の入口

自動結果は [evidence/journey-0155](../evidence/journey-0155/) に記録する。単体13スイート、生成33ファイルの2回再現、整形、既存ブラウザ回帰、6サイズの新UI、保存失敗・画像失敗・復帰、フラットZIPと4倍CPU制限を検証する。失敗した旧期待値は原因を確認し、新仕様の受け入れ条件へ更新後に再検証した。過去の失敗を合格数へ加算しない。

## Git・公開状態

作業ブランチ：`codex/arcline-v0155`。実装コミット：`28939cc`。画像キャッシュ修正：`351675e`。[PR #35](https://github.com/bittrove88/bittrove88.github.io/pull/35) に全変更を集約する。[CIの最新状態](https://github.com/bittrove88/bittrove88.github.io/pull/35/checks) と [Pagesデプロイ](https://github.com/bittrove88/bittrove88.github.io/actions) はGitHubの対象head_shaと結果を参照する。evidence内は公開前のローカル検証記録であり、公開URLや実機で確認済みという意味ではない。

公開URLの直接アクセスは、この作業環境のネットワーク許可に `bittrove88.github.io` が含まれず、CONNECT時に403となった。CI・デプロイ成功とは区別し、通信許可が追加されるまで公開URLでの実表示は未確認とする。

## 未確認事項

物理iPhone/iPad Safari、Android端末、実際のホーム画面インストールと起動、YouTube本番SDK、人による100面通しプレイ。Chromiumの端末・画面サイズ・CPU制限エミュレーションを実機確認と扱わない。上記と公開URLの確認が終わるまでは、第20章の全最終完了条件を満たしたとは報告しない。
