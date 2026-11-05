# ARCLINE 試作マップ座標アーカイブ / 2026-11-05

**状態：DO NOT IMPLEMENT / NOT ACCEPTED FOR RUNTIME / REVIEW REFERENCE ONLY**

## このアーカイブの目的
2026-11-05 に作成した57・58・59面の試作設計を、品質監査・経緯確認のため**履歴としてのみ**保存する。PR #74、ゲームの実行用マップ、ステージ改修の基点として使用しない。

## 含まれる試作データ
- `stage_057_proposal_v4.json` / `stage_057_review_v4.md` / `stage_057_v3_v4_comparison.svg`
- `stage_058_proposal_v4.json` / `stage_058_review_v4.md` / `stage_058_v3_v4_comparison.svg`
- `stage_059_proposal_v3.json` / `stage_059_proposal_v4.json` / 対応レビュー・比較図
- `STAGE_057_DESIGN_APPROVAL.md`、`STAGE_058_DESIGN_APPROVAL.md`: ユーザーの当時の**デザイン意図に対する承認**を記録。実エンジンでの動作・最終合格ではない。

## 停止の理由
GitHubで公開した比較SVGに描画上の欠陥があり、設計JSONも実プレイ画面・物理・歩行・転移・ボスの攻撃による検証が不十分。F04縮小は単純な射線を開いたが足場の連続性と操作性を失うなど、数値上の部分合格が全体の設計品質を保証していない。問題のある試作座標をゲーム実装へ直結させてはならない。

## 次の制作方針
- 1面ずつ、**実際のエンジン描画**と実物理、経路ごとの行動再生、敵の攻撃込みの試験を行う。
- ゲーム実装担当が、新しい地形の配置・座標・部品・コリジョン・動作検証を責任を持って実装する。
- レビュー文書は別ブランチの正式な設計指示にまとめる。過去のJSONは転用せず、必要ならコンセプトだけ参考にする。
- 57・58の当時の承認は変更の来歴として残るが、試作座標の実装許可を意味しない。
- **本アーカイブをマージしない。**

## 旧ブランチ
- `design/arcline-stage-057-v4-review`
- `design/arcline-stage-058-v4-review`
- `design/arcline-stage-059-v3-review`
- `design/arcline-stage-059-v4-review`

各段階の履歴を本アーカイブのコミット列に保全済み。これら4つはアーカイブ作成後、開発ブランチ一覧から削除してよい。削除できないツール環境では**削除済みとは表示しない**。

[参照PR #74](https://github.com/bittrove88/bittrove88.github.io/pull/74)
