/* v43b 验收：图鉴详情的两档显示 + 宠物详情不再显示捕获率
   ① 未遇到的宠（图鉴里还是黑的）→ 详情**只有「栖息地」「捕获」两行**
   ② 遇到过的宠 → 完整资料（可刷等级 / 六维 / 进化 / 技能池）
   ③ 宠物详情面板（队伍里点开的）**不含**捕获率行
   用法：node v43b-dex-verify.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
let seq = 0, pass = 0, fail = 0; const fails = [];
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params?.exceptionDetails?.exception?.description || '').slice(0, 200));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const ck = (ok, name, extra) => { if (ok) { pass++; console.log('  ✅ ' + name + (extra ? '  →  ' + extra : '')); } else { fail++; fails.push(name); console.log('  ❌ ' + name + (extra ? '  →  ' + extra : '')); } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof openDexDetail==='function')")) break; }

const r = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-006'); p.trait='fierce'; p.lv=50; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    function rowsOf(){ var a=[]; document.querySelectorAll('#petinfo-body .stat-line').forEach(function(d){ a.push(d.textContent.trim()); }); return a; }
    function titleOf(){ return $('petinfo-title').textContent; }
    function subOf(){ var e=document.querySelector('#petinfo-body .enc-sub'); return e?e.textContent:''; }
    var out={};
    /* ① 未遇到：超梦 */
    delete S.discovered['pk-150'];
    openDexDetail(byId('pk-150'));
    out.unseen={title:titleOf(), sub:subOf(), rows:rowsOf(), skills:document.querySelectorAll('#petinfo-body .learn-card').length};
    /* ② 遇到过：喷火龙 */
    S.discovered['pk-006']=1;
    openDexDetail(byId('pk-006'));
    out.seen={title:titleOf(), sub:subOf(), rows:rowsOf(), skills:document.querySelectorAll('#petinfo-body .learn-card').length};
    /* ③ 宠物详情（队伍面板那套） */
    openPetInfo(p);
    out.petinfo={rows:rowsOf(), title:titleOf()};
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (r.__err) { ck(false, '图鉴详情实验可跑', r.__err); }
else {
  console.log('① 未遇到（' + r.unseen.title + '）副标题：' + r.unseen.sub);
  r.unseen.rows.forEach(x => console.log('     · ' + x));
  ck(r.unseen.rows.length === 2, '未遇到 → 详情**只有 2 行**', r.unseen.rows.length + ' 行');
  ck(/栖息地/.test(r.unseen.rows[0] || ''), '第 1 行是「栖息地」', r.unseen.rows[0]);
  ck(/捕获/.test(r.unseen.rows[1] || ''), '第 2 行是「捕获」', r.unseen.rows[1]);
  ck(r.unseen.skills === 0, '未遇到 → 不展示技能池', r.unseen.skills + ' 张');
  ck(/未遇到/.test(r.unseen.sub), '副标题写明「未遇到」', r.unseen.sub);
  ck(r.unseen.title.indexOf('？？？') >= 0, '标题仍是 ？？？', r.unseen.title);

  console.log('\n② 遇到过（' + r.seen.title + '）共 ' + r.seen.rows.length + ' 行');
  r.seen.rows.slice(0, 4).forEach(x => console.log('     · ' + x));
  ck(r.seen.rows.length >= 8, '遇到过 → 完整资料（≥8 行）', r.seen.rows.length + ' 行');
  ck(r.seen.rows.some(x => /可刷等级/.test(x)), '含「可刷等级」', '');
  ck(r.seen.rows.some(x => /攻击/.test(x)), '含六维', '');
  ck(r.seen.rows.some(x => /捕获/.test(x)), '同样含「捕获」', '');
  ck(r.seen.skills > 0, '展示技能池', r.seen.skills + ' 张');

  console.log('\n③ 宠物详情面板（' + r.petinfo.title + '）');
  r.petinfo.rows.forEach(x => console.log('     · ' + x));
  ck(!r.petinfo.rows.some(x => /捕获/.test(x)), '宠物详情**不再有**捕获率行', r.petinfo.rows.length + ' 行');
  ck(r.petinfo.rows.some(x => /HP/.test(x)), '仍是原来的属性面板', '');
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v43b 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
