# 0.17.1 検証記録

[依頼の原文と条件](../../docs/change-requests/ARCLINE_START_SAVE_LANDSCAPE_v0.17.1.md) ／ [実装記録](../../docs/releases/0.17.1.md)。基点は `1a2576d144c66edc325355dac79a78b7180d8027` です。

| 対象 | 証拠 |
|---|---|
| 保存 | [追加17検査](local/START_LANDSCAPE_UNIT.json)：明示削除、失敗時保持、再試行、古い書き込みの順序、autosave・二重削除、読み込み失敗時のクラウド保護 |
| UI・回転 | [追加49検査](local/START_LANDSCAPE_BROWSER.json)：4サイズ、取消・失敗・再試行・再読み込み、他アプリの保護、SDK mock、縦開始、ネイティブ音源のシーン／アルバムでの停止・再開、別sourceのSDK停止の維持 |
| 回帰 | [単体16スイート](local/SUITE_UNIT.json)、[ブラウザ10スイート](local/SUITE_BROWSER.json)、[表示](local/SUITE_VISUAL.json)、[配信](local/SUITE_DELIVERY.json) |
| 音源・ENDING | [ローカル92検査](local/MEDIA_220_BROWSER.json)。音源欠落／再生拒否時の代替時計も縦向きで停止。ローカルはARCLINE_FAST_MEDIA=1で最終の実時間171秒サンプルのみ省略し、通常CIではその通し再生も含む |
| 正規生成・ZIP | [45ファイルの2回再現](local/GENERATED_CHECK.json)、[103ファイルの配布](local/BUNDLE_CHECK.json) |
| 非変更範囲 | [58素材・戦闘等14ファイル・save decoder・旧依頼の一致](local/PRESERVED.json)。地形／戦闘は今回変更せず、以前の416戦を今回の新しい実戦として数えない |

最終の結果を `local/`、確認・回転案内の画面を `screens/` に保存しました。回転制限の追加により、旧テストの「縦向きでもスキップできる」「再生拒否のfallbackが縦向きでも始まる」という前提を更新しました。失敗を合格として数えず、修正後に対象と全体を再検査し、最終結果はすべてPASSです。

ローカルはChromium154です。物理Safari／Android／PWA、YouTube本番SDK、人の聴感、公開ドメインの画面確認は未実施。公開ドメインは環境の通信許可によるCONNECT403で遮断されます。対象SHAのCI／Pages結果はPull Requestと最終報告を参照してください。
