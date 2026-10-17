/* v17 训练师队伍修复：坏引用（帕鲁 + 重新编号失效的洛克）按名字换成新物种 id */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
function sliceLiteral(startIdx, text) {
  const t = text;
  const open = t.slice(startIdx).search(/[[{]/); const from = startIdx + open;
  const openCh = t[from], closeCh = openCh === '[' ? ']' : '}';
  let depth = 0, i = from, inStr = null, esc = false;
  for (; i < t.length; i++) { const c = t[i];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === openCh) depth++; else if (c === closeCh) { depth--; if (depth === 0) { i++; break; } } }
  return t.slice(from, i);
}
const grab = (n) => { const i = src.indexOf('var ' + n + '='); return i < 0 ? null : new Function('return (' + sliceLiteral(i + ('var ' + n + '=').length, src) + ')')(); };
const SPECIES = grab('SPECIES'), MOVES = grab('MOVES');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);
const byName = {}; SPECIES.forEach(s => { if (!byName[s.name]) byName[s.name] = s; });
const nameOf = (id) => byId[id] ? byId[id].name : id;

/* 每位训练师坏掉的槽位 → 用谁替换（按主题地区 + 强度） */
const REPLACE = {
  't1': ['カイロス'],   /* 占位，下面按 index 精确替换 */
};
/* 更稳的做法：按「名字」替换（坏槽位原本是哪只帕鲁/洛克，就用指定新宠顶替） */
const PLAN = [
  ['短裤小子·阿磊', ['卡比兽']],
  ['捕虫少年·小柯', ['巨钳螳螂', '赫拉克罗斯', '毒粉蛾']],
  ['露营少女·小茜', ['蜂女王']],
  ['渔夫·大鲛', ['暴鲤龙', '巨牙鲨']],
  ['矿工·铁镐', ['龙头地鼠', '班基拉斯', '波士可多拉']],
  ['格斗家·岩拳', ['路卡利欧', '怪力', '铁掌力士']],
  ['火山学者·炎', ['喷火龙', '烈焰马', '烈咬陆鲨']],
  ['冲浪手·蓝波', ['拉普拉斯', '吼鲸王', '宝石海星']],
  ['龙之使者·凛', ['快龙', '暴飞龙', '三首恶龙', '烈空坐']],
  ['冠军·劫火', ['班基拉斯', '烈咬陆鲨', '超梦']],
];
/* 训тренер 数据在 HTML 里是一段 JSON 对象数组：定位 var TRAINERS= 的文本，逐个改坏 id */
const startIdx = src.indexOf('var TRAINERS=');
const lit = sliceLiteral(startIdx + 'var TRAINERS='.length, src);
let TRAINERS = new Function('return (' + lit + ')')();
let fixed = 0;
TRAINERS.forEach(t => {
  const plan = (PLAN.find(p => p[0] === t.name) || [])[1] || [];
  let pi = 0;
  t.team = (t.team || []).map(id => {
    if (byId[id]) return id;                      /* 引用还在，保留 */
    const nm = plan[pi++];
    if (!nm) return id;                            /* 没有替补就留着（不该发生） */
    const sp = byName[nm];
    if (!sp) { console.log('⚠️ 找不到替补物种 ' + nm); return id; }
    console.log('  ' + (t.name || t.id) + '：' + id + ' → ' + sp.name + '(' + sp.id + ')');
    fixed++;
    return sp.id;
  });
});
console.log('\n修复 ' + fixed + ' 个槽位');
const allOk = TRAINERS.every(t => (t.team || []).every(id => byId[id]));
console.log('全部引用有效：' + (allOk ? '✅' : '❌'));
if (!allOk) {
  TRAINERS.forEach(t => { const bad = (t.team || []).filter(id => !byId[id]); if (bad.length) console.log('  仍坏：' + t.name + ' ' + bad.join('、')); });
  process.exit(1);
}
copyFileSync(F, F.replace(/\.html$/, '.bak-v17-pre-trainers.html'));
const newLit = JSON.stringify(TRAINERS);
src = src.slice(0, startIdx + 'var TRAINERS='.length) + newLit + src.slice(startIdx + 'var TRAINERS='.length + lit.length);
writeFileSync(F, src, 'utf8');
console.log('已写回 TRAINERS');
TRAINERS.forEach(t => console.log('  ' + (t.name || t.id).padEnd(12) + (t.team || []).map(nameOf).join('/')));
