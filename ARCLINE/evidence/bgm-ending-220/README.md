# 0.16.0／正式要求v2.2.0のローカル検証記録

実行済み結果だけを保存しています。単体14スイート、新規220検査、43生成物の隔離2回再現、7曲全デコード、既存ブラウザ7スイート、新しいブラウザ検証、visual、hosted／ZIPの低性能配信検証と101ファイルの照合です。新規のネイティブ音声通し検証はシーク・加速なしで約170秒、11ショット→回想→ロゴ→静寂→復帰を観測しました。

SDK初期ミュートの3項目は、その後の高速検証で追加確認しています。`ARCLINE_FAST_MEDIA=1` は通し再生だけを省く開発用指定であり、それを全曲通し確認とは数えません。最終コミットに対する全8ブラウザスイートの結果は、GitHub Actionsの当該head_shaの結果・添付artifactを正とします。この記録はGitHub Actions、Pagesデプロイ、公開URL、実機の合格を意味しません。

元音源7曲、10機の原画、承認映像、参照シートのバイト一致はPRESERVED_ORIGINALS.jsonを参照。派生物はassets/ending/manifest.jsonに出典・寸法・マスク・矩形とハッシュを記録しています。

公開URLの直接確認は環境プロキシのCONNECT403で遮断されました。ネットワーク運用手順 [cloud-environment-runtime / networking.md](skill://plugin_connector_1p_c5b7d5df5d7081918f2c4be5a633ed5d/cloud-environment-runtime/references/networking.md) は “An explicit destination-policy denial requires the supported configuration workflow” と定めているため、許可先の変更は通常の環境設定手順が必要です。ポリシーを迂回して確認済みとは扱いません。

未確認：BATTLE_Aの聴感で確定した途中ループ点、採用テイクの人による聴き比べ・音量／継ぎ目評価、物理Safari／Android、PWA実機、YouTube本番SDK、公開ドメインでの実表示・音声。詳細はdocs/releases/0.16.0.mdを参照してください。

正常再生ではネイティブdurationへ時間配分を追従し、異常時だけ検証済み尺を使う差分テストを追加しています。CIの初回AAC開始待ち失敗を受け、開発ツールはインストール済みブラウザの承認AAC実デコードを事前確認し、その対応を確認したエンジンを選択します。ブラウザ版数・選択結果はBROWSER_AAC_PROBE.jsonとCI artifactに残します。音声検証のスキップや合格条件の緩和はしていません。
