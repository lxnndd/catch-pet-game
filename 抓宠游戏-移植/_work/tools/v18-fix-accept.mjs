/* 修 v18-accept.mjs 的两个自身 bug */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/tools/v18-accept.mjs';
let s = readFileSync(F, 'utf8');
const before = s.length;

/* 修 1：医院检查用 aroundOk 布尔（避免 Node 侧访问游戏里的 T） */
s = s.replace("return { isHosp:hv===T.HOSP, around:around, dist:Math.abs(HOSP.x-SPAWN.x)+Math.abs(HOSP.y-SPAWN.y), region:REGION_NAME[regionAt(HOSP.x,HOSP.y)] };",
              "return { isHosp:hv===T.HOSP, aroundOk:around.every(function(v){ return v===T.PATH; }), dist:Math.abs(HOSP.x-SPAWN.x)+Math.abs(HOSP.y-SPAWN.y), region:REGION_NAME[regionAt(HOSP.x,HOSP.y)] };");
s = s.replace("hosp.isHosp && hosp.around.every(v => v === T.PATH)", "hosp.isHosp && hosp.aroundOk");

/* 修 2：第 4 部分改成真实开战读 B.foe.lv */
const start = s.indexOf("console.log('\\n【4】");
const end = s.indexOf("console.log('\\n【5】");
if (start < 0 || end < 0) throw new Error('找不到第 4 部分');
const NEW4 = [
  "console.log('\\n【4】地区等级实测（真实开战读野怪等级）');",
  "const lvReal = await ev(\"(function(){ var saved={x:S.pos.x,y:S.pos.y}; var p=selfPet(); var savLv=p.lv; var pt={}; for(var y=1;y<MH-1;y+=3)for(var x=1;x<MW-1;x+=3){ var r=regionAt(x,y); if(!pt[r]) pt[r]={x:x,y:y}; } var out=[]; [['plain',1],['flower',30],['mine',40],['desert',50],['ocean',60],['volcano',70],['snow',70]].forEach(function(it){ var q=pt[it[0]]; if(!q) return; S.pos={x:q.x,y:q.y}; p.lv=it[1]; p.hp=maxHpOf(p); var lvs=[]; for(var i=0;i<8;i++){ try{ var e=rollEnemy(); startWildBattle(e); if(B&&B.foe&&B.foe.lv) lvs.push(B.foe.lv); closeBattle(); }catch(err){} } if(!lvs.length){ out.push(REGION_NAME[it[0]]+' 无法开战'); return; } var mn=Math.min.apply(null,lvs), mx=Math.max.apply(null,lvs); var lrr=LV_RANGE[it[0]]; out.push(REGION_NAME[it[0]]+' 玩家Lv'+it[1]+' → 野怪 Lv'+mn+'~'+mx+'（段 '+lrr[0]+'~'+lrr[1]+'）'+(mn>=lrr[0]&&mx<=lrr[1]?' OK':' BAD')); }); S.pos=saved; p.lv=savLv; p.hp=maxHpOf(p); return out; })()\");",
  "(lvReal || []).forEach(l => console.log('     ' + l));",
  "ck('野怪等级始终落在该地区等级段内', (lvReal || []).length > 0 && (lvReal || []).every(l => /OK/.test(l)), (lvReal || []).length + ' 个地区');",
  "",
].join('\n');
s = s.slice(0, start) + NEW4 + s.slice(end);
writeFileSync(F, s, 'utf8');
console.log('已修：' + before + ' → ' + s.length + ' 字符');
console.log('  aroundOk: ' + (s.includes('hosp.aroundOk') ? '✅' : '❌'));
console.log('  第4部分真实开战: ' + (s.includes('B.foe.lv') ? '✅' : '❌'));
