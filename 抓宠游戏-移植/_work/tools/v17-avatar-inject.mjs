/* v17 头像注入：把 v17-avatars-webp/*.webp 内联进游戏 HTML 的 AVATARS 块
   键 = 物种 id（pk-001 / kz-001），只注入**当前物种表里存在**的 id，避免死图
   用法: node v17-avatar-inject.mjs [--dry] */
import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync } from 'node:fs';

const HTML = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const WEBP = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-avatars-webp';
const DRY = process.argv.includes('--dry');

let src = readFileSync(HTML, 'utf8');
/* 取物种表里所有 id（含亚种：亚种也能共用/单独有图） */
function sliceLiteral(startIdx) {
  const open = src.slice(startIdx).search(/[[{]/); const from = startIdx + open;
  const openCh = src[from], closeCh = openCh === '[' ? ']' : '}';
  let depth = 0, i = from, inStr = null, esc = false;
  for (; i < src.length; i++) { const c = src[i];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === openCh) depth++; else if (c === closeCh) { depth--; if (depth === 0) { i++; break; } } }
  return src.slice(from, i);
}
const spIdx = src.indexOf('var SPECIES=');
const SPECIES = new Function('return (' + sliceLiteral(spIdx + 'var SPECIES='.length) + ')')();
const ids = new Set(SPECIES.map(s => s.id));
console.log('物种表 ' + SPECIES.length + ' 条（id ' + ids.size + ' 个）');

/* 收集 webp：文件名即 id */
const files = existsSync(WEBP) ? readdirSync(WEBP).filter(f => f.endsWith('.webp')) : [];
const avatars = [];
let noId = [], totalBytes = 0;
for (const f of files) {
  const id = f.replace(/\.webp$/, '');
  if (!ids.has(id)) { noId.push(id); continue; }
  const buf = readFileSync(WEBP + '/' + f);
  totalBytes += buf.length;
  avatars.push([id, buf.toString('base64')]);
}
console.log('可用头像 ' + avatars.length + ' 张（合计 ' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB，base64 后约 ' + (totalBytes * 1.34 / 1024 / 1024).toFixed(2) + ' MB）');
if (noId.length) console.log('跳过（物种表里没有这些 id）：' + noId.slice(0, 12).join('、') + (noId.length > 12 ? ' …共 ' + noId.length + ' 个' : ''));
const missing = [...ids].filter(id => !avatars.some(a => a[0] === id));
console.log('⚠️ 缺图的物种 ' + missing.length + ' 个' + (missing.length ? '：' + missing.slice(0, 20).join('、') + (missing.length > 20 ? ' …' : '') : ''));

if (DRY) { console.log('\n--dry：不写入'); process.exit(0); }

/* 组装 AVATARS 块（每行 1 个，便于 diff 与局部替换） */
const lines = avatars.map(([id, b64]) => '  "' + id + '": "' + b64 + '"');
const block = 'var AVATARS = {\n' + lines.join(',\n') + '\n};';
const re = /var AVATARS = \{[\s\S]*?\n\};/;
if (!re.test(src)) { console.log('❌ 找不到 AVATARS 块'); process.exit(1); }
copyFileSync(HTML, HTML.replace(/\.html$/, '.bak-pre-avatars.html'));
src = src.replace(re, block);
writeFileSync(HTML, src, 'utf8');
console.log('\n已注入 ' + avatars.length + ' 张头像 → HTML 现在 ' + (src.length / 1024 / 1024).toFixed(2) + ' MB');
