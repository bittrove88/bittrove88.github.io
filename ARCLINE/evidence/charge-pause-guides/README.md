# 0.7.4 操作・一時停止・射線の検証

基準：0.7.3、`26db1d8e12a75617def49639d820583fa9c8b4f8`。次のキャラ性能・スキル実装には進めず、操作と表示を修正した。

## 修正済み

- 発射ボタンの外へ指をずらして離すとキャンセル。中へ戻すと発射できる。キャンセルで武器・スキル・行動数を消費せず、チャージ前の威力へ戻る。通常射撃・転移弾、左右の操作配置に対応。PCはEscでキャンセルでき、後からSpaceを離しても発射しない。
- 一時停止は「ゲームに戻る」、全画面、言語、操作側切替、「この面をやり直す」「タイトルへ戻る」を表示。やり直しと退出には確認を挟み、取消／Escは一時停止へ戻る。やり直しは面入口の在庫と乱数種を復元する。
- 小さい横画面でもメニューの全操作がスクロールなしで見える。設定中も対戦を停止。Tabの移動をメニュー内に収め、全画面非対応の案内を閉じると元のボタンへ戻す。
- 3モードの射線を待機中・チャージ中とも丸い点線へ統一。イージーは全軌道、ノーマルは弧長の半分。ハードは砲口から48論理pxの方向だけを示し、威力・着弾地点・反射先・将来の曲線を示さない。

## 検証済み

基準版では、568×240／844×390で外へずらしてもキャンセルがfalseのまま、指を離すと発射された。[再現データ](REPRODUCED.json)と[修正前の小画面メニュー](pause-before-568.png)を記録した。

| 確認 | 結果 | 記録 |
|---|---|---|
| 実タッチ／マウスの取消・戻して発射、Esc、転移取消、2本指独立、メニュー全機能・在庫復元 | 245項目、5画面サイズ、左右配置、日英 | [CHARGE_PAUSE.json](CHARGE_PAUSE.json) |
| 半分の弧長、分裂の継承、ハードの48pxと威力独立、100面の状態不変 | 1,001項目 | [AIM_GUIDE.json](AIM_GUIDE.json) |
| 実Canvasの待機／チャージ中の点線、ハードの短い直線、保存、日英、予告・実弾・プレビュー | 154項目、7画面サイズ、21描画ケース | [DIFFICULTY_BROWSER.json](DIFFICULTY_BROWSER.json) |
| 章在庫・保存順序／実ブラウザーの取得・持ち越し・再挑戦 | 129／147項目 | [CHAPTER_STOCK.json](CHAPTER_STOCK.json)、[CHAPTER_STOCK_BROWSER.json](CHAPTER_STOCK_BROWSER.json) |
| 既存の物理・転移・破壊・プレビュー | 598項目 | [INTEGRATED.json](INTEGRATED.json) |
| 100面×8画面サイズ、2本指操作、高弾道カメラ | 3,267項目 | [BROWSER.json](BROWSER.json) |
| 回転・日英／ズーム復帰／全画面 | 57／179／13項目 | [ORIENTATION_I18N.json](ORIENTATION_I18N.json)、[VIEWPORT.json](VIEWPORT.json)、[FULLSCREEN.json](FULLSCREEN.json) |
| 紹介サイトと起動 | 229項目、5画面サイズ | [SERVICE_SITE.json](SERVICE_SITE.json) |

合計6,019項目。16配布ファイルは基準版とバイト一致し、100面・物理・武器効果・敵・機体描画・在庫／保存のモデルは維持した。[ソース比較](COMBAT_PRESERVATION.json)。配布23ファイルと新版への5起動リンクも確認した。[配布資産](BUNDLE_CHECK.json)、[全体記録](RELEASE_CHECK.json)。

画面：[修正後のメニュー](pause-ja-568.png)、[取消状態](charge-cancel.png)、[イージー](forecast-easy.png)、[ノーマル](forecast-normal.png)、[ハード](forecast-hard.png)。

## 未確認

物理的なiPhone／Androidでの操作感・性能、Safariの実機全画面／ホーム画面起動、人による難易度評価は未確認。今回新たな300戦の自動クリアは主張せず、対戦処理の維持はソース比較と上記の回帰検証で確認する。

旧床専用の描画テストには0.7.2基準版で再現した既存の失敗があり、合格数には含めない。[既存の失敗記録](../difficulty/HISTORICAL_RENDER_CHECK.json)。
