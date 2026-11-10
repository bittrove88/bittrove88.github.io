# 制作中の事前確認

2026-11-10。実装候補の限定確認。ユーザーの最終合意後に行う本検証・CI・公開確認とは別の記録。

[表示・機体情報・旧URL・マップの記録](PRECHECK.json) ／ [指摘された実動画と単体HTMLの記録](PLAYBACK_EXPORT_PRECHECK.json) ／ [媒体と本番ソースの照合](SOURCE_MEDIA_PRECHECK.json) ／ [サイト生成元だけの再生成](TARGETED_GENERATION_PRECHECK.json)

- 機体統合：[PC](machines-1440.png) ／ [スマホ](machines-390.png)
- 100マップ総覧：[PC](maps-1440.png) ／ [スマホ](maps-390.png)
- マップ拡大：[PC](map-detail-1440.png) ／ [スマホ](map-detail-390.png)

PCでは10機、スマホではハナとユイの切替を確認。原画・機体タイプ・HP・加入表示が切り替わり、日英と保存値を確認。旧URLは `#machines` へ移動。マップは104カードを構成し、テーマ絞り込みと拡大を確認。表示時の例外・HTTPエラーは0件。

機体セクションの画像は、読みやすくするため撮影時だけスマホ下部の固定CTAを非表示にした要素全体のスクリーンショット。実装の固定CTAは保持している。映像を抑える設定で静止画を表示し、別の確認でハナ・バン・ユイの実動画を再生した。ブラウザはLinux上のChromiumで、実機Safari・Androidの確認ではない。

[実演14本と収録台帳](../../site/showcase-captures.json) ／ [変更範囲と生成元](../../docs/releases/site-refinement-20261110.md)

## 最終合意後の本検証

ユーザー「OK」を受領後、合意した4スイートと生成物検査を実施。[ローカル集約結果](verification/LOCAL_VERIFY.json)：4スイート・1,589項目と生成156ファイルの一致が成功。初回の古い文言チェックの失敗と、その検査だけの再実行は同記録に区別している。

[紹介ページ529項目](verification/SERVICE_SITE.json) ／ [起動45項目](verification/SITE_STARTUP.json) ／ [総覧・公開導線212項目](verification/RELEASE_WEB.json) ／ [生成156ファイル](verification/GENERATED.json)。総覧の正本・埋め込み803項目も集約結果へ記録。CIはPR160の対象コミットで別途確認する。未マージ・未公開。
