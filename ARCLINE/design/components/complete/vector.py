"""Small opaque vector scene graph shared by SVG and Canvas previews."""
import html,math
def n(v):return str(v)
def path(d,fill='none',stroke=None,width=1,screen=False,**extra):
 a={'type':'path','d':d,'fill':fill,**extra}
 if stroke:a.update(stroke=stroke,strokeWidth=width,screenStroke=screen)
 return a
def poly(points,fill,stroke=None,width=1,screen=False,**extra):return path('M'+' L'.join(n(x)+' '+n(y) for x,y in points)+' Z',fill,stroke,width,screen,**extra)
def line(points,color,width=1,screen=False,**extra):return path('M'+' L'.join(n(x)+' '+n(y) for x,y in points),'none',color,width,screen,**extra)
def rect(x,y,w,h,fill,stroke=None,width=1,**extra):return poly([(x,y),(x+w,y),(x+w,y+h),(x,y+h)],fill,stroke,width,**extra)
def ellipse(x,y,rx,ry,fill,stroke=None,width=1,**extra):
 a={'type':'ellipse','cx':x,'cy':y,'rx':rx,'ry':ry,'fill':fill,**extra}
 if stroke:a.update(stroke=stroke,strokeWidth=width)
 return a
def text(x,y,label,size=16,fill='#403F43',weight=400,**extra):return {'type':'text','x':x,'y':y,'text':str(label),'size':size,'fill':fill,'weight':weight,**extra}
def group(children,transform=None,clip=None,**extra):
 a={'type':'group','children':children,**extra}
 if transform:a['transform']=transform
 if clip:a['clip']=clip
 return a
def translated(children,x,y,**extra):return group(children,[1,0,0,1,x,y],**extra)
def clip_path(points):return 'M'+' L'.join(n(x)+' '+n(y) for x,y in points)+' Z'
def wrap(x,y,label,limit=28,size=16,fill='#6C6865',weight=400):
 return [text(x,y+i*size*1.6,label[j:j+limit],size,fill,weight) for i,j in enumerate(range(0,len(label),limit))]
def background(data,x,y,w,h):
 sw,sh=data['size'];s=max(w/sw,h/sh);items=[]
 for layer in data['layerOrder']:
  for shape in data['shapes']:
   if shape['layer']!=layer:continue
   c=data['palette'][shape['fill']]
   if shape['kind']=='path':items.append(path(shape['d'],c))
   else:items.append(ellipse(shape['cx'],shape['cy'],shape['rx'],shape['ry'],c))
 return translated([group(items,[s,0,0,s,(w-sw*s)/2,(h-sh*s)/2],role='background')],x,y,clip=clip_path([(0,0),(w,0),(w,h),(0,h)]))
def svg(scene):
 defs=[];count=0;prefix=scene['id'].replace('-','_')
 def emit(a):
  nonlocal count
  t=a['type'];esc=lambda v:html.escape(str(v),quote=True)
  if t=='group':
   attrs=''
   if a.get('transform'):attrs+=' transform="matrix('+','.join(n(v) for v in a['transform'])+')"'
   content=''.join(emit(child) for child in a['children'])
   if a.get('clip'):
    count+=1;key=prefix+'_clip_'+str(count);defs.append('<clipPath id="'+key+'"><path d="'+esc(a['clip'])+'"/></clipPath>');content='<g clip-path="url(#'+key+')">'+content+'</g>'
   if a.get('role')=='collisionOverlay':return ''
   return '<g'+attrs+'>'+content+'</g>'
  if t=='text':return f'<text x="{n(a["x"])}" y="{n(a["y"])}" font-size="{a["size"]}" font-weight="{a["weight"]}" fill="{a["fill"]}">{esc(a["text"])}</text>'
  attrs=' fill="'+a['fill']+'"'
  if a.get('stroke'):attrs+=' stroke="'+a['stroke']+'" stroke-width="'+n(a['strokeWidth'])+'" stroke-linejoin="round" stroke-linecap="round"'+(' vector-effect="non-scaling-stroke"' if a.get('screenStroke') else '')
  if t=='ellipse':return '<ellipse '+ ' '.join(k+'="'+n(a[k])+'"' for k in ['cx','cy','rx','ry'])+attrs+'/>'
  return '<path d="'+esc(a['d'])+'"'+attrs+'/>'
 content=''.join(emit(a) for a in scene['nodes'])
 return f'<svg xmlns="http://www.w3.org/2000/svg" width="{scene["width"]}" height="{scene["height"]}" viewBox="0 0 {scene["width"]} {scene["height"]}"><defs>'+''.join(defs)+'</defs><g style="white-space:pre;font-kerning:none;text-autospace:no-autospace" xml:space="preserve" font-family="Noto Sans CJK JP,Arial,sans-serif">'+content+'</g></svg>'
