/* v35d：修补洛克缺失的进化链（数据源里 lv=null 的条目在 v17 注入时被跳过）
   规则：数据源有 evo.to 且目标存在于游戏 → 建链；lv 缺失时补 32（沿用 v28 用户选定的兜底值）
   用法：node v35d-patch-kzevo.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v35d.html';
const apply = process.argv.includes('--apply');
const FALLBACK_LV = 32;

const mod = await import('file:///' + (ROOT + '/_work/v17-data/roco.mjs').replace(/\\/g, '/').replace(/^\/+/, ''));
const ROCO = mod.ROCO;
const byNo = {}; ROCO.forEach(o => byNo[String(o.kzNo).padStart(3, '0')] = o);
const nameToNo = {}; ROCO.forEach(o => { if (!(o.n in nameToNo)) nameToNo[o.n] = String(o.kzNo).padStart(3, '0'); });

let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
/* 解析 SPECIES 与 EVO */
function parseVar(n) {
  const k = 'var ' + n + '=';
  const at = work.indexOf(k);
  if (at < 0) throw new Error('找不到 ' + k);
  const head = at + k.length;
  const from = head + work.slice(head).search(/[[{]/);
  const oc = work[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, q = null, esc = false;
  for (; j < work.length; j++) {
    const c = work[j];
    if (q) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) q = null; continue; }
    if (c === '"') { q = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return { from, to: j, val: new Function('return (' + work.slice(from, j) + ')')() };
}
const sp = parseVar('SPECIES'), ev = parseVar('EVO');
const SPECIES = sp.val, EVO = ev.val;
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);
const evolved = new Set();
Object.keys(EVO).forEach(k => { const t = EVO[k].to; (Array.isArray(t) ? t : [t]).forEach(x => evolved.add(x)); });

const added = [], skipped = [];
ROCO.forEach(o => {
  const id = 'kz-' + String(o.kzNo).padStart(3, '0');
  if (!byId[id]) return;
  const e = o.evo;
  if (!e || !e.to) return;
  if (EVO[id]) return;                                  /* 已有链 */
  const toNos = (Array.isArray(e.to) ? e.to : [e.to]).map(n => nameToNo[n]).filter(Boolean);
  const toIds = toNos.map(n => 'kz-' + n).filter(t => byId[t]);
  if (!toIds.length) { skipped.push((o.n || id) + ' → ' + (Array.isArray(e.to) ? e.to.join('/') : e.to) + '（目标不在游戏里，属超进化形态）'); return; }
  const lv = (typeof e.lv === 'number' && e.lv > 0) ? e.lv : FALLBACK_LV;
  EVO[id] = { to: toIds.length === 1 ? toIds[0] : toIds, lv: lv, how: e.how || '等级', item: e.item || '', branchCount: toIds.length };
  added.push((o.n || id) + ' → ' + toIds.map(t => byId[t].name).join('/') + ' Lv.' + lv + (typeof e.lv === 'number' && e.lv > 0 ? '' : '（等级缺失，补 ' + FALLBACK_LV + '）'));
});

console.log('补上进化链: ' + added.length + ' 条');
added.forEach(x => console.log('  ✅ ' + x));
console.log('\n仍无法建链（目标不在游戏里）: ' + skipped.length + ' 条');
skipped.slice(0, 12).forEach(x => console.log('  ⚠️ ' + x));
if (skipped.length > 12) console.log('  …其余 ' + (skipped.length - 12) + ' 条');

/* 复查：还有多少只孤立 */
const kz = SPECIES.filter(s => s.id.startsWith('kz-'));
const nowEvolved = new Set();
Object.keys(EVO).forEach(k => { const t = EVO[k].to; (Array.isArray(t) ? t : [t]).forEach(x => nowEvolved.add(x)); });
const loners = kz.filter(s => !EVO[s.id] && !nowEvolved.has(s.id));
console.log('\n补完后仍「孤立」的洛克: ' + loners.length + ' 只 → ' + loners.map(s => s.name).join('、'));
if (!apply) { console.log('\n（未加 --apply，仅预演）'); process.exit(0); }
work = work.slice(0, ev.from) + JSON.stringify(EVO) + work.slice(ev.to);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
