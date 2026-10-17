import { readFileSync } from 'node:fs';
const F='C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src=readFileSync(F,'utf8');
const i=src.indexOf('var AVATARS = {');
const seg=src.slice(i,i+5000000);
const m=seg.match(/"pk-037":"([A-Za-z0-9+/=]+)"/);
if(!m){ console.log('❌ 游戏内没找到 pk-037 头像'); process.exit(1); }
const w=readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-avatars-webp/pk-037.webp').toString('base64');
console.log('游戏内 pk-037 base64 长度 '+m[1].length+' · 本地新 webp 长度 '+w.length);
console.log(m[1]===w ? '✅ 游戏内头像 = 新下载的六尾图（已修好）' : '❌ 不一致');
/* 再查几只 */
const names={'pk-001':'妙蛙种子','pk-037':'六尾','pk-148':'哈克龙','pk-025':'皮卡丘','pk-038':'九尾'};
for(const [id,nm] of Object.entries(names)){
  const mm=seg.match(new RegExp('"'+id+'":"([A-Za-z0-9+/=]+)"'));
  const lw=readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-avatars-webp/'+id+'.webp').toString('base64');
  console.log('  '+nm+'('+id+') '+(mm&&mm[1]===lw?'✅':'❌'));
}
