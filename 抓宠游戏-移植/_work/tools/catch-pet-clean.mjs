// 清理抓宠游戏 HTML 里的千问追踪 SDK（itrace），保持单文件可离线运行
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = process.argv[2];
const DST = process.argv[3];
let t = readFileSync(SRC, 'utf8');
const before = t.length;
const removed = [];

// 1) itrace 配置 + 加载脚本块
const p1 = /<script>\s*!\(function\(j,a,g\)\{j\.__itrace_conf[\s\S]*?<\/script>\s*/;
if (p1.test(t)) { t = t.replace(p1, ''); removed.push('itrace 配置/加载块'); }

// 2) 任何引用 itrace 的 script 标签
const p2 = /<script[^>]*>[\s\S]{0,400}itrace[\s\S]{0,400}<\/script>\s*/g;
let m2; let n2 = 0;
while ((m2 = p2.exec(t))) n2++;
if (n2) { t = t.replace(p2, ''); removed.push(`itrace 相关 script ×${n2}`); }

// 3) 外链脚本（http(s):// 的 src）
const p3 = /<script[^>]*\ssrc=["']https?:\/\/[^"']+["'][^>]*>\s*<\/script>\s*/g;
let m3; let n3 = 0;
while ((m3 = p3.exec(t))) n3++;
if (n3) { t = t.replace(p3, ''); removed.push(`外链 script ×${n3}`); }

// 4) 残留的 __itrace 调用（仅上报用，删掉不影响游戏）
if (/__itrace/.test(t)) { removed.push('（仍有 __itrace 文本残留，见下）'); }

writeFileSync(DST, t, 'utf8');
console.log(`清理完成 ${before} → ${t.length} 字节（-${before - t.length}）`);
console.log('删除项:', removed.join(' / ') || '无');
console.log('残留 __itrace 次数:', (t.match(/__itrace/g) || []).length);
console.log('剩余 script 标签:', (t.match(/<script/g) || []).length, ' · 外链 src:', (t.match(/src=["']https?:/g) || []).length);
