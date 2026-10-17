/* v23 修三处：①荒漠镇绿地板(falsy陷阱) ②道馆只中心格触发 ③城外不该有石板大道 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;
const done = [];
const rep = (re, to, label) => { if (!re.test(src)) { console.log('  ⚠️ ' + label + ' 未匹配'); return false; } src = src.replace(re, to); done.push(label); return true; };

/* ① 关键 bug：T.PATH 的值是 0（falsy），`T[...] || T.GRASS` 会把荒漠镇顶成草地 */
rep(/var gbase=T\[TOWN_GROUND\[reg\]\|\|"GRASS"\]\|\|T\.GRASS;/,
  `/* v23 修：T.PATH 的值是 0（falsy），不能用 || 兜底，否则荒漠镇会被顶成草地（绿地板） */
    var _gk=TOWN_GROUND[reg]||"GRASS";
    var gbase=(T[_gk]!==undefined)?T[_gk]:T.GRASS;`,
  '荒漠镇绿地板（falsy 陷阱）');

/* ② 道馆：只有「正中心那一格」触发提示（不再是整个 3×3，也不再是一次性） */
rep(/function gymAt\(x,y\)\{[\s\S]*?\n\}/,
  `function gymAt(x,y){
  /* v23：只有道馆正中心那一格才触发提示（原来 3×3 每格都触发，后来改成只弹一次也不合意） */
  for(var i=0;i<TOWNS.length;i++){ var t=TOWNS[i];
    if(x===t.gym.x && y===t.gym.y) return t; }
  return null;
}`,
  '道馆只中心格触发');
rep(/if\(_gt\)\{ if\(!S\.gymsSeen\) S\.gymsSeen=\{\}; if\(!S\.gymsSeen\[_gt\.region\]\)\{ S\.gymsSeen\[_gt\.region\]=1; openGym\(_gt\); return; \} \}/,
  'if(_gt){ openGym(_gt); return; }',
  '去掉「只弹一次」限制');

/* ③ 城外通道：不再铺石板大道，改铺该地区自己的地面，并把长度从 10 缩到 4 */
rep(/for\(var ck=1;ck<=10;ck\+\+\)\{/, 'for(var ck=1;ck<=4;ck++){', '通道缩短到 4 格');
rep(/if\(cqv!==T\.HOSP&&cqv!==T\.GYM&&cqv!==T\.LEAGUE\) m\[I\(cqx,cqy\)\]=T\.STREET;/,
  `if(cqv!==T.HOSP&&cqv!==T.GYM&&cqv!==T.LEAGUE) m[I(cqx,cqy)]=gbase;   /* v23：城外通道铺地区地面，不再是一条石板大道跑到城外 */`,
  '城外通道改地区地面');

writeFileSync(F, src, 'utf8');
console.log('v23：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
done.forEach(d => console.log('  ✅ ' + d));
console.log('  校验：' + [
  src.includes('T[_gk]!==undefined') ? '荒漠地面✅' : '❌',
  src.includes('只有道馆正中心那一格') ? '中心格✅' : '❌',
  src.includes('gymsSeen[_gt.region]') ? '（旧限制仍在❌）' : '限制已去✅',
  src.includes('城外通道铺地区地面') ? '通道✅' : '❌',
].join(' · '));
