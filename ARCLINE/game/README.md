# コードと生成物の編集先

|内容|編集する正本|生成先|
|---|---|---|
|版数・キャッシュ・依存順序|runtime.json|dist/release-info.js、HTMLリソースブロック、manifest|
|画面のフォーカス・Escape・復帰|ui/screens.js|dist/screens.js|
|スティック・発射・キー入力|ui/battle-input.js|dist/battle-input.js|
|初回難易度・クイック機体変更|ui/difficulty-ui.js、ui/machine-picker.js|同名のdist/*.js|
|ゲーム・追加UI・映画のCSS|styles/gameplay.css、styles/player-flow.css、styles/cinematics.css|dist/style.css、player-flow.css、cinematics.css|
|100面、機体加入、物語、字幕|../design内のJSONとtools/build_*|levels、crew、story、lessons、cinematic-data|
|戦闘進行、描画、保存、メニュー等|dist/*.jsのうち上記の生成対象を除くファイル|手書きで直接利用|
|ゲームのHTML本文|dist/index.htmlのruntimeコメント以外|本文は手書き、リソースブロックのみ生成|

生成ファイルの先頭コメントを確認してから編集する。手書きJavaScriptを単純な文字列置換で束ねるビルドは使わず、静的配布とNodeでの共有を維持する。

`npm run build` で生成、`npm run check:generated` で作業ツリーを変更せず一致を確認する。npmの依存は開発・検査用だけで、ブラウザの本番コードは外部ライブラリを必要としない。

画面制御はArcScreensがフォーカス・Escape・inertの復帰を所有し、各画面は内容と完了動作を所有する。ArcBattleInputは入力状態を所有し、ゲーム進行へ軸と操作意図を渡す。物理計算・HP・在庫の正本は既存エンジンのまま。
