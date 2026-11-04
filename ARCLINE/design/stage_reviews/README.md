# ARCLINE｜個別マップ設計の比較資料

2026-11-05。現在のレビュー範囲は**51〜99面の49案**。1〜50面は0.23.0で実装済み、100面は既存専用最終戦を保護する。今回の座標は全49面とも未承認・ゲーム未実装。

[比較画面](map_review_gallery.html#stage-051)／[各面の設計一覧](STAGES_051_099_DESIGN_REVIEW.md)／[総集編との照合・難易度方針](../stage_051_099_compendium_review_v1.md)／[進行台帳](../stage_map_design_register_v1.md)

## 比較画面

HTML自身にデータを同梱し、閲覧時に外部JSONを取得しない。各面を選択し、左右を同じ縮尺で比較する。51〜60面では前案も比較元にできる。範囲選択で10面ずつ、最後は91〜99面を表示する。

- 「開口」で破壊前・主経路・別解を切り替える。D番号と境界は個別の破壊単位、F番号は固定部品。
- 弾道の射点を選び、周期・極性・開口を単発例の条件に合わせると、対応する実測弾道を金・紫の実線で示す。
- 青い点線は候補射点への移動構想。実際の転移弾の軌道ではない。
- 「図面を拡大」で両図を1600px以上に広げ、図の中だけを横スクロールする。
- 図は地形の設計断面。ゲームのスクリーンショットではない。

## 正本と版

`map_review_gallery_data.json`の`reviewScope`が表示対象。過去1〜15面のエントリーは履歴として保持。現在の51〜55面はv3、56〜60面はv2、61〜99面はv1の個別JSONとレビューを参照する。旧版は削除せず承認済みと取り違えない。

各面は独立して輪郭・位置関係・主攻略・別解を設計する。最新依頼は51〜99面の設計なので、1面の承認を待って後続の設計を止めない。座標の承認と実装は別工程。

## 検査と生成

リポジトリのルートで実行する。単発探索は固定敵への通常弾だけを扱い、自動対戦ではない。全49面を再検査するとき、単発探索の範囲引数は省略する。範囲指定の探索は結果ファイルを部分集合で上書きするため、最終成果物に使わない。

```sh
node ARCLINE/design/stage_reviews/check_051_099_static.cjs
node ARCLINE/design/stage_reviews/probe_051_099_shots.cjs
node ARCLINE/design/stage_reviews/assemble_051_099_review.cjs
python3 ARCLINE/design/stage_reviews/build_gallery_html.py
python3 ARCLINE/design/stage_reviews/build_gallery_html.py --check
node ARCLINE/design/stage_reviews/check_051_099_display.cjs /tmp/arcline-map-review-051-099
```

物理に関わる座標・射点・開口条件の照合値を静的検査と単発記録に持たせ、古い記録の組合せを拒否する。組立スクリプトは既存の個別設計へ証拠と表示用データを加えるもので、地形の一括生成器ではない。

比較HTMLはテンプレートとJSONから生成する。通常の面更新はJSONと個別設計を編集し、生成済HTMLを直接修正しない。生成物も保存する。端末幅の検査にはPlaywrightとChromiumが必要。

## 未検証の扱い

[静的検査](STAGES_051_099_STATIC_CHECK.json)、[単発弾道](STAGES_051_099_SHOT_PROBE.json)、[ギミック監査](STAGES_051_099_GIMMICK_AUDIT.json)、[表示検査](STAGES_051_099_DISPLAY_CHECK.json)を分ける。

実移動・転移入力、端子の実操作、破壊して到達する全行程、敵の反撃・徒歩・自律転移、手数内クリア、全キャラ・複数seed・実機確認は未検証。単発例の開口と極性は設定済みの条件であり、準備手順の実証ではない。最終受入れを合格扱いしない。

旧1〜9面の運用や51〜60面のみの進捗はGit履歴と旧レビューに保持。現在の承認状態は進行台帳を参照する。
