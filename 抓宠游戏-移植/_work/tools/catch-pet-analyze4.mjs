// 第四轮：Iv 函数（生成 queryParams / headers）与 ut / utd 来源
import { readFileSync, writeFileSync } from 'node:fs';
const SRC = 'C:/Users/10709/Desktop/AI/千问_files/file_preview.30dcbea5a5fbdda3ecf6.js.下载';
const c = readFileSync(SRC, 'utf8');
const out = [];
const push = (title, arr) => { out.push(`\n===== ${title} (${arr.length}) =====`); for (const s of arr) out.push(s); };
const find = (re, before = 100, after = 600, limit = 5) => {
  const res = []; const r = new RegExp(re, 'g'); let m;
  while ((m = r.exec(c)) && res.length < limit) res.push(c.slice(Math.max(0, m.index - before), m.index + m[0].length + after));
  return res;
};
push('Iv 函数', find('Iv=function|function Iv', 60, 700, 4));
push('utd_id / utdId', find('utd_id|utdId', 150, 250, 10));
push('eo-clt-dvidn', find('eo-clt-dvidn', 200, 300, 5));
push('Bv 函数', find('Bv=function|function Bv', 60, 500, 3));
push('getDeviceID', find('getDeviceID', 120, 300, 6));
push('getAuthData', find('getAuthData', 120, 400, 6));
push('sign 调用', find('"spam\\.sign"|spam\\.sign', 150, 300, 5));
writeFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/previewer-analysis4.txt', out.join('\n'), 'utf8');
console.log('ok', out.join('\n').length);
