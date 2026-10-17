/* 复现注入器的头像读取：它到底读了哪张 pk-037 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const AVW = ROOT + '/_work/v17-avatars-webp';
const h = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);
console.log('目录 ' + AVW + ' 存在：' + existsSync(AVW));
const all = readdirSync(AVW).filter(f => f.endsWith('.webp'));
console.log('webp 文件数：' + all.length);
const f37 = all.filter(f => f === 'pk-037.webp');
console.log('匹配 pk-037.webp 的文件：' + JSON.stringify(f37));
if (f37.length) {
  const buf = readFileSync(AVW + '/' + f37[0]);
  console.log('  它的 sha=' + h(buf) + ' 大小=' + buf.length);
}
/* 目录里还有别的 037 吗 */
console.log('\n名字里含 037 的：' + JSON.stringify(all.filter(f => f.includes('037'))));
/* HTML 里 AVATARS 的 pk-037 与文件对比 */
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
const i = src.indexOf('var AVATARS = {');
const seg = src.slice(i, i + 6000000);
const m = seg.match(/"pk-037":"([^"]+)"/);
const gameBuf = Buffer.from(m[1], 'base64');
console.log('\n游戏内 pk-037：' + gameBuf.length + ' 字节 sha=' + h(gameBuf));
console.log('本地 pk-037.webp：' + readFileSync(AVW + '/pk-037.webp').length + ' 字节 sha=' + h(readFileSync(AVW + '/pk-037.webp')));
console.log('→ ' + (h(gameBuf) === h(readFileSync(AVW + '/pk-037.webp')) ? '一致 ✅' : '不一致 ❌（注入没生效）'));
/* HTML 里是否有第二处 AVATARS / 是否被别的东西覆盖 */
console.log('\nHTML 中 "var AVATARS" 出现 ' + (src.match(/var AVATARS/g) || []).length + ' 次');
console.log('HTML 中 "pk-037" 出现 ' + (src.match(/pk-037/g) || []).length + ' 次');
const all37 = [...src.matchAll(/"pk-037":"([^"]{40})/g)];
console.log('pk-037 头像条目位置：' + all37.map(x => x.index).join(', '));
/* 游戏运行时 AVATARS 里到底是谁 —— 用 headless 查 */
