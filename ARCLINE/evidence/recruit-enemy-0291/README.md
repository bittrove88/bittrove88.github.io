# 仲間登場・通常敵の位置取り：0.29.1

[変更範囲と保護](../../docs/releases/0.29.1.md)。基準はmain `2e0eab2`。作業ブランチでの確認資料で、本番マージ・配信は修正PRの状態を参照。

## 全10機の原画

[修正した透過素材10機](all-ten-original-pixel-cutouts.png)。原画のRGBは一切描き直していない。輪郭・白い装甲・砲口・アンテナ・足回りを原画と照合し、旧マスクで正しく見えていた部品も保護する。原画に含まれる砂ぼこりや部品の重なりは維持する。

比較は同じ原画RGBを旧／新αで切り抜いた素材の見本。ゲーム画面の比較ではない。登場画面は実ゲームのHTML・描画による表示見本で、勝利や実機の証拠とは区別する。ガンは初期機体なので、同じ画像枠を使う確認用状態で表示した。

| 機体 | 素材の修正前／後 | 登場画面 |
|---|---|---|
| ガン | [比較](compare-gun.png) | [全画面](recruit-gun.png) |
| ハナ | [比較](compare-hana.png) | [全画面](recruit-hana.png) |
| コロ | [比較](compare-koro.png) | [全画面](recruit-koro.png) |
| バン | [比較](compare-ban.png) | [全画面](recruit-ban.png) |
| ソラ | [比較](compare-sora.png) | [全画面](recruit-sora.png) |
| リコ | [比較](compare-rico.png) | [全画面](recruit-rico.png) |
| ヒバリ | [比較](compare-hibari.png) | [全画面](recruit-hibari.png) |
| モグ | [比較](compare-mogu.png) | [全画面](recruit-mogu.png) |
| リン | [比較](compare-rin.png) | [全画面](recruit-rin.png) |
| ユイ | [比較](compare-yui.png) | [全画面](recruit-yui.png) |

## 読み込み・音楽・端末サイズ

[読み込み待ち](recruit-loading.png) ／ [失敗時の再読込](recruit-retry.png) ／ [ブラウザ検証](RECRUIT_ENEMY_BROWSER.json)。画像のネットワーク読み込みを止めた場合と、読み込み後のdecode完了を遅らせた場合の両方で、登場パネルが隠れ、BGMが停止することを確認。ホストの再開・操作でも読み込み中は再生を始めない。失敗時は簡易Canvasへ切り替えず、加入状態を保持したまま再読込できる。

10機×6サイズ×日英×4つの登場後の時刻で、元画像の自然寸法・contain・画面内への収まりを確認。別途、iPhone相当440×956／956×440の4方向で、全10機が制御した安全領域に収まることも検査した。これはChromiumでの安全領域検証で、実機Safariとは区別する。

## 現在の敵AI

[全48通常面のNormal攻略入力](ALL_CURRENT_ENEMY_MATCHES.json)、[Hard代表4面](HARD_CURRENT_ENEMY_MATCHES.json)、[再生する代表6面](CURRENT_ENEMY_MATCHES.json)、[固定した報告の指紋](ACCEPTANCE.json)。ガンの通常攻撃と既存移動・テレポートを使い、実際の敵反撃を受けながら全てクリア。Normalの必要行動数は最大7。自動探索による入力で、人間の勝率や楽しさの測定ではない。

この48戦の固定シードでは歩行83回、テレポート13回。テレポート対象24面のうち13戦で発生した。母数・入力・seedを限定した観測であり、一般プレイの発動率を保証する数値ではない。

[単体・実手番の観測](RECRUIT_ENEMY_UNIT.json)では、全対象通常面の72条件で実際に空撃ちと敵行動を進め、歩行171回・テレポート34回を確認した。回数、2敵手番の待ち、140pxの歩行上限、テレポート手番に攻撃しないこと、次の地形切替後にも着地・反撃経路が成立することを検査した。過去の161入力は旧敵行動による地形・物理の回帰検査として保持し、新AIの証拠とは分ける。

Workerと非Workerは同じ評価器で一致。非Workerは候補間でUIへ処理を返す。BGM・画像の検証と同じ実ゲームで、テレポート専用手番から無攻撃で自機手番へ戻ることも確認した。

[生成物153件](GENERATED.json)と[回転・タッチ入力5件](SUITE_INPUT.json)も検証済み。最終の全単体・生成物・入力・ブラウザ・画面比較・配布物の結果は、修正PRのChecksとCI成果物を参照。実機Safari／Androidと公開URLの直接表示は未確認。
