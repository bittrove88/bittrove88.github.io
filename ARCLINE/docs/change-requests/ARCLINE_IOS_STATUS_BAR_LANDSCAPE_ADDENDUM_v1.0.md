# ARCLINE iPhone横向き表示・OSステータスバー干渉の追加変更指示書 v1.0

- 作成：2026-11-04（JST）
- 対象現行版：ARCLINE 0.21.3（対象の挙動は0.20.0で導入された横向き固定に関連）
- 状態：**実装前の変更指示**。本書の登録のみでWebアプリへの反映・iPhone検証・公開が済んだとは扱わない。
- 優先：2026-11-04のユーザー追加依頼。本書は [横向き固定／マップカメラ v0.20.0](ARCLINE_MAP_CAMERA_v0.20.0.md) のiOS表示部分を補足する。戦闘・保存・100面の戦闘条件には触れず、現行0.21.3を優先する。

## 0. ユーザー報告と不具合の再現

iPhoneのスクリーンショットで、ARCLINEのコンテンツは横向きに描画される一方、時刻「0:18」、Dynamic Island、電波、Wi-Fi、バッテリー「60%」等の**OSステータス表示が端末の縦向き座標に残っている**。ロビーの「ステージ91を開始」などがゲーム論理横長レイアウトのままになっている。ユーザーは、直近の強制横向き実装後からOS表示が現れる状態を問題として報告。

**原因候補（コード確認済み）**：

- `game/dist/viewport.js` の `ArcViewport.fit()` は、iPhone画面が縦長の場合、`#app` を `transform: translate(...) rotate(90deg) scale(...)` で横長にする。これは**Webコンテンツだけ**を回転し、iOSのステータスバー・Dynamic Island・ネイティブ画面方向を回転／非表示にはしない。
- `game/dist/index.html` は `apple-mobile-web-app-status-bar-style=black-translucent`、`apple-mobile-web-app-capable=yes`、`viewport-fit=cover` を指定。前者はステータスバーを消す指定ではなく、コンテンツとステータスバーが重なる可能性がある。Safariタブでは期待した挙動も異なる。
- `game/dist/app.webmanifest` の `display:standalone` と `orientation:landscape` は起動形態・方向の**希望値**で、iOSでOS全画面・ステータスバー非表示を保証しない。
- `game/dist/fullscreen.js` の Fullscreen API および `screen.orientation.lock('landscape')` は端末・起動形態により未対応／拒否され得る。成功の確認なく全画面と見なしてはいけない。
- 実機の起動形態（Safariタブかホーム画面Webアプリか）、iOSバージョン、端末の回転ロックは**未確認**。上記を確定原因と断定せず、その条件を取得して再現を記録する。

## 1. 目的と優先順位

**最優先：ゲームの操作領域とiOSシステム表示の重複・誤タッチ・欠けをなくす。** できる環境ではOSネイティブの横向き・真の全画面を優先し、従来どおり「スマホの物理的な右側が画面上部」の横長ゲーム体験を維持する。

ユーザーが求める「時刻・バッテリー等を表示させない」は**システムが許す場合のみ完全非表示を目標**にする。通常のSafariタブやiOSホーム画面WebアプリではOSステータスバー表示が残る場合があり、純粋なHTML/CSS/JavaScriptだけで完全非表示を保証できない。アプリ側で`display:none`や`z-index`を使ってOS表示を消すことはできない。実現不能な環境は「表示は残るがゲームを妨げない安全配置」を合格条件とし、**完全非表示の達成とは呼ばない**。

完全にOSステータス表示を隠すことを必須要件にする場合、WKWebView等のネイティブアプリ化を別途設計・許可する必要がある。今回のWeb修正だけで「すべてのiPhoneで非表示」を約束しない。

## 2. 修正要求（実装順）

### IOS-STATUS-01：起動モードとOS方向を正しく判別する

`navigator.standalone`、`matchMedia('(display-mode: standalone)')`、`matchMedia('(display-mode: fullscreen)')`、`document.fullscreenElement`、`screen.orientation?.type/angle`、`window.orientation`、`innerWidth/innerHeight`、`visualViewport`、`safe-area-inset-*` を収集し、Safariタブ・ホーム画面Webアプリ・実際のフルスクリーンを区別する。目的外の機密情報・個人情報は保存／送信しない。時刻・バッテリー実数は記録不要。

