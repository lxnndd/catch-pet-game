
var SKY_RATE={plain:0.12,forest:0.2,water:0.18,flower:0.26,ocean:0.24,volcano:0.1,mine:0,snow:0.14,desert:0.16};

/* ══════════ v17 宠物头像（大头照）══════════
   规则（用户定稿）：**每只宠都必须有头像，拿不到图的宠物不收录**。
   头像以 128×128 WebP 内联在此（base64，键 = 物种 id，平均 4KB/张）。
   注入脚本 tools/inject-v17-avatars.mjs 会整段替换 AVATARS 的内容。 */
var AVATARS = {};
var _avatarCache = {};
/* 内联 base64 → data URL（带缓存，别每次都拼字符串） */
function avatarURL(sp){
  if(!sp) return "";
  if(_avatarCache[sp.id] !== undefined) return _avatarCache[sp.id];
  var b64 = AVATARS[sp.id];
  _avatarCache[sp.id] = b64 ? ("data:image/webp;base64," + b64) : "";
  return _avatarCache[sp.id];
}
function avatarHTML(sp, cls){
  if(!sp) return "";
  var url = avatarURL(sp);
  if(!url) return "";
  return "<img class=\"pet-avatar" + (cls ? (" " + cls) : "") + "\" src=\"" + url + "\" alt=\"" + sp.name + "\">";
}
/* 把容器填成头像；没图就回退 emoji */
function setAvatar(el, sp, cls){
  if(!el) return;
  var url = avatarURL(sp);
  if(sp && url){
    el.textContent = "";
    var img = document.createElement("img");
    img.className = "pet-avatar" + (cls ? (" " + cls) : "");
    img.alt = sp.name; img.src = url;
    img.addEventListener("error", function(){ el.textContent = sp.emoji; });
    el.appendChild(img);
  } else if(sp){
    el.textContent = sp.emoji;
  }
}

/* ── 状态异常与能力变化（参考宝可梦）── */
var STAGE_KEYS=["atk","def","spd","crit"];
function stageMul(n){ n=clamp(n||0,-6,6); return n>=0?1+0.30*n:1/(1-0.28*n); }
function stageMult(p,k){ return stageMul(p.st&&p.st[k]); }
function initSt(p){ if(!p.st) p.st={atk:0,def:0,spd:0,crit:0}; }
function stageStr(n){ n=clamp(n||0,-6,6); return n>0?("+"+n):(""+n); }
function stLabel(k){ return {atk:"攻击",def:"防御",spd:"速度",crit:"暴击"}[k]||k; }
function spdOf(p){
  if(!p) return 1;
  /* 先手按速度种族值判定（原实现错用血量） */
  var sp=byId(p.sp);
  var v=sp?speOf(sp,p.lv):40;
  return Math.max(1,Math.round(v*stageMult(p,"spd"))*(p.st&&p.st.slow?0.55:1));
}
function faintPet(p){ p.hp=0; clearStatus(p); }
function clearStatus(p){ if(!p) return; p.st={atk:0,def:0,spd:0,crit:0}; }
function clearAllStages(){ S.party.concat(S.box).forEach(clearStatus); }
function addStage(p,k,n){
  initSt(p);
  var old=p.st[k];
  p.st[k]=clamp(old+n,-6,6);
  var d=p.st[k]-old;
  return d===0?"（"+stLabel(k)+"已经到极限了）":(stLabel(k)+" "+stageStr(old)+" → "+stageStr(p.st[k]));
}
function setStatus(p,k){
  initSt(p);
  if(p.st.status) return false;
  var dur={poison:4,burn:4,para:4,sleep:2,freeze:2,slow:4}[k]||3;
  p.st.status={k:k,t:dur};
  return true;
}
/* 回合开始：异常状态结算，返回是否还能行动 */
function tickBoard(p,label,lines,isSelf){
  initSt(p);
  var stt=p.st.status, ok=true;
  var sp=byId(p.sp);
  if(stt){
    if(stt.k==="poison"){
    var d1=Math.max(2,Math.round(maxHpOf(p)*0.06));
      p.hp=Math.max(0,p.hp-d1);
      lines.push("🟣 "+label+" 受到中毒侵蚀，损失 "+d1+" 点 HP！");
    }else if(stt.k==="burn"){
    var d2=Math.max(2,Math.round(maxHpOf(p)*0.07));
      p.hp=Math.max(0,p.hp-d2);
      lines.push("🔥 "+label+" 被灼烧折磨，损失 "+d2+" 点 HP！");
    }else if(stt.k==="sleep"){
      if(Math.random()<0.5){ stt.t=0; p.st.status=null; lines.push("💤 "+label+" 睡醒了，精神抖擞！"); }
      else{ ok=false; lines.push("💤 "+label+" 还在呼呼大睡……"); }
    }else if(stt.k==="freeze"){
      if(Math.random()<0.55){ stt.t=0; p.st.status=null; lines.push("❄️ "+label+" 抖掉了身上的冰壳，解冻了！"); }
      else{ ok=false; lines.push("❄️ "+label+" 被冻住了，动弹不得！"); }
    }else if(stt.k==="para"){
      if(Math.random()<0.35){ ok=false; lines.push("⚡ "+label+" 身体麻痹，僵在原地！"); }
    }
    if(p.st.status){ p.st.status.t--; if(p.st.status.t<=0){ lines.push("✨ "+label+" 身上的"+STATUS_NAME[p.st.status.k]+"状态消退了。"); p.st.status=null; } }
  }
  if(p.hp<=0) ok=false;
  return ok;
}
function endBoardTurn(p,lines){
  initSt(p);
  /* 能力变化逐回合向 0 回归（宝可梦式「能力变化会逐渐恢复」） */
  STAGE_KEYS.forEach(function(k){
    if(p.st[k]>0) p.st[k]--;
    else if(p.st[k]<0) p.st[k]++;
  });
}
function statusChips(p){
  if(!p) return [];
  initSt(p);
  var out=[];
  if(p.st.status) out.push({t:STATUS_ICON[p.st.status.k]+STATUS_NAME[p.st.status.k],c:"c-ail"});
  STAGE_KEYS.forEach(function(k){
    var v=p.st[k], label=stLabel(k);
    if(v>0) out.push({t:label+"↑"+v,c:"c-buff"});
    else if(v<0) out.push({t:label+"↓"+(-v),c:"c-debuff"});
  });
  return out;
}

/* ── 野生遇敌：先弹「战斗 / 绕开」选择 ── */
var pendEnc=null;
function rollEnemy(){
  var reg=regionAt(S.pos.x,S.pos.y);
  var pool=null;
  if(Math.random()<(SKY_RATE[reg]||0)){
    pool=SPECIES.filter(function(s){ return !isEvolvedForm(s) && !s.varOf && s.fly && s.habitat.indexOf(reg)>=0; });
    if(!pool.length) pool=null;
  }
  if(!pool) pool=SPECIES.filter(function(s){ return !isEvolvedForm(s) && !s.varOf && s.habitat.indexOf(reg)>=0; });
  if(!pool.length) pool=SPECIES.filter(function(s){return !isEvolvedForm(s) && !s.varOf;});
  var total=0,i;
  for(i=0;i<pool.length;i++) total+=RARITY_W[pool[i].rarity];
  var r=Math.random()*total;
  for(i=0;i<pool.length;i++){
    r-=RARITY_W[pool[i].rarity];
    if(r<=0) break;
  }
  var sp=pool[clamp(i,0,pool.length-1)];
  /* 低等级不放稀有/传说：1 级新手遇到神兽既不合理也打不过（它们种族值高、血厚） */
  var topLv=1;
  if(S && S.party) S.party.forEach(function(p){ if((p.lv||1)>topLv) topLv=p.lv||1; });
  var maxR=topLv<8 ? 0 : (topLv<15 ? 1 : 2);
  if(sp.rarity>maxR){
    var easy=SPECIES.filter(function(s){ return !isEvolvedForm(s) && !s.varOf && s.rarity<=maxR && s.habitat.indexOf(reg)>=0; });
    if(!easy.length) easy=SPECIES.filter(function(s){ return !isEvolvedForm(s) && !s.varOf && s.rarity<=maxR; });
    if(easy.length) sp=easy[Math.floor(Math.random()*easy.length)];
  }
  var hp=Math.round(maxHpOf({sp:sp,lv:1})*(0.8+Math.random()*0.4));   /* 个体浮动，具体等级在 startWildBattle 里定 */
  return {sp:sp,hp:hp,trait:randTrait()};
}
function ensureFighter(p){
  if(!p) return null;
  var sp=byId(p.sp);
  if(!p.st) p.st={atk:0,def:0,spd:0,crit:0,status:null};
  ensureMoves(p);                       /* v17：技能与 PP 统一由 ensureMoves 维护（4 槽 + 池解锁） */
  return p;
}
function encResetBtns(){
  $("enc-fight").textContent="⚔️ 进入战斗";
  $("enc-flee").textContent="💨 绕开它";
}
function encFlee(){
  clearTimeout(pendEnc&&pendEnc.h);
  $("enc-panel").classList.add("hidden");
  pendEnc=null; encResetBtns();
  updateHUD(); draw(); save();
}
function encFight(){ acceptEncounter(); }
function openEncounter(e){
  var reg=regionAt(S.pos.x,S.pos.y);
  if(pendEnc) encFlee();
  pendEnc={e:e};
  $("enc-emoji").textContent=e.sp.emoji;
  $("enc-name").textContent=e.sp.name;
  $("enc-sub").textContent=RARITY_NAME[e.sp.rarity]+" · "+REGION_NAME[reg]+"出没 · HP 约 "+e.hp;
  encResetBtns();
  $("enc-panel").classList.remove("hidden");
  pendEnc.h=setTimeout(function(){ if(pendEnc&&pendEnc.e){ acceptEncounter(); } },2600);
}

/* ── 开战：野生 / 训练师 / 切磋 ── */
var MODE_TEXT={wild:{tag:"野生",head:"⚔️ 遭遇野生小宠！"},
  trainer:{tag:"训练师对战",head:"🥊 训练师对战！"},
  spar:{tag:"切磋",head:"🤝 队伍内切磋"}};
