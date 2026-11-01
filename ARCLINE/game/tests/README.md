# 現行ARCLINEの検証入口

`game/runtime.json` が表示版・キャッシュ版・保存世代・依存順序の正本。次のコマンドを `ARCLINE/` で実行する。

```sh
npm ci
pip install -r requirements-dev.txt
npm test
npm run check:generated
npm run test:browser
```

Node22以上・Python3.12以上を使用する。ブラウザは `ARCLINE_CHROMIUM`、存在すれば `/usr/bin/chromium`、それ以外は `npx playwright install chromium` の実行ファイルを使う。Node/Playwright/Pillowは開発専用で、配布ゲームには含めない。

検査一覧は [suites.json](suites.json) を参照。ランナーは終了コードを集約し、各ログと `SUITE_*.json` を `ARCLINE_EVIDENCE_DIR`（既定は一時ディレクトリ）へ保存する。名前・結果を個別に確認でき、一部失敗を合格数へ含めない。

- **unit**：保存リセットと継続、100面進行、章在庫、難易度、機体・必殺・ダメージ、画像と物語の正本、生成元と配布物、依存順序。
- **browser**：翻訳の差分更新、画面のフォーカスと復帰、4サイズの現行フロー、実タッチのチャージ取消と2本指、一時停止、公開紹介とオフラインHTML、リリース・カタログ。
- **visual**：直前公開版との配置・書体・色の比較。6サイズ×10画面。比較元は [layout-baseline.json](layout-baseline.json) で固定し、意図した外観変更時のみ理由とともに更新する。
- **delivery**：公開相対パス・フラットZIP、原画、4倍CPU制限での停止・スキップ。物理端末や広域通信の性能保証ではない。

```sh
python3 game/tools/create_layout_baseline.py --output /tmp/arcline-baseline
ARCLINE_BASELINE_ROOT=/tmp/arcline-baseline node game/tools/test.cjs visual
python3 game/tools/build_playables.py --output /tmp/arcline-package
ARCLINE_PACKAGE_DIR=/tmp/arcline-package node game/tools/test.cjs delivery
```

`npm run build` は生成物を書き込む。`check:generated` は一時コピーで2回生成し、コミット対象との一致と再現性を検査し、作業ツリーには書き込まない。歴史的な物語差分にはGit履歴を使うため、CIのcheckoutは全履歴を取得する。

## 保存の受入条件

保存schema8・resetVersion2を維持する。このリファクタリングによる新しいリセットはない。現行fixtureは `ArcSave.resetVersion` を使い、旧版移行のfixtureは意図した古い世代を明示する。旧進行を一度全初期化する契約と、新しい記録を保持する契約を別々に検査する。

## 履歴検査との区別

suites.jsonに載らない過去版の検査は歴史資料であり、全ファイル一括実行を現行の合格基準としない。schema3・旧自由選択・0.13の旧所有引き継ぎ・旧UIなどの期待が含まれる。過去結果は `evidence/` の各版を参照する。現行の在庫・射線・物語検査は今回の保存世代へ更新した。

物理端末Safari/Android、インストールPWA、YouTube本番認証、人による100面通しプレイは別途必要。自動検証は楽しさや人の勝率を測定しない。
