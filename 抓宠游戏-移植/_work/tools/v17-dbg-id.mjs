/* 调试 newMoveId：为什么返回 undefined */
const OLD_MOVES = { existing1: 1, existing2: 1, existing3: 1 };
const moveByName = new Map([['已有招', { id: 'existing1' }]]);
let seq = 0;
function slug(s) { return String(s).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || ('m' + (++seq)); }
function newMoveId(cn) {
  let base = 'mv-' + String(cn).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase();
  console.log('  cn=' + JSON.stringify(cn) + ' → base=' + JSON.stringify(base));
  if (!base || base === 'mv-') base = 'mv' + (++seq);
  let id = base, k = 2;
  while (Object.keys(OLD_MOVES).includes(id) || [...moveByName.values()].some(m => m.id === id)) id = base + '-' + (k++);
  console.log('     id=' + JSON.stringify(id));
  return id;
}
console.log('测试：');
['撞击', '日光束', 'X-剪刀', '12号招', '  '].forEach(n => { try { newMoveId(n); } catch (e) { console.log('  异常 ' + e.message); } });
/* 看构建脚本里的实际定义 */
import { readFileSync } from 'node:fs';
const b = readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/tools/v17-build2.mjs', 'utf8');
const i = b.indexOf('function newMoveId');
console.log('\n构建脚本里的定义：\n' + b.slice(i, i + 420));
