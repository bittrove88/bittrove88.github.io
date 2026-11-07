# 画像の出典・保存状況

[制作資料の入口](README.md) ／ [全案記録・74原画の出典索引](CHARACTER_PLANNING_ARCHIVE.md)

## 主人公ARCとジョブの参照

| 資料 | 設定上の扱い | 実ファイルの状態 |
|---|---|---|
| ユーザー提示のARC基本設定画 | [主人公基準](../01_protagonist/ARC_BASE.md)がFIXと記載。四輪・単眼・小型車体の基準 | 会話添付。予定名 `assets/ARC_BASE_ORIGINAL_REFERENCE.png` はリポジトリ未収録 |
| 12ジョブの最終ラインナップ | [ジョブ仕様](../02_jobs/JOB_CATALOG.md)と[決定事項](../00_overview/DECISIONS_AND_SCOPE.md)が外観FIXを記載 | 会話添付。予定名 `assets/ARC_12_JOBS_FIXED_LINEUP.png` はリポジトリ未収録 |

「FIXと記載された設定」と「PNGが保存されていること」を区別します。予定名へ別の画像を割り当てたり、原画の代わりを生成したりしていません。全案記録のARC参照行C0214〜C0227も、画像が未収録であることを明記しています。

## 1〜100面の参照原画

| 資料 | 原画 |
|---|---|
| 旧10機・ラインアップ | [原本S01](../../ARCLINE/design/sheets/0885817F-97A8-459D-8966-34AA3669AF2E.png) |
| 旧10機・詳細リファレンス | [原本S02](../../ARCLINE/design/sheets/95CB9F45-E52C-4228-9430-3FC587D53F94.png) |
| 大ボス10体 | [原本S03](../../ARCLINE/design/sheets/B4B8EF73-B773-4CF1-B7FC-97BBA5140165.png) |
| 中ボス10体 | [原本S04](../../ARCLINE/design/sheets/F6583EC0-F22F-4A5A-8861-ECFF63F442E3.png) |
| 通常敵12種 | [原本S05](../../ARCLINE/design/sheets/B8EFC1B9-9938-40F3-A9BB-26D58CD8E7F7.png) |

これらは既存世界で共用する原本のため移動しません。[原本台帳](../../ARCLINE/design/sheets/manifest.json)がファイル名・寸法・SHA-256を保持しています。

## 生成したVer.2敵の原画74枚

| まとまり | 原画数 | 台帳 |
|---|---|---|
| 第一案・54枠 | 18 | [manifest](ver2-first-proposal/manifest.json) |
| 第二案・改訂、中間案、没案、B01 r02 | 43 | [42回の履歴](ver2-second-proposal/ITERATIONS.json)と[B01の経緯](ver2-second-proposal/B01_CITADEL.md) |
| 独立した強敵・造形比較 | 4 | [manifest](strong-enemy-form-studies/manifest.json) |
| 強敵・外観初回 | 4 | [manifest](strong-enemy-appearance-studies/manifest.json) |
| 強敵・外観r02、保持部修正前を含む | 5 | [manifest](strong-enemy-appearance-studies/revision-02/manifest.json) |

原画名、生成元名、寸法、SHA-256は[全案記録の出典索引](CHARACTER_PLANNING_ARCHIVE.md)に一元記録しています。移動時に画像の再圧縮・切り抜き・名称変更は行っていません。敵の原画の正式採用・ゲーム素材への登録は未実施です。

## mainに追記された原本パッケージの記録

以下は既存仕様の原本4点の記録です。敵の生成原画74枚とは別の資料です。

| 原本名 | 参照用途 | 状態 |
|---|---|---|
| `ARC_BASE_ORIGINAL_REFERENCE.png` | ユーザーが作成した主人公ARCの三面図・大きな単眼・四輪・基本カラー | 主人公FIX |
| `OLD_10_CAST_STYLE_REFERENCE.png` | 既存1〜100面の10機。画風・セル塗り・ラインナップの誌面参照のみ | 旧キャスト |
| `ARC_12_JOBS_FIXED_LINEUP.png` | 直近「これでFIX」のジョブウェア一覧 | 外観方針FIX。日本語文字校正は別途 |
| `ARC_12_JOBS_PREVIOUS_CONCEPT.png` | 最終修正前の制作履歴。メカニック黄・ウォーリアー赤など旧案 | 過去案であり現仕様ではない |

**GitHub上のPNG原本は未配置です。** 原画は前回のローカル保存パッケージ `ARCLINEver2_design_spec_2026-11-04.zip` に保管されています。GitHubに同名PNGをアップロードする際は、原画を再生成・変更せずそのまま配置します。原画の外観と生成文字が食い違う場合は、`02_jobs/JOB_CATALOG.md` が正本。
