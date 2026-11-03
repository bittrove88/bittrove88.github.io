"""Refresh every atlas map and theme from canonical runtime/design data."""
from pathlib import Path
import json,re
from release import CONFIG
root=Path(__file__).resolve().parents[2]
p=root/'design/expedition_013/arcline_100_maps_atlas.html'
text=p.read_text()
levels=json.loads((root/'design/runtime_campaign_20x5.json').read_text())['levels']
design=json.loads((root/'design/expedition_013/stage_design.json').read_text())['stages']
def payload(tag):return json.loads(re.search(r'<script id="'+tag+r'" type="application/json">(.*?)</script>',text,re.S)[1])
rows=payload('payload');themes=payload('themePayload')
for l,d,row in zip(levels,design,rows):
    assert l['id']==d['stage']==row['id']
    geometry={k:l[k] for k in ['floors','components','features','spawn']}
    if l.get('worldWidth'):geometry['worldWidth']=l['worldWidth']
    if l.get('finalBattle'):geometry['relayMaps']=l['finalBattle']['maps']
    row.update(name=l['name'],goal=d['learningGoal'],terrainIntent=d['terrainIntent'],mainGimmicks=d['mainGimmicks'],geometry=geometry,actions=d['expectedActions'],limit=l['actionLimit'],tolerance=d['tolerance'],route=d['basicRoute'],alternative=d['alternativeRoute'],verified=d['testResult']['status'],recommendedActions=d['testResult'].get('recommendedActions'))
    for key in ['gunActions','teamActions']:
        if key in d['testResult']:row[key]=d['testResult'][key]
        else:row.pop(key,None)
for t in themes:
    first=(t['id']-1)*5;ld=levels[first:first+5];dd=design[first:first+5]
    components=[c for l in ld for m in l.get('finalBattle',{}).get('maps',[l]) for c in m['components']]
    t.update(features=sorted({f for d in dd for f in d['mainGimmicks']}),actionMin=min(d['expectedActions'][0] for d in dd),actionMax=max(d['expectedActions'][1] for d in dd),obstacles=len(components),destructible=sum(c['destructible'] for c in components),goals=[d['learningGoal'] for d in dd],terrains=[d['terrainIntent'] for d in dd])
for tag,data in [('payload',rows),('themePayload',themes)]:
    pattern=r'(<script id="'+tag+r'" type="application/json">).*?(</script>)'
    text=re.sub(pattern,lambda m:m[1]+json.dumps(data,ensure_ascii=False,separators=(',',':'))+m[2],text,count=1,flags=re.S)
text=re.sub(r'ARCLINE v\d+\.\d+\.\d+ / Campaign',f'ARCLINE v{CONFIG["version"]} / Campaign',text)
p.write_text(text)
print('Updated compact atlas:100 current maps,20 themes and all4 final arenas')
