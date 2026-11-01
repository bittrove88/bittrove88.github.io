# ARCLINE

Canvas 2Dの砲撃アドベンチャー。現在の版数・キャッシュ・依存順序は [game/runtime.json](game/runtime.json) が正本。

[サービスサイト](./) ／ [ゲーム](game/dist/?v=0.14.4) ／ [今回の更新](updates/0.14.4/) ／ [10機の原画](characters/) ／ [100面の設計](design/expedition_013/)

## 開発・変更指示書（最新版）

**[ARCLINE 改善変更指示書 v0.15.5・全文21章／13変更要求](docs/change-requests/ARCLINE_CHANGE_REQUEST_v0.15.5.md)**

- [AI開発者の作業入口・指示の優先順位](AGENTS.md)
- [恒久的なアプリ更新・検証・公開ルール](docs/UPDATE_RULES.md)

v0.15.5は**今後実装する変更要求**であり、13項目が現時点でゲームに反映済みという意味ではありません。ユーザーの実装指示があるまで、文書を読んだだけでゲーム本体を変更しないでください。過去の \`CODEX_HANDOFF.md\`・\`CODEX_START_PROMPT.md\` は当時の履歴資料です。現行の実装事実には \`game/runtime.json\`・現行コードを用い、実装する将来要件には上記最新版変更指示書を用いてください。

## 現在のゲーム

ガンから始まり、5面でハナ、10面でコロ、15面でバン、20面でソラ、25面でヒバリ、30面でリコ、40面でモグ、60面でリン、80面でユイが加入する。20テーマ×5面、80通常戦・10中ボス・10大ボス。中ボスは5/15…95面、大ボスは10/20…100面。

通常弾は無制限。通常戦の必殺は自分の第2・4・6ターンに1発ずつ、守り手は最初から3発。機体変更ではHP割合・行動数・必殺残数を維持する。有限の武器・スキルは章ボスまで持ち越す。転移弾は4面から、着弾先へ移動して1行動を使う。

左の2スティックで移動と照準、右の長押し発射。外へずらして離すと取消。左右反転・日英・横向き戦闘・一時停止・難易度別の点線射線に対応する。初回に難易度を確定し、開始画面からも変更できる。

冒険開始後、ストーリーモードでクリア済み各面・9加入画面・プロローグと30/60面の幕間・エピローグを振り返れる。原画10枚と本編23枚は照合済み。再生は進行・編成・加入待ちを変更しない。

## 保存と今回の更新

schema8・resetVersion2。0.14.3で旧記録を一度全初期化する仕様へ更新した。**0.14.4は現在の記録を維持し、追加リセットしない。**旧タブ・端末が初めて0.14.3以降を読むと旧記録の一度の初期化が適用される。バックアップを残す0.13の移行仕様は履歴資料であり、現在の仕様ではない。

今回、入力・初回設定・機体変更・画面ライフサイクルを分離し、CSSの重複を整理。翻訳は更新された部分だけを処理し、版数と依存順序を一元化した。戦闘・地形・ダメージ・原画・物語本文は維持する。

[実装と検証](evidence/refactor-0144/README.md) ／ [編集する正本](game/README.md) ／ [現行のテスト入口](game/tests/README.md)

## 起動・生成・検査

```sh
python3 -m http.server 8000
# http://localhost:8000/ARCLINE/game/dist/
cd ARCLINE
npm ci
pip install -r requirements-dev.txt
npm test
npm run check:generated
npm run test:browser
npm run build
python3 game/tools/build_playables.py --output /tmp/arcline-package
```

生成・検査用の依存は配布ゲームへ含めない。配布ZIPはGit外へ出す。物理端末Safari/Android、インストールPWA、YouTube本番認証、人による全100面通しプレイは未確認。

## 制作資料と履歴

[物語全文・ネタバレ](design/expedition_013/STORY_JA.md) ／ [23ショット](cinematics/) ／ [デザイン原本](design/sheets/) ／ [0.14.3](updates/0.14.3/) ／ [0.14.2](updates/0.14.2/) ／ [0.14.1](updates/0.14.1/)

CODEX_HANDOFF、初期EXPORT_MANIFEST、旧版設計・検査結果は履歴として保持し、現在の合格数へ加算しない。ルートGitと通常pushを使い、別Gitの初期化・force push・他コンテンツへの無関係な変更をしない。