`orientation:landscape` のマニフェスト値やCSSで回転した論理レイアウトの状態を、ネイティブ横向きに成功した証拠として扱わない。

### IOS-STATUS-02：可能ならネイティブ横向き／フルスクリーンを優先

ユーザージェスチャーが必要なAPIはゲーム開始等の既存操作からのみ試行。Fullscreen API／Screen Orientation API が利用でき、許可され、実際に適用された場合はネイティブ向きに合わせた通常の横長UIを表示する。未対応・拒否・無効化・ページ再表示時は静かにフォールバックし、ポーズやゲーム開始を妨げない。

iOS SafariではAPI非対応があり得るため、見かけ上の`rotate(90deg)`を「OSの横向き固定成功」として報告しない。端末の回転ロックを解除するよう**強制しない**。

### IOS-STATUS-03：ステータスバー領域の安全な回避（必須）

ステータスバー／Dynamic Island／ホームインジケータ等に重ならない**実効コンテンツ矩形**を端末のネイティブ座標で算定してから、横長の論理ゲーム領域へ変換する。現在の `ArcViewport.fit()` が行う `visualViewport` の補正、`transform`、`responsiveSheets()` のsafe-area回転を一体で点検し、OS余白の**二重加算、逆側への変換、スケール切り欠き**を解消する。

システム表示が残る環境では、縦向きのOSステータスバーの占有域をゲームから除外した安全矩形の中に横長UIをフィットさせ、必要なら背景と同系色の**非操作余白**を設ける。端末の外枠・Dynamic Islandの形状や大きさを固定ピクセルで決め打ちしない。safe-areaが未対応またはゼロになる条件では実機計測に基づく保守的なフォールバックを用いる。

画像全体を画面外へ切る、OSステータスバーを上からダミー要素で覆う、ゲームUIをOSの不可触領域へ置く、またはスクリーンショットだけ見栄えを揃えて操作を破壊する対応は禁止。

### IOS-STATUS-04：メタタグ・PWA設定を検証する

`black-translucent` はステータスバー非表示の指定ではない。現行iOS/WebKitでは非推奨に関する報告もあるため、**除去してOS既定に合わせることを第一候補**とする。`apple-mobile-web-app-capable` と既存PWA起動機能は維持する。`theme-color` と `background-color`、`html/body/#app` の背景を揃えてステータスバー領域の視覚的な不連続を抑える。

`viewport-fit=cover` を有効にする場合は安全矩形を必ず実機検証する。PWA `display:fullscreen` の指定だけで非表示を実現できると判断しない。Android・PC側のfullscreenやレスポンシブを破壊しない。

### IOS-STATUS-05：ゲームの入力と画面切り替えを守る

縦向き端末＋CSS回転、実ネイティブ横向き、逆向き、180度、端末回転ロック有無、Dynamic Islandの領域、iPhoneのスワイプ操作、PWA再起動、Safariの表示倍率、Safariアドレスバー変動、画面復帰時のすべてで次を保証する。

- ロビー（ユーザーのスクリーンショットではステージ91開始）、設定、機体選択、ストーリー、プロローグ、エンディング、戦闘、マップ見渡し、ポーズのUIが欠けない。
- `ArcViewport.point()`/`rect()` とヒットテストが表示位置に一致し、照準、移動、発射、転移、ボタン操作、縦スクロールが正常。回転中にチャージが解除され、誤発射しない。
- セーフエリア側のタップ・スワイプでOS通知・ホーム操作の誤起動や意図しないゲームボタン押下を誘発しない。
- 見渡しから戻っても元の位置・倍率・戦闘状態を保持する。

### IOS-STATUS-06：既存仕様は維持

「右側が上」の横長論理画面、オンオフ設定なし、縦向き判定でもプレイ・物語・エンディングを停止しない、既存カメラ・照準・物理・移動上限140px、ステージ100の**現行0.21.3**の固定リレー・機体HP70・各100ダメージ・4戦場・80行動、全100面進行、難易度、セーブschema8/resetVersion2、武器と仲間、PWAの公開入口、BGM等は不変。端末別の起動判定のために既存進行のリセットを行わない。

