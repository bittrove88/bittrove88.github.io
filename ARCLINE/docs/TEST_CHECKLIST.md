# v0.15.5検証入口

要求の全文・受け入れ条件は [全21章の変更指示書](change-requests/ARCLINE_CHANGE_REQUEST_v0.15.5.md) を参照する。

| 検証 | コマンド・根拠 |
|---|---|
| 保存互換、100面進行、全加入、章在庫、全機の戦闘 | npm test |
| 既存保存フィールドと旧正本との比較 | refactor-contracts |
| モグ通常弾だけの変更、重い弾道、難易度不変、敵AI | journey-0155 |
| 全23枚のcover、単軸・単方向、静止構図、ハッシュ | cinematic-014 |
| 初回案内→映像→ガン→3試射→確定、中断再開 | journey-0155-browser |
| 6画面サイズ・10機一覧・9加入・回転・実際のcover | journey-0155-browser（visualも同じ現行受け入れテストを使用） |
| 既存画面のフォーカス・タッチ入力・章選択・公開リンク | npm run test:browser |
| 生成一致・再現性 | npm run check:generated |
| フラットZIPと公開相対URL・低性能プロファイル | build_playables.py → node game/tools/test.cjs delivery |

v0.14.4の保存ファイルのバイト一致は、今回の追加フィールドに伴い既存フィールドの互換比較へ変更。旧版と完全に同じ画面配置という旧visual基準は、要求された新しいレイアウトの表示・重なり・ボタン到達性へ変更した。旧テストは履歴として保持する。対象外の戦闘モジュールのバイト一致は引き続き検査する。

実機で別途確認する項目：iPhone/iPad Safari、Android Chrome、ホーム画面追加と再起動、OSセーフエリア、バックグラウンド復帰、実際の低速端末、YouTube本番SDK。ChromiumのUA・タッチ・画面サイズエミュレーションはこれらの代替保証ではない。人による全100面通しプレイも別途必要。
