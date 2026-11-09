# 0.30.4 検証記録

ユーザーが「失敗時の武器・スキル復元」「上位難易度クリアの下位反映」の方針を合意し、「マージ直前まで」と指示。合意済み範囲の本検証として実施した。基準main `f3bce10`（PR138/140統合済み）、版数0.30.4。マージ・公開は行わない。

## ローカル結果

[受入結果と保護対象のSHA-256](ACCEPTANCE.json)／[実行計画](CHECK_PLAN.json)／[生成物155件の一致](GENERATED.json)。選択した8スイートが成功。成功済みの無関係な全件検査は追加していない。

| スイート | 結果 | 検査数 | 記録 |
| --- | --- | ---: | --- |
| retry-progress | PASS | 133 | [RETRY_PROGRESS.json](RETRY_PROGRESS.json) |
| chapter-stock | PASS | 113 | [CHAPTER_STOCK.json](CHAPTER_STOCK.json) |
| difficulty-balance | PASS | 127 | [DIFFICULTY_BALANCE.json](DIFFICULTY_BALANCE.json) |
| crew-supply | PASS | 50 | [CREW_SUPPLY_UNIT.json](CREW_SUPPLY_UNIT.json) |
| retry-progress-browser | PASS | 46 | [RETRY_PROGRESS_BROWSER.json](RETRY_PROGRESS_BROWSER.json) |
| difficulty-browser | PASS | 22 | [DIFFICULTY_BROWSER.json](DIFFICULTY_BROWSER.json) |
| final-retry-browser | PASS | 64 | [FINAL_RETRY_BROWSER.json](FINAL_RETRY_BROWSER.json) |
| charge-pause | PASS | 245 | [CHARGE_PAUSE.json](CHARGE_PAUSE.json) |

再現では旧mainの同じエンジン消費を使い、旧保存は消費後の在庫を保持、旧HardクリアはEasyへ反映されないことを確認。変更後は戦闘中の実残数を減らしたまま、再挑戦用保存を復元し、勝利時は実残数を確定する。

新規ブラウザ検査は1280×720日本語・568×240日本語・844×390英語。実Controllerの発射、実エンジンの武器/スキル消費、正式配置のカプセル取得、結果からのタップ、タイトル復帰、再読み込み、難易度切替と保存失敗を確認。終端HPを設定して `E.check`→本編結果→保存を検査するfixtureを含み、人の攻略・勝率の証拠とはしない。

旧セーブ初回補完・上位/下位の方向・下位の既存先行記録・モード別在庫/台帳/チェックポイント/既読/補充・マスターの選択モード編集・明示的全削除を検査。100面のキャラ別/先頭からの再挑戦も既存フローで成功した。最終戦の既存検査に残っていた旧HP70/行動28の期待値は、先行mainのHP100/行動20へ整合させた（ゲーム値は変更していない）。

## 画面確認

- [568×240・日本語の敗北結果](retry-loss-568-ja.png)：復元の説明と操作が画面内に収まることを目視。
- [Normalへ継承後の568×240](inherited-normal-568-ja.png)：Hardで2面クリア後、Normalも2面クリア済みとなり3面が開く。
- [844×390・英語の敗北結果](retry-loss-844-en.png)。

設定の保存/難易度説明、初回難易度選択、道具ガイドも日英で新仕様へ更新した。チャージ取り消し・ポーズ中の飛行停止を維持し、手動リトライとタイトル復帰では使用分を復元する。

## 保護・未確認・公開

物理・攻撃・敵AI・最終戦・地形・HP・取得配置など13正本が基準mainとバイト一致。保存キー・schema8/reset2を維持し、移行印だけを追加。以前の版で既に消費した分は履歴がないため遡及返却できない。

物理iPhone/Android、音源デコード、全100面攻略、本番の変更確認は対象外。生成物は2回の隔離再生成が一致し、検査による原本書き換えはない。PR・CIの最新状態はPR本文とGitHub Actionsで確認する。
