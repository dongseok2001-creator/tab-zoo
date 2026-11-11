import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../extension/',import.meta.url);
function element(tag='div') {return {tag,style:{},attrs:{},children:[],innerHTML:'',className:'',
  append(e){this.children.push(e)},addEventListener(){},setAttribute(k,v){this.attrs[k]=v},
  html(){return `<${this.tag} class="${this.className}" style="${this.style.cssText||''}" ${Object.entries(this.attrs).map(([k,v])=>`${k}="${v}"`).join(' ')}>${this.innerHTML}${this.children.map(e=>e.html()).join('')}</${this.tag}>`}
};}
const nodes=new Map();
const ctx=vm.createContext({document:{querySelector(s){if(!nodes.has(s))nodes.set(s,element());return nodes.get(s)},createElement:element}});
const popup=await readFile(new URL('popup.js',root),'utf8');
vm.runInContext(await readFile(new URL('atlas-clips.js',root),'utf8')+'\n'+await readFile(new URL('sprite-art.js',root),'utf8')+'\n'+popup.slice(0,popup.lastIndexOf('init().catch')),ctx);
const fixtures=[['sauropod','Spotify','#1db954'],['trex','YouTube','#ff3b32'],['duck','Google','#4285f4'],['fox','Reddit','#ff702d'],['triceratops','GitHub','#777782'],['elephant','Discord','#5865f2'],['cat','Notion','#e4e4dc']];
fixtures.forEach(([species,siteName,accent],index)=>{
  ctx.model={species,siteName,domain:siteName.toLowerCase()+'.com',tab:{active:index===2},accent,shade:'#43555b',mark:'#e1e7c5',metrics:{},visual:{phase:index===3?'juvenile':'adult',scale:index===3?.4:.6,eggScale:.3,widthRatio:1,asleep:index===6,drowsyProgress:0,hopSpeed:2}};
  vm.runInContext(`model.shade=shiftColor(model.accent,-72);model.mark=shiftColor(model.accent,85);renderCreature(model,${index})`,ctx);
});
const locations=[[8,13],[59,10],[35,29],[9,52],[43,54],[68,44],[34,0]];
nodes.get('#creatures').children.forEach((e,i)=>{e.style.cssText=e.style.cssText.replace(/--x:[^;]+;--y:[^;]+;/,`--x:${locations[i][0]}%;--y:${locations[i][1]}%;`)});
let html=await readFile(new URL('popup.html',root),'utf8');
html=html.replace('<title>Tab Zoo</title>','<title>Tab Zoo — 맵·움직임 미리보기</title>')
 .replace('id="zoo-map"','id="zoo-map" data-theme="meadow"')
 .replace('<div id="creatures"></div>',`<div id="creatures">${nodes.get('#creatures').children.map(e=>e.html()).join('')}</div>`)
 .replace('생물을 가리켜 보세요','Google 오리')
 .replace('동물을 가리키면 이곳에 특징과 현재 모습을 보여줍니다.','납작한 부리와 작은 날개를 흔들며 뒤뚱뒤뚱 걷는 오리입니다.')
 .replace('<script src="popup.js"></script>','');
await writeFile(new URL('map-preview.html',root),html);
const cards=fixtures.map(([id])=>{
  ctx.speciesId=id;
  const name=vm.runInContext('spriteArt.find(a=>a.id===speciesId).name',ctx);
  const stages=['juvenile','adult','sleeping'].map(phase=>{
    ctx.phase=phase;
    const svg=vm.runInContext('finishedSprite(spriteArt.find(a=>a.id===speciesId),undefined,phase=== "sleeping"?"adult":phase,phase==="sleeping")',ctx);
    return `<div><div class="pixel-sprite finished-sprite phase-${phase} ${phase==='sleeping'?'sleeping':''}"><span class="sprite-facing">${svg}</span></div><small>${phase==='juvenile'?'미성숙체':phase==='sleeping'?'수면':'성체'}</small></div>`;
  }).join('');
  return `<article id="${id}"><b>${name}</b><section>${stages}</section></article>`;
}).join('');
await writeFile(new URL('growth-preview.html',root),`<!doctype html><meta charset="utf-8"><title>Tab Zoo 성장 그림 비교</title><link rel="stylesheet" href="popup.css"><style>html,body{width:100%;height:auto;overflow:auto}body{background:#18291f;color:#eee;font:13px Arial,sans-serif;padding:20px}main{max-width:620px;margin:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}h1{font-size:18px}article{padding:16px;background:#304d38}section{display:flex;justify-content:space-around;gap:16px;margin-top:12px}section>div{text-align:center}.sprite-facing{animation:none}.pixel-sprite{animation:none}small{display:block;margin-top:8px;color:#b9c9b6}</style><h1>미성숙체 · 성체</h1><main>${cards}</main>`);

