# 紹介サイトの起動停止修正

基準 main `1f048574`（0.31.2）。ユーザーの「修正しよう」「サイト更新は後でまとめてやる、不具合だけ」を受けた修正。

紹介HTMLが `boss-actions.js` を読み込まず、エンジン初期化時の `BossActions.attachments` で停止していた。`enemy-actions.js` より前にdeferで追加し、ゲーム本体、版数、画像、紹介文、デザインを維持する。

新しい `site-startup` ブラウザ検査は、画像の取得元ハッシュ検査から独立して実際のHTMLを開く。基準mainでは同じ参照エラーで失敗し、修正後は5画面幅の85項目が成功した。ヒーロー・4マップ・10機体、機体とデモの切替、保存不変、例外とHTTP失敗0件を確認。

[修正前の失敗](../../evidence/site-startup-fix-20261109/BASELINE_FAILURE.log)／[修正後の結果](../../evidence/site-startup-fix-20261109/SITE_STARTUP.json)。検証計画は `ARCLINE/verification-plan.json`。

紹介画像の再撮影と古いsourceHashesの更新は、ユーザー指定に従い後日に分離する。従来service-site検査のハッシュ失敗を今回の成功へ書き換えない。物理端末と実際に聞こえる音は未確認。マージ・配信・公開URL確認は別工程。
