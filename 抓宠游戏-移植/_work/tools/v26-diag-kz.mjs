/* v26 诊断+修复：洛克头像错位（按 kz-{编号} 重新下载，不走名字查表） */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"') { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const SP = new Function('return (' + sliceLiteral(src, src.indexOf('var SPECIES=') + 'var SPECIES='.length) + ')')();
const kz = SP.filter(s => s.kz);
console.log('洛克物种 ' + kz.length + ' 只');
console.log('抽查 id 与名字：' + kz.slice(0, 5).map(s => s.id + '=' + s.name).join('、'));
const abu = kz.find(s => s.name === '圣龙阿布');
const dunshu = kz.find(s => s.name === '遁鼠');
console.log('圣龙阿布 → ' + (abu ? abu.id : '未找到'));
console.log('遁鼠 → ' + (dunshu ? dunshu.id : '未找到'));
/* 看本地文件时间/大小，判断是否整体错位 */
const AV = ROOT + '/_work/v17-avatars';
const h = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
if (abu && existsSync(AV + '/' + abu.id + '.png')) {
  const b = readFileSync(AV + '/' + abu.id + '.png');
  console.log('本地 ' + abu.id + '.png：' + b.length + ' 字节 · sha=' + h(b));
}
if (dunshu && existsSync(AV + '/' + dunshu.id + '.png')) {
  const b = readFileSync(AV + '/' + dunshu.id + '.png');
  console.log('本地 ' + dunshu.id + '.png：' + b.length + ' 字节 · sha=' + h(b));
}
/* 下载官方 kz-{编号} 对比 */
async function get(url, ms = 20000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120', 'Referer': 'https://roco.dvg.cn/spirits.php' } });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    return b.length > 500 ? b : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}
for (const [nm, sp] of [['圣龙阿布', abu], ['遁鼠', dunshu]]) {
  if (!sp) continue;
  const num = Number(String(sp.id).replace(/^kz-0*/, ''));
  const off = await get('https://roco.dvg.cn/dbsource/spirit/300/' + num + '-.png');
  const loc = existsSync(AV + '/' + sp.id + '.png') ? readFileSync(AV + '/' + sp.id + '.png') : null;
  console.log('\n' + nm + ' (' + sp.id + ' → dvg ' + num + ')');
  console.log('  官方图：' + (off ? (off.length + ' 字节 sha=' + h(off)) : '取不到'));
  console.log('  本地图：' + (loc ? (loc.length + ' 字节 sha=' + h(loc)) : '无文件'));
  if (off && loc) console.log('  → ' + (h(off) === h(loc) ? '一致 ✅' : '❌ 不一致（本地是别人的图）'));
}
