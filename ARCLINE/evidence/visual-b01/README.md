# B01 基準固定・描画接続契約

現行0.10.0（`2cf1a18`）の既存27配布ファイル・原本18点・100面・schema5を基準に固定しました。既存27ファイルは変更せず、読み取り専用の描画台帳を追加しました。42個の描画IDと100面の対応を登録しましたが、現在の90通常面・10大ボスを維持しています。中ボス候補の登録だけで戦闘や章在庫を変えません。

[固定ファイルのハッシュ](BASELINE_FILES.json) ／ [実行結果](SUMMARY.json) ／ [座標・読取・IDの契約](../../design/visual-samples/CONTRACTS_JA.md)

実行したのはmachine-combat、character-graphics、journal、charge-pause、aim-guide、machine-worker、integratedと、新しいvisual-baselineです。各結果は同じフォルダーのJSONに保存しました。現在の実行数だけを記録し、過去の別バージョンの合格数を足していません。

`game/tests/fixtures/visual-baseline.json`は、不変の0.10.0コピーから取得した1,096件の実弾道・状態・イベント・被害と30件の乱数固定CPU判断のハッシュです。10機×100面に加え96件の手番/破損/段階状態を含みます。`visual-legacy-pixels.json`は同じChromiumで描画した7代表面×10機×3画面＝210枚のRGBAハッシュです。今後の描画追加後も既定表示が変わらないか照合します。失敗時に期待値を上書きして合格にする運用はしません。

既知の旧床専用テストは[過去の記録](../difficulty/HISTORICAL_RENDER_CHECK.json)、旧7面箱を前提にしたchapter-stock-browserは[現行0.10.0の説明](../journey-ui/README.md)で区別されています。今回の合格へ数えません。

この結果は幾何・状態・ブラウザー描画の基準です。新美術の完成、新しい敵戦闘の完成、全100面の実HP勝利、実機iPhone/Androidの確認ではありません。
