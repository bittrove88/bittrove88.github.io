# ARCLINE 検証環境：別オリジン・一時状態での運用

2026-11-07のユーザー合意による計画修正。現行の正本は [STG運用計画 v2](../docs/change-requests/ARCLINE_V2_STAGING_SAFETY_PHASE1.md)。計画文書の更新段階であり、STGの起動・配信・保存隔離は未実装。

## 運用の基本

- 本番は既存のGitHub Pagesと公開URLを維持。検証用サイトは本番と異なるオリジンへ配信する。同じホストの別パスや同じGitHubアカウントの別リポジトリは、オリジン分離にならない。
- STGは指定した状況から遊ぶための環境。進行・機体・在庫・取得履歴・言語・操作設定は一時メモリだけに保持し、再読み込み／タブ終了でプレイ状態を破棄する。
- localStorage・sessionStorage・IndexedDB・Cookieへゲーム状態を読み書きしない。本番SDKのloadData/saveDataや旧キー削除へも接続しない。
- 最初の起動UIは開始ステージ1〜100と開始ボタン。難易度・機体・装備は通常のゲームUIを使う。初期状態の規則を固定し、再現条件・コミット・一時状態であることを確認できるようにする。
- 開発途中はPR単位のプレビュー、公開前は採用変更を統合した固定候補をSTGとして使う。初期は同じ配信基盤を使い、環境を多数常設しない。
- ゲーム本体の正本は `ARCLINE/game/`。本番と共通の生成手順を使い、起動・保存・環境表示・PWA・配信パスの差だけを環境側で管理する。STG専用ゲームを手作業で保守しない。
- STG成果物は必要なゲーム・素材だけを含め、他サイトや制作ZIPを配布しない。本番への自動昇格は行わない。

## 初期導入に含めないもの

永続セーブ、クラウド同期、ユーザーセーブの収集、セーブ書き出し／取り込み、大量の再現条件UI、PWAインストール、Service Workerによるオフライン保持。同一サイトの完全スナップショット合成やPages公開方式変更も必須工程から外す。

本番の保存・移行処理を変更する場合は、その作業に必要な自動テスト／専用検証を実施する。メモリで動くSTGの成功を、本番の永続保存の成功と扱わない。

## 既存の安全性PoC

`tools/verify_staging_site.py` と `tests/test_verify_staging_site.py` は、同一サイトの `/ARCLINE-staging/` 以外を保持する旧方式のPoCとして残す。現行の配信先を指定するコードでも、別オリジン配信の必須ゲートでもない。対応する専用CIは検査ツール自身を確認するもので、実際のSTG配信・保存隔離・ゲームの安全性を証明しない。

```sh
python3 -m unittest discover -s ARCLINE/environments/tests -v
python3 ARCLINE/environments/tools/verify_staging_site.py --baseline /path/to/approved-live-snapshot --candidate /path/to/site-artifact
```

旧方式を将来再利用する場合、baselineは現在配信中の承認済みサイトの固定された完全成果物とし、並行公開も別途制御する。main HEADだけでは配信中の内容と一致するとは限らない。

## 次の作業

実装・配信設定・ユーザー操作・受入条件の一覧は [STG運用計画 v2](../docs/change-requests/ARCLINE_V2_STAGING_SAFETY_PHASE1.md) を参照。PR #65は計画修正と既存PoCの保管、PR #89は独立した将来ギミック資料として扱う。