function resolveSp(x){
  if(!x) return null;
  if(typeof x==="object") return x;
  return byId(String(x));
}
function openBattle(mode, enemy){
  enemy.sp=resolveSp(enemy.sp);
  if(!enemy.sp) throw new Error("openBattle: 找不到物种数据");
  var esp=enemy.sp;                       /* 已解析成 SPECIES 条目，后续一律用它，避免再 byId(对象) */
  ensureFighter(enemy.fighter);
  var actUid=(selfPet()&&selfHp()>0)?S.lead:alivePets()[0].uid;
  B={mode:mode||"wild", act:actUid, foe:enemy.fighter, esp:esp, etrait:enemy.fighter.trait,
     ehp:enemy.fighter.hp, emax:maxHpOf(enemy.fighter), eSkip:false, sSkip:false, busy:false,
     ePP:(enemy.fighter&&enemy.fighter.pp)?enemy.fighter.pp:buildPP(esp), sPP:{}, itemUsed:false, turn:0, foeRef:enemy};
  ensureFighter(selfPet());
  B.sPP=selfPet().pp;
  var mt=MODE_TEXT[B.mode]||MODE_TEXT.wild;
  $("battle-title").textContent=mt.head;
  $("battle-mode").textContent=mt.tag;
  $("battle-mode").className="mode-tag"+(B.mode==="trainer"?" m-trainer":(B.mode==="spar"?" m-spar":""));
  beep(330,.08); setTimeout(function(){beep(240,.14);},90);
  var pet=selfPet();
  $("enemy-sprite").textContent=enemy.sp.emoji;
  setAvatar($("enemy-sprite"), enemy.sp);            /* v17：有头像就换成大头照，没有则保留 emoji */
  $("enemy-name").textContent=(B.mode==="wild"?trOf(B.etrait).name+"·":"")+enemy.sp.name+(B.mode==="trainer"?" "+enemy.fighter.owner:"" )+(enemy.fighter.lv?" Lv."+enemy.fighter.lv:"");
  var tag=$("enemy-rarity");
  tag.textContent=RARITY_NAME[enemy.sp.rarity]+" · "+REGION_NAME[regionAt(S.pos.x,S.pos.y)];
  tag.className="rarity-tag"+(enemy.sp.rarity>0?(" r"+enemy.sp.rarity):"");
  $("self-sprite").textContent=leadSp().emoji;
  setAvatar($("self-sprite"), leadSp());             /* v17：我方大头照 */
  $("self-name").textContent=trOf(pet.trait).name+"·"+leadSp().name+" Lv."+pet.lv;
  var st=$("self-type");
  st.textContent=typeText(leadSp());
  st.className=typeClass(leadSp());
  $("btn-switch").textContent = B.mode==="spar" ? "🔄 换人（耗1回）" : "🔄 换宠（耗1回）";
  $("btn-flee").textContent   = B.mode==="spar" ? "🏳️ 认输" : (B.mode==="trainer" ? "🏳️ 认输" : "💨 逃跑");
  $("btn-flee-top").style.display = B.mode==="spar" ? "none" : "";
  var tip="⚖️ 克制：我方技能对它 "+typeEdge(leadSp(),enemy.sp)+" · 它的技能对我方 "+typeEdge(enemy.sp,leadSp());
  if(B.mode==="wild") tip+=" · 压血丢球才能收服";
  if(B.mode==="trainer") tip+=" · 打倒它能拿奖金";
  if(B.mode==="spar") tip+=" · 切磋不致死、不倒宠";
  $("battle-tip").textContent=tip;
  log(B.mode==="wild"
    ? ("在"+REGION_NAME[regionAt(S.pos.x,S.pos.y)]+"遇到了野生的 "+enemy.sp.name+"！上吧，"+leadSp().name+"！")
    : (B.mode==="trainer"
      ? (enemy.fighter.owner+" 派出 "+enemy.sp.name+"，接受挑战吧！")
      : ("切磋开始！"+leadSp().name+" 对上 "+enemy.sp.name+"。")));
  renderMoveRow(); renderItemRow(); renderSwapRow(); refreshHP();
  $("screen-battle").classList.remove("hidden");
}
function initFighter(sp, lv, trait, owner){
  var spObj=resolveSp(sp);                /* 兼容传入 id 或 SPECIES 条目 */
  var p={sp:spObj.id, lv:lv||1, exp:0, trait:trait||randTrait(), hp:1, uid:-1, st:{atk:0,def:0,spd:0,crit:0,status:null}, owner:owner||"", pp:null, ppSp:null, moves:null, learned:[]};
  p.hp=Math.min(maxHpOf(p), Math.round(maxHpOf(p)*(0.9+Math.random()*0.2)));   /* 个体浮动不得超上限 */
  ensureMoves(p);                        /* v17：从初始池取 4 个技能并建 PP */
  return p;
}
/* startWildBattle(e, opts)：e 为 rollEnemy() 的产物；opts 仅供测试注入 {sp, foeLv} */
function topPartyLv(){
  var top=1;
  S.party.forEach(function(p){ if((p.lv||1)>top) top=p.lv||1; });
  return top;
}
function startWildBattle(e, opts){
  opts=opts||{};
  if(!S.party.length){ toast("你还没有伙伴，先去仓库领一只！"); return; }
  var al=alivePets();
  if(!al.length){
    S.party.forEach(function(p){ if(p.hp<=0) p.hp=Math.max(1,Math.round(maxHpOf(p)*0.5)); });
    toast("大家都累坏了，路边休整恢复了些 HP。重伤记得去 🏥 医院！"); save(); return;
  }
  var wsp=opts.sp ? resolveSp(opts.sp) : resolveSp(e.sp);
  /* 野怪等级跟随玩家（队伍最强宠）：只低不高，且 2 级以内新手只遇 1 级，避免开局就被高级野怪带走 */
  var topLv=topPartyLv();
  var foeLv=opts.foeLv ? clamp(opts.foeLv,1,100) : clamp(topLv+ri(-2,0), 1, 100);
  if(!opts.foeLv && topLv<=2) foeLv=1;
  /* 低等级野怪不许用大招：Lv1 的雪绵啾带着「暴风雪(威力44)」，配上冰克草 2× 就是 13~19 伤害，
     等于两回合带走 23 血的 1 级新手。威力上限随等级递增：50/70/90/110/放开（实测 20 级被 90 威大招秒杀）。 */
  var foePP=buildPP(wsp);
  var powerCap = foeLv<=5 ? 25 : (foeLv<=12 ? 45 : (foeLv<=25 ? 70 : (foeLv<=40 ? 90 : 9999)));
  Object.keys(foePP).forEach(function(id){
    var mv=MOVES[id];
    if(mv && mv.power>powerCap){ delete foePP[id]; foePP["tackle"]=MOVES["tackle"].pp; }   /* 换成通用撞击 */
  });
  var foe=initFighter(wsp, foeLv, e.trait);
  foe.pp=foePP; foe.ppSp=wsp.id;
  openBattle("wild", {sp:wsp, fighter:foe});
  /* e.hp 是 rollEnemy 时按 lv1 算的个体浮动值，这里按真实等级重算上限并保留原来的浮动比例 */
  var baseLv1=Math.max(1, maxHpOf({sp:wsp,lv:1}));
  var ratio=(e.hp && baseLv1) ? (e.hp/baseLv1) : 1;
  var hpNow=Math.max(1, Math.min(maxHpOf(foe), Math.round(maxHpOf(foe)*ratio)));
  foe.hp=hpNow;
  B.ehp=hpNow; B.emax=maxHpOf(foe);
  refreshHP();
}
function beginTrainerBattle(t){
  if(!S.party.length){ toast("你还没有伙伴，先去仓库领一只！"); return; }
  if(!alivePets().length){ toast("全队都倒下了，先去医院治疗再来挑战！"); return; }
  var lv0=Math.max(5,Math.round(((selfPet()&&selfPet().lv)||5)*0.9));
  var team=t.team.map(function(id,i){ return initFighter(byId(id), clamp(lv0+i,3,100), null, t.name); });
  TB={t:t, team:team, idx:0};
  openBattle("trainer", {sp:team[0].sp, fighter:team[0]});
}
function startSpar(a, b){
  if(!a||!b||a===b) return;
  var spB=byId(b.sp);
    var hp=Math.max(1,Math.min(b.hp, Math.round(maxHpOf(b)*0.6)));
  SPB={a:a, b:b};
  openBattle("spar", {sp:spB, fighter:initFighter(spB, Math.max(1,b.lv||1), b.trait)});
  B.ehp=hp; B.emax=Math.max(1, maxHpOf({sp:spB,lv:Math.max(1,b.lv||1)}));   /* 原为 spB.base（血量种族值）→ 血条比例会错乱 */
  $("enemy-name").textContent=trOf(b.trait).name+"·"+spB.name+" Lv."+(b.lv||1);
  refreshHP();
}

/* ══ 训练师对战入口与名册 ══ */
function openTrainerChallenge(t){
  if(B) return;
  var beaten=S.beaten&&S.beaten[t.id];
  var panel=$("enc-panel");
  $("enc-emoji").textContent=t.emoji;
  $("enc-name").textContent=t.name;
  $("enc-sub").textContent=(beaten?"⭐ 已击败 · ":"")+t.team.length+" 只伙伴 · 想再打一场吗？";
  var fb=$("enc-fight"), ff=$("enc-flee");
  fb.textContent="⚔️ 挑战！";
  ff.textContent=beaten?"👋 打个招呼就走":"😅 我还没准备好";
  pendEnc={trainer:t};
  panel.classList.remove("hidden");
}
function acceptEncounter(){
  var p=pendEnc; if(!p) return;
  pendEnc=null;
  clearTimeout(p.h);
  $("enc-panel").classList.add("hidden");
  var fb=$("enc-fight"), ff=$("enc-flee");
  fb.textContent="⚔️ 进入战斗";
  ff.textContent="💨 绕开它";
  if(p.trainer) beginTrainerBattle(p.trainer); else if(p.e) startWildBattle(p.e);
}
function openTrainerList(){
  var body=$("trainer-body"); body.textContent="";
  var intro=document.createElement("p"); intro.className="dex-note";
  intro.textContent="地图上散步着 "+TRAINERS.length+" 位训练师：走到他们身边就会开打，队伍等级越高他们越强（按你最猛的伙伴折算），打赢有奖金。点下面的按钮可以直接发起挑战。";
  body.appendChild(intro);
  var sec=document.createElement("p"); sec.className="train-sec";
  sec.textContent="── 名册 "+beatenCount()+"/"+TRAINERS.length+" 已击败 ──";
  body.appendChild(sec);
  TRAINERS.forEach(function(t){
    var row=document.createElement("div"); row.className="train-row";
    var ico=document.createElement("span"); ico.className="ico"; ico.style.cssText="font-size:26px;"; ico.textContent=t.emoji;
    var d=document.createElement("span"); d.className="desc"; d.style.cssText="flex:1;display:flex;flex-direction:column;";
    var b=document.createElement("b"); b.textContent=t.name+(S.beaten&&S.beaten[t.id]?" ✅":"");
    var s=document.createElement("span"); s.style.cssText="font-size:12px;color:#5b7a6c;";
    s.textContent="队伍："+t.team.map(function(id){ return byId(id)?byId(id).name:id; }).join(" / ")+" · 位置 "+(REGION_NAME[regionAt(t.pos.x,t.pos.y)]||"平原");
    d.appendChild(b); d.appendChild(s);
    var act=miniBtn(S.beaten&&S.beaten[t.id]?"再战":"挑战","gold",function(){
      if(B){ toast("正在战斗中！"); return; }
      $("panel-trainer").classList.add("hidden");
      beginTrainerBattle(t);
    });
    row.appendChild(ico); row.appendChild(d); row.appendChild(act);
    body.appendChild(row);
  });
  $("trainer-count").textContent="（"+beatenCount()+"/"+TRAINERS.length+"）";
  $("panel-trainer").classList.remove("hidden");
}

