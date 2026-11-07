# ARCLINE ver.2｜101面以降の主人公・ジョブ・ステージ設計資料

> 作成日: 2026-11-04（JST） / 起点: ユーザーとChatGPTの企画対話 / **設計資料であり、コード実装や実機検証の完了を意味しない**。

## この資料の位置づけ

- 1〜100面: 従来の既存10キャラクターによるプロローグ。既存実装は変更しない。
- 101面から: 新主人公 **アーク（ARC）** の冒険と12ジョブ換装を中心とする新フェーズ。
- 101〜200 / 201〜300 は資料整理上の区間。ゲーム世界や育成を100面ごとに強制リセットしたり、101〜200にだけジョブ要素を限定したりしない。
- 2026-11-04の対話で、ARCの原型と12ジョブの**最終ラインナップ画像および外観修正方針はFIX**。数値バランス、UI詳細、全ステージ配置、201〜300の具体的な内容までFIXしたという意味ではない。

## 資料一覧

| ファイル | 内容 | 状態 |
|---|---|---|
| [00_overview/DECISIONS_AND_SCOPE.md](00_overview/DECISIONS_AND_SCOPE.md) | 世界観、設計確定・構想・未決定の区分、敵企画との関係 | 保存済み |
| [00_overview/STATUS_MATRIX.md](00_overview/STATUS_MATRIX.md) | 決定事項と未決定事項、敵の制作資料、画像の保存状況 | 保存済み |
| [01_protagonist/ARC_BASE.md](01_protagonist/ARC_BASE.md) | 主人公ARCの共通骨格と換装の不変条件 | 保存済み |
| [02_jobs/JOB_SYSTEM.md](02_jobs/JOB_SYSTEM.md) | 12ジョブ、3ジョブ習得、7技、技能カテゴリと調整原則 | 保存済み |
| [02_jobs/JOB_CATALOG.md](02_jobs/JOB_CATALOG.md) | 12ジョブの技・必殺技・外観・配色・個性 | 保存済み |
| [02_jobs/ULTIMATE_HISTORY.md](02_jobs/ULTIMATE_HISTORY.md) | 候補の採否、旧必殺技の保護条件、名称変更履歴 | 保存済み |
| [02_jobs/jobs.json](02_jobs/jobs.json) | ジョブID・技・必殺技・画像用文章のデータ | 保存済み |
| [03_stages/STAGE_101_200.md](03_stages/STAGE_101_200.md) | 101〜200面の構成方針と検証課題 | 保存済み |
| [03_stages/STAGE_201_300.md](03_stages/STAGE_201_300.md) | 201〜300の継承事項と未決定領域 | 保存済み |
| [04_art/README.md](04_art/README.md) | 移動した敵の原画・設計文書・台帳の入口 | 保存済み |
| [04_art/CHARACTER_PLANNING_ARCHIVE.md](04_art/CHARACTER_PLANNING_ARCHIVE.md) | 没案・中間案を含む231記録、全74生成原画と162企画版 | 保存済み |
| [04_art/ASSET_MANIFEST.md](04_art/ASSET_MANIFEST.md) | ARC原画の未収録状況、既存世界の参照原画、敵画像の出典 | 保存済み |
| [04_art/MIGRATION_CHECK.json](04_art/MIGRATION_CHECK.json) | 移動ファイル・原画・通番・参照整合性の検査 | 保存済み |
| [04_art/ART_BIBLE_AND_PROMPT.md](04_art/ART_BIBLE_AND_PROMPT.md) | 主人公と12ジョブの画風・画像制作条件 | 保存済み |
| [05_handoff/OPEN_ITEMS_AND_TESTS.md](05_handoff/OPEN_ITEMS_AND_TESTS.md) | 数値・統合・保存などの未決事項と受け入れ確認 | 保存済み |
| [05_handoff/IMPLEMENTATION_HANDOFF.md](05_handoff/IMPLEMENTATION_HANDOFF.md) | 既存1〜100面を保全する実装引き継ぎ | 保存済み |
| [05_handoff/CODEX_START_PROMPT.md](05_handoff/CODEX_START_PROMPT.md) | 後続セッションへの開始指示 | 保存済み |
| [assets/README.md](assets/README.md) | 主人公・12ジョブ・旧10機画風参照のPNG3点 | 正式名で保存済み |
| [06_gimmicks/README.md](06_gimmicks/README.md) | V2-01〜V2-17の将来ギミック案・空中障害・採用基準 | 企画ストック・未承認 |
| [06_gimmicks/RELOCATION.json](06_gimmicks/RELOCATION.json) | 元PR・出典コミット・原文と17候補の保存確認 | 保存検査 |
| [MANIFEST.json](MANIFEST.json) | 仕様・制作資料の一覧と保存状態 | 保存済み |


## GitHub保存状態（2026-11-08更新）

主人公・ジョブ・画風参照用のPNG原画は3点とも[assets/](assets/)に正式名で格納済みです。

- [ARC主人公の原画](assets/ARC_BASE_ORIGINAL_REFERENCE.png)
- [12ジョブ最終FIX画像](assets/ARC_12_JOBS_FIXED_LINEUP.png)
- [1〜100面の旧10機・画風参照](assets/OLD_10_CAST_STYLE_REFERENCE.png)

12ジョブの修正前画像は**旧版不要のため保管しません**。Ver.2敵の企画原画74枚は[04_art/](04_art/README.md)に別途保存済みであり、これら3点とは区別します。

現行ゲーム`ARCLINE/`配下の実装・保存・公開URLは今回変更していません。

## 仕様管理の読み方

- **FIX**: ユーザーが最終承認または明示指示した内容。
- **現行設計**: 対話での採用ベースとなった内容。実装数値や例外の承認まで含まない。
- **提案**: 設計の手がかり。未承認として扱う。
- **未決定**: 補完で勝手に確定させない。

既存実装と異なる箇所は「ver.2の未来設計」であり、既存ゲームの現在の動作とは区別する。ファイルの存在は自動実装の命令ではない。

## 資料の移動について

2026-11-07、`ARCLINE/design/` のVer.2専用資料93ファイルを `04_art/` へ移動しました。231件の通番と74原画を維持し、主人公・ジョブ仕様と全案記録の間にリンクを追加。旧入口には移転案内を残しています。既存の1〜100面のゲームと原本は移動しません。

将来ギミック17候補は、元PR #89から [06_gimmicks/](06_gimmicks/README.md) へ集約しました。候補の採用や実装は未承認のまま保持しています。
