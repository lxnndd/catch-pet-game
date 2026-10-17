/* v26 把重压后的洛克 webp 同步到部署目录 app/site/avatars/ */
import { readdirSync, copyFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const WEBP = ROOT + '/_work/v17-avatars-webp';
const OUT = ROOT + '/app/site/avatars';
mkdirSync(OUT, { recursive: true });
const files = readdirSync(WEBP).filter(f => f.startsWith('kz-') && f.endsWith('.webp'));
let n = 0, bytes = 0, miss = 0;
for (const f of files) {
  const p = WEBP + '/' + f;
  if (!existsSync(p)) { miss++; continue; }
  copyFileSync(p, OUT + '/' + f); n++; bytes += readFileSync(p).length;
}
console.log('已同步 ' + n + ' 张洛克 webp 到 app/site/avatars/（' + (bytes / 1024).toFixed(0) + ' KB）· 缺失 ' + miss);
console.log('部署目录 webp 总数 ' + readdirSync(OUT).filter(f => f.endsWith('.webp')).length);