/* ══ 队伍内切磋面板 ══ */
var sparPick=null;
function openSpar(){
  var body=$("spar-body"); body.textContent="";
  sparPick=null;
  var alive=S.party.filter(function(p){ return p.hp>0; });
  if(alive.length<2){
    var e=document.createElement("p"); e.className="dex-note";
    e.textContent="至少需要 2 只还有体力的伙伴才能切磋（倒下先去 🏥 医院治疗）。";
    body.appendChild(e);
    $("panel-spar").classList.remove("hidden");
    return;
  }
  var note=document.createElement("p"); note.className="dex-note";
  note.textContent="点第一只 = 你操控的一方，点第二只 = 对手（对手会以 60% HP 出场，不致死）。";
  body.appendChild(note);
  var box=document.createElement("div"); box.id="spar-list";
  alive.forEach(function(p){
    var sp=byId(p.sp);
    var row=petRowEl(p,[],true);
    row.classList.add("spar-pick");
    row.setAttribute("data-uid",p.uid);
    row.addEventListener("click",function(){
      if(sparPick===null){ sparPick=p.uid; markSpar(); }
      else if(sparPick===p.uid){ sparPick=null; markSpar(); }
      else{
        var a=findPet(sparPick), b=p;
        if(!a) return;
        sparPick=null;
        $("panel-spar").classList.add("hidden");
        startSpar(a,b);
      }
    });
    box.appendChild(row);
  });
  body.appendChild(box);
  var go=document.createElement("p"); go.className="spar-vs"; go.id="spar-vs";
  go.textContent="挑一只开始（再点一次取消）";
  body.appendChild(go);
  $("panel-spar").classList.remove("hidden");
}
function markSpar(){
  document.querySelectorAll("#spar-body .spar-pick").forEach(function(el){
    var on = sparPick!==null && String(el.getAttribute("data-uid"))===String(sparPick);
    el.classList.toggle("on",!!on);
  });
  var vs=$("spar-vs");
  if(vs){
    if(sparPick===null) vs.textContent="挑一只开始（再点一次取消）";
    else{ var p=findPet(sparPick); vs.textContent="已选："+(p?byId(p.sp).name:"——")+" · 再点另一只作为对手"; }
  }
}

