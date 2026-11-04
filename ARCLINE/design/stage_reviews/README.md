# ARCLINE ステージ比較ページの追記手順

**[共通比較HTML](map_review_gallery.html)** は表示テンプレートとして固定。ページ内にマップデータを同梱するため、閲覧時の外部JSON読み込みは不要です。

## 追記はJSONの1件追加＋1コマンド

1. 現在の[画面データ](map_review_gallery_data.json)を開く。`stages`配列末尾へ**新しいステージの1件**を追記する。その後、次の生成コマンドを実行すると共通HTMLへ反映され、ステージ選択と前後移動が自動更新される。
2. **HTMLへのデータ埋め込みを生成**：リポジトリのルートから `python3 ARCLINE/design/stage_reviews/build_gallery_html.py` を実行。確認は同じコマンドに `--check` を付ける。HTMLの見た目やJavaScriptを手動修正しない。コミットにはJSONと生成済HTMLの両方を含める。
3. ステージの詳細設計は`stage_XXX_review_v1.md`、位置・床座標・既存との比較用資料は`stage_XXX_proposal_v1.json`に保存。HTML中には説明を書き込まない。
4. [100面進行台帳](../stage_map_design_register_v1.json)で該当面をレビュー待ちにする。ユーザーの「OK」後に**データ中の`state`を`approved`へ変更**し、台帳も設計承認済みにする。ゲームには反映しない。

必要な記述の雛形（`stages`配列内の1件）：

```json
{
  "stage": 4,
  "title": "面の名称",
  "state": "pending",
  "headline": "一文で変更内容",
  "why": "一文で遊びの意図",
  "preserved": "変えない重要な点",
  "goal": "提案する学習目標",
  "before": {
    "width": 1000,
    "floor": [[0, 10], [100, 10]],
    "parts": [],
    "features": [],
    "player": {"x": 18, "h": 10},
    "enemy": {"x": 60, "h": 10},
    "pickups": []
  },
  "after": {
    "width": 1000,
    "floor": [[0, 10], [100, 10]],
    "parts": [],
    "features": [],
    "player": {"x": 18, "h": 10},
    "enemy": {"x": 60, "h": 10},
    "pickups": []
  },
  "detail": "stage_004_review_v1.md",
  "source": "stage_004_proposal_v1.json"
}
```

`before`は現行ゲームのマップ座標、`after`はデザインガイドから再設計した新規案。**既存図を少しずつ修正する前提ではない**。導入帯は意図的に現状維持・小変更も選べる。`parts`は`{"kind":"island|roof|wall","poly":[[x,h],...]}`、`features`は`{"type":"C|F|U|V|M|K|T|W","v":[...]}`のように保持。地形が分離する場合は`floors`で複数の床区間を指定できる。島上開始は`player.h`／`enemy.h`を明示する。

**表示について**：共通HTMLは生成時にJSONを**HTMLファイル自身へ内蔵**するため、閲覧時の `fetch` / CORS / JSON公開状態に依存しない。GitHub Pagesと、端末に保存したローカルHTMLの両方で表示できる。 `#stage-003` のようなリンクで面を直接選択。初期表示は未承認の面を優先する。

**承認状態の正本**は進行台帳。HTMLの承認ラベルと一致させる。ステージを一括で作らず、確認待ちの1面だけを追加・修正する。

**設計方針**：[難易度と体験に基づく1面ずつの設計](../stage_by_stage_map_design_policy_v1.md)。敵の命中圧・ダメージ・HP・手数と整合し、新しい地形／射線／敵の居場所を独立して設計する。ユーザーの指定により、マップ設計時の自動対戦シミュレーションは不要。実ゲームの変更は別工程。

## 2026-11-04の進行例

- **1〜3面：設計承認済み**。
- **4〜9面：番号順に6つの設計資料を作成済み、9面まで終わってからまとめてレビュー待ち**。未承認なので画面データでは`state: "pending"`。
- [4〜9面の比較を始める](map_review_gallery.html#stage-004)。9面まで確認し、修正指摘があれば対象面だけ直す。10面は確認後に着手する。
- ギミックの作用や敵からの命中を証明したわけではない。今回の工程ではシミュレーションを行わない。

## 読込エラー修正（2026-11-04）

以前のHTMLはページ表示時にJSONへ `fetch` を行い、環境によって `Failed to fetch` が発生したため廃止。現在は[1〜9面のデータ](map_review_gallery_data.json)を[HTML](map_review_gallery.html)へ埋め込んだ**自己完結型の比較画面**。将来はJSONへ1件追加して[ビルドスクリプト](build_gallery_html.py)を一度実行するだけで更新できる。HTML内データとJSONの同期は `python3 ARCLINE/design/stage_reviews/build_gallery_html.py --check` で確認できる。
