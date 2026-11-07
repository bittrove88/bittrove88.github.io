# ARCLINE 検証環境：GitHub専用リポジトリ・一時状態での運用

2026-11-07のユーザー合意による計画と初期実装。現行の正本は [STG運用計画 v3](../docs/change-requests/ARCLINE_V2_STAGING_SAFETY_PHASE1.md)。起動・一時状態・配布物・手動公開ワークフローを実装。公開URL・実機の確認は別工程。

## 運用の基本

- 本番は既存のGitHub Pagesと公開URLを維持。STGは専用の `bittrove88/arcline-staging` から配信する。同一オリジンなので、保存領域の物理的な隔離とは説明しない。
- STGは指定した状況から遊ぶための環境。進行・機体・在庫・取得履歴・言語・操作設定は一時メモリだけに保持し、再読み込み／タブ終了でプレイ状態を破棄する。
- STGのWindowだけでlocalStorage／sessionStorageをメモリ互換オブジェクトへ切り替える。実際の永続保存・Cookie・IndexedDB・本番SDKへ接続せず、他タブのStorage.prototypeを変更しない。切替不能ならゲームの読込みを停止する。
- 最初の起動UIは開始ステージ1〜100と開始ボタン。難易度・機体・装備は通常のゲームUIを使う。初期状態の規則を固定し、再現条件・コミット・一時状態であることを確認できるようにする。
- 初期は一つのSTGへ、完全なソースSHAを指定して手動更新する。PR単位の自動プレビューは後回し。確認結果は表示コミットと成果物ハッシュに対応させる。
- ゲーム本体の正本は `ARCLINE/game/`。本番と共通の生成手順を使い、起動・保存・環境表示・PWA・配信パスの差だけを環境側で管理する。STG専用ゲームを手作業で保守しない。
- STG成果物は必要なゲーム・素材だけを含め、他サイトや制作ZIPを配布しない。本番への自動昇格は行わない。

## 初期導入に含めないもの

永続セーブ、クラウド同期、ユーザーセーブの収集、セーブ書き出し／取り込み、大量の再現条件UI、PWAインストール、Service Workerによるオフライン保持、PRごとの自動配信。本番サイト全体のスナップショット合成やPages公開方式変更も必須工程から外す。

本番の保存・移行処理を変更する場合は、その作業に必要な自動テスト／専用検証を実施する。メモリで動くSTGの成功を、本番の永続保存の成功と扱わない。

## 既存の安全性PoC

`tools/verify_staging_site.py` と `tests/test_verify_staging_site.py` は、本番サイト内の `/ARCLINE-staging/` 以外を保持する旧方式のPoCとして残す。現行の配信先を指定するコードでも、専用リポジトリ配信の必須ゲートでもない。8件の検査成功を実際のSTG配信・保存非干渉の証明として流用しない。専用CIには新方式の単体・配布物・ブラウザ検証も追加した。

```sh
python3 -m unittest discover -s ARCLINE/environments/tests -v
python3 ARCLINE/environments/tools/verify_staging_site.py --baseline /path/to/approved-live-snapshot --candidate /path/to/site-artifact
```

旧方式を将来再利用する場合、baselineは現在配信中の承認済みサイトの固定された完全成果物とし、並行公開も別途制御する。main HEADだけでは配信中の内容と一致するとは限らない。

## 生成と検証

リポジトリルートから実行。出力先はソースリポジトリ外の空ディレクトリを指定する。

```sh
node ARCLINE/environments/tests/staging-session.test.cjs
python3 ARCLINE/environments/tools/build_staging.py --output /tmp/arcline-staging-site --source-commit "$(git rev-parse HEAD)" --require-clean
ARCLINE_STAGING_SITE=/tmp/arcline-staging-site python3 -m unittest discover -s ARCLINE/environments/tests -v
ARCLINE_STAGING_SITE=/tmp/arcline-staging-site node ARCLINE/environments/tests/staging-browser.test.cjs
```

配信ワークフローは [github-pages/deploy-staging.yml](github-pages/deploy-staging.yml) をSTG専用リポジトリの `.github/workflows/` へ配置する。本番リポジトリの配信ワークフローとして追加しない。

## 次の作業

配信設定・ユーザー操作・受入条件は [STG運用計画 v3](../docs/change-requests/ARCLINE_V2_STAGING_SAFETY_PHASE1.md) を参照。PR #65に初期実装と検証を集約し、PR #89は独立した将来ギミック資料として扱う。