/* ══ 重开存档：弹窗二次确认 ══ */
function openConfirmReset(){
  var all=S.party.concat(S.box);
  $("confirm-note").textContent="当前存档里有 "+all.length+" 只宠物（图鉴 "+
    Object.keys(S.discovered).length+"/"+SPECIES.length+"、击败训练师 "+beatenCount()+"/"+TRAINERS.length+
    "、🪙"+S.coins+"）。清空后无法恢复，真的要重来吗？";
  $("panel-confirm").classList.remove("hidden");
}
function doResetSave(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  S=freshSave(); map=genMap(); sparkles=[]; B=null; TB=null; SPB=null;
  ["screen-battle","swap-panel","panel-dex","panel-shop","panel-hosp","panel-party","panel-trainer","panel-spar","panel-confirm","enc-panel","screen-world","screen-starter"].forEach(function(id){
    $(id).classList.add("hidden");
  });
  clearAllStages();
  $("screen-title").classList.remove("hidden");
  updateHUD(); save();
  /* 双重保险：任何残留的异步结算都不该把旧存档写回来 */
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  toast("存档已清空，重新选初始伙伴出发吧！");
}
function startBattle(){
  var al=alivePets();
  if(!al.length){ toast("全队都倒下了，先去医院治疗！"); return; }
  startWildBattle(rollEnemy());
}
function renderStatusRows(){
  ["enemy-status","self-status"].forEach(function(id){ $(id).textContent=""; });
  if(!B) return;
  function fill(id, chips){
    var box=$(id);
    chips.forEach(function(c){
      var s=document.createElement("span");
      s.className="status-chip "+c.c; s.textContent=c.t;
      box.appendChild(s);
    });
  }
  fill("enemy-status", statusChips(B.foe));
  fill("self-status", statusChips(selfPet()));
}
function refreshHP(){
  if(!B) return;
  $("enemy-hp-text").textContent="HP "+B.ehp+"/"+B.emax;
  $("enemy-hp-fill").style.width=(B.ehp/B.emax*100)+"%";
  var pet=selfPet(), sp=leadSp();
  if(pet&&sp){
    $("self-hp-text").textContent="HP "+pet.hp+"/"+maxHpOf(pet);
    $("self-hp-fill").style.width=(pet.hp/maxHpOf(pet)*100)+"%";
  }
  renderStatusRows();
  updateHUD();
}
function log(msg){ $("battle-log").textContent=msg; }
function spriteShake(who){
  var el=$(who); el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
}
function renderMoveRow(){
  var row=$("move-row"); row.textContent="";
  var pet=selfPet(); if(!pet) return;
  movesOf(pet).forEach(function(mid,idx){
    var mv=MOVES[mid];
    var btn=document.createElement("button");
    btn.className="move-btn";
    if(idx===0) btn.setAttribute("data-primary-action","true");
    var tag=document.createElement("span");
    tag.className="type-tag"+(mv.type!=="nor"?" t-"+mv.type:"");
    tag.textContent=TYPE_NAME[mv.type];
    var lab=document.createElement("span");
    lab.textContent=mv.name;
    var sm=document.createElement("small");
    var edge=eff(mv.type,B.esp);
    var edgeTxt = mv.power<=0 ? " · 🔮变化技" : (edge>1.2?" · ✅克它":(edge<1?" · ⛔抵抗":""));
    sm.textContent=B.sPP[mid]<=0?"PP 用尽":"威力 "+mv.power+" · PP "+B.sPP[mid]+"/"+mv.pp+edgeTxt;
    btn.appendChild(tag); btn.appendChild(lab); btn.appendChild(sm);
    btn.disabled=B.sPP[mid]<=0||B.busy;
    btn.addEventListener("click",function(){ useMove(mid); });
    row.appendChild(btn);
  });
}
function renderItemRow(){
  var row=$("ball-row"); row.textContent="";
  var throwable=(B.mode==="wild");
  BALLS.forEach(function(b,i){
    var btn=document.createElement("button");
    btn.className="item-btn";
    btn.textContent=b.emoji+b.name+" ×"+S.balls[i];
    if(S.balls[i]<=0||!throwable||B.busy) btn.disabled=true;
    if(!throwable) btn.title="只有野生小宠才能收服（训练师与切磋不能丢球）";
    btn.addEventListener("click",function(){ throwBall(i); });
    row.appendChild(btn);
  });
  /* v16：应玩家要求移除战斗中的「🍪 零食」按钮（原效果是 55% 概率跳过野生宠回合） */
  if(!throwable){
    var note=document.createElement("span");
    note.className="dex-note";
    note.style.cssText="align-self:center;font-size:12px;";
    note.textContent=(B.mode==="trainer"?"训练师对战不能丢球收服":"切磋不能丢球");
    row.appendChild(note);
  }
}
function renderSwapRow(){
  var row=$("swap-row"); row.textContent="";
  if(!B||B.mode!=="spar") return;
  if(!SPB||!SPB.b) return;
  var b=SPB.b;
  var btn=document.createElement("button");
  btn.className="item-btn";
  btn.textContent="🤝 换 "+byId(b.sp).name+" 上场（耗1回）";
  if(b.hp<=0||B.act===b.uid) btn.disabled=true;
  btn.addEventListener("click",function(){
    if(!B||B.busy) return;
    var old=selfPet();
    if(!old) return;
    B.act=b.uid;
    ensureFighter(b);
    B.sPP=b.pp;
    $("self-sprite").textContent=byId(b.sp).emoji; setAvatar($("self-sprite"), byId(b.sp));
    $("self-name").textContent=trOf(b.trait).name+"·"+byId(b.sp).name+" Lv."+b.lv;
    var st=$("self-type");
    st.textContent=typeText(byId(b.sp));
    st.className=typeClass(byId(b.sp));
    log("换人！"+byId(b.sp).name+" 上场接替 "+byId(old.sp).name+"。");
    renderMoveRow(); refreshHP();
    enemyTurnSoon();
  });
  row.appendChild(btn);
}
function applyMove(mv, atkSp, defSp, atkIsSelf, defMax){
  var lines=[];
  var selfP=selfPet();
  var atkT=trOf(atkIsSelf?(selfP?selfP.trait:null):B.etrait);
  var defT=trOf(atkIsSelf?B.etrait:(selfP?selfP.trait:null));
  var atkF = atkIsSelf ? selfP : B.foe;
  var defF = atkIsSelf ? B.foe : selfP;
  function healTo(v){ if(atkIsSelf) setSelfHp(v); else B.ehp=Math.min(B.emax,v); }
  function dmgTo(v){ if(atkIsSelf) B.ehp=Math.max(0,v); else setSelfHp(v); }
  function maxOf(){ return atkIsSelf ? maxHpOf(selfP) : B.emax; }
  /* 全队回血式变化招式（月光浴） */
  if(mv.healTeam){
    var amtT=Math.max(1,Math.round(maxOf()*mv.healTeam));
    S.party.forEach(function(q){ if(q.hp>0) q.hp=Math.min(maxHpOf(q),q.hp+amtT); });
    lines.push(atkSp.name+" 洒下月光，全队各回复了约 "+amtT+" 点 HP！");
    return lines;
  }
  if(mv.heal){
    var amt=Math.round(maxOf()*mv.heal*(atkT.heal||1));
    healTo((atkIsSelf?selfHp():B.ehp)+amt);
    lines.push(atkSp.name+" 使用 "+mv.name+"，回复了 "+amt+" 点 HP！");
    return lines;
  }
  /* 变化招式：强化自己 / 削弱对手 */
  if(!mv.power){
    if(mv.buff){
      var bs=[]; Object.keys(mv.buff).forEach(function(k){ bs.push(addStage(atkF,k,mv.buff[k])); });
      lines.push(atkSp.name+" 使出 "+mv.name+"！"+bs.join("；"));
    }
    if(mv.debuff){
      var ds=[]; Object.keys(mv.debuff).forEach(function(k){ ds.push(addStage(defF,k,-mv.debuff[k])); });
      lines.push((mv.buff?"":"对手被 "+mv.name+" 影响：")+ds.join("；"));
    }
    if(mv.status&&Math.random()<(mv.status.chance===undefined?1:mv.status.chance)){
      if(setStatus(defF,mv.status.k)) lines.push(defF===selfP?("你中了"+STATUS_NAME[mv.status.k]+"！"):(defSp.name+" 陷入了"+STATUS_NAME[mv.status.k]+"状态！"));
    }
    return lines;
  }
  if(atkT.miss&&Math.random()<atkT.miss){
    lines.push(atkSp.name+" 莽莽撞撞一招 "+mv.name+"，居然打空了！");
    return lines;
  }
  if(defT.dodge&&Math.random()<defT.dodge){
    lines.push(defSp.name+" 身形一闪，躲开了 "+mv.name+"！");
    return lines;
  }
  var e=eff(mv.type,defSp);
  /* 攻/防种族值比（宝可梦式）：攻高打防低伤害大，配合上面的 atkOf/defOf 等级系数 */
  var atkSpObj=atkIsSelf?(selfP?byId(selfP.sp):null):B.esp;
  var defSpObj=atkIsSelf?B.esp:(selfP?byId(selfP.sp):null);
  var atkLv=atkIsSelf?(selfP?selfP.lv:1):(B.foe?B.foe.lv:1);
  var defLv=atkIsSelf?(B.foe?B.foe.lv:1):(selfP?selfP.lv:1);
  var statMul=clamp(atkOf(atkSpObj,atkLv)/Math.max(1,defOf(defSpObj,defLv)),0.9,1.6)*0.75;   /* 攻/防比 × 全局伤害系数（v14 定标） */
  var lvOf=(atkIsSelf&&selfP)?selfP.lv:(B.foe?B.foe.lv:1);
  var lvBonus=clamp(0.55+0.055*(lvOf-1), 0.55, 3.2);   /* 等级伤害折算 k(lv)：0.55 → 3.2，敌我同式（v15 标定，见 tools/scan-v15-analyze.mjs） */
  /* 开局伤害折算：1 级时攻防/血量都极小，属性克制会被放大成「一击必杀」
     （实测冰系招打草系 2× = 23 伤害打满 23 血，同族对打却要 4 回合）。
     这里在 1~13 级平滑地把伤害压到 55%，此后完全放开；敌我同式，不偏袒任何一方。 */
  var fScale=0.55+0.45*Math.min(1, Math.max(0,(lvOf-1)/12));
  lvBonus*=fScale;
  var atkM=atkT.atk*statMul, stag=stageMult(atkF,"atk"), dstag=stageMult(defF,"def"), mult2=1;
  if(mv.ignoreDef) dstag=1;
  if(atkT.bloodrage){
    var ownRatio=atkIsSelf?(selfP?selfHp()/maxHpOf(selfP):1):(B.ehp/B.emax);
    if(ownRatio<0.35){ atkM*=1.35; lines.push(atkSp.name+" 斗志燃起！"); }
  }
  var hits=1;
  if(mv.hits){ hits=ri(mv.hits[0],mv.hits[1]); mult2=(mv.hitsMul===undefined?0.62:mv.hitsMul); }
  /* 暴击（聚气等能力变化 + 招式自带暴击率） */
  var critRate=0.06+0.04*clamp(atkF.st?atkF.st.crit:0,0,6)+(mv.crit||0);
  var crit=Math.random()<critRate;
  var base=mv.power*e*lvBonus*atkM*stag*defT.def*dstag*mult2*hits*(0.85+Math.random()*0.3)*(crit?1.6:1);
  var dmg=Math.max(1,Math.round(base));
  dmgTo(atkIsSelf?B.ehp-dmg:selfHp()-dmg);
  spriteShake(atkIsSelf?"enemy-sprite":"self-sprite");
  var stat = mv.power<=25?"（连击型）":(mv.power>=40?"（大招）":"");
  lines.push(atkSp.name+" 的 "+mv.name+" 打出 "+dmg+" 点伤害！"+(hits>1?("（命中 "+hits+" 次）"):"")+stat);
  if(crit) lines.push("💥 会心一击！");
  var et=effText(e); if(et) lines.push(et+"（"+TYPE_NAME[mv.type]+" → "+typeText(defSp)+"）");
  else if(e<1) lines.push("效果不太好……");
  if(mv.recoil){
    var rc=Math.round(dmg*mv.recoil);
    if(atkIsSelf) setSelfHp(selfHp()-rc); else B.ehp=Math.max(0,B.ehp-rc);
    lines.push("反作用力让 "+atkSp.name+" 也吃了 "+rc+" 点伤害。");
  }
  if(mv.drain){
    var hd=Math.round(dmg*mv.drain);
    healTo((atkIsSelf?selfHp():B.ehp)+hd);
    lines.push("顺手吸回了 "+hd+" 点 HP！");
  }
  if(mv.skip&&Math.random()<mv.skip){
    if(atkIsSelf){ B.eSkip=true; lines.push("糊它一脸泥！它下回合要忙着擦脸了！"); }
    else{ B.sSkip=true; lines.push("你被糊了一脸泥，下回合行动会迟缓！"); }
  }
  if(mv.status&&Math.random()<(mv.status.chance||1)){
    if(setStatus(defF,mv.status.k)){
      lines.push(defF===selfP?("附加效果：你陷入了"+STATUS_NAME[mv.status.k]+"！")
        :(defSp.name+" 陷入了"+STATUS_NAME[mv.status.k]+"状态！"));
    }
  }
  return lines;
}
function guardPlayer(fn){
  if(!B||B.busy) return;
  if(B.sSkip){
    B.sSkip=false;
    log("你的伙伴正手忙脚乱擦泥，白白耗掉一回合！");
    refreshHP(); renderMoveRow();
    B.busy=true; setTimeout(enemyTurn,650);
    return;
  }
  fn();
}
function useMove(mid){
  guardPlayer(function(){
    if(!B.sPP[mid]||B.sPP[mid]<=0){ log("这个技能 PP 用尽了，换一个！"); return; }
    var pet=selfPet();
    if(!pet) return;
    var me=leadSp(), foeSp=B.esp;
    /* 前期（玩家 ≤5 级）不让野怪抢先手：新手先出手、少挨一下，体验更稳；
       高等级再按速度正常判定，速度流仍然有意义。 */
    var foeFirst = spdOf(B.foe)>spdOf(pet) && (pet.lv||1)>5;
    if(foeFirst&&Math.random()<0.65){
      /* 对方更快：先手挨一下，再轮到我们 */
      B.busy=true;
      log("野生/对手的 "+foeSp.name+" 速度更快，抢在你前面出手！");
      refreshHP();
      setTimeout(function(){
        if(!B) return;
        enemyStrike(function(){
          if(!B) return;
          if(pet.hp<=0){ onSelfFaint(); return; }
          playerStrike(mid);
        });
      },600);
      return;
    }
    playerStrike(mid);
  });
}
function playerStrike(mid){
  if(!B) return;
  var pet=selfPet(); if(!pet) return;
  B.sPP[mid]--;
  var lines=[];
  if(!tickBoard(pet,"你的 "+leadSp().name,lines,true)){
    log(lines.join("\n")||(leadSp().name+" 动弹不得！"));
    refreshHP(); renderMoveRow();
    if(pet.hp<=0){ onSelfFaint(); return; }
    enemyTurnSoon(); return;
  }
  lines=lines.concat(applyMove(MOVES[mid], leadSp(), B.esp, true));
  log(lines.join("\n"));
  refreshHP(); renderMoveRow();
  if(B.ehp<=0){ enemyFainted(); return; }
  enemyTurnSoon();
}
function enemyTurnSoon(){ B.busy=true; setTimeout(enemyTurn,700); }
function enemyTurn(){
  if(!B) return;
  B.turn=(B.turn||0)+1;
  var lines=[];
  if(B.eSkip){
    B.eSkip=false;
    lines.push("对手正忙着擦脸上的泥，白白耗掉一回合！");
  }
  if(!lines.length && !tickBoard(B.foe,"对手的 "+B.esp.name,lines,false)){
    if(B.ehp<=0){ log(lines.join("\n")); refreshHP(); enemyFainted(); return; }
    log(lines.join("\n")+"\n它这回合动不了！");
    refreshHP(); endPlayerAfterFoe(); return;
  }
  endBoardTurn(selfPet(),lines);
  /* 同 enemyStrike：可用招式取自 B.ePP，它可能已被按等级压制 */
  var usable=Object.keys(B.ePP).filter(function(id){return B.ePP[id]>0 && MOVES[id];});
  if(!usable.length){ foePPReset(); usable=Object.keys(B.ePP); }
  var mid=usable[ri(0,usable.length-1)];
  B.ePP[mid]--;
  lines=lines.concat(applyMove(MOVES[mid], B.esp, leadSp(), false, B.emax));
  log(lines.join("\n"));
  refreshHP();
  if(selfHp()<=0){ onSelfFaint(); return; }
  endPlayerAfterFoe();
}
function endPlayerAfterFoe(){
  B.busy=false; renderMoveRow(); renderItemRow(); renderSwapRow();
}
/* 对手主动出手（用于速度更快时的先手） */
function enemyStrike(cb){
  if(!B){ if(cb) cb(); return; }
  var lines=[];
  if(B.eSkip){
    B.eSkip=false;
    lines.push("对手正忙着擦脸上的泥，白白耗掉一回合！");
    log(lines.join("\n")); refreshHP();
    if(cb) cb();
    return;
  }
  if(!tickBoard(B.foe,"对手的 "+B.esp.name,lines,false)){
    if(B.ehp<=0){ log(lines.join("\n")); refreshHP(); enemyFainted(); if(cb) cb(); return; }
    lines.push("它这回合动不了！");
    log(lines.join("\n")); refreshHP();
    B.busy=false;
    if(cb) cb();
    return;
  }
  /* 可用招式必须取自 B.ePP（它可能已被 startWildBattle 按等级压制过），
     用 B.esp.moves 会让压制失效——低级野怪照样掏出暴风雪。 */
  var usable=Object.keys(B.ePP).filter(function(id){return B.ePP[id]>0 && MOVES[id];});
  if(!usable.length){ foePPReset(); usable=Object.keys(B.ePP); }
  var mid=usable[ri(0,usable.length-1)];
  B.ePP[mid]--;
  lines=lines.concat(applyMove(MOVES[mid], B.esp, leadSp(), false, B.emax));
  log(lines.join("\n"));
  refreshHP();
  B.busy=false;
  if(cb) cb();
}
function onSelfFaint(){
  var pet=selfPet();
  if(B&&B.mode==="spar"){
    log(leadSp().name+" 撑不住了，切磋到此为止——它还剩一口气。");
    beep(220,.16);
    setTimeout(endSpar,900);
    return;
  }
  log((pet?leadSp().name:"伙伴")+" 濒倒了！快换伙伴！");
  var rest=(B&&B.mode==="trainer") ? alivePets().length : alivePets().length;
  if(rest===0){ wipedRetreat(); return; }
  B.busy=true;
  setTimeout(function(){ openSwap(true); },600);
}
function wipedRetreat(){
  var wasTrainer = B && B.mode==="trainer";
  var tn = wasTrainer && TB ? TB.t.name : null;
    S.party.forEach(function(p){ p.hp=Math.max(1,Math.round(maxHpOf(p)*0.4)); });
  log(wasTrainer
    ? ("全队都撑不住了……"+tn+" 收起了精灵球：「再练练，我等你回来。」")
    : "全队濒倒……只好灰溜溜撤退，回窝略作休整。重伤的伙伴记得送去 🏥 医院！");
  beep(200,.18);
  setTimeout(closeBattle,1000);
}
function enemyFainted(){
  if(B.mode==="spar"){ endSpar(); return; }
  if(B.mode==="trainer"){ nextTrainerFoe(); return; }
  var c=Math.round(ri(B.esp.reward[0],B.esp.reward[1])*0.6);
  S.coins+=c;
  gainExp(selfPet(),B.emax);
  $("enemy-sprite").classList.add("faint");
  log("野生的"+B.esp.name+" 眼冒金星！捡到 🪙×"+c+"（打倒的宠不进图鉴，压血丢球才能收服）");
  jingle(); B.busy=true;
  setTimeout(closeBattle,1000);
}
/* 训练师对战：换下一只 */
function nextTrainerFoe(){
  var reward=Math.round(ri(B.esp.reward[0],B.esp.reward[1])*0.5);
  S.coins+=reward;
  gainExp(selfPet(),Math.round(B.emax*1.1));
  $("enemy-sprite").classList.add("faint");
  TB.idx++;
  if(TB.idx>=TB.team.length){
    log("🎉 打赢了 "+TB.t.name+"！奖金 🪙×"+reward+"，全队欢呼！");
    jingle(); B.busy=true;
    var t=TB.t;
    S.beaten=S.beaten||{};
    if(!S.beaten[t.id]){ S.beaten[t.id]=1; toast("🏅 首次击破 "+t.name+"！"); }
    setTimeout(function(){ closeBattle(); toast("🏆 训练师 "+t.name+" 已被你击败！"); },1100);
    updateHUD(); save();
    return;
  }
  var f=TB.team[TB.idx];
  B.foe=f; B.esp=byId(f.sp); B.ehp=f.hp; B.emax=maxHpOf(f); B.ePP=buildPP(B.esp);
  $("enemy-sprite").classList.remove("faint");
  $("enemy-sprite").textContent=B.esp.emoji;
  $("enemy-name").textContent=TB.t.name+"·"+B.esp.name+" Lv."+f.lv;
  $("enemy-rarity").textContent=RARITY_NAME[B.esp.rarity]+" · "+typeText(B.esp);
  log(TB.t.name+" 派出了下一只："+B.esp.name+"！（奖金已到账 🪙×"+reward+"）");
  B.busy=false;
  refreshHP(); renderMoveRow(); renderItemRow(); renderSwapRow();
  save(); updateHUD();
}
/* 切磋收尾：不倒宠、不加金币，胜方拿经验、双方回血 */
function endSpar(){
  if(!B||!SPB) { closeBattle(); return; }
  var a=SPB.a, b=SPB.b;
  var mine=selfPet();
  var winner = (B.ehp<=0) ? a : b;
  var loser  = (B.ehp<=0) ? b : a;
  if(winner&&winner.uid!==mine.uid) gainExp(winner, Math.round(maxHpOf(winner)*1.4));
  if(mine&&mine.uid!==winner.uid) gainExp(mine, Math.round(maxHpOf(mine)*0.7));
  [a,b].forEach(function(q){
    if(!q) return;
    var s=byId(q.sp);
    if(q.hp<=0) q.hp=1;
      else q.hp=Math.min(maxHpOf(q),q.hp+Math.round(maxHpOf(q)*0.25));
    clearStatus(q);
  });
  runEvoCheck();
  toast("🥊 切磋结束："+byId(winner.sp).name+" 胜出，双方各回了些体力！");
  closeBattle();
}
function throwBall(idx){
  guardPlayer(function(){
    if(B.mode!=="wild"){ toast(B.mode==="trainer"?"训练师对战不能丢球收服！":"切磋时不能丢球收服！"); return; }
    if(S.balls[idx]<=0){ toast("这种球用完了，换个球或去商店补货！"); return; }
    B.busy=true;
    S.balls[idx]--;
    spriteShake("enemy-sprite"); beep(520,.07);
    var p=clamp(0.10+(1-B.ehp/B.emax)*0.75,0.05,0.9)*BALLS[idx].mult*DIFF[B.esp.rarity];
    p=clamp(p,0.03,0.95);
    renderItemRow();
    setTimeout(function(){
      if(Math.random()<p){ captureSuccess(); }
      else{
        log("唉！它晃晃脑袋挣脱了……（这球成功率约 "+Math.round(p*100)+"%）再压低血量会更好抓！");
        beep(240,.12);
        renderItemRow();
        enemyTurnSoon();
      }
    },520);
  });
}
function captureSuccess(){
  var sp=B.esp;
  $("enemy-sprite").classList.add("faint");
  log("叮！收服成功！"+sp.name+" 加入队伍！");
  jingle();
  var bonus=ri(sp.reward[0],sp.reward[1]);
  S.coins+=bonus;
  gainExp(selfPet(),sp.base);
  var pet=newPet(sp.id);
  pet.hp=Math.max(1,B.ehp);
  S.discovered[sp.id]=1;
  var toBox=false;
  if(S.party.length<PARTY_MAX) S.party.push(pet);
  else{ S.box.push(pet); toBox=true; }
  if(!selfPet()) S.lead=pet.uid;
  var name=trOf(pet.trait).name+"·"+sp.name;
  setTimeout(function(){
    closeBattle();
    toast(toBox?("📦 队伍已满，"+name+" 寄存在 🏥 医院仓库！奖励 🪙×"+bonus):("🎉 抓到 "+name+"！奖励 🪙×"+bonus));
    updateHUD();
  },900);
}
/* v16：零食已按玩家要求下线（战斗中不再有喂零食跳过回合的玩法）。
   函数保留成空壳，避免旧存档/旧缓存里残留的调用点报错。 */
