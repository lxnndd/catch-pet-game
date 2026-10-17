/* v22 性能优化：头像从「内联 base64」改为「外置文件按需加载」——HTML 7.3MB → 约 0.9MB */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

/* 1) avatarURL 改为返回文件路径（不再拼 data URL） */
const reFn = /function avatarURL\(sp\)\{[\s\S]*?\n\}/;
const mFn = src.match(reFn);
if (!mFn) throw new Error('找不到 avatarURL');
console.log('原 avatarURL：' + mFn[0].replace(/\s+/g, ' ').slice(0, 200));
src = src.replace(reFn, `function avatarURL(sp){
  /* v22：头像改为外置文件按需加载（原来把 1205 张 base64 内联进 HTML，整页 7.3MB，手机上解析极慢） */
  if(!sp) return "";
  if(!AVATARS || !AVATARS[sp.id]) return "";
  return "avatars/"+sp.id+".webp";
}`);

/* 2) AVATARS 收缩成「有哪些 id」的集合（值是 1，不再放 base64） */
const S_ = src.indexOf('var AVATARS = {');
const E_ = src.indexOf('\n};', S_);
if (S_ < 0 || E_ < 0) throw new Error('找不到 AVATARS 块');
const oldLen = E_ - S_;
const ids = [...src.slice(S_, E_).matchAll(/"([a-z]+-\d+)":/g)].map(m => m[1]);
console.log('原 AVATARS 块 ' + (oldLen / 1024 / 1024).toFixed(2) + ' MB，含 ' + ids.length + ' 个 id');
const NEW_AV = 'var AVATARS = {' + ids.map(id => '"' + id + '":1').join(',') + '\n};';
src = src.slice(0, S_) + NEW_AV + src.slice(E_ + 3);
console.log('新 AVATARS 块 ' + (NEW_AV.length / 1024).toFixed(1) + ' KB');

writeFileSync(F, src, 'utf8');
console.log('\nv22：' + (before / 1024 / 1024).toFixed(2) + ' MB → ' + (src.length / 1024 / 1024).toFixed(2) + ' MB');
console.log('  avatarURL 已改为路径：' + (src.includes('avatars/"+sp.id+".webp') ? '✅' : '❌'));
console.log('  AVATARS 已收缩：' + (src.length < before / 2 ? '✅' : '❌'));

/* 3) 把 webp 头像复制到部署目录 app/site/avatars/ */
const webpDir = ROOT + '/_work/v17-avatars-webp';
const outDir = ROOT + '/app/site/avatars';
mkdirSync(outDir, { recursive: true });
let copied = 0, bytes = 0;
readdirSync(webpDir).filter(f => f.endsWith('.webp')).forEach(f => {
  const p = webpDir + '/' + f;
  copyFileSync(p, outDir + '/' + f);
  copied++; bytes += readFileSync(p).length;
});
console.log('\n已复制 ' + copied + ' 张头像到 app/site/avatars/（' + (bytes / 1024 / 1024).toFixed(2) + ' MB）');