## 3. 実装ファイルと検証記録

- `game/dist/viewport.js`：OS方向／表示モードと論理方向の区別、safe-areaを先に適用した実効矩形、回転・タッチ逆変換。
- `game/dist/index.html`、`game/dist/app.webmanifest`：PWA起動条件／メタタグ、`black-translucent`候補の精査。
- `game/dist/fullscreen.js`：Fullscreen API／orientation.lockの結果確認、未対応時の安全フォールバック。
- `game/styles/gameplay.css` と生成済み `game/dist/style.css`、必要なUI正本：ゲーム全画面・OS余白・セーフエリアに伴う寸法調整。
- `game/tests/landscape-view-browser.test.cjs` ほか：safe-areaの模擬値、端末向き、アプリ領域、タッチ回転、OS領域を模擬した回帰テスト追加。
- バージョン・生成依存・キャッシュは、実装する際に`game/runtime.json`／正式ビルドへ反映。今回は設計文書のみの保存。

**Safari/実機試験はブラウザ自動テストで代替できない。** スクリーンショットにあった時刻等のOS表示は、Playwright/Chromiumのページ描画には存在しないため、実機スクリーンショットでの確認を必須とする。

## 4. 検収表

| 起動条件 | 期待結果 |
|---|---|
| iPhoneホーム画面Webアプリ・縦持ち・回転ロックON | ゲームは指定の横長のまま継続。残るOS表示とゲーム操作領域の重複ゼロ。 |
| iPhoneホーム画面Webアプリ・端末を横持ち・回転ロックOFF | 対応するOSではネイティブ横向きに同期。OSバー表示はiOS実際の挙動を記録し、非表示を偽らない。 |
| iPhone Safariタブ起動（ホーム画面未登録） | ネイティブのSafari UIを勝手に隠したと主張せず、ゲームは安全余白で操作可能。 |
| Dynamic Island搭載iPhone／非搭載iPhone | 時刻・バッテリー・切り欠き・ホームインジケータでゲームの主要UI・タッチ目標が欠けない。 |
| 90°／逆90°／180°、回転中、再起動、背景復帰 | ワールド・射角・ポインターがずれず、誤発射なし。 |
| ロビー・ステージ91・戦闘・マップ・動画 | ボタンが見切れず、画面外の入力、システム領域の誤タッチがない。 |
| Android／PC | 既存のネイティブ全画面・横画面、画面カメラを回帰破壊しない。 |

**合格を分けて報告する**：(A)システム表示が実際に非表示になった機種／起動モード、(B)システム表示は残るがUIの重なりがゼロの機種／起動モード、(C)未確認または未解消。AとBを合算して「全画面非表示成功」として報告しない。

## 5. 禁止する実装・完了の定義

- HTML/CSS/JavaScriptでiOSステータスバーを完全に非表示にできると保証しない。
- `black-translucent` や `viewport-fit=cover`、`display:fullscreen` を指定するだけで解決としない。
- ステータスバーやDynamic Islandをゲーム上の矩形で塗って隠したように見せない。
- 自動Chromiumテストの成功を物理iPhoneでの成功と混同しない。
- 既存の寝転び用横向き固定を撤回したり、縦向きだからゲームを停止したりしない。

今回のGitHubへの**変更指示書登録は完了しても**、ゲームへの反映、実機の表示改善、公開URLの確認を完了と扱わない。iOSのプラットフォーム制約でAを満たせない場合は、Bを安全なWeb版の検収基準とし、OS表示を本当に消す要件はネイティブアプリ化の別提案として区別する。

## 参照（実装時に改めて互換性を確認）

- [Apple: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)（standaloneでもステータスバーは残る場合がある）。
- [MDN: Web manifest display](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display)（standaloneとfullscreenの違い、実際にサポートされる表示モード）。
- [WebKit Bug 317153](https://bugs.webkit.org/show_bug.cgi?id=317153)（新しいiOSでは`black-translucent`非推奨とWebアプリのステータスバー制限についてのWebKit側の説明）。
