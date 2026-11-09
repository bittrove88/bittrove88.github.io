# 最新main統合後：敵の歩行・テレポート0.30.3

[最終のローカル結果](integrated-0303/ACCEPTANCE.json)。先行PR140の攻撃修正を保持し、敵移動・自機転移とHP/行動を再検証。生成物155件が一致。メニュー/TOPのソースは不変のため下記成功を再利用し、最新コミットのCIでも計画した5スイートを確認する。

[転移弾](integrated-0303/teleport-flight-568.png)／[到着](integrated-0303/teleport-arrival-568.png)。ユーザーからマージ指示受領。

# 最新main統合後：敵の歩行・テレポート0.30.2

[今回の結果](integrated-0302/ACCEPTANCE.json)／[敵移動の実行記録](integrated-0302/ENEMY_MOVEMENT_BROWSER.json)。main8555e87のHP・行動上限とメニューを保持して競合を解消。限定5スイートと生成物155件の一致が成功。

[PC飛翔](integrated-0302/teleport-flight-1280.png)／[PC到着](integrated-0302/teleport-arrival-1280.png)／[小画面飛翔](integrated-0302/teleport-flight-568.png)／[小画面到着](integrated-0302/teleport-arrival-568.png)。

旧HP検査のbattle-catalog固定比較だけ、先行メニューで承認済みの英語説明の基準へ更新。他の戦闘・保存の固定比較は保持。

以下は初回0.29.6基準の履歴。現在のmain統合の証拠は上記を参照。

# 敵の歩行・テレポート0.29.7

[検証記録](VERIFY.json)。41面の140px歩行は0.875秒。旧0.45秒から約半分の速度へ調整。71面は元の場所に敵を残し、青い転移弾が届いてから移動する。

[PC飛翔](teleport-flight-1280.png)／[PC到着](teleport-arrival-1280.png)／[小画面飛翔](teleport-flight-568.png)／[小画面到着](teleport-arrival-568.png)。本編コントローラと描画による画像。

30/120fps・Workerあり／なし・実発射から敵歩行／転移と次の自機操作・ポーズ・離脱・自機転移・序盤の旧微移動を確認。通常RAFでも約1.33秒で転移と到着の余韻を完了。生成物153件は一致。音源・実機は未確認。mainマージ・公開は別工程。
