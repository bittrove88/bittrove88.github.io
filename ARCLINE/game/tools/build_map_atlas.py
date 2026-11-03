"""Refresh the preserved compact atlas's derived payloads, retaining its page UI."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[2]
p=root/'design/expedition_013/arcline_100_maps_atlas.html'
text=p.read_text()
levels=json.loads((root/'design/runtime_campaign_20x5.json').read_text())['levels']
design=json.loads((root/'design/expedition_013/stage_design.json').read_text())['stages']
def payload(tag):return json.loads(re.search(r'<script id="'+tag+r'" type="application/json">(.*?)</script>',text,re.S)[1])
rows=payload('payload');themes=payload('themePayload')
# This request changes only stage100. Keep all other preserved atlas rows intact.
l,d=levels[99],design[99];row=rows[99];assert row['id']==100
row.update(name=l['name'],goal=d['learningGoal'],terrainIntent=d['terrainIntent'],mainGimmicks=d['mainGimmicks'],geometry={k:l[k] for k in ['floors','components','features','spawn']},actions=d['expectedActions'],limit=l['actionLimit'],tolerance=d['tolerance'],route=d['basicRoute'],alternative=d['alternativeRoute'],verified=d['testResult']['status'],gunActions=d['testResult'].get('gunActions'),recommendedActions=d['testResult'].get('recommendedActions'))
t=themes[19];t['obstacles']=sum(len(l['components']) for l in levels[95:]);t['destructible']=sum(c['destructible'] for l in levels[95:] for c in l['components']);t['goals'][-1]=d['learningGoal'];t['terrains'][-1]=d['terrainIntent']
for tag,data in [('payload',rows),('themePayload',themes)]:
 pattern=r'(<script id="'+tag+r'" type="application/json">).*?(</script>)'
 text=re.sub(pattern,lambda m:m[1]+json.dumps(data,ensure_ascii=False,separators=(',',':'))+m[2],text,count=1,flags=re.S)
p.write_text(text)
print('Updated compact atlas stage100 and theme20; page UI and other99 maps retained')
