# ラスボス固有技 0.31.1：PR142統合後の検証

基準main `aba82d3`（0.31.0）。追加質問へのユーザー回答「終極砲の照射ターンだけ移動せず、予告線を固定する」を反映した。[設計](../../docs/releases/0.31.1.md)、[選択計画](../../verification-plan.json)、[ソースと結果](VERIFY.json)。

## 結果

| 対象 | 結果 | 記録 |
|---|---|---|
| final-projectiles | 成功。単発と合計上限、低軌道の補完、射線の手前・奥・幅境界、防御と30/120fpsのHP・音、固定予告・合法転移・再挑戦、実照射だけの移動停止と回数／待ち時間、残像による大技延期、最新mainの限定差分保護 | [JSON](unit/FINAL_PROJECTILES_UNIT.json) |
| final-attacks / special-self-damage | 成功。通常25・固有の上限と周期・交代、全機の必殺自傷軽減を保持 | [最終技](unit/FINAL_ATTACKS.json) / [自傷](unit/SPECIAL_SELF_DAMAGE.json) |
| attack-motion / map-atlas | 成功。個別時計と共有総覧 | [ログ](unit/attack-motion.log) / [ログ](unit/map-atlas.log) |
| boss-motion | 成功。PR142の通常手番・移動／転移・残像・低HP上限・交代・再挑戦を保持 | [JSON](unit/BOSS_MOTION.json) |
| final-projectiles-browser | 成功。8条件の実Controller・Worker／非Worker・両ARC前置き・最大歩行・合法転移・日英・PC／小画面・動きを減らす設定・ポーズ・次入力。共有確認HTML各3技と重界砲4条件のWorker一致 | [JSON](browser/FINAL_PROJECTILES_BROWSER.json) |
| final-retry-browser / boss-motion-browser | 成功。既存の再挑戦と、実際のボス転移・残像発砲・同じ敵手番の本体行動・入力復帰 | [再挑戦](browser/FINAL_RETRY_BROWSER.json) / [ボス移動](browser/BOSS_MOTION_BROWSER.json) |
| 生成物 | 155件成功。隔離した2回の再生成で一致・安定 | [JSON](GENERATED.json) |
| 現行版の最終戦 | Normal47行動・残HP24.5、Hard46行動・残HP49.5。各seed4697、全10機の担当量を達成 | [再生結果](NATIVE_REPLAY.json) / [Normal](matches/100-normal-clean-gun-4697.json) / [Hard](matches/100-hard-clean-gun-4697.json) |

[単体6スイート](unit/SUITE_UNIT.json)、[ブラウザ3スイート](browser/SUITE_BROWSER.json)。旧Rico等の歴史的な全ソース固定は、PR142がすでにソースを変更したため今回の完了条件にしない。代わりに0.31.0のgeometry・boss-actions・game・HP・保存等をそのまま保持し、物理・敵AI等は今回の許可差分だけを逆適用して全バイトを比較する。

## 再現と限界

```sh
ARCLINE_EVIDENCE_DIR=/tmp/arcline-final-0311 node ARCLINE/game/tools/test.cjs unit final-projectiles final-attacks special-self-damage attack-motion map-atlas boss-motion --fail-fast
ARCLINE_EVIDENCE_DIR=/tmp/arcline-final-0311 node ARCLINE/game/tools/test.cjs browser final-projectiles-browser final-retry-browser boss-motion-browser --skip-aac-probe --fail-fast
python3 ARCLINE/game/tools/check_generated.py --output /tmp/arcline-final-0311/GENERATED.json
node ARCLINE/evidence/final-projectiles-0311/replay-native.cjs
```

ビーム単体のブラウザ8条件は既存の移動予算を消費済みにした境界フィクスチャで、確定した射線・時間・回避を分離して検査する。移動との接続は専用の単体検査、既存boss-motion検査、実際の移動・残像を含む最終戦で別途確認した。NativeReplayは記録された合法入力を現行エンジンで再生し、探索器は不要。照準は最適化しており、1seedずつの結果を人間の勝率や難易度の一般則と扱わない。

[砲口の集光](browser/muzzle-charge-1200-1-stay-worker-no-preference.png)と[点線](browser/charge-warning-1200-1-stay-worker-no-preference.png)を保存した。形状と時計が共通の[通常速度動画（無音）](../final-speed-preview-20261109/finale-fire-preview.mp4)は再利用。物理端末と実音声の再生は未確認。

[0.30.5候補の結果](../final-projectiles-0305/README.md)は統合前の履歴であり、この結果と混同しない。CIはPR143の統合後コミットで確認する。マージ・配信・公開URL確認は別工程。
