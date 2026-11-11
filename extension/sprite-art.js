/* Each animal is a finished 40 × 36 illustration with one continuous contour. */
const spriteArt = [
  {id:'sauropod',name:'브라키오',color:'#79bc70',shade:'#47864f',light:'#b9dc8d',ink:'#253a27',
    outline:'M5 5H12V6H14V8H15V18H19V17H27V18H30V20H32V22H34V24H37V26H31V25H29V29H28V33H24V29H20V30H17V33H13V29H11V27H10V14H6V13H3V11H2V8H3V6H5Z',
    patches:['M15 26H27V28H16V27H15Z'],
    pale:'',eye:[6,7]},
  {id:'trex',name:'티라노',color:'#e87959',shade:'#b34b3c',light:'#ffdda0',ink:'#482d27',
    outline:'M5 8H15V9H17V12H18V17H21V18H24V21H28V23H31V24H34V23H36V21H38V26H36V28H31V29H26V31H27V33H21V29H17V30H16V33H10V31H12V26H10V21H7V19H3V17H2V11H3V9H5Z',
    patches:['M12 21H14V23H17V25H14V24H12Z'],
    pale:'M3 15H10V17H4V16H3Z',eye:[7,11]},
  {id:'triceratops',name:'트리케라',color:'#80afe0',shade:'#507bab',light:'#f1dda2',ink:'#293b51',
    outline:'M11 10H15V11H18V14H27V15H30V18H31V22H35V24H38V26H31V29H29V33H25V30H19V33H15V29H11V28H8V26H4V25H2V22H3V20H6V16H5V11H7V14H10V10H9V7H11Z',
    patches:['M14 12H16V15H18V24H16V27H13V25H15V22H16V17H14Z','M23 24H30V28H27V30H25V28H22Z'],
    pale:'M5 12H6V15H8V18H6V16H5Z M10 8H11V12H13V15H11V13H10Z',eye:[8,19]},
  {id:'cat',name:'고양이',color:'#e8aa50',shade:'#b37432',light:'#ffe0a0',ink:'#493422',
    outline:'M5 10H7V12H10V13H13V11H15V10H17V17H19V18H26V20H29V24H32V22H33V15H35V13H38V16H36V25H35V28H31V29H28V32H24V30H19V32H15V29H12V27H10V24H6V23H4V21H3V17H4V13H5Z',
    patches:['M23 19H25V23H23Z M27 21H29V25H27Z','M31 26H35V28H31V29H28V31H25V29H28V27H31Z'],
    pale:'M5 20H8V21H13V20H15V23H13V25H9V23H6V22H5Z',eye:[6,17],eye2:[12,17]},
  {id:'fox',name:'사막여우',color:'#e98543',shade:'#b35430',light:'#ffe2ab',ink:'#482c24',
    outline:'M6 4H8V6H10V9H11V12H13V8H15V4H17V11H16V16H18V19H24V20H27V23H29V22H30V19H32V16H35V14H38V20H37V24H35V27H32V29H28V30H27V33H24V29H18V30H17V33H14V28H12V25H10V23H7V22H4V21H1V19H4V18H6V16H7V13H6Z',
    patches:['M7 7H8V9H9V13H8V12H7Z M15 8H16V12H15V14H14V11H15Z','M29 26H34V27H32V29H28V30H26V28H29Z'],
    pale:'M3 19H7V20H10V19H12V22H15V25H13V24H10V23H7V22H4V21H3Z M34 17H36V15H38V19H37V22H35V21H33V19H34Z',eye:[8,16],nose:[1,19]},
  {id:'duck',name:'오리',color:'#f1cf4e',shade:'#bd9230',light:'#fff0aa',ink:'#4c3b22',
    outline:'M10 7H16V8H19V10H20V15H19V18H23V19H28V21H32V19H35V18H37V22H35V25H33V27H30V29H25V30H24V33H19V31H21V30H17V33H12V31H14V29H10V27H8V24H7V20H4V19H2V17H3V15H7V10H8V8H10Z',
    patches:['M20 21H28V22H30V24H28V26H23V27H19V25H18V23H20Z'],
    pale:'M8 18H11V21H13V25H11V24H9V21H8Z',eye:[11,12],bill:'M3 16H9V18H6V19H3Z'},
  {id:'elephant',name:'코끼리',color:'#91a9ca',shade:'#607b9e',light:'#d6e1e6',ink:'#2b364a',
    outline:'M8 11H18V13H30V15H32V28H31V32H26V28H21V32H16V28H13V25H11V22H8V30H5V15H6V12H8Z',
    patches:['M14 13H18V15H20V20H19V24H16V25H13V23H12V16H14Z','M24 25H30V28H28V30H26V28H23Z'],
    pale:'M14 15H17V16H15V21H14Z',eye:[8,17]}
];
let atlasSequence = 0;
function brightSpritePalette(hex) {
  const digits=hex.replace('#','');
  // In the pre-atlas artwork, Brachio's base was the supplied accent itself.
  const rgb=[0,2,4].map(i=>parseInt(digits.slice(i,i+2),16));
  const toHex=values=>'#'+values.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  return {color:toHex(rgb),dark:toHex(rgb.map(v=>v*.38)),shade:toHex(rgb.map(v=>v*.62)),light:toHex(rgb.map(v=>v*.58+255*.42)),highlight:toHex(rgb.map(v=>v*.35+255*.65)),ink:'#29352f'};
}
function triceratopsBaseColor(hex) {
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const brightness=rgb[0]*.213+rgb[1]*.715+rgb[2]*.072;
  if(brightness>=115) return hex;
  // Blue and violet favicons can look dark despite a high blue channel.
  // Lift only this species' main body enough to read against the brown map.
  const white=(115-brightness)/(255-brightness);
  return '#'+rgb.map(v=>Math.round(v*(1-white)+255*white).toString(16).padStart(2,'0')).join('');
}
function atlasSprite(a, palette, atlas) {
  const key=`animal-clip-${++atlasSequence}`;
  const color=palette?.color || a.color;
  const width=Math.min(38,atlas.width/atlas.height*33),height=width*atlas.height/atlas.width;
  // Atlas sauropod faces right; normalize every sprite to left-facing at rest.
  const facing=a.id==='sauropod' && !atlas.drawn?'translate(40 0) scale(-1 1)':'';
  // Keep the triceratops' large white face at the favicon colour. Its darker
  // back markings use the shade; the original warm horns are restored below.
  const tones=a.id==='triceratops'
    ? ['#29352f',palette.dark,palette.dark,palette.shade,palette.shade,color]
    // The sleep source has an almost-white cat body. Keep that body anchored
    // to the awake base colour, while map its markings through the awake
    // shade/light palette instead of retaining their source-coloured pixels.
    : atlas.id==='cat-sleep'
    ? ['#29352f',palette.dark,palette.shade,palette.light,palette.light,color]
    : ['#29352f',palette.dark,palette.shade,color,palette.light,palette.highlight];
  const ramp=['R','G','B'].map((channel,index)=>`<feFunc${channel} type="table" tableValues="${tones.map(hex=>(parseInt(hex.slice(1+index*2,3+index*2),16)/255).toFixed(4)).join(' ')}"/>`).join('');
  // Anchor each atlas's dominant body pixels to the base-colour stop (153/255).
  // The source sheets have different original hues and brightness levels.
  const luminance=a.id==='sauropod'?'.213 .715 .072':'.333 .333 .333';
  const offsets={
    'sauropod-adult':-.02,'sauropod-sleep':-.04,
    'trex-adult':.12,'trex-sleep':.12,
    'fox-adult':.06,'fox-sleep':.045,
    'duck-adult':.01,'duck-sleep':.015,
    'elephant-adult':.02,'elephant-sleep':.01,
    'triceratops-adult':.06,'triceratops-sleep':.03,
    'cat-sleep':.03
  };
  const offset=offsets[atlas.id]??0;
  const colorFilter=`<filter id="${key}-color" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${luminance} 0 ${offset} ${luminance} 0 ${offset} ${luminance} 0 ${offset} 0 0 0 1 0"/><feComponentTransfer>${ramp}</feComponentTransfer></filter>`;
  // Restore source-coloured accents after recolouring the main body. Warm
  // pixels distinguish horns, beaks, feet and cat details; pale pixels keep
  // the T-rex belly and fox ear tips separate from their favicon body colour.
  const accentFilter=['triceratops','duck'].includes(a.id)
    ? `<filter id="${key}-accent" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 8 0 -8 0 -.3"/></filter>`
    : ['trex','fox'].includes(a.id)
    ? `<filter id="${key}-accent" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 8 0 -5.2"/></filter>`
    : '';
  const accentOverlay=accentFilter?`<g filter="url(#${key}-accent)"><image clip-path="url(#${key})" href="${atlas.source || 'assets/animal-atlas.png'}" x="${-atlas.x}" y="${-atlas.y}" width="1254" height="1254" style="image-rendering:pixelated"/></g>`:'';
  // Eye coordinates belong to each source drawing; sleeping eyes are drawn in the atlas.
  const eyes={
    'sauropod-adult':[[114,142,22,32]],
    'trex-adult':[[536,234,20,31]],
    'triceratops-adult':[[922,360,20,31]],
    'fox-adult':[[122,680,21,29]],
    'duck-adult':[[558,646,19,30]],
    'elephant-adult':[[942,660,20,31]],
    'cat-adult':[[106,988,19,28],[160,988,19,28]],
    'sauropod-redraw':[[134,150,10,30]],
    'triceratops-redraw':[[522,282,11,30]],
    trex:[[416,340,12,13]],duck:[[744,407,14,14]],fox:[[1003,403,17,18]],
    elephant:[[396,841,11,13],[431,840,13,15]]
  }[atlas.id] || [];
  const base={sauropod:'#10d333',trex:'#ff3030',duck:'#3baded',fox:'#ff7b1f',triceratops:'#4a4aff',elephant:'#6663fa'}[a.id];
  const unit=atlas.width/width;
  const eyeWidth=Math.round(2*unit),eyeHeight=Math.round(3*unit);
  const eyeMasks=eyes.map(([x,y,w,h])=>`<rect x="${x-atlas.x-1}" y="${y-atlas.y-1}" width="${w+2}" height="${h+2}" fill="${base}"/>`).join('');
  const openEyes=eyes.map(([x,y,w,h])=>{
    const left=Math.round(x+(w-eyeWidth)/2),top=Math.round(y+(h-eyeHeight)/2);
    return `<rect class="atlas-open-eye" x="${left-atlas.x}" y="${top-atlas.y}" width="${eyeWidth}" height="${eyeHeight}" fill="#000000"/>`;
  }).join('');
  const hasEyeGlint=['sauropod-adult','trex-adult','triceratops-adult'].includes(atlas.id);
  const eyeGlints=hasEyeGlint?eyes.map(([x,y,w,h])=>{
    const left=Math.round(x+(w-eyeWidth)/2),top=Math.round(y+(h-eyeHeight)/2);
    // Half the eye width by one quarter of its height: a restrained 1/8
    // top-front catchlight that stays legible at the popup's small scale.
    return `<rect class="atlas-eye-glint" x="${left-atlas.x+1}" y="${top-atlas.y+1}" width="${Math.max(1,Math.floor(eyeWidth/2))}" height="${Math.max(1,Math.floor(eyeHeight/4))}" fill="#fff7df"/>`;
  }).join(''):'';
  return `<svg xmlns="http://www.w3.org/2000/svg" data-color="${color}" data-art="${atlas.id}" viewBox="0 0 40 36" shape-rendering="crispEdges" role="img" aria-label="${a.name}"><g transform="${facing}"><svg overflow="visible" x="${(40-width)/2}" y="${34-height}" width="${width}" height="${height}" viewBox="0 0 ${atlas.width} ${atlas.height}"><defs>${colorFilter}${accentFilter}<clipPath id="${key}"><path d="${atlas.clip}"/></clipPath></defs><g filter="url(#${key}-color)"><image clip-path="url(#${key})" href="${atlas.source || 'assets/animal-atlas.png'}" x="${-atlas.x}" y="${-atlas.y}" width="1254" height="1254" style="image-rendering:pixelated"/>${eyeMasks}</g>${accentOverlay}${openEyes}${eyeGlints}${atlas.eyeClip?`<path class="atlas-closed-eye" d="${atlas.eyeClip}" fill="#000000"/>`:''}</svg></g></svg>`;
}
// Dedicated hatchling silhouettes: large heads, compact bodies, short limbs.
const juvenileArt = {
  sauropod:{outline:'M9 10H17V12H19V23H25V24H28V27H32V29H27V33H23V30H19V33H15V30H13V21H9V20H7V17H6V13H9Z',patches:['M16 27H25V29H18V28H16Z'],pale:'',eye:[10,14]},
  trex:{outline:'M8 12H19V14H21V22H24V25H28V27H32V25H33V29H28V31H25V33H21V30H17V33H13V29H14V25H10V23H7V21H5V15H8Z',patches:['M18 24H20V27H23V28H19V27H18Z'],pale:'M7 20H14V22H9V21H7Z',eye:[10,16]},
  triceratops:{outline:'M12 11H15V14H19V17H26V19H28V26H32V28H28V30H26V33H22V30H18V33H14V29H10V27H6V26H5V23H8V19H9V15H11V18H13Z',patches:['M16 17H19V25H17V27H15V25H17V20H16Z'],pale:'M10 15H11V19H10Z M13 12H14V17H13Z',eye:[10,22]},
  cat:{outline:'M8 13H10V15H14V16H17V13H19V15H20V20H23V22H26V27H29V24H30V21H32V27H30V30H25V33H21V31H17V33H13V29H9V27H7V24H6V19H8Z',patches:['M22 23H24V26H22Z'],pale:'M9 25H12V26H16V25H18V27H15V29H12V27H9Z',eye:[9,21],eye2:[16,21]},
  fox:{outline:'M8 8H10V11H12V16H15V12H17V8H19V16H18V21H22V24H25V28H28V24H30V21H33V25H32V29H29V31H25V33H22V30H18V33H14V29H12V26H8V24H5V23H4V21H7V19H9V16H8Z',patches:['M10 12H11V16H10Z M17 12H18V16H17Z'],pale:'M6 22H10V23H15V25H17V28H14V26H10V25H7Z M30 23H33V26H31V28H29V26H30Z',eye:[10,20]},
  duck:{outline:'M11 13H18V14H20V17H21V23H25V25H29V24H31V23H32V27H30V29H27V31H23V33H20V31H17V33H14V30H11V28H9V24H6V23H5V21H9V17H10V14H11Z',patches:['M21 25H27V27H25V29H21V28H20V26H21Z'],pale:'',bill:'M6 21H12V23H7V22H6Z',eye:[12,18]},
  elephant:{outline:'M10 15H19V17H26V19H28V29H26V33H22V30H19V33H15V29H12V24H10V30H7V20H8V17H10Z',patches:['M16 18H20V21H21V25H19V27H16V25H15V20H16Z'],pale:'M17 19H19V20H17V24H16V21H17Z',eye:[10,20]}
};
const sleepingArt={
  sauropod:{outline:'M8 14H15V16H17V23H20V21H27V23H30V27H34V29H32V32H11V31H8V28H10V23H8V22H5V19H5V16H8Z',patches:['M18 26H26V29H23V30H17V28H18Z'],pale:'M10 29H16V31H10Z',eye:[8,18]},
  trex:{outline:'M7 13H16V14H19V18H20V22H24V20H28V22H31V26H35V25H36V28H34V31H29V32H10V31H8V28H10V24H7V22H4V19H4V15H7Z',patches:['M22 24H27V26H28V29H23V30H19V28H22Z'],pale:'M6 20H13V22H8V21H6Z M10 29H16V31H10Z',eye:[8,17]},
  triceratops:{outline:'M10 12H12V16H15V14H18V17H20V20H27V21H30V25H34V28H35V30H31V32H10V31H6V29H3V26H4V23H7V21H8V17H10Z',patches:['M16 18H19V25H17V28H14V26H16V22H15Z M22 27H28V30H23Z'],pale:'M9 15H11V20H9Z M6 29H12V31H6Z',eye:[8,24]},
  cat:{outline:'M8 20H10V23H14V22H17V20H19V24H24V23H28V25H31V28H33V30H30V32H9V31H6V29H5V25H7Z',patches:['M22 27H29V29H23V31H17V29H22Z'],pale:'M8 28H15V30H9Z',eye:[9,26],eye2:[15,26]},
  fox:{outline:'M9 10H11V14H13V18H15V14H17V10H19V19H21V21H27V23H30V26H33V29H31V32H12V31H8V29H4V27H3V24H7V22H9V19Z',patches:['M23 25H29V27H30V30H23V31H17V29H23Z'],pale:'M4 24H9V25H13V28H10V27H6Z M14 28H22V30H18V31H13Z',eye:[10,22]},
  duck:{outline:'M11 14H18V15H20V18H21V23H25V22H29V24H33V23H35V26H33V29H30V31H15V32H11V30H9V27H10V23H6V22H5V20H9V17H10V15H11Z',patches:['M21 25H29V27H27V29H22V28H20V26H21Z'],pale:'M11 25H14V29H12Z',bill:'M6 20H12V22H7Z',eye:[12,18]},
  elephant:{outline:'M9 16H18V18H28V20H31V29H29V32H16V31H12V28H10V30H5V28H6V24H7V19H9Z',patches:['M16 19H21V25H19V28H15V26H15V21H16Z M24 27H29V30H23Z'],pale:'M12 29H18V31H12Z',eye:[10,21]}
};
function finishedSprite(a, palette, phase='adult', asleep=false){
  const base=palette?.color||a.color;
  palette=brightSpritePalette(a.id==='triceratops'?triceratopsBaseColor(base):base);
  const atlasId=asleep?`${a.id}-sleep`:phase==='adult'?`${a.id}-adult`:a.id;
  const atlas=typeof atlasClips==='undefined'?null:atlasClips.find(s=>s.id===atlasId);
  if(atlas && (asleep || (phase!=='juvenile' && a.id!=='cat'))) return atlasSprite(a,palette,atlas);
  if(phase==='juvenile') a={...a,eye2:undefined,bill:undefined,nose:undefined,...juvenileArt[a.id]};
  if(asleep) a={...a,eye2:undefined,bill:undefined,nose:undefined,...sleepingArt[a.id]};
  a = { ...a, ...palette };
  // Cat markings stay light in every state, matching its sleeping sprite.
  const patternColor=a.id==='cat'?a.light:a.shade;
  const rect=([x,y])=>`<rect class="${asleep?'closed-eye':'sprite-eye'}" x="${x}" y="${y}" width="${asleep?3:2}" height="${asleep?1:3}" fill="#000000"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 36" shape-rendering="crispEdges" role="img" aria-label="${a.name}"><path d="${a.outline}" fill="${a.color}" stroke="${a.ink}" stroke-width="1" stroke-linejoin="miter"/>${a.patches.map(d=>`<path d="${d}" fill="${patternColor}"/>`).join('')}<path d="${a.pale}" fill="${a.light}"/>${a.bill?`<path d="${a.bill}" fill="#e79a32"/>`:''}${rect(a.eye)}${a.eye2?rect(a.eye2):''}${a.nose?`<rect x="${a.nose[0]}" y="${a.nose[1]}" width="2" height="2" fill="${a.ink}"/>`:''}</svg>`;
}
