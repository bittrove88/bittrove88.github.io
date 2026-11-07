# ARCLINE｜マップ設計・改修資料

現在の設計判断は[1〜100面を通したマップデザインの考え方](../MAP_DESIGN_PRINCIPLES_001_100.md)を参照。[0.24.0](../../docs/releases/0.24.0.md)で51〜99面を統合し、[0.24.1](../../docs/releases/0.24.1.md)で17・33・36・39・47面の承認済み改訂を統合した。[5面の設計レビュー](idea_refinement_20261107/README.md)／[5面の採用記録](STAGES_IDEA_REFINEMENT_APPROVED_RUNTIME.json)。

以下は**PR #74時点の履歴**。「未承認」「未実装」「残る検証」や実行コマンドは当時の範囲を表し、現在の全件再検証・旧条件への巻戻しを指示するものではない。

## PR #74 マップ設計・改修資料

当時の入口は[レビュー対応記録](PR74_REVIEW_REVISION.md)。25面を個別改修し、残る24面は骨格を維持。全49案が未承認・ゲーム未実装だった。

[各面の一覧](STAGES_051_099_DESIGN_REVIEW.md)／[比較画面・実入力手順](map_review_gallery.html#stage-051)／[隣接面の同縮尺比較](adjacent_geometry_review.html)

比較画面では、現行ゲーム・前案との同縮尺比較、個別破壊D-IDと固定F-ID、開口、周期、極性、条件付き単発例を切り替える。「実入力を確認」では、破壊・端子・歩行・転移・射撃を一操作ずつ進め、実際の操作前と操作直後を並べる。敵攻撃・任意歩行を省いた入力検査と、反撃込みの対戦検査は別。

## 正本と生成

座標・射点・設計意図は各面の最新 `stage_XXX_proposal_vN.json`。表示対象と最新ファイルは `map_review_gallery_data.json` に記録。旧版は履歴として残す。生成HTMLを直接編集しない。

```sh
node ARCLINE/design/stage_reviews/sync_review_units.cjs
node ARCLINE/design/stage_reviews/check_051_099_static.cjs
node ARCLINE/design/stage_reviews/probe_051_099_shots.cjs
node ARCLINE/design/stage_reviews/replay_051_099_actions.cjs
node ARCLINE/design/stage_reviews/validate_action_replays.cjs
node ARCLINE/design/stage_reviews/probe_pr74_geometry.cjs
node ARCLINE/design/stage_reviews/probe_pr74_combat.cjs
node ARCLINE/design/stage_reviews/assemble_pr74_revision.cjs
python3 ARCLINE/design/stage_reviews/build_gallery_html.py
python3 ARCLINE/design/stage_reviews/build_gallery_html.py --check
node ARCLINE/design/stage_reviews/build_adjacent_gallery.cjs /tmp/arcline-pr74-review
```

実行はリポジトリのルートから。ブラウザ生成にはPlaywrightとChromiumが必要。単発・入力探索に開始面と終了面を渡すと、その範囲だけ再検査して他面の結果を保持する。物理条件の照合値が古い記録は組立時に拒否する。入力証跡は保存した入力を新しい状態から再実行し、発射位置と着地まで照合する。

旧 `assemble_051_099_review.cjs` は初稿時の組立スクリプトで、現在は使用しない。添付資料の原本は再配布しない。ゲーム本体・在庫・AI・セーブ・1〜50面・100面は変更しない。

## 残る検証

全件の反撃込み攻略、敵自律転移、全キャラ・全seed・実機・最終受入れは未検証。60面の低所ルートで未完了となったseedも対戦ログに残す。検証項目を広げ続けて改修完了を止めず、PRへ引き継ぐ。
