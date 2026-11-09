# ARCLINE 0.30.0 HPと行動上限の検証

以下の244条件は統合前コミット5549959の履歴。先行PR132〜134の攻撃修正を取り込んだ現行判定は末尾の統合検査を参照。

ローカルのゲーム実装を検証。Normal・Easyの全100面、Hard代表16面、試射・照準修正・主攻略・低HP機の別経路を含む244条件で実際の発射と敵手番を進め、全条件が勝利した。中心を正確に狙う自動探索と固定seedの成立例で、人の勝率ではない。

- [確定設定](../../design/combat_balance.json)と[実装範囲](../../docs/releases/0.30.0.md)
- [全入力と敵手番](MATCHES.json)、[証拠の指紋](ACCEPTANCE.json)
- [全300初期化と保護検査](HP_ACTION_BALANCE.json)
- [選定15件の独立再生と実到着状態30件の再挑戦](HP_ACTION_NATIVE.json)
- [日英・全3難易度の画面、再挑戦、実Workerの手番交代](HP_ACTION_BROWSER.json)
- [154生成物の二重再生成](GENERATED.json)

最終戦のNormal/Hardは各機体HP100・担当150・20行動、Easyは各HP100・担当80・20行動。実対戦の正確な照準ではNormal/Hard各40行動、Easy20行動で完走。各機体の空撃ち2回を含むNormal/Easyは各60/40行動で勝利した。使用数は10機合計で、上限は機体ごとにリセットする。

91面は通常の固定射点では低HP機が耐久切れになる既存の懸念がある。同じHP140を維持し、実際に左へ140px・70px移動する別入力ではリコHP80とリンHP100がともに6行動・被弾なしで勝利した。全機体・全経路の保証ではない。

出撃順・再挑戦の画面検査は進行を作る直接状態設定を含む。これを実対戦の勝利件数へ混ぜていない。実対戦の到着状態からの再挑戦は別の30件を使用する。音声検査は省略。人の初見・通常速度の楽しさ・物理端末・本番配信は未確認。

## 先行マージ統合後の確認

main799287e（PR132・133・134）を保持して0.30.0へ統合。攻撃とダメージ計上を巻き戻さず、現在の実エンジンで代表15条件を再記録し、独立再生も成功。最終戦はEasy21行動・Normal/Hard41行動（10機合計）で勝利した。実到着状態30件の再挑戦・保存、全300初期化、日英6条件の画面・Worker手番とヒバリ光輪の回帰検査が成功。技・物理・敵AI・マスターモード・保存の保護ソースは最新mainと完全一致。

- [統合後の入力](INTEGRATED_MATCHES.json)／[到着状態](INTEGRATED_FINAL_ENTRIES.json)／[指紋](INTEGRATED_ACCEPTANCE.json)
- [初期化](INTEGRATED_HP_ACTION_BALANCE.json)／[実対戦と再挑戦](INTEGRATED_HP_ACTION_NATIVE.json)／[ブラウザ](INTEGRATED_HP_ACTION_BROWSER.json)
- [生成物一致](INTEGRATED_GENERATED.json)

旧244条件の全件再実行は行わず、先行修正が影響する代表対戦と最終戦を選定した。
