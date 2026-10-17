/* v18 修：①捕获后等级跟随野怪 ②#stage 重复定义 ③对战卡片显示不全 */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;
let fixed = [];

/* ── ① 捕获后等级必须 = 遇到的野怪等级（原来 newPet 默认 1 级） ── */
const OLD_CAP = `  var pet=newPet(sp.id);
  pet.hp=Math.max(1,B.ehp);`;
const NEW_CAP = `  var pet=newPet(sp.id);
  /* v18 修复：抓到手的宠必须和遇到的野怪同等级（原来 newPet 默认 1 级，所以"打的和抓的不是一个等级"） */
  if(B.foe && B.foe.lv){ pet.lv=B.foe.lv; pet.exp=0; ensureMoves(pet); }
  pet.hp=Math.max(1, Math.min(maxHpOf(pet), B.ehp));`;
if (src.includes(OLD_CAP)) { src = src.replace(OLD_CAP, NEW_CAP); fixed.push('捕获等级'); }
else console.log('⚠️ 未匹配捕获段');

/* ── ② #stage 重复定义：把后面那个 4/3 的去掉，只保留 1.6:1（与 216×156 地图匹配） ── */
const reStage2 = /#stage\{\s*position:relative;[^}]*aspect-ratio:4\/3[^}]*\}/;
const mStage2 = src.match(reStage2);
if (mStage2) {
  const keep = mStage2[0].replace(/aspect-ratio:4\/3;?/, 'aspect-ratio:1.6/1;').replace(/max-height:62dvh;?/, 'max-height:58dvh;');
  src = src.replace(reStage2, keep);
  fixed.push('#stage 比例统一为 1.6:1');
} else console.log('⚠️ 未找到第二处 #stage');

/* ── ③ 对战卡片：内容多时容易超出，加宽限高并让招式区不被挤掉 ── */
const OLD_CARD = '.battle-card{ width:100%; max-width:480px; max-height:92dvh; overflow-y:auto;';
const NEW_CARD = '.battle-card{ width:100%; max-width:520px; max-height:94dvh; overflow-y:auto; -webkit-overflow-scrolling:touch;';
if (src.includes(OLD_CARD)) { src = src.replace(OLD_CARD, NEW_CARD); fixed.push('对战卡片限高'); }
else console.log('⚠️ 未匹配 battle-card');

writeFileSync(F, src, 'utf8');
console.log('已修：' + fixed.join(' · '));
console.log('大小：' + (before / 1024).toFixed(0) + ' KB → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('校验：');
console.log('  捕获带等级: ' + (src.includes('pet.lv=B.foe.lv') ? '✅' : '❌'));
console.log('  #stage 是否只剩一种比例: ' + ((src.match(/aspect-ratio:4\/3/g) || []).length === 0 ? '✅ 只剩 1.6:1' : '❌ 还有 4/3'));
