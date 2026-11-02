"""Prepare original-pixel ending assets; intentionally separate from runtime build."""
from pathlib import Path
from collections import deque
import hashlib,json,html,zipfile
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2]
PLAN=ROOT/'design/ending-roll-preparation/cutouts.json'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def mask_crop(raw,keep_largest=False,seeds=()):
 w,h=raw.size;px=raw.load();outside=bytearray(w*h);q=deque()
 def paper(x,y):
  r,g,b=px[x,y][:3];return r>=190 and g>=180 and b>=150 and r-b<58 and r-g<35
 def push(x,y):
  i=y*w+x
  if not outside[i] and paper(x,y):outside[i]=1;q.append((x,y))
 for x in range(w):push(x,0);push(x,h-1)
 for y in range(h):push(0,y);push(w-1,y)
 for x,y in seeds:push(x,y)
 while q:
  x,y=q.popleft()
  for a,b in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
   if 0<=a<w and 0<=b<h:push(a,b)
 seen=bytearray(w*h);components=[]
 for y in range(h):
  for x in range(w):
   i=y*w+x
   if seen[i] or outside[i]:continue
   seen[i]=1;q.append((x,y));part=[]
   while q:
    a,b=q.popleft();part.append((a,b))
    for c,d in ((a-1,b),(a+1,b),(a,b-1),(a,b+1)):
     j=d*w+c
     if 0<=c<w and 0<=d<h and not seen[j] and not outside[j]:seen[j]=1;q.append((c,d))
   components.append(part)
 components.sort(key=len,reverse=True);largest=len(components[0]);kept=components[:1] if keep_largest else [c for c in components if len(c)>=max(40,largest*.10)]
 alpha=Image.new('L',(w,h));a=alpha.load()
 for c in kept:
  for x,y in c:a[x,y]=255
 result=raw.convert('RGBA');result.putalpha(alpha);return result

