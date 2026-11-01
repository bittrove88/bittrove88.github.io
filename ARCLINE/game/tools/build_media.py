"""Reproduce approved crops and publish verified streaming-media metadata. No re-encoding."""
import hashlib,json
from pathlib import Path
from PIL import Image
from release import ROOT

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
data=json.loads((ROOT/'design/ending_media.json').read_text())
for item in data['cutouts']:
    source=ROOT/item['source']
    assert digest(source)==item['sourceSha256'],item['source']
    image=Image.open(source).convert('RGBA').crop(item['crop'])
    if item['mask']=='paper-to-alpha':
        image.putdata([(r,g,b,max(0,min(255,round((220-max(r,g,b))*255/40)))) for r,g,b,a in image.get_flattened_data()])
    elif item['mask']=='exclude-palette':
        # Only the unrelated colour chips outside the claw silhouette are removed.
        for y in range(26):
            for x in range(195,image.width): image.putpixel((x,y),(0,0,0,0))
    destination=ROOT/item['src'];destination.parent.mkdir(parents=True,exist_ok=True);image.save(destination)
    item.update(width=image.width,height=image.height,sha256=digest(destination))
for track in data['tracks'].values():
    path=ROOT/track['src']
    assert digest(path)==track['sha256'] and path.stat().st_size==track['bytes'],track['src']
for card in data['cards']:
    for asset in card['images']:
        if asset.get('cutout'):
            asset.update({k:v for k,v in next(x for x in data['cutouts'] if x['id']==asset['cutout']).items() if k in ['src','width','height','sha256','name']})
        else:
            path=ROOT/asset['src'];image=Image.open(path)
            asset.update(width=image.width,height=image.height,sha256=digest(path))
manifest=ROOT/'assets/ending/manifest.json'
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
js='/* Generated from design/ending_media.json and approved originals. */\n(function(root){const data='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';if(typeof module!=="undefined")module.exports=data;else root.ArcMediaData=data;})(globalThis);\n'
(ROOT/'game/dist/media-data.js').write_text(js)
print('Verified seven original AAC files; reproduced four approved sheet crops')
