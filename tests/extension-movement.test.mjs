import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../extension/movement.js',import.meta.url),'utf8'),context);
const {stepZooWalk,chooseZooWalk}=context;
const bounds={minX:0,maxX:100,minY:0,maxY:100};

test('left and right take equal pixel steps and synchronize facing and stride',()=>{
  const left={x:50,y:50,stride:0,facing:1,remaining:6,walk:{dx:-2,dy:1}};
  const right={...left,walk:{dx:2,dy:1}};
  for(let i=0;i<6;i++) {
    assert.ok(stepZooWalk(left,bounds));assert.ok(stepZooWalk(right,bounds));
    assert.equal(50-left.x,right.x-50);
    assert.equal(left.y,right.y);assert.equal(left.stride,right.stride);
    assert.equal(left.facing,1);assert.equal(right.facing,-1);
    assert.ok(Number.isInteger(left.x) && Number.isInteger(left.y));
  }
});
test('a boundary stops a walk without crossing it or turning in place',()=>{
  const state={x:0,y:50,stride:0,facing:1,remaining:6,walk:{dx:-2,dy:0}};
  assert.equal(stepZooWalk(state,bounds),false);
  assert.equal(state.x,0);assert.equal(state.remaining,0);assert.equal(state.facing,1);
});
test('new walks vary direction, distance, cadence and rest',()=>{
  const a=chooseZooWalk(()=>0),b=chooseZooWalk(()=>.99);
  for(const property of ['dy','steps','interval','rest']) assert.notEqual(a[property],b[property]);
});
