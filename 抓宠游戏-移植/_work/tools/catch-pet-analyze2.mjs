// 第二轮分析：biz_id 常量、请求头/签名生成（Fv/zv/Xv 函数）
import { readFileSync, writeFileSync } from 'node:fs';
const SRC = 'C:/Users/10709/Desktop/AI/千问_files/file_preview.30dcbea5a5fbdda3ecf6.js.下载';
const c = readFileSync(SRC, 'utf8');
const out = [];
const push = (title, arr) => { out.push(`\n===== ${title} (${arr.length}) =====`); for (const s of arr) out.push(s); };
const find = (re, before = 100, after = 400, limit = 6) => {
  const res = []; const r = new RegExp(re, 'g'); let m;
  while ((m = r.exec(c)) && res.length < limit) res.push(c.slice(Math.max(0, m.index - before), m.index + m[0].length + after));
  return res;
};
push('mv 常量定义', find('\\bmv\\s*=', 150, 200, 6));
push('biz_id 出现处', find('biz_id', 150, 250, 10));
push('Fv 函数', find('Fv=function|function Fv', 50, 500, 4));
push('zv 函数', find('zv=function|function zv', 50, 500, 4));
push('Xv 函数', find('Xv=function|function Xv', 50, 600, 4));
push('resources reduce 全貌', find('resources\\)\\|\\|\\[\\]', 500, 200, 3));
push('uc_param_str / qianwenApp', find('uc_param_str', 200, 250, 6));
push('headers 设置', find('headers:\\s*\\{', 100, 320, 10));
writeFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/previewer-analysis2.txt', out.join('\n'), 'utf8');
console.log('ok', out.join('\n').length);
