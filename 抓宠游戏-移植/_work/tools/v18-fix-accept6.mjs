/* 修 v18-accept 第 6 部分：在平原正常走动触发遇敌，并用当前地区等级段校验 */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/tools/v18-accept.mjs';
let s = readFileSync(F, 'utf8');
const start = s.indexOf("console.log('\\n【6】");
const end = s.indexOf("console.log('\\n【7】");
if (start < 0 || end < 0) throw new Error('找不到第 6 部分');
const NEW6 = [
  "console.log('\\n【6】真实游玩：遇敌 → 战斗');",
  "/* 回到平原（高草丛多的环），等级给了 5 级，边走边看是否遇到野怪 */",
  "await ev(\"(function(){ try{ if(typeof B!=='undefined'&&B) closeBattle(); }catch(e){} S.pos={x:MAP_CX,y:MAP_CY+6}; var p=selfPet(); p.lv=5; p.hp=maxHpOf(p); return REGION_NAME[regionAt(S.pos.x,S.pos.y)]; })()\");",
  "await wait(600);",
  "let enc = null;",
  "for (let i = 0; i < 400 && !enc; i++) {",
  "  const d = [[0,-1],[0,1],[-1,0],[1,0]][i % 4];",
  "  await ev('(function(){ try{ move(' + d[0] + ',' + d[1] + '); }catch(e){} if(typeof B!==\\'undefined\\'&&B) return 1; if(Math.abs(S.pos.x-MAP_CX)>12||Math.abs(S.pos.y-MAP_CY)>12) S.pos={x:MAP_CX,y:MAP_CY+6}; return 1; })()');",
  "  await wait(70);",
  "  const st = await ev(\"(function(){ var ep=document.getElementById('enc-panel'); if(ep&&!ep.classList.contains('hidden')) return 'enc'; var bp=document.getElementById('screen-battle'); if(bp&&!bp.classList.contains('hidden')) return 'battle'; return null; })()\");",
  "  if (st) enc = st;",
  "}",
  "ck('在平原走到草丛能触发遇敌', !!enc, enc || '400 步未触发');",
  "if (enc === 'enc') { await ev(\"(function(){ var b=document.getElementById('enc-fight'); if(b) b.click(); return 1; })()\"); await wait(2800); }",
  "const bs = await ev(\"(function(){ var row=document.getElementById('move-row'); var lr=LV_RANGE[regionAt(S.pos.x,S.pos.y)]; return { shown:!document.getElementById('screen-battle').classList.contains('hidden'), foe:(document.getElementById('enemy-name')||{}).textContent||'', moves:row?row.querySelectorAll('button').length:0, eLv:(typeof B!=='undefined'&&B&&B.foe)?B.foe.lv:0, lr:lr }; })()\");",
  "ck('战斗界面正常（4 技能 + 野怪等级在本地段内）', bs.shown && bs.moves === 4 && bs.eLv >= bs.lr[0] && bs.eLv <= bs.lr[1], bs.foe + ' · Lv' + bs.eLv + '（段 ' + bs.lr[0] + '~' + bs.lr[1] + '）· ' + bs.moves + ' 技能');",
  "await shot('v18-02-战斗');",
  "const fight = await ev(\"(async function(){ var out={turns:0,log:''}; for(var t=0;t<10;t++){ var b=[...document.querySelectorAll('#move-row button')].find(function(x){return !x.disabled;}); if(!b) break; b.click(); out.turns++; await new Promise(function(r){setTimeout(r,2500);}); var st=document.getElementById('screen-battle'); if(!st||st.classList.contains('hidden')) break; } var lf=document.getElementById('battle-log'); out.log=lf?lf.textContent.replace(/\\\\s+/g,' ').slice(-110):''; return out; })()\");",
  "ck('技能可释放、战斗能正常结束', fight.turns > 0 && fight.log.length > 5, fight.turns + ' 回合 · ' + fight.log);",
  "",
].join('\n');
s = s.slice(0, start) + NEW6 + s.slice(end);
writeFileSync(F, s, 'utf8');
console.log('第 6 部分已重写');