const eyePreview=['sauropod','trex','triceratops'].map(id=>{
  ctx.speciesId=id;
  const name=vm.runInContext('spriteArt.find(a=>a.id===speciesId).name',ctx);
  const svg=vm.runInContext('finishedSprite(spriteArt.find(a=>a.id===speciesId),undefined,"adult",false)',ctx);
  return `<article><b>${name}</b><div class="preview-sprite">${svg}</div><small>눈의 앞쪽 상단 1/8 흰 포인트</small></article>`;
}).join('');
await writeFile(new URL('eye-glint-preview.html',root),`<!doctype html><meta charset="utf-8"><title>Tab Zoo — 눈 포인트 적용 결과</title><link rel="stylesheet" href="popup.css"><style>html,body{width:100%;height:auto;overflow:auto}body{margin:0;padding:24px;background:#18291f;color:#eef5e4;font:14px Arial,sans-serif}h1{font-size:18px;margin:0 0 6px}p{margin:0 0 20px;color:#b9c9b6}main{max-width:540px;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}article{background:#304d38;padding:14px;display:flex;flex-direction:column;align-items:center;gap:10px}article b{align-self:flex-start}.preview-sprite{width:128px;height:96px;display:grid;place-items:center}.preview-sprite>svg{width:128px;height:96px;image-rendering:pixelated}.sprite-facing{animation:none}small{color:#b9c9b6;font-size:11px}</style><h1>눈 흰 포인트 적용 결과</h1><p>눈의 앞쪽 상단 약 1/8만 흰색으로 두었습니다.</p><main>${eyePreview}</main>`);

const comparison=fixtures.map(([id,name,accent])=>{
  const art=vm.runInContext(`spriteArt.find(a=>a.id===${JSON.stringify(id)})`,ctx);
  ctx.previewAccent=accent;
  const current=vm.runInContext(`finishedSprite(spriteArt.find(a=>a.id===${JSON.stringify(id)}),{color:previewAccent},'adult',false)`,ctx);
  const replacement=id==='sauropod'?'<span class="coarse-candidate brachio" aria-label="브라키오 굵은 픽셀 시안"></span>'
    :id==='fox'?'<span class="coarse-candidate fox" aria-label="사막여우 굵은 픽셀 시안"></span>'
    :`<span class="current-sprite">${current}</span>`;
  return `<article><b>${name}</b>${replacement}<small>${id==='sauropod'||id==='fox'?'굵은 픽셀 시안':'현재 스프라이트'}</small></article>`;
}).join('');
await writeFile(new URL('coarse-comparison.html',root),`<!doctype html><meta charset="utf-8"><title>Tab Zoo — 성체·파비콘 색 비교</title><link rel="stylesheet" href="popup.css"><style>html,body{width:100%;height:auto;overflow:auto}body{margin:0;padding:24px;background:#18291f;color:#eef5e4;font:14px Arial,sans-serif}h1{font-size:18px;margin:0 0 6px}p{margin:0 0 20px;color:#b9c9b6}main{max-width:620px;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}article{min-height:132px;background:#304d38;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}article b{align-self:flex-start}.current-sprite{display:block;position:relative;width:96px;height:72px}.current-sprite>svg{position:absolute;inset:0;width:96px;height:72px;image-rendering:pixelated}.coarse-candidate{display:block;width:92px;height:72px;background-image:url('preview-assets/coarse-brachio-fox.png');background-size:177.4px 88.7px;background-repeat:no-repeat}.coarse-candidate.brachio{background-position:0 0}.coarse-candidate.fox{background-position:-88px 0}small{color:#b9c9b6;font-size:11px}</style><h1>성체·파비콘 색 비교</h1><p>성체 기준으로 각 도메인의 색상을 밝게 정규화해 입힌 모습입니다.</p><main>${comparison}</main>`);
