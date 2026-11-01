# GitHub Pages公開と復旧

1. mainの最新SHAを記録し、作業ブランチを切る。v0.15.5の復旧元は `9f908c38880922b78c4a767663abdbdc4b2bc267`。
2. game/runtime.jsonのversion/cacheVersionと生成元を更新し、npm run buildを実行する。
3. npm test、npm run check:generated、npm run test:browser、visual、deliveryを確認する。Node22以上、Python3.12以上、Playwright、Pillowが必要。
4. 作業ブランチを通常pushし、Pull Requestでmainへマージする。force push・別Gitの初期化はしない。
5. ARCLINE checksとPages build and deploymentの対象head_sha、status、conclusionを確認する。実行中の競合ワークフローを無条件にキャンセルしない。
6. `https://bittrove88.github.io/ARCLINE/` と `/ARCLINE/game/dist/` にアクセスする。release-infoの版数、JS/CSSのキャッシュ識別子、画像、初回フロー、既存セーブ再開を公開版で確認する。
7. iPhone Safari・Android Chromeの実機、ホーム画面起動・回転を別途確認する。エミュレーションを実機確認と呼ばない。
8. CHANGELOGへコミット・CI・公開確認・未確認事項を分けて記録する。

公開失敗時は該当runとjobのログを確認し、ビルド・デプロイ・反映遅延を区別する。必要なら原因修正後に再実行する。緊急復旧は安定版を通常のrevertコミットとして戻す。v0.15.5の追加onboardingフィールドは旧版が無視でき、セーブキー・resetVersionを上げたりlocalStorageを消したりしない。

配布ZIPはリポジトリ外に生成する。P03-01の封蝋除去以外の22枚と10機の原画を保護する。既存URL、.nojekyll、空白ルート、独自ドメインなしの設定を維持する。
