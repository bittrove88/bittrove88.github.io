# PR #74 制作途中マップの参照インデックス（51〜99面）

> **履歴・参考資料（2026-11-06で作業指示として失効）**：本書は過去のレビューや制作経緯を記録するものです。**現在の制作手順・順番・ギミックの採否・品質の合否は [唯一の作業仕様書](ARCLINE_MAP_DESIGN_SINGLE_SOURCE_OF_TRUTH_20261106.md) を正本**とし、本書と矛盾する指示や構想例は実行しないでください。既承認版の状態も正本とGitHubの承認記録を確認してください。


**必読：** この一覧は、**今回レビューした制作途中のマップを見失わないためのリンク表**です。各ファイルは [PR #74](https://github.com/bittrove88/bittrove88.github.io/pull/74) の基準コミット `9a58a777fd9582557102d38285db6c959accf9c1` から取得した **各ステージの最新改訂版**です。旧版ではなくこの一覧にリンクしたものを、まず確認してください。

**参照の順序：** ① この一覧の「最新案JSON」と「個別レビュー」、② [同じPRに収録された全49面の設計一覧](STAGES_051_099_DESIGN_REVIEW.md) と [比較画面](map_review_gallery.html)、③ [今回の追加レビューと改修判定](STAGE_051_099_REDESIGN_BRIEFS_20261105.md)、④ 実ゲームの実装データ・画面。**①の制作途中案は検討のベース、④はゲームに何を実装できるか確認する技術上のベースです。**

**重要な違い：** PRの各 `proposal` は **未承認・ゲーム未実装の設計候補**です。これをそのままランタイムにコピーすることが今回の依頼ではありません。一方で、PRの案を見ずに「mainの現行マップだけから新規作成」するのも誤りです。**制作途中案の地形、狙う攻略、ギミック、ユーザー指摘の問題を全部確認し、残す価値のあるものを積極的に活かしてください。** R対象だけは、使える要素を特定したうえで、攻略を成立させるため必要なら形状をゼロから再設計します。

**旧版と失敗試作：** 各面の `v1` や旧 `vN` は変更履歴の参照用です。57面v4、58面v4、59面v3/v4のアーカイブ試作はこの表の対象に含めず、**図形や座標を実装へ転用しません**。ただし「57の崖肩の射線」「58の破壊なし移動」「59のF04からの射線と下部の通路」というユーザーの目的は[個別改修ブリーフ](STAGE_051_099_REDESIGN_BRIEFS_20261105.md)に引き継いでいます。

## 現在の作業順・レビュー対象（2026-11-06 75面品質見直し中）

**最新の状態は [75面品質劣化監査](STAGE_075_QUALITY_REGRESSION_AUDIT_20261106.md)と[65〜72面の承認監査](STAGE_065_072_APPROVAL_AND_DIVERSITY_AUDIT_20261106.md)を正とする。** 65v3・66v4・67v4・69v2・71v5・**72v4**の6面が**設計承認済み・動作未検証**（PR #78/#79/#80/#81/#83/#84）。表の各JSON／レビューは**PR #74時点の未承認旧案**であり、直近の採用版の一覧ではない。

**75面v3／PR #85はユーザーが承認せず、別の構築担当への再委託方針が決まった。** 新担当は[独立再構築の引継ぎ仕様](STAGE_075_NEW_BUILDER_HANDOFF_20261106.md)を先に読む。 次の担当は75面の全体構造・造形・攻略の読みやすさから見直し、局所修正の積み重ねを避ける。新規の作業ベースは**承認済み72面v4／PR #84**（`design/arcline-stage072-open-fault-flank-v4-20261106`）。72面の旧却下v2/v3／PR #82や、75面v3／PR #85を正本として取り込まない。

**今回の参照：** [PR #74の75面元案](stage_075_proposal_v1.json)／[75面元レビュー](stage_075_review_v1.md)／[75面v3の現在の候補](https://github.com/bittrove88/bittrove88.github.io/pull/85)／[75面品質監査](STAGE_075_QUALITY_REGRESSION_AUDIT_20261106.md)。

**現在の着手順：新担当による75面の独立再設計 → ユーザー承認 → 76 → 78 → 79 → 81 → 82 → 87 → 89**。以降S・K群の残面を進める。1面ずつ承認を得るが、弾道・歩行・敵AI・実戦の最終動作検証は全49面の設計承認後。

**99面について：** ユーザーの新しいマップアイデアにより、従来のK（保持・局所調整）を**S（大幅構造改修）**に変更。下表のPR #74案・旧レビューは歴史的な入力であり、99面の制作時は**[新しい個別改訂レビュー](STAGE_099_NEW_CONCEPT_REVIEW_20261106.md)**を優先して読む。

## 1. 全49面の制作途中の最新案と個別レビュー

| 面 | PR #74の最新座標案（現時点の検討基準） | これまでの個別レビュー | 比較画面 |
|---:|---|---|---|
| 51 | [最新案 `stage_051_proposal_v3.json`](stage_051_proposal_v3.json) | [個別レビュー `stage_051_review_v3.md`](stage_051_review_v3.md) | [マップ表示](map_review_gallery.html#stage-051) |
| 52 | [最新案 `stage_052_proposal_v4.json`](stage_052_proposal_v4.json) | [個別レビュー `stage_052_review_v4.md`](stage_052_review_v4.md) | [マップ表示](map_review_gallery.html#stage-052) |
| 53 | [最新案 `stage_053_proposal_v3.json`](stage_053_proposal_v3.json) | [個別レビュー `stage_053_review_v3.md`](stage_053_review_v3.md) | [マップ表示](map_review_gallery.html#stage-053) |
| 54 | [最新案 `stage_054_proposal_v3.json`](stage_054_proposal_v3.json) | [個別レビュー `stage_054_review_v3.md`](stage_054_review_v3.md) | [マップ表示](map_review_gallery.html#stage-054) |
| 55 | [最新案 `stage_055_proposal_v3.json`](stage_055_proposal_v3.json) | [個別レビュー `stage_055_review_v3.md`](stage_055_review_v3.md) | [マップ表示](map_review_gallery.html#stage-055) |
| 56 | [最新案 `stage_056_proposal_v2.json`](stage_056_proposal_v2.json) | [個別レビュー `stage_056_review_v2.md`](stage_056_review_v2.md) | [マップ表示](map_review_gallery.html#stage-056) |
| 57 | [最新案 `stage_057_proposal_v3.json`](stage_057_proposal_v3.json) | [個別レビュー `stage_057_review_v3.md`](stage_057_review_v3.md) | [マップ表示](map_review_gallery.html#stage-057) |
| 58 | [最新案 `stage_058_proposal_v3.json`](stage_058_proposal_v3.json) | [個別レビュー `stage_058_review_v3.md`](stage_058_review_v3.md) | [マップ表示](map_review_gallery.html#stage-058) |
| 59 | [最新案 `stage_059_proposal_v2.json`](stage_059_proposal_v2.json) | [個別レビュー `stage_059_review_v2.md`](stage_059_review_v2.md) | [マップ表示](map_review_gallery.html#stage-059) |
| 60 | [最新案 `stage_060_proposal_v3.json`](stage_060_proposal_v3.json) | [個別レビュー `stage_060_review_v3.md`](stage_060_review_v3.md) | [マップ表示](map_review_gallery.html#stage-060) |
| 61 | [最新案 `stage_061_proposal_v1.json`](stage_061_proposal_v1.json) | [個別レビュー `stage_061_review_v1.md`](stage_061_review_v1.md) | [マップ表示](map_review_gallery.html#stage-061) |
| 62 | [最新案 `stage_062_proposal_v1.json`](stage_062_proposal_v1.json) | [個別レビュー `stage_062_review_v1.md`](stage_062_review_v1.md) | [マップ表示](map_review_gallery.html#stage-062) |
| 63 | [最新案 `stage_063_proposal_v1.json`](stage_063_proposal_v1.json) | [個別レビュー `stage_063_review_v1.md`](stage_063_review_v1.md) | [マップ表示](map_review_gallery.html#stage-063) |
| 64 | [最新案 `stage_064_proposal_v2.json`](stage_064_proposal_v2.json) | [個別レビュー `stage_064_review_v2.md`](stage_064_review_v2.md) | [マップ表示](map_review_gallery.html#stage-064) |
| 65 | [最新案 `stage_065_proposal_v2.json`](stage_065_proposal_v2.json) | [個別レビュー `stage_065_review_v2.md`](stage_065_review_v2.md) | [マップ表示](map_review_gallery.html#stage-065) |
| 66 | [最新案 `stage_066_proposal_v1.json`](stage_066_proposal_v1.json) | [個別レビュー `stage_066_review_v1.md`](stage_066_review_v1.md) | [マップ表示](map_review_gallery.html#stage-066) |
| 67 | [最新案 `stage_067_proposal_v2.json`](stage_067_proposal_v2.json) | [個別レビュー `stage_067_review_v2.md`](stage_067_review_v2.md) | [マップ表示](map_review_gallery.html#stage-067) |
| 68 | [最新案 `stage_068_proposal_v1.json`](stage_068_proposal_v1.json) | [個別レビュー `stage_068_review_v1.md`](stage_068_review_v1.md) | [マップ表示](map_review_gallery.html#stage-068) |
| 69 | [最新案 `stage_069_proposal_v1.json`](stage_069_proposal_v1.json) | [個別レビュー `stage_069_review_v1.md`](stage_069_review_v1.md) | [マップ表示](map_review_gallery.html#stage-069) |
| 70 | [最新案 `stage_070_proposal_v2.json`](stage_070_proposal_v2.json) | [個別レビュー `stage_070_review_v2.md`](stage_070_review_v2.md) | [マップ表示](map_review_gallery.html#stage-070) |
| 71 | [最新案 `stage_071_proposal_v2.json`](stage_071_proposal_v2.json) | [個別レビュー `stage_071_review_v2.md`](stage_071_review_v2.md) | [マップ表示](map_review_gallery.html#stage-071) |
| 72 | [最新案 `stage_072_proposal_v1.json`](stage_072_proposal_v1.json) | [個別レビュー `stage_072_review_v1.md`](stage_072_review_v1.md) | [マップ表示](map_review_gallery.html#stage-072) |
| 73 | [最新案 `stage_073_proposal_v1.json`](stage_073_proposal_v1.json) | [個別レビュー `stage_073_review_v1.md`](stage_073_review_v1.md) | [マップ表示](map_review_gallery.html#stage-073) |
| 74 | [最新案 `stage_074_proposal_v2.json`](stage_074_proposal_v2.json) | [個別レビュー `stage_074_review_v2.md`](stage_074_review_v2.md) | [マップ表示](map_review_gallery.html#stage-074) |
| 75 | [最新案 `stage_075_proposal_v1.json`](stage_075_proposal_v1.json) | [個別レビュー `stage_075_review_v1.md`](stage_075_review_v1.md) | [マップ表示](map_review_gallery.html#stage-075) |
| 76 | [最新案 `stage_076_proposal_v2.json`](stage_076_proposal_v2.json) | [個別レビュー `stage_076_review_v2.md`](stage_076_review_v2.md) | [マップ表示](map_review_gallery.html#stage-076) |
| 77 | [最新案 `stage_077_proposal_v2.json`](stage_077_proposal_v2.json) | [個別レビュー `stage_077_review_v2.md`](stage_077_review_v2.md) | [マップ表示](map_review_gallery.html#stage-077) |
| 78 | [最新案 `stage_078_proposal_v1.json`](stage_078_proposal_v1.json) | [個別レビュー `stage_078_review_v1.md`](stage_078_review_v1.md) | [マップ表示](map_review_gallery.html#stage-078) |
| 79 | [最新案 `stage_079_proposal_v1.json`](stage_079_proposal_v1.json) | [個別レビュー `stage_079_review_v1.md`](stage_079_review_v1.md) | [マップ表示](map_review_gallery.html#stage-079) |
| 80 | [最新案 `stage_080_proposal_v1.json`](stage_080_proposal_v1.json) | [個別レビュー `stage_080_review_v1.md`](stage_080_review_v1.md) | [マップ表示](map_review_gallery.html#stage-080) |
| 81 | [最新案 `stage_081_proposal_v1.json`](stage_081_proposal_v1.json) | [個別レビュー `stage_081_review_v1.md`](stage_081_review_v1.md) | [マップ表示](map_review_gallery.html#stage-081) |
| 82 | [最新案 `stage_082_proposal_v1.json`](stage_082_proposal_v1.json) | [個別レビュー `stage_082_review_v1.md`](stage_082_review_v1.md) | [マップ表示](map_review_gallery.html#stage-082) |
| 83 | [最新案 `stage_083_proposal_v1.json`](stage_083_proposal_v1.json) | [個別レビュー `stage_083_review_v1.md`](stage_083_review_v1.md) | [マップ表示](map_review_gallery.html#stage-083) |
| 84 | [最新案 `stage_084_proposal_v2.json`](stage_084_proposal_v2.json) | [個別レビュー `stage_084_review_v2.md`](stage_084_review_v2.md) | [マップ表示](map_review_gallery.html#stage-084) |
| 85 | [最新案 `stage_085_proposal_v1.json`](stage_085_proposal_v1.json) | [個別レビュー `stage_085_review_v1.md`](stage_085_review_v1.md) | [マップ表示](map_review_gallery.html#stage-085) |
| 86 | [最新案 `stage_086_proposal_v2.json`](stage_086_proposal_v2.json) | [個別レビュー `stage_086_review_v2.md`](stage_086_review_v2.md) | [マップ表示](map_review_gallery.html#stage-086) |
| 87 | [最新案 `stage_087_proposal_v1.json`](stage_087_proposal_v1.json) | [個別レビュー `stage_087_review_v1.md`](stage_087_review_v1.md) | [マップ表示](map_review_gallery.html#stage-087) |
| 88 | [最新案 `stage_088_proposal_v2.json`](stage_088_proposal_v2.json) | [個別レビュー `stage_088_review_v2.md`](stage_088_review_v2.md) | [マップ表示](map_review_gallery.html#stage-088) |
| 89 | [最新案 `stage_089_proposal_v1.json`](stage_089_proposal_v1.json) | [個別レビュー `stage_089_review_v1.md`](stage_089_review_v1.md) | [マップ表示](map_review_gallery.html#stage-089) |
| 90 | [最新案 `stage_090_proposal_v2.json`](stage_090_proposal_v2.json) | [個別レビュー `stage_090_review_v2.md`](stage_090_review_v2.md) | [マップ表示](map_review_gallery.html#stage-090) |
| 91 | [最新案 `stage_091_proposal_v2.json`](stage_091_proposal_v2.json) | [個別レビュー `stage_091_review_v2.md`](stage_091_review_v2.md) | [マップ表示](map_review_gallery.html#stage-091) |
| 92 | [最新案 `stage_092_proposal_v2.json`](stage_092_proposal_v2.json) | [個別レビュー `stage_092_review_v2.md`](stage_092_review_v2.md) | [マップ表示](map_review_gallery.html#stage-092) |
| 93 | [最新案 `stage_093_proposal_v2.json`](stage_093_proposal_v2.json) | [個別レビュー `stage_093_review_v2.md`](stage_093_review_v2.md) | [マップ表示](map_review_gallery.html#stage-093) |
| 94 | [最新案 `stage_094_proposal_v2.json`](stage_094_proposal_v2.json) | [個別レビュー `stage_094_review_v2.md`](stage_094_review_v2.md) | [マップ表示](map_review_gallery.html#stage-094) |
| 95 | [最新案 `stage_095_proposal_v2.json`](stage_095_proposal_v2.json) | [個別レビュー `stage_095_review_v2.md`](stage_095_review_v2.md) | [マップ表示](map_review_gallery.html#stage-095) |
| 96 | [最新案 `stage_096_proposal_v2.json`](stage_096_proposal_v2.json) | [個別レビュー `stage_096_review_v2.md`](stage_096_review_v2.md) | [マップ表示](map_review_gallery.html#stage-096) |
| 97 | [最新案 `stage_097_proposal_v2.json`](stage_097_proposal_v2.json) | [個別レビュー `stage_097_review_v2.md`](stage_097_review_v2.md) | [マップ表示](map_review_gallery.html#stage-097) |
| 98 | [最新案 `stage_098_proposal_v2.json`](stage_098_proposal_v2.json) | [個別レビュー `stage_098_review_v2.md`](stage_098_review_v2.md) | [マップ表示](map_review_gallery.html#stage-098) |
| 99 | [PR #74案 `stage_099_proposal_v2.json`](stage_099_proposal_v2.json) | **[最新の99面改訂レビュー](STAGE_099_NEW_CONCEPT_REVIEW_20261106.md)** ／ [旧v2レビュー](stage_099_review_v2.md) ／ [ユーザー新構想](STAGE_099_MULTI_TELEPORT_TACTICAL_MAP_CONCEPT_20261106.md) | [旧案の表示](map_review_gallery.html#stage-099) |

## 2. PR #74の横断資料と検証記録

- [PR #74の改修一覧と残検証](PR74_REVIEW_REVISION.md)：直前25面の変更内容。**改修完了の記録であって最終合格ではない**。
- [全49面の設計一覧](STAGES_051_099_DESIGN_REVIEW.md)：各面の企画意図・主攻略・別解。リンクされているステージ個別 `review` と合わせて読む。
- [マップ比較HTML](map_review_gallery.html)：座標図・部品・射撃例・入力列の閲覧入口。**ゲームの実画面確認の代替にはしない**。
- [隣接面の比較HTML](adjacent_geometry_review.html)：近いステージの似た地形と86面／90面を比較するための参考。
- [入力証跡](STAGES_051_099_INPUT_CERTIFICATES.json)／[ショットの証跡](STAGES_051_099_SHOT_PROBE.json)／[ギミック監査](STAGES_051_099_GIMMICK_AUDIT.json)／[形状監査](STAGES_PR74_GEOMETRY_AUDIT.json)／[一部ボスの実戦記録](STAGES_PR74_COMBAT_PROBE.json)：**PRの旧形状に対する記録**。改修後の合否に流用禁止。

## 3. 各面で制作に入る前に必ず出す「継承・改修方針」

- **引き継ぐもの：** 最新案のどの地形構造、敵味方の位置、ギミックと攻略意図が有効なのか。根拠としてこの一覧のJSONとレビューを指す。
- **修正すべきもの：** 最新案のどの問題が[追加レビューの指摘](STAGE_051_099_REDESIGN_BRIEFS_20261105.md)に該当するか。
- **作り直すもの：** 攻略が成り立たない骨格や、近隣面と似た選択しか生まない部位。**Rでも残せる部品は残せる**。S/Kでは既存の価値を極力残す。
- **理由と証拠：** なぜ現案で直せる／全面設計を切り替えるのか、プレイヤーの判断がどう変わるのか。エンジンで検証し、旧案と同縮尺で比較。
- **ソースの一致：** `proposal`、`review`、実ランタイムのどこから何を引き継いだか記録。PRとの差異が大きい場合は、作業前に記録してレビューへ提出。

**この一覧のR面から1面ずつ進め、1面の「マップ設計承認」前に次の面へ進まないこと。総合動作検証は全49面の設計承認後に実施する。**
