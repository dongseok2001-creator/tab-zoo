import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../extension/', import.meta.url);
const art = await readFile(new URL('sprite-art.js', root), 'utf8');
const clips = await readFile(new URL('atlas-clips.js', root), 'utf8');
const popup = await readFile(new URL('popup.js', root), 'utf8');
const html = await readFile(new URL('popup.html', root), 'utf8');
const css = await readFile(new URL('popup.css', root), 'utf8');

function element() {
  return { style: {}, children: [], attributes: {},
    append(child) { this.children.push(child); },
    addEventListener() {},
    setAttribute(key, value) { this.attributes[key] = value; },
  };
}

test('popup loads artwork before rendering and preserves tab actions, colours and stages', () => {
  assert.ok(html.indexOf('src="sprite-art.js"') < html.indexOf('src="popup.js"'));
  assert.match(css, /#observed-favicon-fallback\[hidden\]\s*\{\s*display:none;/, 'the fallback badge stays hidden while a favicon is visible');
  const nodes = new Map();
  const context = vm.createContext({ URL, document: {
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, element());
      return nodes.get(selector);
    },
    createElement: element,
  } });
  // Startup needs Chrome APIs; render the real popup functions with DOM stubs.
  vm.runInContext(clips + '\n' + art + '\n' + popup.slice(0, popup.lastIndexOf('init().catch')), context);
  context.chrome = { runtime: { getURL: (path) => `chrome-extension://tab-zoo${path}` } };
  context.tab = { url: 'https://example.com/article', favIconUrl: '' };
  assert.equal(vm.runInContext('faviconForTab(tab)', context), null, 'tabs without a favicon use the observer fallback');
  context.tab.favIconUrl = 'https://example.com/favicon.ico';
  assert.match(vm.runInContext('faviconForTab(tab)', context), /^chrome-extension:\/\/tab-zoo\/_favicon\//, 'tabs with a favicon use the protected favicon endpoint');
  context.pixels=[255,0,0,255,0,0,255,255,255,255,255,0];
  assert.equal(vm.runInContext('averageFaviconColor(pixels)',context),'#800080','all visible favicon pixels contribute to the base colour');
  context.pixels=[100,0,0,255,0,100,0,128];
  assert.equal(vm.runInContext('averageFaviconColor(pixels)',context),'#432100','partly transparent pixels contribute in proportion to their alpha');
  context.pixels=[255,255,255,0];
  assert.equal(vm.runInContext('averageFaviconColor(pixels)',context),null,'fully transparent pixels do not affect the average');
  context.pixels=[0,220,110,255,10,200,105,255,255,255,255,255];
  assert.equal(vm.runInContext('faviconBaseColor(pixels)',context),vm.runInContext('averageFaviconColor(pixels)',context),'single-hue icons keep their current whole-image average');
  context.pixels=[
    ...Array(4).fill([255,0,0,255]).flat(),
    ...Array(2).fill([0,0,255,255]).flat(),
    255,255,255,255,
  ];
  const multicolor=vm.runInContext('faviconBaseColor(pixels)',context);
  const wholeAverage=vm.runInContext('averageFaviconColor(pixels)',context);
  assert.notEqual(multicolor,wholeAverage,'multicolour icons do not use the muddy RGB average as their hue');
  assert.ok(parseInt(multicolor.slice(1,3),16)>parseInt(multicolor.slice(5,7),16)*2,'the largest red area determines the hue');
  context.average=wholeAverage;context.multicolor=multicolor;
  const lightness=vm.runInContext('([average,multicolor].map(hex=>rgbToHsl(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)))[2]))',context);
  assert.ok(Math.abs(lightness[0]-lightness[1])<.005,'multicolour icons retain the whole-image brightness');
  for (const species of ['sauropod','trex','triceratops','cat','fox','duck','elephant']) {
    for (const phase of ['egg','juvenile','adult']) {
     for (const asleep of [false,true]) {
      context.model = { species, domain:'example.com', siteName:'Example', tab:{active:true},
        accent:'#ef743c', shade:'#a72c00', mark:'#ffc991',
        visual:{phase,scale:.65,eggScale:.3,widthRatio:1.7,asleep,drowsyProgress:0,hopSpeed:2} };
      vm.runInContext('renderCreature(model, 0)', context);
      const article = nodes.get('#creatures').children.at(-1);
      const button = article.children[0];
      assert.match(button.attributes['aria-label'], /example.com/);
      assert.match(article.style.cssText, /--width-ratio:1.700/);
      if (phase === 'egg') {
        assert.doesNotMatch(button.innerHTML, /<svg/);
        assert.match(button.innerHTML, /phase-egg/);
      } else if (asleep) {
        assert.match(button.innerHTML, /adult-sleep-atlas.png/);
        assert.ok(button.innerHTML.includes('data-art="'+species+'-sleep"'));
        assert.match(button.innerHTML, /<\/g><path class="atlas-closed-eye"[^>]+fill="#000000"/);
      } else if (phase === 'juvenile' || species === 'cat') {
        assert.doesNotMatch(button.innerHTML, /<image /);
        assert.match(button.innerHTML, /sprite-eye/);
        assert.match(button.innerHTML, /class="sprite-eye"[^>]+fill="#000000"/);
        assert.match(button.innerHTML, /<path /);
      } else {
        assert.match(button.innerHTML, /adult-favicon-atlas.png/);
        assert.ok((button.innerHTML.match(/<image /g) || []).length >= 1);
        assert.match(button.innerHTML, /feComponentTransfer/);
        assert.equal((button.innerHTML.match(/class="atlas-open-eye"/g)||[]).length, species==='cat'?2:1);
        assert.match(button.innerHTML, /<\/g><rect class="atlas-open-eye"[^>]+fill="#000000"/);
        assert.match(button.innerHTML, /sprite-facing/);
        assert.match(button.innerHTML, /clip-path="url\(#animal-clip-/);
        assert.doesNotMatch(button.innerHTML, /part head/);
      }
     }
    }
  }
  const sizes=vm.runInContext('[.5,2,5,60,120].map(total=>visualFromMetrics({total,typical:1,visits:1,streak:1,idle:0}))',context);
  assert.equal(sizes[0].phase,'egg');
  assert.equal(sizes[1].phase,'juvenile');
  assert.ok(sizes[1].scale>=.4);
  assert.ok(sizes[2].scale>=.5);
  assert.ok(sizes[3].scale>sizes[2].scale);
  assert.ok(Math.abs(sizes[4].scale-1.375)<.001);
  for (const input of ['#142050','#bb2211','#000000','#ffffff','#5865f2']) {
    context.input=input;
    const palette=vm.runInContext('brightSpritePalette(input)',context);
    assert.equal(palette.color,input,'the pre-atlas Brachio rule keeps the supplied base colour');
  }
  context.input='#03c75a';
  const naverPalette=vm.runInContext('brightSpritePalette(input)',context);
  const naverValue=Math.max(...[1,3,5].map(i=>parseInt(naverPalette.color.slice(i,i+2),16)));
  assert.ok(naverValue>=195 && naverValue<=205,'preserve Naver green brightness rather than forcing neon');
  const contrastPalette=vm.runInContext('brightSpritePalette("#4285f4")',context);
  const baseColor=contrastPalette.color;
  context.darkBlue='#5441f5';
  const liftedTriceratops=vm.runInContext('triceratopsBaseColor(darkBlue)',context);
  const liftedChannels=[1,3,5].map(i=>parseInt(liftedTriceratops.slice(i,i+2),16));
  assert.ok(liftedChannels[0]*.213+liftedChannels[1]*.715+liftedChannels[2]*.072>=114.5,'dark blue triceratops is lifted to the map visibility floor');
  assert.ok(liftedChannels[2]>liftedChannels[0] && liftedChannels[2]>liftedChannels[1],'the favicon hue remains blue');
  assert.equal(vm.runInContext('triceratopsBaseColor("#48d787")',context),'#48d787','bright favicon colours are unchanged');
  for(const asleep of [false,true]) {
    context.asleep=asleep;
    const svg=vm.runInContext('finishedSprite(spriteArt.find(animal=>animal.id==="triceratops"),{color:darkBlue},"adult",asleep)',context);
    assert.ok(svg.includes(`data-color="${liftedTriceratops}"`),'awake and sleeping triceratops share the visibility rule');
  }
  const channel=(hex,i)=>(parseInt(hex.slice(i,i+2),16)/255).toFixed(4);
  const brachio=vm.runInContext('finishedSprite(spriteArt.find(animal=>animal.id==="sauropod"),{color:"#3de286"})',context);
  assert.match(brachio,/\.213 \.715 \.072 0 -0\.02/,'green source pixels use calibrated perceived luminance');
  const triceratops=vm.runInContext('finishedSprite(spriteArt.find(animal=>animal.id==="triceratops"),{color:"#4285f4"})',context);
  assert.ok(triceratops.includes(`data-color="${baseColor}"`),'triceratops uses the Brachio base-colour rule');
  for (const [letter,i] of [['R',1],['G',3],['B',5]]) {
    const values=triceratops.match(new RegExp(`<feFunc${letter} type="table" tableValues="([^"]+)"`))?.[1].split(' ');
    assert.equal(values?.at(-1),channel(baseColor,i),'bright face pixels use the corrected base colour');
  }
  assert.doesNotMatch(triceratops,/#fff3d4/,'triceratops face plate keeps the favicon hue');
  for (const species of ['sauropod','trex','triceratops','cat','fox','duck','elephant']) {
    context.speciesId=species;
    for (const asleep of [false,true]) {
      context.asleep=asleep;
      const sprite=vm.runInContext('finishedSprite(spriteArt.find(animal=>animal.id===speciesId),{color:"#4285f4"},"adult",asleep)',context);
      assert.ok(sprite.includes(`data-color="${baseColor}"`)||sprite.includes(`fill="${baseColor}"`),'adult and sleeping bodies share the Brachio base-colour rule');
      assert.doesNotMatch(sprite,/#fff3d4/,'atlas highlights do not replace the favicon hue');
    }
  }
  const triceratopsShade=vm.runInContext('(()=>{const a=spriteArt.find(animal=>animal.id==="triceratops");return finishedSprite(a,{color:"#4285f4"},"juvenile")})()',context);
  assert.ok(triceratopsShade.includes(`fill="${contrastPalette.shade}"`),'triceratops markings retain stronger contrast');
  const brightness=hex=>[1,3,5].reduce((sum,i)=>sum+parseInt(hex.slice(i,i+2),16),0);
  assert.ok(brightness(contrastPalette.dark)<brightness(contrastPalette.shade)-80);
  assert.ok(brightness(contrastPalette.highlight)>brightness(contrastPalette.light)+60);
  assert.match(triceratops,/-accent\)"/,'triceratops preserves the original warm horn pixels');
  for (const species of ['trex','fox','duck']) {
    context.speciesId=species;
    const svg=vm.runInContext('finishedSprite(spriteArt.find(animal=>animal.id===speciesId),{color:"#4285f4"},"adult",true)',context);
    const matrix=svg.match(/<filter id="[^"]+-accent"[^>]*><feColorMatrix type="matrix" values="([^"]+)"/)?.[1].split(' ').map(Number);
    assert.equal(matrix?.length,20,`${species} sleeping accent filter has a valid colour matrix`);
  }
  context.speciesId='cat';
  const catSleep=vm.runInContext('finishedSprite(spriteArt.find(animal=>animal.id===speciesId),{color:"#4285f4"},"adult",true)',context);
  assert.doesNotMatch(catSleep,/-accent\)"/,'cat sleep markings use the awake palette instead of source-coloured accents');
  const bodySamples={
    sauropod:{adult:[37,200,93],sleep:[36,208,97]},
    trex:{adult:[254,66,49],sleep:[254,67,48]},
    triceratops:{adult:[243,242,236],sleep:[250,248,243]},
    fox:{adult:[254,113,44],sleep:[254,122,48]},
    duck:{adult:[62,138,253],sleep:[57,136,254]},
    elephant:{adult:[85,105,253],sleep:[88,110,253]},
    cat:{sleep:[250,248,242]},
  };
  for (const [species,samples] of Object.entries(bodySamples)) {
    context.speciesId=species;
    for (const [pose,rgb] of Object.entries(samples)) {
      context.asleep=pose==='sleep';
      const svg=vm.runInContext('finishedSprite(spriteArt.find(animal=>animal.id===speciesId),{color:"#4285f4"},"adult",asleep)',context);
      const matrix=svg.match(/<feColorMatrix type="matrix" values="([^"]+)"/)?.[1].split(' ').map(Number);
      const gray=rgb.reduce((sum,value,i)=>sum+value/255*matrix[i],matrix[4]);
      for (const [letter,i] of [['R',1],['G',3],['B',5]]) {
        const stops=svg.match(new RegExp(`<feFunc${letter} type="table" tableValues="([^"]+)"`))?.[1].split(' ').map(Number);
        const position=Math.min(5,Math.max(0,gray*5));
        const lower=Math.floor(position),upper=Math.min(5,lower+1);
        const actual=Math.round((lower===upper?stops[lower]:stops[lower]*(upper-position)+stops[upper]*(position-lower))*255);
        const expected=parseInt(baseColor.slice(i,i+2),16);
        assert.ok(Math.abs(actual-expected)<=6,`${species} ${pose} body channel ${letter} stays near the favicon base`);
      }
    }
  }
});