function giveTreat(){
  toast("零食玩法已下线，专心用招式和精灵球吧！");
}
function closeBattle(){
  $("screen-battle").classList.add("hidden");
  $("swap-panel").classList.add("hidden");
  $("enemy-sprite").classList.remove("faint");
  $("self-sprite").classList.remove("faint");
  var t = (B&&B.mode==="trainer"&&TB)?TB.t.id:null;
  B=null; TB=null; SPB=null;
  clearAllStages();
  runEvoCheck();
  if(t){ var tr=null; TRAINERS.forEach(function(q){ if(q.id===t) tr=q; }); if(tr) tr.defeated=1; }
  updateHUD(); save(); draw();
  /* v17：战斗中升到学习等级点的话，战后补弹学招窗 */
  setTimeout(maybeLearnPopup, 400);
}
function petRowEl(p, acts, faintSuffix){
  var sp=byId(p.sp);
  var row=document.createElement("div"); row.className="pet-row";
  var ico=document.createElement("span"); ico.className="ico"; ico.textContent=sp.emoji; setAvatar(ico, sp);
  var d=document.createElement("span"); d.className="desc";
  var b=document.createElement("b"); b.textContent=sp.name+(S.lead===p.uid?" ⭐":"");
  var s=document.createElement("span");
  s.textContent=trOf(p.trait).name+" · "+typeText(sp)+" · Lv."+p.lv+" · HP "+p.hp+"/"+maxHpOf(p)+(p.hp<=0&&faintSuffix?" 濒倒":"");
  d.appendChild(b); d.appendChild(s);
  var a=document.createElement("span"); a.className="acts";
  (acts||[]).forEach(function(x){ a.appendChild(x); });
  row.appendChild(ico); row.appendChild(d); row.appendChild(a);
  return row;
}
function miniBtn(text,cls,fn){
  var btn=document.createElement("button");
  btn.className="mini-btn"+(cls?" "+cls:"");
  btn.textContent=text;
  btn.addEventListener("click",fn);
  return btn;
}
function openSwap(forced){
  var list=$("swap-list"); list.textContent="";
  var cur=(B&&B.act)?B.act:S.lead;
  var spar=(B&&B.mode==="spar"&&SPB);
  if(spar){
    var ob=SPB.b;
    var rowB=petRowEl(ob,[ miniBtn(B.act===ob.uid?"出战中":"换上它",B.act===ob.uid?"gray":"gold",function(){ sparSwapToB(); }) ],true);
    if(B.act===ob.uid||ob.hp<=0) rowB.querySelector(".mini-btn").disabled=true;
    var head=document.createElement("p"); head.className="dex-note";
    head.textContent="── 切磋对象 ──";
    list.appendChild(head); list.appendChild(rowB);
    var head2=document.createElement("p"); head2.className="dex-note";
    head2.textContent="── 你的替补 ──";
    list.appendChild(head2);
  }
  S.party.forEach(function(p){
    if(spar&&p.uid===SPB.b.uid) return;
    var row=petRowEl(p,[ miniBtn(cur===p.uid?"出战中":"上阵",cur===p.uid?"gray":"gold",function(){ switchTo(p.uid); }) ],true);
    if(cur===p.uid||p.hp<=0){ row.querySelector(".mini-btn").disabled=true; }
    list.appendChild(row);
  });
  var back=miniBtn(spar?"🏳️ 认输，结束切磋":"🏃 全部不要了，硬撤！","",function(){ $("swap-panel").classList.add("hidden"); wipedRetreat(); });
  back.style.cssText="width:100%;min-height:44px;margin-top:4px;";
  list.appendChild(back);
  $("swap-panel").classList.remove("hidden");
}
/* 切磋：切到对手方的伙伴（SPB.b） */
function sparSwapToB(){
  if(!B||!SPB||B.busy) return;
  var b=SPB.b;
  if(b.hp<=0){ toast("它已经没力气了！"); return; }
  ensureFighter(b);
  B.act=b.uid; B.sPP=b.pp;
  var sp=byId(b.sp);
  $("swap-panel").classList.add("hidden");
  $("self-sprite").textContent=sp.emoji;
  $("self-name").textContent=trOf(b.trait).name+"·"+sp.name+" Lv."+b.lv;
  var st=$("self-type");
  st.textContent=typeText(sp);
  st.className=typeClass(sp);
  log("花掉一回合换人——上吧，"+sp.name+"！");
  renderMoveRow(); renderSwapRow(); refreshHP();
  enemyTurnSoon();
}
function switchTo(uid){
  var p=findPet(uid);
  if(!p){ return; }
  if(S.party.indexOf(p)<0){ toast("它在仓库里，先去医院领出来！"); return; }
  if(p.hp<=0){ toast("它已经濒倒了，先送医院！"); return; }
  if(B){ B.act=uid; } else { S.lead=uid; }
  $("swap-panel").classList.add("hidden");
  if(B){
    ensureFighter(p);
    B.sPP=(B.mode==="spar"&&SPB&&SPB.b&&SPB.b.uid===uid)?SPB.b.pp:p.pp;
    B.busy=false;
    $("self-sprite").textContent=byId(p.sp).emoji;
    $("self-name").textContent=trOf(p.trait).name+"·"+byId(p.sp).name+" Lv."+p.lv;
    var st=$("self-type");
    st.textContent=typeText(byId(p.sp));
    st.className=typeClass(byId(p.sp));
    log("花掉一回合换人——上吧，"+byId(p.sp).name+"！");
    renderMoveRow(); refreshHP();
    enemyTurnSoon();
  }
  save(); updateHUD();
}

