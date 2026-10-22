# ARCLINE Codex移行パッケージ

**まずCODEX_HANDOFF.mdを読んでください。** 新しいCodexに渡す開始文はCODEX_START_PROMPT.mdです。

- game/dist：現在の最新実装0.3.0-rc1。現行ソースと同一の4ファイルです。
- design：未実装の新100面設計と、優先して適用するv1.1レビュー。
- evidence：旧実装のテスト結果。新設計の動作保証ではありません。
- game/arcline-current-playables.zip：現在版の配布用4ファイルZIP。YouTube審査未完了。

ローカル起動：`python3 -m http.server 8000 --directory game/dist` → `http://localhost:8000/`

ビルド・npm installは不要。テストは`node game/tests/engine.test.cjs`と`node game/tests/runtime.test.cjs`。実ブラウザー検証は別途必要です。

エクスポート時の出典コミットとファイルハッシュはEXPORT_MANIFEST.jsonに記録しています。認証情報とGit履歴は含みません。
