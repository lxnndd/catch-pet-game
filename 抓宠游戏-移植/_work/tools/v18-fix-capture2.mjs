/* v18 修（正则版）：捕获等级 + 对战卡片限高 */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

/* ① 捕获后等级 = 野怪等级 */
const reCap = /(var pet=newPet\(sp\.id\);)[\s\S]{0,80}?(pet\.hp=Math\.max\(1,B\.ehp\);)/;
const mCap = src.match(reCap);
if (mCap) {
  const NEW = `var pet=newPet(sp.id);
  /* v18 修复：抓到手的宠必须和遇到的野怪同等级（原来 newPet 默认 1 级 → "打的和抓的不是一个等级"） */
  if(B.foe && B.foe.lv){ pet.lv=B.foe.lv; pet.exp=0; ensureMoves(pet); }
  pet.hp=Math.max(1, Math.min(maxHpOf(pet), B.ehp));`;
  src = src.replace(reCap, NEW);
  console.log('✅ 捕获等级已修');
} else {
  console.log('❌ 仍未匹配捕获段，打印上下文：');
  const i = src.indexOf('function captureSuccess');
  console.log(src.slice(i, i + 700).split('\n').map(l => '   ' + l).join('\n'));
}

/* ② 对战卡片限高放宽（原来是 92dvh + 480px 宽） */
const reCard = /\.battle-card\{[^}]*\}/;
const mCard = src.match(reCard);
if (mCard) {
  const keep = mCard[0].replace(/max-width:\d+px/, 'max-width:520px').replace(/max-height:\d+dvh/, 'max-height:94dvh');
  src = src.replace(reCard, keep.replace('{', '{ -webkit-overflow-scrolling:touch; '));
  console.log('✅ 对战卡片已放宽');
} else console.log('❌ 未找到 .battle-card');

writeFileSync(F, src, 'utf8');
console.log('大小 ' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('  捕获带等级: ' + (src.includes('pet.lv=B.foe.lv') ? '✅' : '❌'));
