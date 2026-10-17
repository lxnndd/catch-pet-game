// 第三轮：找 API base（Sv 函数 / bv 常量 / doc-reader 域名）
import { readFileSync, writeFileSync } from 'node:fs';
const SRC = 'C:/Users/10709/Desktop/AI/千问_files/file_preview.30dcbea5a5fbdda3ecf6.js.下载';
const c = readFileSync(SRC, 'utf8');
const out = [];
const push = (title, arr) => { out.push(`\n===== ${title} (${arr.length}) =====`); for (const s of arr) out.push(s); };
const find = (re, before = 150, after = 500, limit = 5) => {
  const res = []; const r = new RegExp(re, 'g'); let m;
  while ((m = r.exec(c)) && res.length < limit) res.push(c.slice(Math.max(0, m.index - before), m.index + m[0].length + after));
  return res;
};
push('doc-reader 域名', find('doc-reader', 200, 400, 6));
push('Sv 函数', find('Sv=function|function Sv', 80, 500, 4));
push('bv 常量上下文', find('var bv=', 100, 500, 3));
push('Hv 函数（分享页签名）', find('Hv=function|function Hv', 80, 700, 4));
push('qianwen.com 全部域名', find('https://[a-z0-9\\-]+\\.qianwen\\.com', 60, 120, 20));
push('web_preview 全部出现', find('web_preview', 200, 300, 8));
writeFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/previewer-analysis3.txt', out.join('\n'), 'utf8');
console.log('ok', out.join('\n').length);
