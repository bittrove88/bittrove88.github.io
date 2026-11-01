"""Export current story prose and recruitment mapping for writers and reviewers."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[2];out=root/'design/expedition_013';d=json.loads((root/'design/narrative_0_13.json').read_text());crew=json.loads((out/'crew.json').read_text())
ja=lambda x:x.get('ja','') if isinstance(x,dict) else str(x)
lines=[f'# ARCLINE {d["revision"]} — 物語全文','', '**結末までのネタバレを含む制作者向け資料。** ゲームが使う `narrative_0_13.json` と `crew.json` から生成。操作機体と、物語上で同行している仲間は別に管理する。','', '## 世界と旅の核','']
for key in ['premise','world']:
    value=d[key]
    if isinstance(value,dict) and 'ja' not in value:
        for k,v in value.items():lines.extend([f'**{k}**', '',ja(v),''])
    else:lines.extend([ja(value),''])
lines.extend(['## プロローグ — 一機の出発',''])
for f in d['prologue']['frames']:lines.extend([f'### {f["id"]} {ja(f["title"])}','',ja(f['text']),'',f'場面：{f["visual"]}',''])
lines.extend(['## 章と全100面の復旧記録',''])
for c in d['chapters']:
    lines.extend([f'### 第{c["id"]}章 {ja(c["title"])} — {c["start"]}〜{c["end"]}面','',ja(c['journalOpening']),'',f'問い：{ja(c["question"])}',''])
    for n in range(c['start'],c['end']+1):
        g=next((g for g in d['guardians'] if g['stage']==n),None)
        if g:lines.extend([f'**{n:03} {ja(g["name"])}（'+('大ボス' if g['kind']=='boss' else '中ボス')+'）**','',f'登場：{ja(g["entrance"])}',f'特徴：{ja(g["feature"])}',f'停止後：{ja(g["aftermath"])}',f'返答：{ja(g["response"])}',f'本来の仕事：{ja(g["work"])}',f'背景：{ja(g["background"])}',''])
        else:
            normal=next(r for r in d['stageClears'] if r['stage']==n);lines.extend([f'**{n:03} 経路を確保** — {ja(normal["event"])}',''])
        recruit=next((r for r in crew if r['stage']==n),None)
        if recruit:lines.extend([f'**仲間と出会う：{ja(recruit["name"])}**','',ja(recruit['reason']),'',f'「{ja(recruit["line"])}」',''])
        for f in d['movies'].get(str(n),[]):lines.extend([f'**幕間：{ja(f["title"])}**','',ja(f['text']),''])
    lines.extend(['区間復旧：'+ja(c['reflection']),''])
lines.extend(['## エピローグ — 全線復旧の、その先',''])
for f in d['epilogue']['frames']:lines.extend([f'### {f["id"]} {ja(f["title"])}','',ja(f['text']),'',f'場面：{f.get("visual",f.get("scene",""))}',''])
lines.extend(['## 23画像の字幕キュー（日英）','', '本文の正本と同じ親シーンに保存。最小保持時間は全文が出た後の時間。実際の自動送りは翻訳の長さ・読了余裕も待ち、手動送りとスキップはいつでも使える。',''])
for f in d['prologue']['frames']+sum(d['movies'].values(),[])+d['epilogue']['frames']:
    for cue in f['subtitleCues']:
        lines.extend([f'### {cue["shotId"]} / {cue["textKey"]}', '', cue['text']['ja'], '', cue['text']['en'], '', f'初期開始：{cue["startAfterMs"]}ms／最小保持：{cue["minHoldMs"]}ms／{cue["emphasis"]}。複数文は前文の読了余裕の後へ繰り下げる。', ''])
lines.extend(['## 10機それぞれの願い、迷い、選択',''])
for r in crew:
    m=next(m for m in d['machines'] if m['id']==r['id']);lines.extend([f'### {ja(r["name"])} — '+('開始時' if r['stage']==0 else str(r['stage'])+'面で加入'),''])
    for label,key in [('魅力','charm'),('願い','desire'),('同行の理由','reason')]:lines.extend([f'**{label}**：{ja(r[key])}',''])
    for label,key in [('過去（核心を含む）','past'),('弱さ','flaw'),('旅で選んだこと','choice'),('旅の先','ending')]:lines.extend([f'**{label}**：{ja(m[key])}',''])
    if m.get('joinLine'): lines.extend(['**この旅の加入時の一言**：'+ja(m['joinLine']),''])
    lines.extend([f'成長記録の解放：{m["growthStage"]}面。帰還の核心を含む過去は90面以降。',''])
lines.extend(['## 仲間の関係',''])
for r in d['relations']:lines.extend(['### '+ja(r['title']),'',ja(r['body']),''])
lines.extend(['## 伏線と提示順','', '70面：十の空欄。80面：停止の後の届かなかった返事。90面：10機全員の帰還。95面：便りの宛先。100面：中枢の最後の仕事と全線復旧。','', '加入前の機体が地域の観測者として言及される場合はあるが、旅の正式な同行者として会話させない。旧所有者も、この旅の出会いの順序は同じ。',''])
(out/'STORY_JA.md').write_text('\n'.join(lines))
mapping=['# 仲間加入と物語・見せ場の対応','', '「以前から所有」は使用権、「今回の旅で合流」は物語上の出会い。旧所有者に再取得を要求しない。','', '|加入|機体|合流する理由|直後の役割・見せ場|','|---|---|---|---|']
showcases={'gun':'1–4：移動、狙い、発射、転移。港の便りを一機で運び出す。','hana':'6–9：鏡岸と壊れた門を越え、色の路線印を残す。','koro':'11–14：下り、梁下、小段差、連続床を転がり弾でつなぐ。','ban':'16–19：遺跡の門を開き、帰路も残す。','sora':'21–24：高い壁、山陰、雲、屋根の先へ落下弾を届ける。','hibari':'26–29：観測から返答へ。30の幕間で町の灯りが応える。','rico':'31–34：安全な1回反射から2回反射へ。失敗も記した地図。','mogu':'41–49：坑道と残す支柱、割る梁の選択。','rin':'61–64：板を壊す→開いた射線→精密弾。60の幕間で不確かさを共有。','yui':'81–89：複数の高さと牽引、つなぐことと離すこと。'}
for r in crew:mapping.append(f'|{r["stage"]}|{ja(r["name"])}|{ja(r["reason"])}|{showcases[r["id"]]}|')
mapping.extend(['', '勝利を保存してから加入画面を表示し、「このキャラに変更／今のキャラで続ける」を保存。30・60の幕間は加入確認の後。100面では四つの親場面・11ショットのエピローグへ。どの操作機体でも章の話者と共有の出来事は固定する。','', '加入未確認のまま終了すると `pendingRecruit` から再開。加入済み・練習・章のやり直しで所有数を増減しない。保存失敗時は選択を戻して同じ画面から再試行。',''])
(out/'CREW_STORY.md').write_text('\n'.join(mapping))
print('Exported current full story and recruitment/spotlight mapping')
