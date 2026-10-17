/* v26 找 dvg 站的 API 端点 */
import { readFileSync } from 'node:fs';
const s = readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/out/dvg-spirits-utf8.html', 'utf8');
const hits = new Set();
for (const re of [/axios\.[a-z]+\(\s*['"`]([^'"`]+)['"`]/g, /url\s*:\s*['"`]([^'"`]+)['"`]/g, /["'`](\/api[^"'`\s]*)["'`]/g, /(https?:\/\/[a-z0-9.\-]+\/[^"'`\s]*(?:api|interface)[^"'`\s]*)/gi, /["'`]([a-z0-9_\-]+\.php[^"'`\s]*)["'`]/gi]) {
  for (const m of s.matchAll(re)) hits.add(m[1]);
}
console.log('候选端点：');
for (const h of hits) console.log('  ' + h);
/* 找 script 里的数据变量 / page 参数 */
const sc = [...s.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(x => x.length > 200);
console.log('\n内联 script 块 ' + sc.length + ' 个，长度 ' + sc.map(x => x.length).join(','));
for (const [i, x] of sc.entries()) {
  const keys = [...x.matchAll(/\b(get|post|fetch|list|spirit|page|sx|ajax)\w*\b/gi)].map(m => m[0]);
  console.log('  块' + i + ' 关键调用: ' + [...new Set(keys)].slice(0, 18).join(','));
  const u = [...x.matchAll(/['"`]([^'"`\s]{4,80})['"`]/g)].map(m => m[1]).filter(v => /\.php|\/api|list|spirit/i.test(v));
  if (u.length) console.log('    字符串: ' + [...new Set(u)].slice(0, 20).join(' | '));
}
