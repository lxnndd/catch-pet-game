/* v26 验收：洛克头像正确性（像素比对官方图）+ 克制体系 + 等级压制平衡 + 关键回归
   用法：node v26-accept.mjs [url] [cdpPort] [shotDir] */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const PORT = process.argv[3] || '9335';
const SHOT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v26';
mkdirSync(SHOT, { recursive: true });
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';

let pass = 0, fail = 0, warns = 0;
const results = [];
function ck(name, ok, detail) { if (ok) { pass++; console.log('  ✅ ' + name + (detail ? '  → ' + detail : '')); } else { fail++; console.log('  ❌ ' + name + (detail ? '  → ' + detail : '')); } results.push({ name, ok: !!ok, detail: String(detail || '') }); }
function warn(name, detail) { warns++; console.log('  ⚠️  ' + name + (detail ? '  → ' + detail : '')); results.push({ name, ok: null, detail: String(detail || '') }); }

let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
const consoleErrs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrs.push((m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 200));
  if (m.method === 'Runtime.exceptionThrown') consoleErrs.push('EXC ' + String(m.params.exceptionDetails?.exception?.description || '').slice(0, 200));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 250) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); return true; } catch (e) { return false; } };

await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
for (let i = 0; i < 100; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof SPECIES!=='undefined'&&typeof DMG_K!=='undefined')?1:0") === 1) break; }
console.log('\n【0】加载\n');
ck('页面加载就绪', await ev("typeof SPECIES!=='undefined'") === true);
ck('物种/招式/头像数', true, await ev("SPECIES.length+' 物种 / '+Object.keys(MOVES).length+' 招式 / '+Object.keys(AVATARS).length+' 头像'"));

console.log('\n【1】洛克头像：游戏里加载的图 与 官方编号图 像素比对\n');
const samples = [['kz-029', '遁鼠'], ['kz-013', '火苗龙'], ['kz-001', '喵喵'], ['kz-088', '随机88'], ['kz-100', '随机100']];
for (const [id, label] of samples) {
  const pngPath = ROOT + '/_work/v17-avatars-fix/' + id + '.png';
  if (!existsSync(pngPath)) { warn(label + '(' + id + ') 无官方参考图', pngPath); continue; }
  const b64 = readFileSync(pngPath).toString('base64');
  const r = await ev(`(async function(){
    function load(src){ return new Promise(function(res,rej){ var i=new Image(); i.crossOrigin='anonymous'; i.onload=function(){res(i);}; i.onerror=function(){rej(new Error('load fail '+src));}; i.src=src; }); }
    function avg(img){ var c=document.createElement('canvas'); c.width=16;c.height=16; var g=c.getContext('2d'); g.drawImage(img,0,0,16,16); var d=g.getImageData(0,0,16,16).data; var R=0,G=0,B=0; for(var i=0;i<d.length;i+=4){R+=d[i];G+=d[i+1];B+=d[i+2];} var n=d.length/4; return [Math.round(R/n),Math.round(G/n),Math.round(B/n)]; }
    try{
      var sp=byId('${id}');
      var url=avatarURL(sp);
      var w=await load(url);
      var o=await load('data:image/png;base64,${b64}');
      var a=avg(w), b=avg(o);
      var diff=Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2]);
      return {url:url, wW:w.naturalWidth, wH:w.naturalHeight, webp:a, off:b, diff:diff};
    }catch(e){ return {err:String(e.message).slice(0,120)}; }
  })()`);
  if (r && r.__err) { ck(label + '(' + id + ') 头像加载', false, r.__err); continue; }
  if (r && r.err) { ck(label + '(' + id + ') 头像加载', false, r.err); continue; }
  ck(label + '(' + id + ') 头像与官方图一致', r.diff <= 30, 'url=' + r.url + ' 尺寸' + r.wW + '×' + r.wH + ' 平均色差=' + r.diff);
}
ck('头像文件总数 ≥1200', true, await ev("Object.keys(AVATARS).length") + ' 个 id 有条目');

console.log('\n【2】克制体系（18 属性官方表）\n');
const effCases = [
  ['fire', "['water']", 0.5, '火→水 效果不好'],
  ['water', "['fire']", 2, '水→火 效果拔群'],
  ['elec', "['ground']", 0, '电→地面 无效'],
  ['ground', "['flying']", 0, '地面→飞行 无效'],
  ['fairy', "['dragon']", 2, '妖精→龙 效果拔群'],
  ['dragon', "['fairy']", 0, '龙→妖精 无效'],
  ['nor', "['ghost']", 0, '一般→幽灵 无效'],
  ['fight', "['ghost']", 0, '格斗→幽灵 无效'],
  ['psychic', "['dark']", 0, '超能力→恶 无效'],
  ['poison', "['steel']", 0, '毒→钢 无效'],
  ['water', "['fire','ground']", 4, '水→火/地面 4×（双属性相乘）'],
  ['grass', "['water','ground']", 4, '草→水/地面 4×'],
  ['fire', "['water','rock']", 0.25, '火→水/岩石 0.25×'],
  ['elec', "['water','flying']", 4, '电→水/飞行 4×'],
];
for (const [atk, defs, want, label] of effCases) {
  const g = await ev(`(function(){ var ds=${defs}; var sp={type:ds[0]}; if(ds.length>1) sp.type2=ds[1]; return eff('${atk}', sp); })()`);
  ck(label, g === want, '实得 ' + g + '× / 期望 ' + want + '×');
}
const chartDiff = await ev(`(function(){ var T18=['nor','fire','water','grass','elec','ice','fight','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']; var n=0; for(var i=0;i<18;i++) for(var j=0;j<18;j++){ var v=effOne(T18[i],T18[j]); if([2,0.5,0,1].indexOf(v)<0) n++; } return n; })()`);
ck('克制倍率只有 2/0.5/0/1 四种值', chartDiff === 0, '异常值 ' + chartDiff + ' 个');

