# 0.17.0 追加指示の検証記録

[追加指示の原文と受け入れ条件](../../docs/change-requests/ARCLINE_ADDITIONAL_CHANGE_REQUEST_v0.17.0.md) ／ [実装記録](../../docs/releases/0.17.0.md)。旧v2.2.0／0.16.0の検証結果は別ディレクトリに保持します。

`matches/` の3JSONは新しい地形で実行した全416戦です。通常弾を中心とするガンの全100面×3敵seed、利用可能な推奨機体の全100面、固有技の16実戦で、実際の敵手番と元のHP・弾道・弾数・撃破条件を使って勝利を確認しました。人の難易度や楽しさ、全機体全状況の証明ではありません。

章の順序・加入移行・地形以外の戦闘パラメータ・1000安全配置を単体検査。初回導線、単一の開始操作、固定試撃、6画面サイズと回転、全画面章再生、保存非変更、ポーズメニューの機体変更をブラウザ検査します。最終結果JSONを `local/` に配置しました。途中の失敗を成功数へ含めず、最終コミットのCIとローカル結果を区別します。

公開URLの直接確認は環境プロキシのCONNECT403により遮断されているため未確認です。Pagesデプロイ、公開画面、物理Safari／Android、PWA、YouTube本番SDKは別々の確認です。BATTLE_Aの暫定全曲ループと、人による聴感確認の未実施も継続して報告します。

## ローカルの最終結果

| 検証 | 結果と証拠 |
|---|---|
| 単体 | [15スイート PASS](local/SUITE_UNIT.json)、追加[1338検査](local/CHAPTER_FLOW_UNIT.json) |
| ブラウザ | [9スイート PASS](local/SUITE_BROWSER.json)、追加[42検査](local/CHAPTER_FLOW_BROWSER.json)、[ポーズ等245検査](local/CHARGE_PAUSE.json) |
| 音源・エンディング | [90検査 PASS](local/MEDIA_220_FULL_NATIVE_BROWSER.json)。最終章の章再生ボタンから入り、約171秒を早送りせず11ショット→アルバム→風景→ロゴ→静寂→章一覧へ復帰 |
| 再生成 | [45ファイルを2回再現 PASS](local/GENERATED_CHECK.json) |
| 表示 | [回帰 PASS](local/SUITE_VISUAL.json)。初回試撃は6サイズ・回転後のCanvas実寸と同一倍率、戦闘後の全画面ストーリーも3サイズで検査 |
| 配信 | [低速配信・起動 PASS](local/SUITE_DELIVERY.json)、[詳細](local/DELIVERY.json)、[103ファイルのZIP](local/BUNDLE_CHECK.json) |
| 原本保護 | [58素材の基点一致・旧正式要求維持 PASS](local/PRESERVED_ORIGINALS.json) |

`screens/` に横／縦の固定試撃、章の加入、戦闘後の全画面ストーリーを保存しています。操作説明の既読修正と戦闘後の全画面化を含む版で、9ブラウザスイートを再実行しました。全画面APIに未対応のブラウザでは、CSSで利用可能な表示領域全体を使います。

実行環境はローカルChromium154.0.8037.57です。上の実時間エンディングはネイティブAACを用いたブラウザ検証であり、人の聴感確認ではありません。CI・Pagesの対象SHAはこの変更のPull Request／Actionsと最終報告を参照してください。公開ドメインの通信制限と実機未検証は上記のとおりです。
