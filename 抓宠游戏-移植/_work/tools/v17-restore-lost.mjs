/* v17 恢复丢失代码：从 .bak-pre-avatars.html 找出当前文件缺失的 JS 区间并补回
   用法: node v17-restore-lost.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const S = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/';
const CUR = S + '抓宠游戏-v12-clean.html';
const GOOD = S + '抓宠游戏-v12-clean.bak-pre-avatars.html';
const APPLY = process.argv.includes('--apply');

const cur = readFileSync(CUR, 'utf8');
const good = readFileSync(GOOD, 'utf8');
console.log('当前 ' + (cur.length / 1024).toFixed(0) + ' KB · 参照 ' + (good.length / 1024).toFixed(0) + ' KB');

/* 两边的 script 内部代码（跳过数据块，只比函数区） */
const jsOf = (t) => t.slice(t.indexOf('<script>') + 8, t.lastIndexOf('</script>'));
const A = jsOf(good);      /* 好版本 */
const Bc = jsOf(cur);      /* 当前 */

/* 找出好版本里所有函数的 body 区间（用函数名 + 括号配对） */
function findFn(text, name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const m = text.match(re);
  if (!m) return null;
  const start = m.index;
  let i = text.indexOf('{', start), depth = 0, inStr = null, esc = false;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return { start, end: i, text: text.slice(start, i) };
}
const MISSING = ['initFighter', 'draw', 'updateHUD', 'openBattle', 'applyMove', 'openDex', 'bindInput', 'clearStatus', 'rollEnemy', 'renderMoveRow'];
const found = {};
MISSING.forEach(n => { found[n] = { good: findFn(A, n), cur: findFn(Bc, n) }; });
console.log('\n各函数存在情况：');
MISSING.forEach(n => console.log('  ' + n.padEnd(16) + '参照:' + (found[n].good ? '有' : '无') + '  当前:' + (found[n].cur ? '有' : '无')));

/* 用「当前文件里最后一个存在的函数」和「第一个存在的函数」夹出丢失区间 */
const goodOrder = MISSING.map(n => ({ n, pos: found[n].good ? found[n].good.start : -1 })).filter(x => x.pos >= 0).sort((a, b) => a.pos - b.pos);
const curHas = MISSING.map(n => ({ n, pos: found[n].cur ? found[n].cur.start : -1, end: found[n].cur ? found[n].cur.end : -1 })).filter(x => x.pos >= 0).sort((a, b) => a.pos - b.pos);
console.log('\n参照版本里这些函数的顺序：' + goodOrder.map(x => x.n).join(' → '));
console.log('当前版本里还活着的：' + (curHas.length ? curHas.map(x => x.n).join(' → ') : '（一个都没有）'));

/* 参照版本里，丢失区间的范围 = 第一个缺失函数之前最后一个「当前也有」的函数的结束，到第一个「当前也有」的函数开始 */
/* 更直接：找参照版本中从 initFighter 前一个函数结尾 到 boot 之前 的整段 */
const anchors = ['ensureMoves', 'syncPP', 'poolCandidates', 'queueLearn', 'gainExp', 'runEvoCheck', 'buildPP', 'boot'];
console.log('\n锚点（参照版本）：');
anchors.forEach(n => { const f = findFn(A, n); console.log('  ' + n.padEnd(14) + (f ? (f.start + '…' + f.end + ' (' + f.text.length + ' chars)') : '无')); });
const curAnchors = {};
anchors.forEach(n => { curAnchors[n] = findFn(Bc, n); });
console.log('锚点（当前版本）：');
anchors.forEach(n => { const f = curAnchors[n]; console.log('  ' + n.padEnd(14) + (f ? (f.start + '…' + f.end) : '❌ 无')); });

/* 恢复策略：以 good 版本中 ensureMoves 结束 … boot 开始 之间那段为目标，
   它在 good 里包含所有丢失的函数；当前文件同一位置只有零散代码。*/
const gStart = (() => { const f = findFn(A, 'poolCandidates') || findFn(A, 'syncPP') || findFn(A, 'ensureMoves'); return f ? f.end : -1; })();
const gEnd = (() => { const f = findFn(A, 'boot'); return f ? f.start : -1; })();
console.log('\n参照版本的「函数密集区」区间：' + gStart + ' … ' + gEnd + '（' + ((gEnd - gStart) / 1024).toFixed(1) + ' KB）');
const segment = A.slice(gStart, gEnd);
/* 该区间包含哪些函数定义 */
const fnsInSeg = [...segment.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]);
console.log('区间内函数 ' + fnsInSeg.length + ' 个：' + fnsInSeg.slice(0, 30).join('、') + (fnsInSeg.length > 30 ? ' …' : ''));
const stillMissing = fnsInSeg.filter(n => !findFn(Bc, n));
console.log('其中当前文件仍缺的 ' + stillMissing.length + ' 个：' + stillMissing.join('、'));

/* 当前文件里插入点：boot 函数之前 */
const curBoot = findFn(Bc, 'boot');
if (!curBoot) { console.log('❌ 当前文件没有 boot，无法定位插入点'); process.exit(1); }
console.log('\n插入点：当前文件 boot 之前（偏移 ' + curBoot.start + '）');
if (!APPLY) { console.log('（--dry，不写入；加 --apply 执行）'); writeFileSync(S + '_work/out/lost-segment.js', segment, 'utf8'); console.log('已把待补片段写出到 _work/out/lost-segment.js 供检查'); process.exit(0); }
copyFileSync(CUR, S + '抓宠游戏-v12-clean.bak-before-restore.html');
const out = Bc.slice(0, curBoot.start) + segment + '\n' + Bc.slice(curBoot.start);
writeFileSync(CUR, cur.slice(0, cur.indexOf('<script>') + 8) + out + cur.slice(cur.lastIndexOf('</script>')));
console.log('✅ 已补回 ' + stillMissing.length + ' 个函数，文件现在 ' + (readFileSync(CUR, 'utf8').length / 1024 / 1024).toFixed(2) + ' MB');