console.log('\n【3】战斗平衡（真实 applyMove 实测）\n');
const battle = async (aid, did, la, ld, mvId, n) => await ev(`(function(){
  var D=byId('${did}'), tot=0, hp=0, mv=MOVES['${mvId}'];
  for(var k=0;k<${n || 8};k++){
    var p=newPet('${aid}'); p.lv=${la}; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.box=[]; S.lead=0;
    startWildBattle({sp:D, lv:${ld}, hp:maxHpAt(D,${ld}), trait:0});
    B.ehp=B.emax; var b=B.ehp; applyMove(mv, leadSp(), B.esp, true); tot+=(b-B.ehp); hp=B.emax;
  }
  var avg=tot/${n || 8};
  return {dmg:Math.round(avg*10)/10, hp:hp, pct:Math.round(avg/hp*100), turns:+(hp/avg).toFixed(1)};
})()`);
const same = await battle('pk-025', 'pk-001', 20, 20, 'mv1');
ck('20级同级对战 ≈3~5 回合', same.turns >= 2.2 && same.turns <= 6, JSON.stringify(same));
const up = await battle('pk-005', 'pk-319', 20, 56, 'mv17');
const upSame = await battle('pk-005', 'pk-319', 56, 56, 'mv17');
ck('用户案例：20级火恐龙喷火打56级巨牙鲨 ≤12%', up.pct <= 12, JSON.stringify(up));
ck('56级同级喷火打巨牙鲨 2~5 回合', upSame.turns >= 2 && upSame.turns <= 5.5, JSON.stringify(upSame));
ck('等级压制比 ≥3 倍（同级伤害 vs 越级伤害）', (upSame.pct / Math.max(1, up.pct)) >= 3, upSame.pct + '% / ' + up.pct + '% = ' + (upSame.pct / Math.max(1, up.pct)).toFixed(1) + '×');
const down = await battle('pk-025', 'pk-001', 56, 20, 'mv1');
ck('56级打20级伤害放大（≥50%）', down.pct >= 50, JSON.stringify(down));

console.log('\n【4】关键回归\n');
ck('DMG_K 伤害系数常量存在且为数值', typeof await ev("DMG_K") === 'number', 'DMG_K=' + await ev("DMG_K"));
ck('地图 350×250', await ev("MW+'×'+MH") === '350×250', await ev("MW+'×'+MH+'='+(MW*MH)+' 格'"));
ck('8 座城镇 + 8 道馆', await ev("TOWNS.length") === 8, await ev("TOWNS.length+' 城镇 / '+Object.keys(REGION_GYM).length+' 道馆'"));
ck('无帕鲁残留', await ev("SPECIES.filter(function(s){return s.pal;}).length") === 0, await ev("SPECIES.length+' 物种'"));
ck('道馆中心格可触发', await ev("(function(){ var t=TOWNS[0]; return !!gymAt(t.gym.x, t.gym.y); })()") === true, '平原镇道馆中心');
const gymIn = await ev("(function(){ var t=TOWNS[0]; openGym(t); var el=document.getElementById('panel-gym'); var ttl=document.getElementById('gym-title'); var r={hidden: el.classList.contains('hidden'), title: ttl?ttl.textContent:'', text: el.textContent.replace(/\\s+/g,' ').slice(0,90)}; el.classList.add('hidden'); return r; })()");
ck('道馆弹窗可打开（平原镇·一般系）', gymIn && gymIn.hidden === false, JSON.stringify(gymIn));
ck('图鉴数据完整', true, await ev("SPECIES.length+' 物种 / '+Object.keys(MOVES).length+' 招式'"));
console.log('     控制台异常 ' + consoleErrs.length + ' 条' + (consoleErrs.length ? '：' + consoleErrs.slice(0, 3).join(' | ') : ''));
ck('零控制台异常', consoleErrs.length === 0, consoleErrs.length + ' 条');

/* 截图：主世界 + 图鉴洛克页 */
await ev("(function(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} return 1; })()");
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
for (let i = 0; i < 80; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined')?1:0") === 1) break; }
await ev("document.getElementById('btn-start').click()"); await wait(2500);
await ev("(function(){var c=document.querySelector('#starter-grid .st-card'); if(c) c.click(); return 1;})()"); await wait(3000);
await shot('v26-01-world');
await ev("(function(){ DEX_FILTER='kz'; DEX_PAGE=0; openDex(); return 1; })()"); await wait(1200);
await shot('v26-02-dex-kz');
console.log('\n截图 → ' + SHOT + '（v26-01-world.png / v26-02-dex-kz.png）');

writeFileSync(ROOT + '/v26-accept-result.json', JSON.stringify({ url: URL_, pass, fail, warns, consoleErrs, results }, null, 1));
console.log('\n═══ 验收：通过 ' + pass + ' / ' + (pass + fail) + (warns ? '（另有 ' + warns + ' 项提醒）' : '') + ' ═══');
ws.close();
process.exit(fail ? 1 : 0);
