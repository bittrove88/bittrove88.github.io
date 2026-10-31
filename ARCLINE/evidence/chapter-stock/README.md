# 0.7.3 検証記録

基準コミット：`ddeb2c95042d51a623f406ccb1a44eea8e02de26`（0.7.2）。今回の反映範囲は章在庫と面入口の復元。

## 実装済み

- 武器取得でその種類を3発まで補充。武器3種類・スキル2種類、各残数3まで。満杯時は入れ替え／見送り。拾った武器は自動装備しない。
- 残数は次の面へ持ち越す。5・15・25…面も継続し、10・20・30…面のボス勝利でリセット。
- 面開始時の在庫・開始武器・乱数種・取得台帳を保存。敗北／中断は面入口に復元。既存の面別スキル補給は入場時に一度だけ加える。
- 勝利時に次面入口と残数をまとめて保存。保存失敗時は進行を止めて再保存する。
- 所有武器と外観の記録を保持。本編と練習の在庫を分離。章の最初から遊び直しても永久進行は消さない。
- 既存16配置のうち岩へ埋没していた8個の座標を補正。全16個に通常弾で届く経路を確認。新しい配置は追加していない。

## 検証済み

| 確認 | 結果 | 記録 |
|---|---|---|
| 在庫消費・補充・全10章の境界・入口復元・保存順序 | 129項目 | [CHAPTER_STOCK.json](CHAPTER_STOCK.json) |
| 実際のカプセル取得、制御した勝敗、持ち越し、練習分離、保存失敗、入れ替えUI | 147項目、5画面サイズ、日英 | [CHAPTER_STOCK_BROWSER.json](CHAPTER_STOCK_BROWSER.json) |
| 100面の地形・敵・予算の維持、全20武器の弾道比較、既存16配置、旧版の上書き防止 | 2,244項目 | [CHAPTER_STOCK_CONTENT.json](CHAPTER_STOCK_CONTENT.json) |
| 現行物理・転移・破壊・プレビュー等 | 598項目 | [INTEGRATED.json](INTEGRATED.json) |
| 射線3モード／実ブラウザー | 855／154項目 | [AIM_GUIDE.json](AIM_GUIDE.json)、[DIFFICULTY_BROWSER.json](DIFFICULTY_BROWSER.json) |
| 100面×8画面サイズ、実際の2本指操作、高弾道カメラ | 3,267項目 | [BROWSER.json](BROWSER.json) |
| 回転・日英／ズーム復帰／全画面 | 57／179／13項目 | [ORIENTATION_I18N.json](ORIENTATION_I18N.json)、[VIEWPORT.json](VIEWPORT.json)、[FULLSCREEN.json](FULLSCREEN.json) |
| キャラ選択・描画・300砲口姿勢 | 2,338項目 | [CHARACTERS.json](CHARACTERS.json) |
| 紹介サイト・日英・ダウンロード・ゲーム起動 | 229項目、5画面サイズ | [SERVICE_SITE.json](SERVICE_SITE.json) |
| 通常弾＋転移、実際の敵手番を含む100面×3種 | 300戦クリア | [CAMPAIGN_SUMMARY.json](CAMPAIGN_SUMMARY.json) |
| 配布資産と起動リンク | 23ファイル・5起動リンク | [BUNDLE_CHECK.json](BUNDLE_CHECK.json)、[RELEASE_CHECK.json](RELEASE_CHECK.json) |

弾道比較は100面×20武器に同じ角度・威力を与え、弾の経路・速度・接触・着弾・ダメージ・破壊・所要時間を比較したもの。移設で変わるアイテム接触イベントは比較対象から除外する。物理・地形計算・武器定義・キャラ描画・カメラ描画・射線・表示範囲・全画面の8モジュールは基準版とバイト一致。

ブラウザーの勝利テストには敵HPを小さくした制御場面を、敗北復元テストには結果の制御場面を使用する。300戦の自動プレイは通常HPと実際の敵の手番を使用し、機械探索で角度と威力を選ぶ。人の難易度評価とは区別する。

## 未確認・対象外

実機iPhone／Androidでの操作感・性能・ホーム画面インストール、YouTubeホスト接続、人による難易度評価、全到達状態の網羅は未確認。キャラ固有性能、新しいスキル効果、補給密度、中ボス、ボス再設計、物語は今回未反映。

旧床専用の描画テストは基準版でも失敗するため、今回の合格数に含めない。既存の記録：[HISTORICAL_RENDER_CHECK.json](../difficulty/HISTORICAL_RENDER_CHECK.json)。

画面例：[章の持ち物](chapter-lobby.png)、[小さい横画面の入れ替え](stock-choice-568.png)、[横画面の入れ替え](stock-choice-844.png)。
