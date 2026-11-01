# ARCLINEの構造と保存互換性

## 編集元と公開物

公開入口は `/ARCLINE/`、ゲームは `/ARCLINE/game/dist/`。GitHub Pagesはmainのrootを公開する。ルートindexは空白、カタログは `/catalog/` を維持する。

| 対象 | 正本 | 出力・依存 |
|---|---|---|
| 版数・依存順・保存世代 | game/runtime.json | build_runtime.py → distのリソース参照・release-info・manifest |
| 画面・初回体験・端末判定 | game/ui/*.js | runtime.generated → dist同名JS |
| スタイル | game/styles/*.css | runtime.generated → dist同名CSS |
| 戦闘・保存・画面内容 | runtime.generatedに載らないdist/*.js | 手書きの正本。game/README.md参照 |
| 100面・加入・ストーリー | design/内の各JSON | game/tools/build_* |
| 映像 | assets/cinematicsの原本ZIPとedits/P03-01.jpeg | extract_cinematics.py → 23枚・manifest。P03-01のみ封蝋除去の承認された差し替え |
| キャラクター | assets/charactersとdesign/cinematics_014/character_images.json | 原画10枚の対応・ハッシュを維持 |

`npm run build` が正式生成、`npm run check:generated` が一時コピーで2回生成して再現性を検査する。ゲームは外部JavaScriptライブラリを要求しない。PWAのid・scope・公開入口は変更しない。

## 保存

キー `arcline-campaign-v1`、schema8、resetVersion2、contentRevision5.0.0を維持。v0.15.5では新しいリセットを導入しない。resetVersion2より古いデータに対する既存の一度のリセット契約は変更しない。

追加は `onboarding={version:1,step,tried}` のみ。stepはprologue/gun/trial/done。既存の進行・難易度確定・開始記録を持つセーブはdoneとして読み込み、チュートリアルを再強制しない。新規の中断記録は完了済み試射だけを保存する。通常の保存失敗時は工程を進めず再試行できる。既存の読込失敗時のセッションプレイでは保存済みと表示せず、メモリ内だけで体験できる。

インストール案内の延期・閉じた状態・appinstalledによる完了は別キー `arcline-install-guide-v1`。本編データを変更しない。通常ブラウザとホーム画面アプリのストレージ共有は保証しない。

章の持ち物はcampaign-runとinventoryが所有し、練習の選択は本編の在庫へ反映しない。加入条件、解放条件、章リセット、100面の地形・物語を維持する。難易度は射線の描画のみ。モグの通常弾の速度・重力のみ要求に従い調整し、全必殺技・他9機の性能は維持する。

## ディレクトリ点検の結果（AR-09）

既存のruntime.generatedとgame/READMEで正本と配布物の関係が定義されている。大規模な移動の必要性は認めず、公開URL・原画・ビルドの参照を維持する。新機能は既存ui/stylesへ配置し、画像差し替え元だけをassets/cinematics/editsに分離した。過去のevidence/や旧指示書は履歴であり、現行テストの合格数には含めない。
