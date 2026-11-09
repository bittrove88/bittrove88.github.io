# 0.29.6: damage labels and Hibari rings
Base: 415e7bc (0.29.5). Approved: one numeric cumulative body-damage label per target/attack, no HIT/CORE/PART/MAX/count labels, weak/critical conveyed by color, no part numbers; keep HP/armor rules. Simplify player special/weapon notes without formulas.
Investigate Hibari: bright spiral does not follow expanding collision circle; a single center-directed contact ray can miss an exposed arc behind partial cover. Reproduce both before changing runtime. Keep 11+12+12 ordinary cap35, boss weak cap45, two rings0.2s apart/radius170/duration0.75, fixed-wall occlusion and terrain unchanged. Use a swept ring front instead of repeatedly accepting the full interior.
Sources: handwritten physics.js/effects.js/render.js, definitions.json for concise notes, runtime.json for version0.29.6. Generated catalogs/review/atlas/cache must match. Existing historical source protection must reverse this exact new delta before the0.29.3 delta, preserving other files.
Validation: focused native Hibari tests for visible edge/partial/full cover/ellipse/boss/HP and ring cadence; 32 attack damage timelines; real Canvas cumulative labels and two ring footprints at PC/mobile,30/120fps; special damage/targeting/evolution, attack motion and native battle Worker continuity; generated equality and package. Reuse prior unrelated AI/map/audio/story/master successes. No main merge or publication in this task.

修正前は低い障害物が敵の中心への線だけを遮る条件で、到達する2光輪の合計が0となった。期待値は12×2＝24。hibari-ring検査の先頭で再現した。

受領動画：10面タイドクロー、ヒバリ48度・表示61％。部位5.1/12/2.9で爪20HPが壊れ、本体200HPが残る。2枚目の未使用9.1が捨てられる処理を追加再現した。同じ1光輪12の予算で、部位を壊した余りを本体へ運び、190.9HPになることを単体と実Canvasで検査する。内部威力は60.67620434。動画は作業環境内だけで参照し、原本・フレームはGitへ追加しない。
