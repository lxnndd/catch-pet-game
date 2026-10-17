/* v26 分析 dvg spirits.php 的数据结构与编码 */
import { writeFileSync } from 'node:fs';
const H = { 'User-Agent': 'Mozilla/5.0 Chrome/120', 'Referer': 'https://roco.dvg.cn/spirits.php' };
const r = await fetch('https://roco.dvg.cn/spirits.php', { headers: H });
const buf = Buffer.from(await r.arrayBuffer());
console.log('字节 ' + buf.length + ' · 头: ' + buf.slice(0, 200).toString('latin1').replace(/\s+/g, ' '));
const utf = buf.toString('utf8');
const gbk = new TextDecoder('gbk').decode(buf);
writeFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/out/dvg-spirits-utf8.html', utf);
writeFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/out/dvg-spirits-gbk.html', gbk);
console.log('utf8 含"火苗龙" ' + utf.includes('火苗龙') + ' / gbk 含"火苗龙" ' + gbk.includes('火苗龙'));
console.log('utf8 含"遁鼠" ' + utf.includes('遁鼠') + ' / gbk 含"遁鼠" ' + gbk.includes('遁鼠'));
for (const s of [utf, gbk]) {
  const api = [...s.matchAll(/["'(]([^"'()\s]*\.(?:php|json|js)[^"'()\s]*)["')]/g)].map(m => m[1]);
  if (api.length) console.log('引用文件: ' + [...new Set(api)].slice(0, 25).join(' | '));
}
/* 找编号与图的关系 */
const imgs = [...gbk.matchAll(/dbsource\/spirit\/\d+\/(\d+)-\.png/g)].map(m => m[1]);
console.log('gbk 中 spirit 图链接数 ' + imgs.length + '，前 20 个编号: ' + imgs.slice(0, 20).join(','));
const alt = [...gbk.matchAll(/<img[^>]*?(\d+)-\.png[^>]*?>/g)].slice(0, 3);
for (const a of alt) console.log('IMG 标签样本: ' + a[0].slice(0, 200));
