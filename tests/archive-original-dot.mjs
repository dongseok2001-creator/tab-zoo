import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=new URL('../design-archive/pixel-before-atlas/',import.meta.url);
const dest=new URL('../design-archive/original-dot-zoo/',import.meta.url);
await mkdir(dest,{recursive:true});
for(const name of ['background.js','manifest.json']) await copyFile(new URL(name,source),new URL(name,dest));
let html=await readFile(new URL('popup.html',source),'utf8');
html=html.replace(/\s*<script src="(?:sprite-art|atlas-clips)\.js"><\/script>/g,'');
await writeFile(new URL('popup.html',dest),html);
let css=await readFile(new URL('popup.css',source),'utf8');
assert.ok(css.includes('/* Quiet tile habitat;'));
css=css.slice(0,css.indexOf('/* Quiet tile habitat;'));
css=css.replace(/\/\* Finished artwork supplies[\s\S]*?(?=\/\* From 10)/,'');
css+='@media (prefers-reduced-motion:reduce) { .creature,.pixel-sprite { animation:none!important; } }\n';
await writeFile(new URL('popup.css',dest),css);
let js=await readFile(new URL('popup.js',source),'utf8');
assert.ok(js.includes('const spriteContent ='));
js=js.replace('/* global chrome, spriteArt, finishedSprite */','/* global chrome */');
js=js.replace(/  const isEgg = model.visual.phase === "egg";[\s\S]*?(?=  button.innerHTML =)/,'');
js=js.replace('${isEgg ? "egg-scale" : ""}','${model.visual.phase === "egg" ? "egg-scale" : ""}');
js=js.replace('${isEgg ? "" : "finished-sprite"} ','').replace('${spriteContent}','${spriteParts}');
js=js.replace(/  \/\/ Twelve steps[^\n]*\n  const dx =[^\n]*\n  const dy =[^\n]*/,
 '  const dx = 8 + (hash % 18) + Math.round(sizeFactor * 4);\n  const dy = 6 + ((hash >>> 12) % 12) + Math.round(sizeFactor * 3);');
assert.ok(!js.includes('finishedSprite('));
assert.ok(!js.includes('spriteContent'));
assert.ok(!css.includes('pixel-walk'));
await writeFile(new URL('popup.js',dest),js);
await writeFile(new URL('README.md',dest),`# 기존 CSS 도트 동물 · 기존 맵 보관본

2026-09-11 별도 보관.

새 SVG/이미지 동물과 단순화한 새 맵 적용 이전의 렌더링을 복원한 독립 사본입니다. 당시 전체 파일의 원본 스냅샷은 없어, 남아 있는 CSS 동물/맵 코드와 이전 렌더 함수를 기준으로 복원했습니다.

- 기존 CSS 파츠 도트 동물 7종과 기존 초원·시베리아·사막 맵
- 기존 이동/점프 표현, 동물 설명, 파비콘 색상 및 성장 기능
- 현재 작업 폴더인 extension/과 독립적

Chrome 확장 프로그램 관리에서 '압축해제된 확장 프로그램을 로드합니다'로 이 폴더를 선택하면 실행할 수 있습니다.

pixel-before-atlas 폴더는 새 맵/SVG 동물이 포함된 중간 버전이며, 요청하신 기존 도트+기존 맵 보관본은 이 폴더입니다.
`);
console.log('Saved independent original-dot-zoo archive.');
