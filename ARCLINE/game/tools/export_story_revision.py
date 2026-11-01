"""Export bilingual prose changes against the published 0.14 story."""
from pathlib import Path
import json, subprocess, os

root=Path(__file__).resolve().parents[2]
base='3bdbf4f35367b1e9d2ef611454c681d7b84ce104'
def previous(name):
    return json.loads(subprocess.check_output(['git','show',base+':ARCLINE/'+name],cwd=Path(os.environ.get("ARCLINE_HISTORY_REPO",root.parent)),text=True))
old=previous('design/narrative_0_13.json')
old_shots=previous('design/cinematics_014/shots.json')['shots']
new=json.loads((root/'design/narrative_0_13.json').read_text())
parents=new['prologue']['frames']+sum(new['movies'].values(),[])+new['epilogue']['frames']
changes=[]
def diff(a,b,p=''):
    if isinstance(a,dict) and isinstance(b,dict):
        for k in sorted(a.keys()|b.keys()):diff(a.get(k),b.get(k),p+'/'+k)
    elif isinstance(a,list) and isinstance(b,list) and len(a)==len(b):
        for i,(x,y) in enumerate(zip(a,b)):diff(x,y,p+'/'+str(i))
    elif a!=b:changes.append({'path':p,'before':a,'after':b})
diff(old,new)
shots=[]
for s in old_shots:
    cues=[c for p in parents for c in p['subtitleCues'] if c['shotId']==s['id']]
    shots.append({'shotId':s['id'],'sceneId':s['scene'],'before':s['text'],'after':{l:'\n'.join(c['text'][l] for c in cues) for l in ['ja','en']},'textKeys':[c['textKey'] for c in cues]})
out=root/'design/story_emotion_0141';out.mkdir(exist_ok=True)
joins=[{'id':m['id'],'before':next(x for x in old['machines'] if x['id']==m['id'])['line'],'after':m['joinLine']} for m in new['machines'] if m.get('joinLine')]
(out/'TEXT_DIFF.json').write_text(json.dumps({'baselineCommit':base,'fromRevision':old['revision'],'toRevision':new['revision'],'changes':changes,'displayedSubtitleDiff':shots,'joinLineDiff':joins},ensure_ascii=False,indent=2)+'\n')
lines=['# ARCLINE 0.14.1 — 日英の文章差分','', '**結末までのネタバレを含みます。** 公開0.14のコミット `'+base+'` と現在の正本から生成。前版で画像原稿に分離していた表示文も比較対象とする。文章を短く分けるため、改行は別の字幕キューを示す。','', '元の0.13本文はGit履歴に保持。編集revisionは0.14.1、保存の物語namespaceは0.13.0、schema8と既読IDは維持する。','', '## 正本の主な差分','']
for c in changes:
    if c['path'].endswith(('/ja','/en')):
        lines.extend(['### `'+c['path']+'`','','**変更前**', '',str(c['before']),'','**変更後**','',str(c['after']),''])
lines.extend(['## 実際に表示する23ショットの字幕',''])
for s in shots:
    lines.extend(['### '+s['shotId']+' — '+s['sceneId'],''])
    for l in ['ja','en']:
        lines.extend(['**'+l+' / 変更前**','',s['before'][l],'','**'+l+' / 変更後**','',s['after'][l].replace('\n','\n\n'),''])
lines.extend(['## 加入時だけの一言','', '従来の表示は共通line。新しいjoinLineはこの場面だけの字幕であり、恒久lineと機体モットーは保持する。',''])
for j in joins:
    lines.extend(['### '+j['id'],''])
    for l in ['ja','en']:lines.extend(['**'+l+' / 変更前**','',j['before'][l],'','**'+l+' / 変更後**','',j['after'][l],''])
lines.extend(['## 変更しないもの','', '100面・10章・10機・20守り手、正式加入順、世界設定、古い便りの約束、戦闘と保存の仕様、採用23原画。加入時の4機の一言は恒久モットーとは別の場面字幕。','', 'P03-02は未来の出会いを示す5秒の象徴画へ変更。「過去の集合記録」という前版の追加解釈を削除した。E02の画面では帰還を点灯で示し、未帰還信号の消灯とは説明しない。',''])
(out/'TEXT_DIFF.md').write_text('\n'.join(lines))
print('Exported',len(shots),'bilingual displayed-subtitle comparisons and',len(changes),'canonical changes')
