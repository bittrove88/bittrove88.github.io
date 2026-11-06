# 52面｜一片の横穴と開いた縦穴

完成設計・レビュー待ち・動作未検証。ゲーム本体・承認済み18面は変更していない。

[全景](stage_052_full.svg) ／ [旧案比較](stage_052_compare.svg) ／ [座標](stage_052_proposal.json)

**攻略の核：** 横穴を壊して低く通すか、開いた縦穴から断崖上へ出る。

**その面自身の旧案からの変更：** 西張り出しを後退してP0頭上を開け、破壊窓を80pxの独立片に。

**他面との違い：** 破壊の一手と縦の迂回を比較する断崖。二枚隔壁とは分ける。



制作→実描画→内部確認→必要な改善→修正箇所の再確認の順で仕上げた。内部確認：P0の上方を開放し、横窓と縦穴の二経路を全景・同縮尺比較で確認。横窓の1片表示を追加し、再描画して確認した。

最低限のデータ整合、部品ID、明白な自己交差、代表位置の支持・めり込み、構想射撃空間と全景を確認。破線は構想空間であり、実入力・実弾道の記録ではない。直射の確認は代表位置に限り、全角度の保証ではない。

敵 enemy:spike・HP欄5・16行動・歩行140px、既存AI・物理・難易度・所持品を維持。ボスの本体/部位HPとHP欄は別で既存定義を変更しない。射撃後はその位置で反撃を受ける。同手番の退避や無償待機は仮定しない。

実歩行・転移着地・機構を含む命中・敵AI/反撃・勝敗は未検証。全49面の設計承認後に一括検証する。旧案の試験記録を新形状の成功証拠にしない。

参照：[元JSON](https://github.com/bittrove88/bittrove88.github.io/blob/review/arcline-map-redesign-handoff-20261105/ARCLINE/design/stage_reviews/stage_052_proposal_v4.json) ／ [元個別レビュー](https://github.com/bittrove88/bittrove88.github.io/blob/review/arcline-map-redesign-handoff-20261105/ARCLINE/design/stage_reviews/stage_052_review_v4.md)。この面の元案を起点とし、直前の面の形状をひな形にしていない。
