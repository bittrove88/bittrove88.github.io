# ARCLINE 0.14.2 — 10機の原画確認と表示接続

10枚すべてを実際に開き、S01/S02と正式な機体データの配色・形状・武装へ照合した。取り違えはない。元UUIDのPNGと機体名のPNGは全バイト一致し、全て1672×941、10の異なるSHA-256を持つ。

|機体|目視で確認した特徴|原画|
|---|---|---|
|ガン|橙・クリーム、重装履帯、太い主砲|[gun](../../assets/characters/unlock/gun.png)|
|バン|赤い楔形装甲、大きな後部フィン|[ban](../../assets/characters/unlock/ban.png)|
|ヒバリ|青緑・黄、長いセンサーフィン、観測頭部|[hibari](../../assets/characters/unlock/hibari.png)|
|ハナ|ピンク・クリーム、花模様、三連装|[hana](../../assets/characters/unlock/hana.png)|
|リン|紫の低い車体、長い狙撃砲|[rin](../../assets/characters/unlock/rin.png)|
|モグ|黄色い作業機体、大型円盤カッター|[mogu](../../assets/characters/unlock/mogu.png)|
|コロ|黄緑の六輪ローバー、多孔砲口|[koro](../../assets/characters/unlock/koro.png)|
|ソラ|青・クリーム、上向きの大型迫撃砲|[sora](../../assets/characters/unlock/sora.png)|
|リコ|マゼンタ・黄緑、低い四輪車体、角形砲口|[rico](../../assets/characters/unlock/rico.png)|
|ユイ|ミント色、円環状の分節アーム、中央レンズ|[yui](../../assets/characters/unlock/yui.png)|

## 実装済み

[登録データ](../../design/cinematics_014/character_images.json)に元ファイル・ハッシュ・寸法・確認記録と保護領域を登録。`build_cinematic_data.py` で生成し、詳細・加入・公開キャラ画面へ接続した。名前・役割・モットーと能力・所有・編成は従来の正本を使う。

機体ごとの保護領域により、長い砲身、センサー、砲口、アームを残して画像内カメラを動かす。元PNGは編集・再圧縮しない。弱い背景のぼかしは同じ原画を使用し、低能力・動作軽減時には止める。最初から10枚を読み込まず、選んだ機体だけを読む。

読み込み中は正しい機体のCanvasを表示し、PNGが届いたら切り替える。失敗時もCanvasと編成操作を使える。ダウンロードHTMLはオフライン用のCanvas表示を明示し、PNG通信を要求しない。head/bodyの省略されたHTMLでも設定が確実に入るようにして、起動不具合を修正した。

戦闘中の機体描画、能力、射撃・移動、100面、物語本文と上映時計、保存schema8・所有・既読・持ち物を保持する。新しい進行リセットはない。

## 検証済み

|結果|範囲|
|---|---|
|[CHARACTER_ART_CONTENT](CHARACTER_ART_CONTENT.json)|10原画のID・ハッシュ・元バイト・確認情報、600の保護構図、動作軽減時の静止|
|[CHARACTER_ART_BROWSER](CHARACTER_ART_BROWSER.json)|実Chromiumの6サイズ×10原画、300の実描画構図、選択した画像だけの読み込み、低能力／動作軽減、遅延と欠落時のCanvas、操作継続|
|[CONTENT](CONTENT.json)|23本編原画と1,380構図、10PNGの登録、18戦闘・保存・地形・機体モジュールの保持|
|[CINEMATIC_BROWSER](CINEMATIC_BROWSER.json)|横縦6サイズで23場面と10機、9加入と保存選択、日英・停止・欠落時の復帰|
|[EMOTION_CONTENT](EMOTION_CONTENT.json)|日英の27字幕、十灯と静寂、公開順、既読・保留映画の互換|
|[PUBLIC_UI](PUBLIC_UI.json)|公開10機×日英×4サイズ、閲覧で保存を変えない、明示的な編成、実HTMLダウンロードと通信なしでの起動|
|[DELIVERY](DELIVERY.json)|4倍CPU制限と2コア／2GB設定、公開相対パスとフラットZIPで本編原画・機体PNGが読み込めること、タッチ停止・スキップ|
|[GENERATED](GENERATED.json)|19生成物の再生成一致|
|[BUNDLE_CHECK](BUNDLE_CHECK.json)|41実行ファイル＋23本編JPEG＋10機体PNG＝74エントリ。原画全バイト一致。ZIPはGit外|
|[RELEASE_WEB](RELEASE_WEB.json)|現行URL、告知とカタログ、4サイズの導線と表示、空白ルート・.nojekyll・CNAME不在|

[CHECKS](CHECKS.json)に実行コマンド、集計、最終ファイルのハッシュを保存。[844×390のガン](original-gun-844.jpg)、[390×844のユイ](original-yui-390.jpg)など、全10機×横縦2サイズの画面を保存した。

## 未確認

物理端末Safari／Android、ホーム画面インストール、YouTube本番SDK／認証と広域通信の速度は未確認。ブラウザー環境がfile://起動を拒否するため、同じダウンロードHTMLを通信無効の自己完結文書として検査した。前版で実施した全実戦を再実行したとは報告しない。
