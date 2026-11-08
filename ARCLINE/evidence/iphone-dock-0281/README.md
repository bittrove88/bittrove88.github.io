# iPhone下部UI 0.28.1

440×956相当のiPhone表示で、下部がノッチ側へ侵入し、武器単独のボタンが656pxへ伸びる問題を再現して修正した。

| 状態 | 修正前 | 修正後 |
|---|---|---|
| 縦持ち・武器のみ | [画面](before-portrait-weapon.png) | [画面](after-portrait-weapon.png) |
| 縦持ち・全メニュー | [画面](before-portrait-all.png) | [画面](after-portrait-all.png) |
| 横持ち・武器のみ | [画面](before-landscape-weapon.png) | [画面](after-landscape-weapon.png) |
| 横持ち・全メニュー | [画面](before-landscape-all.png) | [画面](after-landscape-all.png) |

前はmain `a45f6031b5e2f6b2eff74b0356554713bea631a0` のCSSを隔離した検査サーバーで使用し、失敗を意図的に収集したもの。画像加工ではない。後は正式に生成した0.28.1のCSSを使用。縦持ちは本編と同じ固定横向きで表示する。

- [修正前の失敗記録の要約](BASELINE_EXPECTED_FAILURE.json)
- [修正後の要約：773項目・128条件すべて成功](IPHONE_DOCK_BROWSER.json)

4サイズ、縦横の正逆、左右配置、メニュー4状態を比較。主操作68px、アイコン40px、メニュー高さ36px、チャージ高さ26pxを維持する。セーフエリアはChromiumの検査環境で制御した値であり、実機iPhone Safariでの確認は未実施。

[実装と検証](../../docs/releases/0.28.1.md)。追加のマージ・配信は未実施。コミットごとのCI結果はPRのChecksを参照。

全128条件の詳細は修正PRのCI成果物 `arcline-checks/IPHONE_DOCK_BROWSER.json` で確認できる。
