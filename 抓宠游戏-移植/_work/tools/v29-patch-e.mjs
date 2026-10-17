/* v29b：图鉴分类筛选改为按「属性」（18 属性），而不是按来源（宝可梦/洛克）
   用法：node v29-patch-e.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v29e.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── 1. dexList 改为按属性筛选 ── */
rep(
  'function dexList(){ return SPECIES.filter(function(sp){ return DEX_FILTER==="all"||dexSourceOf(sp)===DEX_FILTER; }); }',
  'function dexList(){ return SPECIES.filter(function(sp){ return DEX_FILTER==="all"||sp.type===DEX_FILTER||sp.type2===DEX_FILTER; }); }   /* v29b：按「属性」筛选（双属性任一命中） */',
  'dexList 改为按属性筛选');

/* ── 2. 顶端工具条：全部 + 18 属性 ── */
rep(
  ['    [["all","全部"],["pk","宝可梦"],["kz","洛克王国"]].forEach(function(it){',
    '      var b=document.createElement("button"); b.className="btn-sm"+(DEX_FILTER===it[0]?" on":"");',
    '      var n=it[0]==="all"?SPECIES.length:SPECIES.filter(function(x){return dexSourceOf(x)===it[0];}).length;',
    '      b.textContent=it[1]+" "+n;',
    '      b.addEventListener("click",function(){ DEX_FILTER=it[0]; DEX_PAGE=0; openDex(0); });',
    '      tb.appendChild(b);',
    '    });'].join('\n'),
  ['    /* v29b：按「属性」分类（18 属性），不再是按来源（宝可梦/洛克） */',
    '    var _filters=[["all","全部"]];',
    '    Object.keys(TYPE_NAME).forEach(function(k){ _filters.push([k, TYPE_NAME[k]]); });',
    '    _filters.forEach(function(it){',
    '      var b=document.createElement("button"); b.className="btn-sm"+(DEX_FILTER===it[0]?" on":"");',
    '      var n=it[0]==="all"?SPECIES.length:SPECIES.filter(function(x){return x.type===it[0]||x.type2===it[0];}).length;',
    '      b.textContent=it[1]+" "+n;',
    '      if(!n) b.disabled=true;',
    '      b.addEventListener("click",function(){ DEX_FILTER=it[0]; DEX_PAGE=0; openDex(0); });',
    '      tb.appendChild(b);',
    '    });'].join('\n'),
  '工具条改为「全部 + 18 属性」');

/* ── 3. 工具条样式：允许横向滚动 + 紧凑一点（19 个按钮） ── */
rep(
  '.dex-toolbar{display:flex; flex-wrap:wrap; gap:6px; justify-content:center; padding:2px 0 8px;}',
  ['.dex-toolbar{display:flex; flex-wrap:wrap; gap:5px; justify-content:center; padding:2px 0 8px; max-height:132px; overflow-y:auto;}',
    '.dex-toolbar .btn-sm{padding:3px 8px; font-size:12px;}'].join('\n'),
  '工具条样式（19 个按钮可滚动）');

/* ── 校验 ── */
const need = ['function dexList(){ return SPECIES.filter(function(sp){ return DEX_FILTER==="all"||sp.type===DEX_FILTER',
  'var _filters=[["all","全部"]];', 'Object.keys(TYPE_NAME).forEach(function(k){ _filters.push([k, TYPE_NAME[k]]); });',
  '.dex-toolbar .btn-sm{'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
if (work.includes('[["all","全部"],["pk","宝可梦"],["kz","洛克王国"]]')) { console.error('!! 来源筛选仍在'); process.exit(1); }
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节)');
