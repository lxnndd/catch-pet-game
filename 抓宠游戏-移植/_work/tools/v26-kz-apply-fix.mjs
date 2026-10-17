/* v26 洛克头像修复：用按正确编号下载的官方图覆盖本地，并删除对应 webp 以便重压 */
import { readdirSync, copyFileSync, existsSync, unlinkSync, readFileSync } from 'node:fs';
import crypto from 'node:crypto';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FIX = ROOT + '/_work/v17-avatars-fix';
const AV = ROOT + '/_work/v17-avatars';
const WEBP = ROOT + '/_work/v17-avatars-webp';
const h = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
const files = readdirSync(FIX).filter(f => f.startsWith('kz-') && f.endsWith('.png'));
console.log('官方图 ' + files.length + ' 张待覆盖');
let replaced = 0, sameSkip = 0, noLocal = 0, webpDel = 0;
for (const f of files) {
  const from = FIX + '/' + f, to = AV + '/' + f;
  const nb = readFileSync(from);
  const ob = existsSync(to) ? readFileSync(to) : null;
  if (ob && h(ob) === h(nb)) { sameSkip++; }
  else { if (!ob) noLocal++; copyFileSync(from, to); replaced++; }
  const wp = WEBP + '/' + f.replace(/\.png$/, '.webp');
  if (existsSync(wp)) { unlinkSync(wp); webpDel++; }
}
console.log('覆盖 ' + replaced + ' 张（其中原先无文件 ' + noLocal + '）· 已一致跳过 ' + sameSkip + ' · 删除 webp ' + webpDel + ' 张');
console.log('webp 目录剩余 ' + readdirSync(WEBP).filter(f => f.endsWith('.webp')).length + ' 张');
