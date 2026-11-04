# ARCLINE v2 環境分離：段階1（本番無変更の安全性検証）

ゲーム本体の唯一の正本は ARCLINE/game/。環境専用の起動・保存・公開のための設定は ARCLINE/environments/ に分離する。ここにゲーム本体や本番セーブを複製しない。

## 合意した将来仕様（未実装）
- STG公開先：/ARCLINE-staging/ 。ゲーム本体は /ARCLINE-staging/game/dist/ 。
- STG UI：開始ステージ1〜100の数値入力と開始ボタンだけ。
- 入力Nは N面を開始地点、1〜N面を選択可能とする。N=1は初回の通常プレイを再現。
- 難易度・機体・装備は通常のゲームUIから操作する。
- STGの進行状態はメモリ上のみ。本番のブラウザ保存を読み込まず、書き換えず、削除しない。
- 本番・STGの共通ゲーム本体と素材は同一ソース・同一ビルド。環境差は起動・保存・PWA・公開パスに限定する。

## この段階で実装したもの
- tools/verify_staging_site.py：組み立て済みPagesサイト全体のベースラインとSTG更新候補を比較。STG以外のファイル変更・削除・追加を検出すると失敗。
- tests/test_verify_staging_site.py：その保護機能の単体テスト。

実行：
    python3 -m unittest discover -s ARCLINE/environments/tests -v
    python3 ARCLINE/environments/tools/verify_staging_site.py --baseline /path/to/approved-live-snapshot --candidate /path/to/site-artifact

ベースラインは「現在公開中の承認済みサイト」の固定された完全スナップショットを使用する。単なるmain HEADは、並行公開や遅延があるため一致を保証しない。識別子・ハッシュを記録し、公開直前に競合を検知すること。

## 未実装：別PRで対応
STG起動UI、保存のメモリ化、難易度別初期状態、PWA設定、素材パス修正、サイト成果物の合成、Pages発行方式変更、本番昇格、ロールバック。今回の試験成功はゲーム本体または実際のPages公開の安全性を証明しない。

同一ドメインのブラウザ保存領域は共有される。STGの実装上の保護は可能だが権限分離ではなく、未信頼スクリプトから本番セーブを隔離できない。
