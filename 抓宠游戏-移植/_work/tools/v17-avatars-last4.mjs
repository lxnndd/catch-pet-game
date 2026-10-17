/* v17 补齐最后 4 只头像：3 只 PokéAPI 繁简混写（用已知图鉴号）+ 乐维（dvg 站内搜索）*/
import { writeFileSync, existsSync } from 'node:fs';
import { WebSocket } from 'ws';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const AV = ROOT + '/_work/v17-avatars';
const OUT = ROOT + '/_work/out/';
import { readFileSync } from 'node:fs';
const sp = JSON.parse(readFileSync(OUT + 'species-v17.json', 'utf8'));

/* 1) 三只宝可梦：PokéAPI 用的名字与大陆官方不同，直接按图鉴号取图 */
const BY_ID = { '负电拍拍': 312, '缠红鹤': 973, '铁辙迹': 990 };
const GH = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
async function tryFetch(url, ms = 20000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    return b.length > 400 ? b : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}
for (const [name, pokeId] of Object.entries(BY_ID)) {
  const s = sp.find(x => x.name === name);
  if (!s) { console.log('⚠️ 物种表里没有 ' + name); continue; }
  if (existsSync(AV + '/' + s.id + '.png')) { console.log('已有 ' + name); continue; }
  let buf = null;
  for (const u of [GH + '/other/home/' + pokeId + '.png', GH + '/' + pokeId + '.png']) { buf = await tryFetch(u); if (buf) break; }
  if (buf) { writeFileSync(AV + '/' + s.id + '.png', buf); console.log('✅ ' + name + ' → ' + s.id + '（图鉴 #' + pokeId + '）'); }
  else console.log('❌ ' + name + ' 下载失败');
}

/* 2) 乐维：dvg 站内搜索编号（用表单提交，等结果刷新） */
const lewei = sp.find(x => x.name === '乐维');
if (lewei && existsSync(AV + '/' + lewei.id + '.png')) console.log('已有 乐维');
else if (lewei) {
  let seq = 0;
  const created = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(created.webSocketDebuggerUrl);
  const pending = new Map();
  ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.navigate', { url: 'https://roco.dvg.cn/spirits.php' });
  await wait(3000);
  await ev(`(function(){ var i=document.querySelector('input'); if(!i) return false; i.value='乐维'; i.dispatchEvent(new Event('input',{bubbles:true})); var b=[...document.querySelectorAll('button,input[type=submit],a')].find(function(x){return /搜索/.test(x.textContent||x.value||'');}); if(b){b.click(); return true;} if(i.form){i.form.submit(); return true;} return false; })()`);
  await wait(2500);
  const found = await ev(`(function(){ var out=[]; document.querySelectorAll('a[href*="spirit_info"]').forEach(function(a){ var m=(a.getAttribute('href')||'').match(/id=(\\d+)/); var img=a.querySelector('img'); var no=m?Number(m[1]):null; if(img){var mm=(img.getAttribute('src')||'').match(/spirit\\/\\d+\\/(\\d+)-/); if(mm) no=Number(mm[1]);} var nm=(a.textContent||'').trim(); if(nm&&nm.length<20&&no) out.push(nm+'='+no); }); return out.slice(0,12); })()`);
  console.log('搜索「乐维」结果：' + JSON.stringify(found));
  ws.close();
  /* 结果里找精确匹配 */
  const hit = (found || []).find(t => t.split('=')[0] === '乐维');
  if (hit) {
    const no = hit.split('=')[1];
    const r = await fetch('https://roco.dvg.cn/dbsource/spirit/300/' + no + '-.png', { headers: { Referer: 'https://roco.dvg.cn/spirits.php', 'User-Agent': 'Mozilla/5.0 Chrome/120' } });
    if (r.ok) { writeFileSync(AV + '/' + lewei.id + '.png', Buffer.from(await r.arrayBuffer())); console.log('✅ 乐维 → ' + lewei.id + '（dvg #' + no + '）'); }
    else console.log('❌ 乐维图片下载失败 ' + r.status);
  } else console.log('❌ 搜索没有精确匹配到「乐维」');
}

/* 最终统计 */
const { readdirSync } = await import('node:fs');
const have = new Set(readdirSync(AV).filter(f => f.endsWith('.png')).map(f => f.replace(/\.png$/, '')));
const miss = sp.filter(s => !have.has(s.id));
console.log('\n最终覆盖：' + (sp.length - miss.length) + ' / ' + sp.length + ' 只有头像');
if (miss.length) console.log('仍缺：' + miss.map(s => s.name + '(' + s.id + ')').join('、'));