/* SECTION: HUD / party / dex / shop / hospital */
function updateHUD(){
  if(!S) return;
  $("hud-coins").textContent=S.coins;
  $("hud-b0").textContent=S.balls[0];
  $("hud-b1").textContent=S.balls[1];
  $("hud-b2").textContent=S.balls[2];
  /* v16：HUD 上的零食计数已随零食玩法一起移除 */
  $("hud-party").textContent=S.party.length+"/"+PARTY_MAX;
  var own=Object.keys(S.discovered).length;
  $("hud-dex").textContent=own+"/"+SPECIES.length;
  var sp=leadSp();
  $("hud-lead").textContent=sp?sp.emoji:"—";
}
function openParty(){
  var list=$("party-list"); list.textContent="";
  if(!S.party.length){
    var e=document.createElement("p"); e.className="dex-note"; e.textContent="背包空空，去 🏥 仓库领一只伙伴回来吧！";
    list.appendChild(e);
  }
  S.party.forEach(function(p){
    var acts=[];
    if(S.lead!==p.uid && p.hp>0 && !B) acts.push(miniBtn("设为首发","gold",function(){ S.lead=p.uid; save(); updateHUD(); openParty(); toast("🎖️ 已设为首发！"); }));
    acts.push(miniBtn("存仓库","",function(){
      if(S.party.length<=1){ toast("至少留 1 只随身！"); return; }
      if(B){ toast("战斗中不能存取！"); return; }
      var i=S.party.indexOf(p); S.party.splice(i,1); S.box.push(p);
      if(S.lead===p.uid){ S.lead=S.party[0]?S.party[0].uid:null; }
      save(); updateHUD(); openParty(); toast("📦 已存入仓库");
    }));
    acts.push(miniBtn("🔧 调整技能","",function(){ openSkillEditor(p); }));
    acts.push(miniBtn("💊 快捷回血 🪙"+QUICK_HEAL_PRICE,"",function(){ quickHeal(p); }));
    list.appendChild(petRowEl(p,acts,true));
  });
  $("party-count").textContent="（"+S.party.length+"/"+PARTY_MAX+"）";
  $("panel-party").classList.remove("hidden");
}
/* 医院治疗全免费（护士台）· v16 起连 PP 一起回满 */
function healPP(p){
  if(!p) return;
  var sp=byId(p.sp);
  if(!sp) return;
  if(!p.pp || p.ppSp!==p.sp || Object.keys(p.pp).length!==p.moves.length){ syncPP(p); return; }
  p.moves.forEach(function(id){ if(MOVES[id]) p.pp[id]=MOVES[id].pp; });   /* 每个招式都补满 */
  p.ppSp=p.sp;
}
function ppLow(p){
  var sp=byId(p.sp);
  if(!sp||!p.pp||p.ppSp!==p.sp) return true;
  return movesOf(p).some(function(id){ return (p.pp[id]||0)<=0; });
}
function treatOne(p){
  var sp=byId(p.sp);
  if(p.hp>=maxHpOf(p) && !ppLow(p) && !(p.st&&p.st.status)){ toast(sp.name+" 满血、PP 也满着呢～"); return; }
  p.hp=maxHpOf(p); if(p.st) p.st.status=null; healPP(p);
  if($("panel-hosp").classList.contains("hidden")) openParty(); else openHospital();
  toast("🏥 "+sp.name+" 免费治愈，满血 + PP 全满出院！");
}
/* 队伍面板快捷回血：花钱，图个省事（v16 起也回 PP） */
function quickHeal(p){
  var sp=byId(p.sp);
  if(p.hp>=maxHpOf(p) && !ppLow(p)){ toast(sp.name+" 满血着呢～"); return; }
  if(S.coins<QUICK_HEAL_PRICE){ toast("金币不够，"+(p.hp<=0?"救回":"快捷回血")+"要 🪙"+QUICK_HEAL_PRICE+"，去医院免费治疗吧！"); return; }
    S.coins-=QUICK_HEAL_PRICE; p.hp=maxHpOf(p);
  if(p.st) p.st.status=null;
  healPP(p);
  save(); updateHUD();
  if($("panel-party").classList.contains("hidden")) openHospital(); else openParty();
  toast("💊 花 🪙"+QUICK_HEAL_PRICE+" 给 "+sp.name+" 灌了瓶活力饮料！");
}
function evoSrcOf(id){
  var out=null;
  Object.keys(EVO).forEach(function(k){
    var e=EVO[k], arr=(e.to instanceof Array)?e.to:[e.to];
    if(arr.indexOf(id)>=0){
      var b=byId(k);
      if(b) out={name:b.name, lv:e.lv, branch:arr.length>1};
    }
  });
  return out;
}
/* v14 图鉴：三方汇集后数量很大，按来源分页（宝可梦 / 洛克 / 帕鲁），每页 DEX_PAGE_SIZE 条 */
var DEX_PAGE_SIZE=60, DEX_FILTER="all", DEX_PAGE=0;
var DEX_SRC_NAME={pk:"宝可梦",kz:"洛克王国",pal:"幻兽帕鲁"};
function dexSourceOf(sp){ return sp.pk?"pk":(sp.kz?"kz":(sp.pal?"pal":"?")); }
function dexList(){ return SPECIES.filter(function(sp){ return DEX_FILTER==="all"||dexSourceOf(sp)===DEX_FILTER; }); }
function openDex(page){
  /* 注意：openDex 直接当事件回调用时（onclick / addEventListener 传的是 Event 对象），
     DEX_PAGE 会被写成 PointerEvent → 页码与本页数量全变 NaN。
     这里只认真正的数字，其余情况一律沿用当前页。 */
  if(typeof page==="number" && isFinite(page)) DEX_PAGE=page;
  else if(page!==undefined && typeof page!=="number") DEX_PAGE=DEX_PAGE||0;
  var grid=$("dex-grid"); grid.textContent="";
  var all=SPECIES, own=0;
  all.forEach(function(sp){ if(S.discovered[sp.id]) own++; });
  var list=dexList();
  var total=list.length, pages=Math.max(1,Math.ceil(total/DEX_PAGE_SIZE));
  if(DEX_PAGE>=pages) DEX_PAGE=pages-1;
  if(DEX_PAGE<0) DEX_PAGE=0;
  list.slice(DEX_PAGE*DEX_PAGE_SIZE,(DEX_PAGE+1)*DEX_PAGE_SIZE).forEach(function(sp){
    var got=!!S.discovered[sp.id];
    var card=document.createElement("div");
    card.className="dex-card"+(got?"":" sil");
    var face=document.createElement("div"); face.className="face"; face.textContent=sp.emoji; setAvatar(face, sp);
    var nm=document.createElement("div"); nm.className="nm"; nm.textContent=got?sp.name:"？？？";
    var meta=document.createElement("div"); meta.className="meta";
    if(got){
      meta.textContent=typeText(sp)+" · 血量基数 "+hpBaseOf(sp)+(sp.ride?" · "+({fly:"🕊 飞行坐骑",water:"🌊 水上坐骑",land:"🐎 陆地坐骑"}[sp.ride]||"可骑乘"):"")+(sp.fly?" ☁天空":"")+" · 持有×"+ownedCount(sp.id)+" · "+sp.habitat.map(function(h){return REGION_NAME[h];}).join("/");
    }else{
      var src=evoSrcOf(sp.id);
      meta.textContent=src?("进化形态 · "+src.name+" 到 Lv."+src.lv+"自动进化"+(src.branch?"（或另一分支）":"")):"未捕获 · "+RARITY_NAME[sp.rarity]+" · "+sp.habitat.map(function(h){return REGION_NAME[h];}).join("/");
    }
    var badge=document.createElement("div"); badge.className="meta";
    badge.textContent="【"+DEX_SRC_NAME[dexSourceOf(sp)]+"】"+(sp.varOf?" · "+sp.varOf+"的亚种":"");
    card.appendChild(face); card.appendChild(nm); card.appendChild(badge); card.appendChild(meta);
    grid.appendChild(card);
  });
  /* 分页条 */
  var bar=document.createElement("div"); bar.className="dex-pager";
  bar.style.cssText="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;padding:8px 0;";
  [["all","全部"],["pk","宝可梦"],["kz","洛克王国"],["pal","幻兽帕鲁"]].forEach(function(it){
    var b=document.createElement("button"); b.className="btn-sm"+(DEX_FILTER===it[0]?" on":"");
    var n=it[0]==="all"?SPECIES.length:SPECIES.filter(function(x){return dexSourceOf(x)===it[0];}).length;
    b.textContent=it[1]+" "+n;
    b.addEventListener("click",function(){ DEX_FILTER=it[0]; DEX_PAGE=0; openDex(0); });
    bar.appendChild(b);
  });
  var prev=document.createElement("button"); prev.className="btn-sm btn-ghost"; prev.textContent="‹ 上一页";
  prev.disabled=(DEX_PAGE<=0); prev.addEventListener("click",function(){ openDex(DEX_PAGE-1); });
  var next=document.createElement("button"); next.className="btn-sm btn-ghost"; next.textContent="下一页 ›";
  next.disabled=(DEX_PAGE>=pages-1); next.addEventListener("click",function(){ openDex(DEX_PAGE+1); });
  var info=document.createElement("span"); info.className="dex-note";
  info.textContent="第 "+(DEX_PAGE+1)+" / "+pages+" 页 · 本页 "+Math.min(DEX_PAGE_SIZE,total-DEX_PAGE*DEX_PAGE_SIZE)+" 只 · 已捕获 "+own+" 种";
  bar.appendChild(prev); bar.appendChild(info); bar.appendChild(next);
  grid.appendChild(bar);
  $("dex-count").textContent="（"+own+"/"+SPECIES.length+"）";
  grid.style.cssText="max-height:52vh;overflow:auto;padding-right:2px;";
  $("panel-dex").classList.remove("hidden");
}
function openShop(){
  var body=$("shop-body"); body.textContent="";
  BALLS.forEach(function(b,i){
    body.appendChild(shopRow(b.emoji,b.name,"捕捉用 · 成功率加成 ×"+b.mult,"🪙 "+b.price,function(){
      if(S.coins<b.price){ toast("金币不够，对战或抓宠赚币吧！"); return; }
      S.coins-=b.price; S.balls[i]++; save(); updateHUD(); openShop();
      toast("购入 "+b.name+" ×1");
    }));
  });
  /* v16：香香零食已下线（玩家要求），商店不再出售 */
  var snote=document.createElement("p"); snote.className="dex-note";
  snote.textContent="🏥 治疗与仓库存取都在宠物医院（红十字小屋）。"
  body.appendChild(snote);
  $("shop-coins").textContent="（🪙 "+S.coins+"）";
  $("panel-shop").classList.remove("hidden");
}
function shopRow(ico,name,desc,priceText,onBuy){
  var row=document.createElement("div"); row.className="shop-row";
  var a=document.createElement("span"); a.className="ico"; a.textContent=ico;
  var d=document.createElement("span"); d.className="desc";
  var b=document.createElement("b"); b.textContent=name;
  var sp=document.createElement("span"); sp.textContent=desc;
  d.appendChild(b); d.appendChild(sp);
  var btn=document.createElement("button"); btn.className="buy-btn"; btn.textContent=priceText;
  btn.addEventListener("click",onBuy);
  row.appendChild(a); row.appendChild(d); row.appendChild(btn);
  return row;
}
var hospTab="treat";
function setHospTab(t){
  hospTab=t;
  $("tab-treat").className="tab-btn"+(t==="treat"?" on":"");
  $("tab-box").className="tab-btn"+(t==="box"?" on":"");
  openHospital();
}
function openHospital(){
  if(B){ toast("正在战斗中，先撤出再送医！"); return; }
  var body=$("hosp-body"); body.textContent="";
  var intro=document.createElement("p"); intro.className="dex-note";
  if(hospTab==="treat"){
    intro.textContent="🏥 护士柜台：治疗全免费（单体、全队、仓库里的都能满血救回），中毒灼烧等异常状态一并清除，PP 也一起回满。";
    body.appendChild(intro);
    var all=S.party.concat(S.box);
    if(!all.length){
      var e0=document.createElement("p"); e0.className="dex-note"; e0.textContent="院里没有认识的宠物，去草丛抓一只吧！";
      body.appendChild(e0);
    }
    all.forEach(function(p){
      var sp=byId(p.sp);
      var full=(p.hp>=maxHpOf(p) && !ppLow(p) && !(p.st&&p.st.status));
    var acts=[ miniBtn(full?"满血 · PP 满":"💊 免费治疗","",function(){ if(!full) treatOne(p); }) ];
      if(full) acts[0].disabled=true;
      body.appendChild(petRowEl(p,acts,true));
    });
    if(all.length){
      var full2=miniBtn("🛏 全队满血 + PP 全满（免费）","gold",function(){
    var need=all.some(function(p){return p.hp<maxHpOf(p) || ppLow(p) || (p.st&&p.st.status);});
        if(!need){ toast("大家都精神饱满，不用治啦～"); return; }
    all.forEach(function(p){ p.hp=maxHpOf(p); clearStatus(p); healPP(p); });
        save(); updateHUD(); openHospital();
        toast("🛏 全队满血 + PP 全满，一分钱没花！");
      });
      full2.style.cssText="width:100%;min-height:44px;margin-top:4px;";
      body.appendChild(full2);
    }
    var tip=document.createElement("p"); tip.className="dex-note";
    tip.textContent="💊 想少跑一趟？队伍面板里也有「快捷回血」，花 🪙"+QUICK_HEAL_PRICE+" 当场回满。";
    body.appendChild(tip);
  }else{
    intro.textContent="📦 队伍满了新抓会自动寄存这里；点「交换」选中两只（队伍⇄仓库任意配对）即可对调位置。";
    body.appendChild(intro);
    var sec1=document.createElement("p"); sec1.className="dex-note"; sec1.textContent="── 队伍 "+S.party.length+"/"+PARTY_MAX+" ──";
    body.appendChild(sec1);
    S.party.forEach(function(p){ body.appendChild(swapRow(p)); });
    var sec2=document.createElement("p"); sec2.className="dex-note"; sec2.textContent="── 仓库 "+S.box.length+" ──";
    body.appendChild(sec2);
    if(!S.box.length){
      var e1=document.createElement("p"); e1.className="dex-note"; e1.textContent="仓库目前空着。抓满 6 只后，溢出的新宠会住进来。";
      body.appendChild(e1);
    }
    S.box.forEach(function(p){ body.appendChild(swapRow(p)); });
  }
  $("hosp-coins").textContent="（🪙 "+S.coins+"）";
  $("panel-hosp").classList.remove("hidden");
}
var boxPick=null;
function findSlot(uid){
  var i;
  for(i=0;i<S.party.length;i++) if(S.party[i].uid===uid) return {arr:S.party,i:i};
  for(i=0;i<S.box.length;i++) if(S.box[i].uid===uid) return {arr:S.box,i:i};
  return null;
}
function swapRow(p){
  var inParty=S.party.indexOf(p)>=0;
  var sp=byId(p.sp);
  var acts=[];
  if(!inParty){
    var take=miniBtn(S.party.length<PARTY_MAX?"领回":"队满","",function(){
      if(S.party.length>=PARTY_MAX){ toast("队伍满员，用「交换」对调吧！"); return; }
      S.box.splice(S.box.indexOf(p),1); S.party.push(p);
      if(!selfPet()) S.lead=p.uid;
      boxPick=null; save(); updateHUD(); openHospital();
      toast("🎒 "+sp.name+" 回到队伍！");
    });
    if(S.party.length>=PARTY_MAX) take.disabled=true;
    acts.push(take);
  }
  var btnTxt = boxPick===null ? "🔁 交换" : (boxPick===p.uid ? "✖ 取消" : "↔ 换它");
  acts.push(miniBtn(btnTxt,"gold",function(){
    if(boxPick===null||boxPick===p.uid){ boxPick=(boxPick===p.uid?null:p.uid); openHospital(); return; }
    var A=findSlot(boxPick), C=findSlot(p.uid);
    boxPick=null;
    if(!A||!C||A.arr===C.arr){ openHospital(); return; }
    var pa=A.arr[A.i], pb=C.arr[C.i];
    A.arr[A.i]=pb; C.arr[C.i]=pa;
    if(S.lead===pb.uid && S.party.indexOf(pb)<0) S.lead=pa.uid;
    save(); updateHUD(); openHospital();
    toast("🔁 "+byId(pa.sp).name+" ⇄ "+byId(pb.sp).name+" 已对调");
  }));
  acts.push(miniBtn(p.hp>=maxHpOf(p)?"满血":"💊 免费","",function(){ if(p.hp<maxHpOf(p)||(p.st&&p.st.status)) treatOne(p); }));
  if(p.hp>=sp.base&&!(p.st&&p.st.status)) acts[acts.length-1].disabled=true;
  return petRowEl(p,acts,true);
}

