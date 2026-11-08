# ARCLINE 0.29.0 攻撃・個別モーションの検証

[制作判断と全体結果](../../docs/releases/0.29.0-attacks.md)／[通常速度の比較動画](motion-review.mp4)／[動作確認](../../game/attack-review/)／[単独HTML](../../game/attack-review/standalone.html)。本番未公開。

- `UNIT_SUITE.json`：42の単体・統合スイート。
- `GENERATED.json`：153生成物が再生成と一致し、2回目も安定。
- `APPROVED_MAP_REPLAY.json`：161対戦、663自機行動、505敵手番を同じ入力で再現。全99通常面、後半Hardを含む。
- `MATCHES.json`：攻撃改訂で入力を更新した32対戦。旧承認資料のファイルとハッシュは維持。
- `MACHINE_COMBAT.json`：10機×100面の安全配置、物理計画、消費・保存・移動など。
- `FINAL_BATTLE_UNIT.json`：Normal／Hardの固定10機リレー、4マップ、各100ダメージを実入力で再現。
- `ATTACK_REVIEW_BROWSER.json`：117項目を5時点ずつ描画。4画面幅、実地形の反射・遮蔽・隙間、最終4マップ、保存への非接続、13技のWorker一致、単独HTMLの追加通信なしを確認。
- `MOTION.json`：各技の物理時間、表示時間、選択した静止と判断理由。

動画は通常速度の描画記録。静止画だけでの評価と区別する。心地よさは数値で証明したとは扱わず、制作時の比較・修正内容を制作記録へ残し、確認用HTMLで通常速度と時間変化なしを比較できるようにする。物理実機・本番公開・GitHubでのCIは未確認。

## PR126統合後の確認

元の42／37スイートと32対戦の記録はPR125基準の検証として保持。最新main0.28.1を統合した結果と追加検証は `INTEGRATION_PR126.json`、統合後の入力は `MATCHES_PR126.json` に分離する。
