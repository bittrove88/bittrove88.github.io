# ラスボス固有技 0.30.5 の検証

基準main `a2234ed`（PR141まで）。具体的な設計・動画と射線全体判定の提示後、ユーザーの「進めて」を受けて本検証した。[設計・完了条件](../../docs/releases/0.30.5.md)、[選択計画](../../verification-plan.json)、[ソースと結果](VERIFY.json)。

## ローカル結果

| 対象 | 結果 | 記録 |
|---|---|---|
| final-projectiles | 成功。星環砲の部分命中と上限32、重界砲の3配置と屋根の再探索、終極砲の射線全体・防御・30/120fps・HP/音・予告・転移・再挑戦、先行mainの保護 | [JSON](unit/FINAL_PROJECTILES_UNIT.json) |
| final-attacks | 成功。既存の最終技、通常25、固有の上限・防御・周期・機体交代 | [JSON](unit/FINAL_ATTACKS.json) |
| rico-direction / special-self-damage | 成功。共有物理のリコ反射と必殺自傷軽減を保持 | [リコ](unit/RICO_DIRECTION.json) / [自傷](unit/SPECIAL_SELF_DAMAGE.json) |
| attack-motion / map-atlas | 成功。既存の個別時計と総覧の共有実装 | [ログ](unit/attack-motion.log) / [ログ](unit/map-atlas.log) |
| final-projectiles-browser | 成功。8条件の実Controller、両ARC前置き、最大歩行と左右合法転移、日英・PC/小画面・Worker/非Worker・動きを減らす設定、ポーズ、HPと次入力。通常／単体確認HTML各3技と重界砲4条件のWorker一致 | [JSON](browser/FINAL_PROJECTILES_BROWSER.json) |
| final-retry-browser | 成功。3画面サイズ・4出撃位置で既存の機体別再挑戦と持ち物・戦場・保存を維持 | [JSON](browser/FINAL_RETRY_BROWSER.json) |
| 生成物 | 155件成功。隔離した2回の再生成で一致・安定、作業元を変更しない | [JSON](GENERATED.json) |
| 現行版の最終戦2対戦 | Normal/Hard各seed4697。合法操作で全10機の担当量を達成し、各41行動で勝利。ガンは終極砲38を受け、残りHP62 | [再生結果](NATIVE_REPLAY.json) / [Normal](matches/100-normal-clean-gun-4697.json) / [Hard](matches/100-hard-clean-gun-4697.json) |

単体は[6スイートの実行結果](unit/SUITE_UNIT.json)。ブラウザは重界砲の隣接修正後にfinal-projectiles-browserを再実行したため、[最後の実行一覧](browser/SUITE_BROWSER.json)にはその1件を記録し、既存の再挑戦の結果は独立したJSONとログで保持する。再挑戦専用のシナリオは変更した照準分岐を実行しないため、成功済みの結果を再利用した。

## 修正前後の再現

[再現結果](REGRESSIONS.json)。チャージのない出撃時記録へ同じ状態を復元すると、修正前は古いチャージが残り、修正後は消える。屋根の低軌道は修正前45度・出力65で0、限定再探索後50度・出力57で36。ボスをまたぐ位置変更でも固定した発射方向と初期軌跡を保つ。

## 再現と制限

```sh
ARCLINE_EVIDENCE_DIR=/tmp/arcline-final-0305 node ARCLINE/game/tools/test.cjs unit final-projectiles final-attacks rico-direction special-self-damage attack-motion map-atlas --fail-fast
ARCLINE_EVIDENCE_DIR=/tmp/arcline-final-0305 node ARCLINE/game/tools/test.cjs browser final-projectiles-browser final-retry-browser --skip-aac-probe --fail-fast
python3 ARCLINE/game/tools/check_generated.py --output /tmp/arcline-final-0305/GENERATED.json
node ARCLINE/evidence/final-projectiles-0305/replay-native.cjs
```

対戦の照準は最適化した候補を使い、全操作・反撃を現行エンジンで解決した。記録済みの操作列は上のスクリプトで外部の探索器なしに再生できる。2条件の結果を人間の勝率として扱わない。射線の幾何境界や屋根が残る静的配置の確認を、合法な移動・実戦勝利の証拠と混同しない。

演出の形と0.5秒／0.3秒の時計が変わらないため、通常速度の[無音動画](../final-speed-preview-20261109/finale-fire-preview.mp4)を再利用する。[砲口の集光](browser/muzzle-charge-1200-1-stay-worker-no-preference.png)と[予告](browser/charge-warning-1200-1-stay-worker-no-preference.png)も保存した。物理端末・実音声再生・無関係な全100面攻略は未実施。

CIはPRの対象コミットで別途確認する。ローカル成功はマージ・配信・公開URL確認を意味しない。
