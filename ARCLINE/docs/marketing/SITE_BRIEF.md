# サービスサイト制作ブリーフ

2026-11-09。対象は [ARCLINE公式サイト](../../index.html)。主目的は、遊びを理解して実際に開始してもらうこと。現行ページには地形・仲間・物語・操作の紹介があるため、それらを活かして入口の実プレイと主CTAを強くする。

## 1 ページの優先順

| 順序・領域 | ユーザーの疑問 | 掲載するもの | 素材ID・挙動 |
| --- | --- | --- | --- |
| 1 ファーストビュー | 何をするゲーム？ 遊ぶには？ | 既存見出し、短い説明、主CTA、一つの一射の実プレイ | V30またはL01。音声なしで理解。静止画S01を代替にする |
| 2 遊びの手応え | 撃つと何が変わる？ | 破壊・転移・反射を一つずつ。見出しと短い説明 | L01〜L03。初期表示は一つ。重い動画を一斉再生しない |
| 3 旅を続ける理由 | その先には何がある？ | 地形の違い、20テーマ100面、仲間の存在 | S02・S03、C01。機能解放を初期状態と混同させない |
| 4 物語 | なぜ旅をする？ | ガンと便りの導入、物語の問い | N01。結末の映像や答えを置かない |
| 5 遊び方・利用情報 | 操作できる？ 中断できる？ | 操作3手順、対応条件、保存の案内 | S04。端末・保存の掲載条件は素材台帳で確定 |
| 6 最終CTA | 今から始める？ | 主CTA、任意の動画リンク、公式の配信先 | ゲームへの直接リンクを維持 |

サイト上部の主CTAは「ゲームを遊ぶ」。動画は補助CTAとし、動画を観終わることを開始の前提にしない。小画面でも開始先を探させない。既存の再開動線を妨げる新しい入口を作らない。

## 2 掲載原稿の日英案

以下はそのままレイアウトに置ける第一稿。対応端末・料金・新しい冒頭は[掲載条件](ASSET_PLAN.md)を満たしてから加える。既存サイトは日英切替があるため、更新箇所を両言語で揃える。

| 要素 | 日本語 | English draft |
| --- | --- | --- |
| タイトル・H1 | その一発で、道をひらけ。 | One shot. A new way. |
| リード | 狙う。ためる。地形を味方にする。 | Aim. Charge. Make the terrain your ally. |
| 補足 | 角度と力を合わせて、一射。射つ場所を変えながら道を探す、ターン制の砲撃アドベンチャー。 | Set your angle and power, then fire. Change your position and find a way through this turn-based artillery adventure. |
| 主CTA | ゲームを遊ぶ | Play ARCLINE |
| 補助CTA | 遊びを30秒で見る | Watch 30 seconds of gameplay |
| 遊びの見出し | その地形に、次の一手がある。 | Read the terrain. Find your next move. |
| 破壊 | 遮蔽を壊して、射線をひらく。 | Break the cover. Open a line of fire. |
| 転移 | 着弾先を、次の射点に。 | Make your impact point your next firing position. |
| 反射 | 反射する面を使って、回り込む。 | Bounce your shot around an obstacle. |
| 世界の見出し | 次の地形では、どう撃とう。 | A new terrain. A new shot to try. |
| 世界の本文 | 海辺から、雲上の庭園へ。20のテーマ、100のステージで、射つ場所と弾の通り道を考えよう。 | From quiet shores to gardens in the sky. Choose where to fire and how to guide your shot across 100 stages in 20 themes. |
| 仲間 | ガンと、旅の途中で出会う仲間たち。10機それぞれの通常弾と必殺技で、違う撃ち方を見つけよう。 | Begin with Gun and meet companions along the way. Explore a cast of 10 machines, each with different normal shots and special attacks. |
| 物語の見出し | 一通の便りから、旅が始まる。 | One letter. A journey begins. |
| 物語の本文 | 止まった世界で便りを拾ったガン。道をつなぐ旅の、その理由をたどっていこう。 | Gun finds a letter in a world that has come to a halt. Follow a journey to reconnect its roads, and discover what set it in motion. |
| 操作1 | 位置と角度を合わせる。 | Choose your position and angle. |
| 操作2 | 発射を長押しして、強さを合わせる。 | Hold FIRE to set your power. |
| 操作3 | 指を離して、一射。結果を見て、次の一手へ。 | Release to fire. Watch the result and plan your next move. |
| 最後の呼びかけ | あなたの一射から、始めよう。 | Start with your own first shot. |

端末別の説明が必要な場合は操作欄に分岐を設ける。上記はタッチ操作の原稿案。キーボード・マウスの実際の対応を調べず、すべての入力方式に同じ文言を流用しない。

検索説明案：

> ARCLINEは、角度と力、射つ場所を選ぶターン制砲撃アドベンチャー。反射・地形破壊・転移を使い分け、10機の仲間と20テーマ100面を旅します。

> ARCLINE is a turn-based artillery adventure. Choose your angle, power and firing position, using ricochets, destruction and teleportation across 100 stages in 20 themes with a cast of 10 machines.

無料・インストール不要・スマホ対応のバッジは、公開する配信方式と対応条件を確認できたものだけを加える。プレイ時間の推定値やユーザー評価の架空表示を作らない。

## 3 映像とインタラクション

ファーストビューで見せるのは、多機能の一覧より一つの因果。狙った場所・弾・作用を同時に追える構図にする。現行の81面ヒーローや風景表現は世界紹介へ活かせるが、冒頭先行試撃の映像と混同しない。

既存の反射31面・破壊7面・転移4面デモは再利用候補。特に反射31面は第1章の冒頭に使わない。デモで全機能が初めから解放される印象を避ける。映像の再撮影時には実際の現行挙動との一致を確認する。

自動再生する場合は消音・停止・画面外停止を用意し、動きを抑える設定では静止画へ切り替える。動画の読み込み失敗時も説明とCTAを表示する。字幕で弾道や目標を隠さない。

## 4 現行からの更新方針

- 既存H1・日英・ゲーム直リンクを活かす。新規の抽象的なブランド説明だけに置き換えない。
- 冒頭の長い演出の有無や長さは現物で確認し、開始ボタン・実プレイの理解が遅れない構成を選ぶ。ゲームのプロローグ全編保持とは別のサイト上の判断。
- 2分50秒の既存ムービーは内容を確認して役割を判断する。まず30秒の実プレイ紹介を主動画にし、既存の長尺はネタバレ確認後に任意の世界紹介として扱う。
- 本編と同じ描画・操作列を使う既存デモを優先。架空の弾道や存在しない派手な作用を作らない。
- 制作時の主な正本は `index.html`、`site/site.js`、`site/experience.js`、`site/experience.css`。写真の記録は `site/gameplay-captures.json`。ゲーム版数をサイト改修のためだけに変更しない。

## 5 制作の完了条件

初見で「何をするか」「どこから遊ぶか」が分かる。実プレイとコピーが一致する。日英、スマホ相当の表示とPC、動画停止・低速回線・画像代替・動きを抑える設定で開始導線が使える。新しい導入を紹介するなら実装済みの版と一致する。必要な確認は[公開判断](MEASUREMENT.md)に従い、資料段階で確認済みとしない。