def build():
 data=json.loads(PLAN.read_text());source_by={s['id']:s for s in data['sources']}
 for s in data['sources']:assert sha(ROOT/s['src'])==s['sha256'],s['src']
 for row in data['rows']:
  src=source_by[row['sheetId']];box=row['candidateCrop'];raw=Image.open(ROOT/src['src']).convert('RGB').crop(box)
  # Palette chips in the primary-art region are outside the machine silhouette.
  exclusion={
   'flint':[[1295,239,1355,301],[1331,202,1355,224]],'tideclaw':[[226,132,301,158]],'prism-guardian':[[1142,132,1212,155]],'whitehowl':[[226,598,306,620]],'polaris-core':[[838,598,915,621]],'archeart':[[1447,598,1530,621]],
   'reflect-ram':[[1068,149,1138,168]],'lift-mole':[[1352,149,1426,168]],'gale-scout':[[207,658,287,681]],'cinder-chef':[[498,658,576,681]],'ore-shepherd':[[780,658,854,680]],'bloom-tender':[[1056,658,1140,681]],'line-warden':[[1351,658,1435,681]]
  }.get(row['key'],[])
  # Exclusions affect only alpha; RGB is always the exact original crop.
  work=raw.copy();draw=ImageDraw.Draw(work)
  for x1,y1,x2,y2 in exclusion:draw.rectangle((max(0,x1-box[0]),max(0,y1-box[1]),min(raw.width-1,x2-box[0]-1),min(raw.height-1,y2-box[1]-1)),fill=(250,246,232))
  seeds={'bridge-mender':[(390,218),(510,245)]}.get(row['key'],[])
  image=mask_crop(work,row['key']=='flint',[(x-box[0],y-box[1]) for x,y in seeds]);alpha=image.getchannel('A')
  ground={'enemies':[297,298,300,296,598,601,602,601,897,901,901,901],'midbosses':[328,329,330,329,330,830,830,830,830,831],'bosses':[302,301,302,302,302,766,765,766,767,765]}[row['category']][row['sheetOrder']-1]
  ImageDraw.Draw(alpha).rectangle((0,ground-box[1],raw.width,raw.height),fill=0)
  image=raw.convert('RGBA');image.putalpha(alpha)
  dest=ROOT/row['output'];dest.parent.mkdir(parents=True,exist_ok=True);image.save(dest)
  row.update(status='prepared_visual_reviewed',source=src['src'],sourceSha256=src['sha256'],width=image.width,height=image.height,sha256=sha(dest),alphaBounds=list(alpha.getbbox()),rgbPixelsUnchanged=image.convert('RGB').tobytes()==raw.tobytes(),mask='border-connected paper removal; component filtering; no RGB modification',alphaOnlyExclusions=exclusion,backgroundSeeds=seeds,groundCutY=ground,anchor={'x':(alpha.getbbox()[0]+alpha.getbbox()[2])/2,'y':alpha.getbbox()[3]},displayMaxWidth=image.width,visualReview='Primary concept identity and completeness compared with source; no IN-GAME SPRITE',reviewLimitations=('Source snow retained at feet; no reconstruction of occluded body.' if row['key']=='whitehowl' else 'Source water stream retained.' if row['key']=='bloom-tender' else ''))
  assert row['rgbPixelsUnchanged'];assert alpha.getextrema()==(0,255)
 data['status']='PREPARED_VISUAL_REVIEWED_NOT_IN_RUNTIME';PLAN.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 # Review board only: assets themselves remain at native resolution.
 for category in ['enemies','midbosses','bosses']:
  rows=[r for r in data['rows'] if r['category']==category];cols=4 if category=='enemies' else 5;cw,ch=310,255
  board=Image.new('RGB',(cols*cw,((len(rows)+cols-1)//cols)*ch),'#173447');dr=ImageDraw.Draw(board)
  for n,row in enumerate(rows):
   x=n%cols*cw;y=n//cols*ch;im=Image.open(ROOT/row['output']);board.paste(im,(x+(cw-im.width)//2,y+35+(190-im.height)//2),im)
   dr.text((x+10,y+8),str(row['sheetOrder'])+' '+row['key'],fill='white');dr.text((x+10,y+230),str(row['width'])+' x '+str(row['height']),fill='#c8ded5')
  board.save(ROOT/f'design/ending-roll-preparation/{category}-review.png')

 cards=[]
 for row in data['rows']:
  src=source_by[row['sheetId']];x,y,r,b=row['candidateCrop'];w=r-x;h=b-y
  cards.append(f'<article data-group="{row["group"]}"><h3>{html.escape(row["name"]["ja"])} <small>{row["id"]}</small></h3><p>{row["sheetId"]}・{row["sheetOrder"]:02d} ／ {row["group"]} ／ {w}×{h}px</p><div class="preview"><img loading="lazy" src="../../{row["output"]}" width="{w}" height="{h}" alt="{html.escape(row["name"]["ja"])}"></div><p><a href="../../{row["output"]}" download>透過PNGを保存</a> ・ <a href="../../{src["src"]}">原画を見る</a></p><details><summary>切り抜き元の範囲</summary><div class="original" style="width:{w}px;height:{h}px"><img loading="lazy" alt="原画の大きい設定画" src="../../{src["src"]}" style="width:{src["width"]}px;height:{src["height"]}px;left:-{x}px;top:-{y}px"></div><p>座標：{x}, {y}, {r}, {b}</p></details><p>{html.escape(row["reviewLimitations"])}</p></article>')
 page='<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARCLINE エンドロール素材準備</title><style>*{box-sizing:border-box}body{margin:0;padding:22px;background:#102d40;color:#e8efdf;font:15px/1.6 system-ui}main{max-width:1500px;margin:auto}a{color:#bee4f2}button{min-height:44px;padding:8px 16px;font:inherit}nav{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}article{padding:12px;border:1px solid #759294;border-radius:10px}h3{margin:0}small{display:block;font-size:12px}p{font-size:13px}.preview{height:200px;display:grid;place-items:center;overflow:hidden;background-color:#173447;background-image:linear-gradient(45deg,#ffffff09 25%,transparent 25%,transparent 75%,#ffffff09 75%),linear-gradient(45deg,#ffffff09 25%,transparent 25%,transparent 75%,#ffffff09 75%);background-size:20px 20px;background-position:0 0,10px 10px}.preview img{max-width:100%;height:auto;object-fit:contain}.original{position:relative;overflow:hidden;background:#fff}.original img{position:absolute;max-width:none}body.light .preview{background-color:#eee}body.black .preview{background-color:#000}article[hidden]{display:none}</style></head><body><main><h1>エンドロール用・原画切り抜き32体</h1><p>通常敵12体／中ボス10体／大ボス9体＋アークハート。大きいコンセプト設定画から抽出し、元のRGB画素と原画は維持。ゲーム内画像・縮小スプライト・生成AIは未使用。本編への組み込み前の素材です。</p><p><a href="../../assets/ending/roll-cutouts/ARCLINE_Ending_Concept_Cutouts.zip" download>32体の透過PNGと台帳をまとめて保存（ZIP）</a> ／ <a href="cutouts.json">切り抜き台帳</a> ／ <a href="../../">ARCLINE</a></p><nav><button data-bg="">暗色・市松</button><button data-bg="light">明色</button><button data-bg="black">黒</button><select aria-label="表示グループ" id="filter"><option value="">全32体</option>'+''.join(f'<option value="{g}">{g}（{n}体）</option>' for g,n in data['groupCounts'].items())+'</select></nav><div class="grid">'+''.join(cards)+'</div><p>原画以上に拡大せず使います。ホワイトハウルの足元の雪、ブルーム・テンダーの放水は原画に含まれるものを保持しています。自機10機の背景付き原画は別途保持しており、集合用の透過化は未実施です。</p></main><script>document.querySelectorAll("[data-bg]").forEach(b=>b.onclick=()=>document.body.className=b.dataset.bg);document.getElementById("filter").onchange=e=>document.querySelectorAll("[data-group]").forEach(a=>a.hidden=!!e.target.value&&a.dataset.group!==e.target.value);</script></body></html>'
 (ROOT/'design/ending-roll-preparation/index.html').write_text(page)
 archive=ROOT/'assets/ending/roll-cutouts/ARCLINE_Ending_Concept_Cutouts.zip'
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
  for row in data['rows']:
   info=zipfile.ZipInfo(row['category']+'/'+row['key']+'.png',(2026,11,2,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,(ROOT/row['output']).read_bytes())
  info=zipfile.ZipInfo('cutouts.json',(2026,11,2,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,PLAN.read_bytes())
  info=zipfile.ZipInfo('README.txt',(2026,11,2,0,0,0));z.writestr(info,'Original concept crops; source paths, SHA256, crop rectangles and masks are recorded in cutouts.json. RGB values unchanged. No runtime sprites or generative redrawing. Native-resolution transparent PNG; do not upscale. Not integrated into the ending yet.')
 print('Prepared gallery and ZIP with32 PNGs and source manifest')
 print('Prepared32 transparent PNGs with exact original RGB and verified source hashes')
if __name__=='__main__':build()
