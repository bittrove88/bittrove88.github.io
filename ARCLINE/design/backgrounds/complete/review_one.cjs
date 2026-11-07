/* Render one artwork for visual review, then check four viewport crops. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const id=process.argv[2],root=__dirname;
if(!id)throw Error('Pass a single scene ID');
const scene=JSON.parse(fs.readFileSync(path.join(root,'data',id+'.json'),'utf8'));
const renderer=fs.readFileSync(path.join(root,'renderer.js'),'utf8');
const svg=fs.readFileSync(path.join(root,'svg',id+'.svg'),'utf8');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const p=await b.newPage();await p.setContent('<script>'+renderer+'</script>');
  const result=await p.evaluate(async({scene,svg})=>{
   const A=ArcBackgroundCollection,c=document.createElement('canvas'),ctx=c.getContext('2d'),sizes=[];
   A.validate(scene);
   for(const [w,h] of [[1120,604],[844,390],[568,240],[393,852]]){
    c.width=w;c.height=h;A.draw(ctx,w,h,scene);const d=ctx.getImageData(0,0,w,h).data;
    let transparent=0;for(let i=3;i<d.length;i+=4)if(d[i]!==255)transparent++;
    sizes.push({width:w,height:h,transparent,png:c.toDataURL().split(',')[1]});
   }
   c.width=1120;c.height=604;A.draw(ctx,1120,604,scene);const a=ctx.getImageData(0,0,1120,604).data;
   const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();ctx.clearRect(0,0,1120,604);ctx.drawImage(img,0,0,1120,604);
   const d=ctx.getImageData(0,0,1120,604).data;let sum=0;for(let i=0;i<d.length;i++)if(i%4!==3)sum+=Math.abs(d[i]-a[i]);
   return {sizes,meanDifference:sum/(1120*604*3)};
  },{scene,svg});
  assert(result.sizes.every(x=>x.transparent===0));assert(result.meanDifference<.5);
  for(const size of result.sizes){const name=size.width===1120?id+'.png':`${id}-${size.width}x${size.height}.png`;fs.writeFileSync(path.join(root,'png',name),Buffer.from(size.png,'base64'));delete size.png;}
  const file=path.join(root,'review',id+'.json');let previous=[];if(fs.existsSync(file))previous=JSON.parse(fs.readFileSync(file)).renders||[];
  previous.push({iteration:previous.length+1,shapes:scene.shapes.length,...result});
  fs.writeFileSync(file,JSON.stringify({id,renders:previous},null,2)+'\n');
  console.log(JSON.stringify({id,iteration:previous.length,shapes:scene.shapes.length,meanDifference:result.meanDifference}));
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
