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

BGM管理は `ui/audio-manager.js`、絶対時刻の回想構成は `ui/ending-credits.js`、必殺技説明・通知は `ui/special-ui.js`、追加CSSは `styles/media-ending.css` が正本です。`design/ending_media.json` が採用音源ハッシュ・検証済み尺・切抜き矩形・使用カードの正本で、`tools/build_media.py` が指定シートから派生PNG、監査台帳、`dist/media-data.js` を再生成します。元のM4Aやシートを変更しません。任意の全音源デコード検査は `python3 game/tools/validate_media.py --output /tmp/arcline-audio.json`（ffmpeg/ffprobeが必要）。

0.17.0の章再生は `ui/chapter-playback.js`、表示は `styles/chapter-flow.css`。地形の正本は `design/expedition_013/stage_blueprints.json`。実戦で再確認した証拠だけを `record_stage_verification.py` で記録し、blueprintのSHA256が一致する結果をガイドへ反映します。保存のcampaignVersionは変えず、地形更新はterrainRevisionで区別します。

0.17.1の開始画面の削除確認は `ui/onboarding.js`、明示削除の保存順序と失敗保護は `dist/save.js`。当時のプロローグ／エンディングの回転停止は0.20.0で廃止し、常時横向きへ統一しました。SDK・バックグラウンドの停止は維持します。削除はcanonical保存だけを初期状態で置換し、言語・操作配置・インストール案内と他アプリの保存領域を保持します。

0.18.0のエンディング正本は `../design/ending_roll.json`（固定境界、グループ、10機の加入順、動きの基準）。`tools/build_ending_roll.py` が、出典台帳と `../design/ending-roll-preparation/player-masks.json`・承認済みalpha PNGから42体と `dist/ending-roll-data.js`、`assets/ending/roll-manifest.json`、`player-cutouts.json` を再生成します。通常ビルドはPillowのみ。マスクの準備手順は `tools/prepare_player_masks.py`（OpenCV 5.0.0.93の任意の別環境）へ保存。元RGBと元画像SHAは検査し、派生PNGも全画素を照合します。

`ui/ending-credits.js` が本編・`ending-preview/` 共通の時刻／出演／ポーズを所有し、`dist/story-view.js` と `ending-preview/review.js` は同じrateで元字幕とカメラの時計を進めます。旧 `ending_media.json` の静止カード・風景と小切り抜きは履歴として保持し、新ロールでは参照しません。ロゴと承認7音源は引き続き同台帳を使用。正式生成の90出力と配布ZIPへ全42体を登録しています。

0.18.1は `design/ending_roll.json` のER-02〜05だけを再配分（敵7秒短縮→自機へ）。自機の登場間隔は区間長と6.6秒の通過から算出します。`ending-credits.js` の共通poseで斜め進入・旋回・加速・フェードを計算し、回転後の外接範囲と名前の余白も確保。CSS側に独立したアニメーション時計を作りません。

0.19.0のSFX正本は `../design/audio/sfx/runtime.json`、再生は `ui/sfx-manager.js`。`tools/build_sfx.py` が保存されたFINAL ZIPの全72件を検証し、採用37 WAV・manifest・`dist/sfx-data.js`を再生成します。`tools/generation.py`の正式計画・130出力と配布ZIPに登録。原本・旧試作・archive・試聴ファイルは配布しません。保存・物理カーソルから独立した音声カーソルで既存AudioContextを共有し、BGM・UI音を保持します。弾道の基本定数は `dist/combat.js` のballistics、明示的な武器効果は `weapons.js`。結果画面は `styles/chapter-flow.css`、10灯の原画座標は `dist/cinematic-player.js`。

0.20.0の見渡しカメラは `ui/map-camera.js`、表示は `styles/map-camera.css`。`dist/render.js` は明示的な `cameraView` を表示へ適用し、終了時は通常カメラへ即時復帰します。`ArcScreens` がフォーカス・背景入力の遮断を管理。見渡し中の進行停止と座標・入力解放は `dist/game.js` が接続し、物理・保存にはカメラ状態を渡しません。

常時横向き表示は手書きの `dist/viewport.js`。スマホ右側を上に固定し、ネイティブ角に応じた90／逆90／180度の補正と逆座標変換を共有します。元CSSを同じ順序で複製し、寸法メディアクエリ・viewport単位・セーフエリアを論理画面へ対応。固定オフや反転の選択、好みの保存は追加しません。

