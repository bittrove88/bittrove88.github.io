# GitHub内で運用するARCLINE STGの初期実装

2026-11-07。要求の正本は [STG運用計画v3](../change-requests/ARCLINE_V2_STAGING_SAFETY_PHASE1.md)。ゲーム版数は本番の0.24.1のまま、STGの配布方法と起動処理を追加した。

## 実装

- `environments/staging/session.js`：このWindowのlocalStorage／sessionStorageをメモリ内の互換オブジェクトへ切り替える。元の保存API・SDKを読み込まず、他タブのStorage.prototypeを変更しない。Cookie・IndexedDB・Service Workerへの接続も止める。
- `loader.js`：切替成功後にだけ既存ゲームのスクリプトを元の依存順で読み込む。失敗時・範囲外ステージはゲームを起動しない。1面は通常初回、2〜100面はN-1クリア相当の検証用初期状態から開始し、全難易度に同じ範囲を用意する。
- 進行・機体・在庫・設定は一時メモリに保持し、再読み込み・別タブで初期化する。100面は未クリアの最終戦として開始する。STG画面に版・コミット・保存しない旨を表示し、PWA案内とセーブ削除ボタンを出さない。
- `tools/build_staging.py`：既存の配布許可リストと素材検証を再利用する。出力先の上書き・ソース内への出力・本番パス・SHA不一致を拒否する。公開用は未コミットの変更も拒否する。
- 成果物のHTMLだけをSTG用ローダーへ接続し、元のゲームJS・CSS・SVG・画像・音声は元バイト列を保持する。ゲーム本体・素材・設計データ・本番のCI／Pages設定には変更なし。
- `github-pages/deploy-staging.yml`：専用リポジトリに置く配信定義。完全なSHAの手動指定、または明示的な`staging-source.json`の更新で検証と配信を開始する。ソースPRの更新だけではSTGを更新しない。

## ローカル検証

| 検証 | 結果 |
|---|---|
| 既存ゲーム `npm test` | 33スイート成功 |
| `npm run check:generated` | 145出力一致 |
| STGセッション・初期状態 | Node 69項目成功 |
| 旧PoCと配布境界・成果物ハッシュ | Python 13件成功 |
| STG専用ブラウザ検証 | Chromium 154、44項目成功 |
| 文書の相対リンク・YAML・JavaScript構文 | 成功 |

ブラウザでは1/50/100面、全難易度の切替、実エンジンの50/100面開始、言語・操作・在庫の一時保持と再読み込みによる破棄、別タブの初期化、範囲外入力、保存切替不能時の停止を確認した。通常Windowに置いた本番相当の保存値と他アプリの値は不変。STG側で元のstorage getterやSDKを利用しないことを監視した。

配布したWorkerとメインの計画結果が一致し、同梱AACが実再生でき、読み込み先の404とブラウザ例外がないことを確認。844×390、568×240、390×844を描画・目視した。変更したゲームロジックの検査ではなく、環境の起動と非干渉・配布経路の確認である。

## 配信・公開・実機

本番とSTGのGitHub Pagesは同一オリジンであり、ブラウザによる権限隔離ではない。自分たちのコードを対象に、メモリ切替と検証で非干渉を確保する。

ソースのマージ、STGの配信、公開URLでの確認、iPhone／Android実機、本番公開は別工程。最新のCI・配信状況と対象SHAは [PR #65](https://github.com/bittrove88/bittrove88.github.io/pull/65) と [STG専用Actions](https://github.com/bittrove88/arcline-staging/actions) に記録する。今回のローカル検証を実機確認・本番公開成功とは扱わない。
