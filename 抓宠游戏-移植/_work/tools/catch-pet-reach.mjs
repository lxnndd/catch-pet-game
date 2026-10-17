// 终极收尾核验：公网返回字节 == 本地清理版 + 劫火回归 + 延迟
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const local = readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html');
const localSha = createHash('sha256').update(local).digest('hex');

const t0 = Date.now();
const r = await fetch('http://47.105.123.182:8727/');
const buf = Buffer.from(await r.arrayBuffer());
const sha = createHash('sha256').update(buf).digest('hex');

console.log('=== 抓宠游戏 · 公网 ===');
console.log(' HTTP:', r.status, r.headers.get('content-type'));
console.log(' 公网字节:', buf.length, '| 本地清理版字节:', local.length);
console.log(' 公网 sha256   :', sha);
console.log(' 本地 sha256   :', localSha);
console.log(' 一致性:', sha === localSha ? '✅ 完全一致（玩家拿到的就是验收过的文件）' : '❌ 不一致！');
console.log(' 首字节响应:', Date.now() - t0, 'ms');
console.log(' Cache-Control:', r.headers.get('cache-control'));

console.log('\n=== 劫火烙八荒 · 回归检查 ===');
const t1 = Date.now();
const j = await fetch('http://47.105.123.182:8726/health');
console.log(' HTTP:', j.status, '|', (await j.text()).slice(0, 120), '|', Date.now() - t1, 'ms');
console.log(' 结论:', j.ok ? '✅ 劫火安然无恙，两站并存' : '❌ 劫火异常！');

console.log('\n=== 目录 ---');
console.log(' 抓宠游戏:', 'http://47.105.123.182:8727/');
console.log(' 劫火烙八荒:', 'http://47.105.123.182:8726/');
