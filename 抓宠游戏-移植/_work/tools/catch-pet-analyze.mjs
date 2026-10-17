// 分析千问预览器 JS：找 guest/info 接口的调用方式与文件真实地址字段
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'C:/Users/10709/Desktop/AI/千问_files/file_preview.30dcbea5a5fbdda3ecf6.js.下载';
const c = readFileSync(SRC, 'utf8');
const out = [];
const push = (title, arr) => {
  out.push(`\n===== ${title} (${arr.length}) =====`);
  for (const s of arr) out.push(s);
};
const ctx = (re, before = 200, after = 300, limit = 6) => {
  const res = [];
  const r = new RegExp(re, 'g');
  let m;
  while ((m = r.exec(c)) && res.length < limit) {
    res.push(c.slice(Math.max(0, m.index - before), m.index + m[0].length + after));
  }
  return res;
};

push('guest/info 调用点', ctx('Cv\\(', 150, 250, 8));
push('guest/info 直接出现', ctx('guest/info', 300, 300, 4));
push('htmlFid 相关', ctx('htmlFid', 120, 160, 10));
push('qianwen.com API base', ctx('chat2-api', 120, 200, 4));
push('fetch/axios 请求模板', ctx('"\\/2\\/reader', 200, 400, 4));
push('文件 url 字段 (fileUrl|file_url|downloadUrl|url:)', ctx('(fileUrl|file_url|downloadUrl|download_url|resourceUrl|resource_url)', 100, 150, 12));
push('blob/base64 处理', ctx('(blob:|atob\\(|base64)', 120, 160, 8));

writeFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/previewer-analysis.txt', out.join('\n'), 'utf8');
console.log('written', out.join('\n').length, 'chars');
