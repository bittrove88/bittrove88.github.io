# 共通チャージカメラの検証

実装：必要時だけ通常倍率の90%へ縮小し、そのチャージ中は維持。通常フレームと縮小率を分け、連続操作での累積縮小を防ぐ。判定に実際の衝突・着弾先を使用しない。

- `VERIFY.json`：集計、検証範囲、未確認事項。
- `SUITE_UNIT.json`：全31スイート成功。`charge-camera.log`：追加170項目。
- `arcline-generated.json`：144生成物が一致、再生成で差分なし。
- `CHARGE_CAMERA_BROWSER.json`：217項目。3難易度で同一条件・固定90%、不要時の通常倍率、キャンセル・連続チャージ・発射・歩行、UI寸法・セーブ・弾道、回転タッチとアニメーション軽減を確認。
- `CHARGE_PAUSE.json`：245項目。`MAP_CAMERA_BROWSER.json`：116項目。`LANDSCAPE_VIEW_BROWSER.json`：80項目。既存操作・見渡し・回転の回帰確認。
- PNG：小型横画面のEasy、縦端末の横向き固定表示でのHard。制御した時刻の合成平地マップで、実際のキーボード／CDPタッチ入力を使用。

初速共通化前の `9ca73c2` と6ステージ×2射撃条件の実弾結果を完全比較。実機iPhone Safari／Android Chrome、公開URLへの反映と動作確認は未実施。