0.21.0の追加演出は `ui/experience.js` と `styles/experience.css` が正本。ボスカメラは表示変換のみで、操作前に通常へ戻します。`dist/character-hero.js` は加入時だけ承認済み透過カットを飛行表示。勝利BGMは `audio-manager.js` の対象判定と `game.js` の勝利tokenで一度だけ開始し、`design/ending_media.json` の採用②を全曲ループ。30/60の通常クリア幕間は同一曲、回想と100面は旧ルール。

0.21.1の100面は固定10機リレー。`dist/final-team.js` は手書き正本、`ui/final-team-ui.js`・`styles/final-team.css` は生成元。`stage_blueprints.json` のfinalBattleから4マップ各3,000pxを生成。各機の本体10ダメージ、耐久70％、最後ガン、全員条件を保存前にも検査。`record_final_stage.py` は4実戦だけ更新し他99面の履歴を保持。共通の幅は未指定なら従来1,000px、基礎弾道とAIは維持。

0.21.2：`dist/master-progress.js` と `ui/master-mode.js`／`styles/master-mode.css` で隠し進行設定。`save.replace` は保存成功後にライブ状態を更新。`engine.move` はプレイヤーの左右累計140pxを消費し、`boundary` で回復。`geometry.move` は強制変位と敵移動のため従来どおり。

0.21.3：100面のfixedHp70・requiredDamage5（表示100）・出現距離800px以上を正本データへ登録。`ui/final-travel.js` は実世界を変えない崩壊描画、`engine.next` は100達成時の交代を扱う。通常の敵手番・歩行140px・他99面は維持。

連続使用は `dist/crew-usage.js`、任意セーブfieldmachineUsage、`ui/crew-supply.js`／`styles/crew-supply.css` で管理。R.finish成功時に1回だけ記録し、他機体で5面の補充期間。100面は除外。

0.21.4：`dist/save.js` の `prepareDifficulty` が現在の攻略・保有機体・章在庫・補充・物語を退避し、選択先を復帰。選択中は従来のトップレベル、他2モードは追加field `difficultyProgress` に格納し、チェックポイントを二重保持しません。保存成功後にのみ切り替え、失敗時は旧モードを維持。既存データは現在の難易度へ割り当て、他の難易度は初期状態。schema8/reset2・保存キー・言語・操作設定は維持。初回の難易度確定では、直前に見たプロローグを繰り返しません。

`engine.enemyParameters` をメインとWorkerで共有。既存誤差×面倍率×モード倍率を浮動小数のまま使用し、敵計画の対自機damageだけにステージ倍率を一度適用。物理や最適解探索、特殊固定座標、部位破壊の半減は維持。`aim-guide.paths` と描画側は全モード全軌道。`ui/difficulty-ui.js` で試撃は任意、保存中の開始を遮断。`crew-usage.record` は100面・既クリア面を除外し、再プレイでは連続使用も補充残りも変えません。

最小検証：`tests/difficulty-balance.test.cjs`、`tests/aim-guide.test.cjs`、`tests/difficulty-browser.test.cjs`、`tools/difficulty-smoke.cjs`（Normal60・90・100各1戦）。旧最終戦の対戦フィクスチャは当時の敵バランスで保持し、今回の代表対戦とは区別します。

0.22.0：正本は `design/expedition_013/stage_blueprints.json` の指定30面。指示書と提案JSONは参照原本として保持し、現在の100面のHP70・各100・80行動などを保全して地形だけ移植。`map-revision-planner.cjs` は上限140pxの実移動、通常弾／実際の転移、現行Normalの敵反撃と勝敗で対象面だけ検証。`record_map_revision.py --evidence evidence/map-revision-0220` は新121戦だけを対象30面へ記録し、旧70面の証拠は保持。変更した地形には旧操作列を再利用しません。`build_campaign.py` → 正式 `npm run build` で攻略図とデータを同期します。

`tests/map-revision.test.cjs` は基準683d5b0に対して未変更70面の設計・実初期状態と13の実装モジュールを厳密照合。床座標による集計（高低差3以下0/60、同高度1/60）と、実行時安全配置後の同高度4/60を分離。後者89/92/94/98は全て変更対象外のため変更せず、実配置3以下の目標未達を記録します。

2026-11-04 射線復元：0.21.4で全モード同じ全軌道になった表示のみを修正し、`dist/aim-guide.js` の Easy 100%／Normal 軌道距離50%／Hard 予測なしと、`dist/render.js`／`ui/difficulty-ui.js` の Hard 発射方向ガイドを復元。初回試撃は引き続き任意。敵の誤差・敵ダメージ・難易度別セーブ・0.22.0の地形には変更なし。キャッシュ識別子のみ 0.22.1 に変更（アプリの `version` は0.22.0）。[修正記録](../docs/releases/aim-guide-restore-2026-11-04.md)。
