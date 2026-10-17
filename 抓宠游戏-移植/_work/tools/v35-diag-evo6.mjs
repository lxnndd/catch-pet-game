/* 查这 6 只「孤立」洛克在数据源里的 evo 字段，判断是该补链还是本来就无进化 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mod = await import('file:///' + (ROOT + '/_work/v17-data/roco.mjs').replace(/\\/g, '/').replace(/^\/+/, ''));
const ROCO = mod.ROCO;
const NAMES = ['喵喵', '地鼠', '遁鼠', '超音蝠', '扁嘴蝠', '迪莫'];
console.log('数据源共 ' + ROCO.length + ' 只\n');
NAMES.forEach(n => {
  const o = ROCO.find(x => x.n === n);
  if (!o) { console.log('  ' + n + ' → 数据源里没有'); return; }
  console.log('  ' + n + '(' + o.kzNo + ')  evo=' + JSON.stringify(o.evo || null) + '  note=' + String(o.note || '').slice(0, 90));
});
/* 反过来找：谁的 evo 指向这 6 只 */
console.log('\n══ 有谁的 evo.to 指向它们？══');
NAMES.forEach(n => {
  const src = ROCO.filter(x => x.evo && (x.evo.to === n || (Array.isArray(x.evo.to) && x.evo.to.indexOf(n) >= 0)));
  if (src.length) console.log('  ' + n + ' ← ' + src.map(x => x.n + '(Lv' + x.evo.lv + ')').join('、'));
  else console.log('  ' + n + ' ← 没有前置形态');
});
/* 看喵喵/超音蝠附近的编号顺序，判断谁该接谁 */
console.log('\n══ 编号 1~10 与 超音蝠/扁嘴蝠 附近 ══');
ROCO.slice(0, 10).forEach(o => console.log('  ' + o.kzNo + ' ' + o.n.padEnd(8) + ' evo=' + (o.evo ? JSON.stringify(o.evo) : '无')));
const bat = ROCO.filter(o => o.n.indexOf('蝠') >= 0 || o.n.indexOf('鼠') >= 0);
console.log('  含「蝠/鼠」的: ' + bat.map(o => o.kzNo + o.n + (o.evo ? '→' + (typeof o.evo.to === 'string' ? o.evo.to : JSON.stringify(o.evo.to)) + '@' + o.evo.lv : '(无)')).join('  '));