/* SECTION: canvas rendering */
var canvas=$("game-canvas"), ctx=canvas.getContext("2d");
var TILE=32, VIEW_W=0, VIEW_H=0;
function resizeCanvas(){
  var rect=canvas.parentElement.getBoundingClientRect();
  var dpr=window.devicePixelRatio||1;
  canvas.width=Math.max(1,Math.round(rect.width*dpr));
  canvas.height=Math.max(1,Math.round(rect.height*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  VIEW_W=rect.width/TILE; VIEW_H=rect.height/TILE;
  draw();
}
function draw(){
  if(!map.length||!S) return;
  var w=canvas.width/(window.devicePixelRatio||1), h=canvas.height/(window.devicePixelRatio||1);
  ctx.clearRect(0,0,w,h);
  var camX=clamp(S.pos.x-VIEW_W/2+0.5,0,Math.max(0,MW-VIEW_W));
  var camY=clamp(S.pos.y-VIEW_H/2+0.5,0,Math.max(0,MH-VIEW_H));
  var t0=Math.floor(camX), t1=Math.ceil(camX+VIEW_W), r0=Math.floor(camY), r1=Math.ceil(camY+VIEW_H);
  var time=Date.now()/600;
  for(var y=r0;y<=r1;y++){ for(var x=t0;x<=t1;x++){
    if(x<0||y<0||x>=MW||y>=MH) continue;
    var px=(x-camX)*TILE, py=(y-camY)*TILE, v=map[y*MW+x];
    ctx.fillStyle=((x+y)&1)?"#8fd48b":"#84cd81"; ctx.fillRect(px,py,TILE,TILE);
    if(v===T.PATH){ ctx.fillStyle="#dcc99b"; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle="#d2be8c"; ctx.fillRect(px+4,py+4,3,3); ctx.fillRect(px+18,py+14,3,3);}
    else if(v===T.TALL){
      ctx.fillStyle="#5cb463";
      for(var g=0;g<4;g++){ var gx=px+4+g*7, swy=Math.sin(time+x+g)*1.4;
        ctx.fillRect(gx+swy,py+6,2,10); ctx.fillRect(gx+3+swy,py+14,2,10); }
    }
    else if(v===T.WATER){
      ctx.fillStyle="#6fb7e8"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#9ad2f2"; var wx=Math.sin(time+x*0.9+y)*4;
      ctx.fillRect(px+8+wx,py+10,10,2); ctx.fillRect(px+12-wx,py+20,8,2);
    }
    else if(v===T.FLOWER){
      var cols=["#f2a7c3","#f7d774","#e88bb0","#f5f0fa"];
      for(var fl=0;fl<4;fl++){ ctx.fillStyle=cols[(fl+x*2+y)%4]; ctx.fillRect(px+5+fl*7,py+6+((fl*3+x+y)%3)*8,3,3); }
      ctx.fillStyle="#68b86d"; ctx.fillRect(px+10,py+22,2,6); ctx.fillRect(px+22,py+18,2,6);
    }
    else if(v===T.LAVA){
      ctx.fillStyle="#c9482a"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#f08a3c"; var lg=Math.sin(time*2+x+y)*3;
      ctx.fillRect(px+8+lg,py+8,8,3); ctx.fillRect(px+12-lg,py+19,9,3);
    }
    else if(v===T.ROCK){
      ctx.fillStyle="#8d857c"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#6e675f"; ctx.fillRect(px+5,py+6,9,7); ctx.fillRect(px+17,py+16,9,7);
      ctx.fillStyle="#d8c25a"; ctx.fillRect(px+15,py+10,3,3); ctx.fillRect(px+8,py+20,3,3);
    }
    else if(v===T.DEEP){
      ctx.fillStyle="#2f6fae"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#4a8cc8"; var dg=Math.sin(time*0.7+x*0.6+y*0.9)*5;
      ctx.fillRect(px+7+dg,py+12,10,2); ctx.fillRect(px+13-dg,py+22,8,2);
    }
    else if(v===T.HOSP){
      ctx.fillStyle="#f7f2ea"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#d8ccba"; ctx.fillRect(px,py+TILE-5,TILE,5);
      ctx.fillStyle="#e05a5a"; ctx.fillRect(px+13,py+5,6,14); ctx.fillRect(px+9,py+9,14,6);
    }
    else if(v===T.TREE){
      ctx.fillStyle="#8a5a33"; ctx.fillRect(px+13,py+18,6,10);
      ctx.fillStyle="#2f7d4f"; ctx.beginPath(); ctx.arc(px+16,py+13,11,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#3c9060"; ctx.beginPath(); ctx.arc(px+12,py+11,7,0,Math.PI*2); ctx.fill();
    }
  }}
  sparkles.forEach(function(p){
    var px=(p.x-camX)*TILE+TILE/2, py=(p.y-camY)*TILE+TILE/2;
    var s=1+Math.sin(time*3)*0.25;
    ctx.save(); ctx.translate(px,py); ctx.scale(s,s);
    ctx.fillStyle="#ffe27a";
    ctx.beginPath();
    for(var i=0;i<4;i++){
      var a=i*Math.PI/2;
      ctx.lineTo(Math.cos(a)*9,Math.sin(a)*9);
      ctx.lineTo(Math.cos(a+Math.PI/4)*3,Math.sin(a+Math.PI/4)*3);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  });
  /* 训练师 NPC */
  TRAINERS.forEach(function(tr){
    var tx=(tr.pos.x-camX)*TILE+TILE/2, ty=(tr.pos.y-camY)*TILE+TILE/2;
    if(tx<-TILE||ty<-TILE||tx>TILE*(VIEW_W+1)||ty>TILE*(VIEW_H+1)) return;
    ctx.fillStyle="rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(tx,ty+12,9,3.5,0,0,Math.PI*2); ctx.fill();
    ctx.font="24px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(tr.emoji,tx,ty-3);
    if(S.beaten&&S.beaten[tr.id]){
      ctx.font="13px sans-serif";
      ctx.fillText("✅",tx+13,ty-15);
    }
  });
  var ppx=(S.pos.x-camX)*TILE+TILE/2, ppy=(S.pos.y-camY)*TILE+TILE/2;
  ctx.fillStyle="rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(ppx,ppy+12,9,3.5,0,0,Math.PI*2); ctx.fill();
  ctx.font="26px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText("🧑‍🌾",ppx,ppy-2);
  var lsp=leadSp();
  if(lsp){
    ctx.font="15px sans-serif";
    ctx.fillText(lsp.emoji,ppx+15,ppy+6);
  }
}

/* SECTION: input */
var keyHeld=null, keyTimer=null;
function bindInput(){
  document.querySelectorAll(".dbtn").forEach(function(btn){
    var dir=btn.dataset.dir;
    var dxy={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir];
    var iv=null;
    function tap(){ move(dxy[0],dxy[1]); }
    btn.addEventListener("pointerdown",function(e){ e.preventDefault(); tap();
      clearInterval(iv);
      var last=0, lastIv=0;
      iv=setInterval(function(){
        var ms=moveIntervalMs(), now=Date.now();
        if(ms!==lastIv){ lastIv=ms; last=now-ms; }
        if(now-last>=ms){ last=now; tap(); }
      },45); });
    function stop(){ clearInterval(iv); iv=null; }
    btn.addEventListener("pointerup",stop); btn.addEventListener("pointerleave",stop); btn.addEventListener("pointercancel",stop);
  });
  window.addEventListener("keydown",function(e){
    var d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}[e.key];
    if(!d) return;
    e.preventDefault();
    if(keyHeld===d.join()) return;
    keyHeld=d.join(); clearInterval(keyTimer);
    move(d[0],d[1]);
    var last=0, lastIv=0;
    keyTimer=setInterval(function(){
      var iv=moveIntervalMs(), now=Date.now();
      if(iv!==lastIv){ lastIv=iv; last=now-iv; }   /* 速度变化时重置节流，立刻生效 */
      if(now-last>=iv){ last=now; move(d[0],d[1]); }
    },45);
  });
  window.addEventListener("keyup",function(){ keyHeld=null; clearInterval(keyTimer); });
}

/* SECTION: boot */
function renderStarter(){
  if(!STARTER_GROUPS.length) STARTER_GROUPS=buildStarterGroups();
  if(!STARTERS.length||!byId(STARTERS[0])) STARTERS=starterPool(3);
  /* 默认停在「玩家上次选的系」；否则草系 */
  if(!STARTER_TAB || !STARTER_GROUPS.some(function(g){ return g.key===STARTER_TAB; })){
    STARTER_TAB=STARTER_GROUPS.length?STARTER_GROUPS[0].key:null;
  }
  var grid=$("starter-grid"); grid.textContent="";
  var sub=$("starter-sub");
  if(sub) sub.textContent="宝可梦 9 代御三家 + 洛克王国御三家，共 "+STARTERS.length+" 只 —— 挑一只带走（只能选一只）";
  /* 分系标签页 */
  if(STARTER_GROUPS.length>1){
    var tabs=document.createElement("div"); tabs.className="starter-tabs";
    STARTER_GROUPS.forEach(function(g){
      var b=document.createElement("button");
      b.className="btn-sm"+(g.key===STARTER_TAB?" on":"");
      b.textContent=g.label+" "+g.ids.length;
      b.addEventListener("click",function(){ STARTER_TAB=g.key; renderStarter(); });
      tabs.appendChild(b);
    });
    grid.appendChild(tabs);
  }
  var cur=null;
  STARTER_GROUPS.forEach(function(g){ if(g.key===STARTER_TAB) cur=g; });
  var list=(cur?cur.ids:STARTERS).filter(function(id){ return !!byId(id); });
  list.forEach(function(id){
    var sp=byId(id);
    var card=document.createElement("button");
    card.className="st-card";
    var big=document.createElement("div"); big.className="big"; big.textContent=sp.emoji; setAvatar(big, sp);
    var nm=document.createElement("b"); nm.textContent=sp.name;
    var ty=document.createElement("span");
    ty.className=typeClass(sp);
    ty.textContent=typeText(sp);
    var mv=document.createElement("div"); mv.className="moves";
    mv.textContent="初始技能："+((spPools(sp).p0||sp.moves||[]).slice(0,SKILL_SLOTS).map(function(m){return MOVES[m]?MOVES[m].name:m;}).join(" / "));
    var src=document.createElement("div"); src.className="src";
    src.textContent=(sp.pk?"宝可梦":sp.kz?"洛克王国":"")+" · HP "+sp.hpBase;
    card.appendChild(big); card.appendChild(nm); card.appendChild(ty); card.appendChild(mv); card.appendChild(src);
    card.addEventListener("click",function(){ chooseStarter(id); });
    grid.appendChild(card);
  });
}
function chooseStarter(id){
  var sp=byId(id);
  var pet=newPet(id);
  S.party.push(pet);
  S.lead=pet.uid;
  S.discovered[id]=1;
  jingle(); save();
  $("screen-starter").classList.add("hidden");
  enterWorld();
  toast("🎉 "+sp.name+" 加入了你的队伍，出发！");
}
function enterWorld(){
  $("screen-title").classList.add("hidden");
  $("screen-starter").classList.add("hidden");
  $("screen-world").classList.remove("hidden");
  resizeCanvas(); updateHUD(); save();
}
var map=[], sparkles=[], B=null, TB=null, SPB=null, pendEnc=null;
/* 初始伙伴候选：全部「宝可梦御三家（9 代 ×3）+ 洛克御三家」共 30 只，玩家自己挑一只。
   宝可梦：关东→帕底亚 9 代御三家（27 只）· 洛克：喵喵(草) / 火花(火) / 水蓝蓝(水) */
var POKE_STARTERS={
  grass:["妙蛙种子","菊草叶","木守宫","草苗龟","藤藤蛇","哈力栗","木木枭","敲音猴","新叶喵"],
  fire:["小火龙","火球鼠","火稚鸡","小火焰猴","暖暖猪","火狐狸","火斑喵","炎兔儿","呆火鳄"],
  water:["杰尼龟","小锯鳄","水跃鱼","波加曼","水水獭","呱呱泡蛙","球球海狮","泪眼蜥","润水鸭"]
};
var KZ_STARTERS={ grass:["喵喵"], fire:["火花"], water:["水蓝蓝"] };
var STARTER_GROUPS=[];        /* [{key,label,ids:[]}] 供界面分组展示 */
function buildStarterGroups(){
  var groups=[{key:"grass",label:"🌿 草系"},{key:"fire",label:"🔥 火系"},{key:"water",label:"💧 水系"}];
  function findByName(nm,src){
    for(var i=0;i<SPECIES.length;i++){ if(SPECIES[i].name===nm && (src==="pk"?SPECIES[i].pk:SPECIES[i].kz)) return SPECIES[i]; }
    return null;
  }
  var out=[];
  groups.forEach(function(g){
    var ids=[];
    (POKE_STARTERS[g.key]||[]).forEach(function(nm){
      var sp=findByName(nm,"pk");
      /* 只收「进化链起点」——御三家都是基础形态，但都带 ev 标记，不能拿 ev 判断 */
      if(sp && !sp.varOf && sp.rarity<=1 && !isEvolvedForm(sp)) ids.push(sp.id);
    });
    (KZ_STARTERS[g.key]||[]).forEach(function(nm){
      var sp=findByName(nm,"kz");
      if(sp && !sp.varOf && !isEvolvedForm(sp)) ids.push(sp.id);
    });
    if(ids.length) out.push({key:g.key,label:g.label,ids:ids});
  });
  return out;
}
var STARTER_TAB=null;
function starterPool(n){
  if(!STARTER_GROUPS.length) STARTER_GROUPS=buildStarterGroups();
  var all=[];
  STARTER_GROUPS.forEach(function(g){ all=all.concat(g.ids); });
  /* 兜底：万一御三家数据没匹配上，退回「非进化形态的常见宠」里抽 */
  if(all.length<(n||3)){
    var pool=SPECIES.filter(function(sp){ return !isEvolvedForm(sp) && !sp.varOf && sp.rarity<=1 && (sp.base||0)>0 && hpBaseOf(sp)<=70; });
    pool.slice(0,n||3).forEach(function(sp){ all.push(sp.id); });
  }
  return all;
}
var STARTERS=starterPool(3);
