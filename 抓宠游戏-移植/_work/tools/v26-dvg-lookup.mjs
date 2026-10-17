/* v26 在 dvg 已渲染页面里直接查名字 → 官方编号 */
import { WebSocket } from 'ws';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 200) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Page.navigate', { url: 'https://roco.dvg.cn/spirits.php' });
await wait(6000);
/* 1) 全页 HTML 里定位名字 */
const names = ['遁鼠', '圣龙阿布', '喵喵', '火苗龙', '火花', '水蓝蓝', '蹦蹦草'];
for (const n of names) {
  const r = await ev(`(function(){ var h=document.documentElement.outerHTML; var i=h.indexOf('${n}'); if(i<0) return {found:false, htmlLen:h.length}; var seg=h.slice(i, i+400).replace(/<[^>]+>/g,'|').replace(/\\|+/g,'|'); var m=h.slice(Math.max(0,i-400), i+50).match(/编号[：:]\\s*<[^>]*>?\\s*(\\d+)/) || h.slice(Math.max(0,i-400), i+50).match(/编号[：:]\\s*(\\d+)/); return {found:true, num:m?m[1]:null, seg:seg.slice(0,200)}; })()`);
  console.log(n + ' → ' + JSON.stringify(r));
}
/* 2) 搜索框搜「遁鼠」 */
const search = await ev(`(function(){
  var inp=document.querySelector('input[type=text],input[placeholder*=搜索],input');
  if(!inp) return 'no input';
  inp.value='遁鼠';
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  inp.dispatchEvent(new Event('change',{bubbles:true}));
  var btn=document.querySelector('button');
  var all=[].slice.call(document.querySelectorAll('button,a')).filter(function(b){return /搜索/.test(b.textContent);});
  if(all[0]) all[0].click();
  return 'input='+(inp.placeholder||inp.type)+' buttons='+all.length;
})()`);
console.log('\n搜索操作: ' + search);
await wait(3500);
const after = await ev("document.body.innerText.replace(/\\n{2,}/g,'\\n').slice(0, 900)");
console.log('\n== 搜索结果页文本 ==\n' + after);
ws.close();
