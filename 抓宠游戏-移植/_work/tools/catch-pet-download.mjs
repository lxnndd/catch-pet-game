// 下载抓宠游戏真实文件 + 完整性校验
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const URL_ = process.argv[2];
const OUT = process.argv[3] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12.html';

const r = await fetch(URL_, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Referer': 'https://share.my.cn/'
  }
});
console.log('HTTP', r.status, r.headers.get('content-type'), r.headers.get('content-length'));
const buf = Buffer.from(await r.arrayBuffer());
const text = buf.toString('utf8');
writeFileSync(OUT, text, 'utf8');

const sha = createHash('sha256').update(buf).digest('hex');
console.log('字节数:', buf.length);
console.log('sha256:', sha);
const checks = {
  'DOCTYPE 开头': text.startsWith('<!DOCTYPE'),
  '</html> 收尾': text.trimEnd().endsWith('</html>'),
  '含 canvas': text.includes('canvas'),
  '含 boot()': /boot\(\)/.test(text),
  '含 抓宠': text.includes('抓宠'),
  '含 宠物/捕捉': /宠物|捕捉|驯服/.test(text),
  'script 块数': (text.match(/<script/g) || []).length,
  'style 块数': (text.match(/<style/g) || []).length,
  '版本标记': (text.match(/v1[0-9]|V1[0-9]|版本\s*[:：]?\s*[0-9.]+/g) || []).slice(0, 8).join(' | ') || '(无)'
};
console.log('--- 校验 ---');
for (const [k, v] of Object.entries(checks)) console.log(` ${k}: ${v}`);
console.log('--- 前 12 行 ---');
console.log(text.split('\n').slice(0, 12).join('\n').slice(0, 900));
