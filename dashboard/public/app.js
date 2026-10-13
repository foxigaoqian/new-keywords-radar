/* Browser-only workbench. Untrusted research content is always rendered via textContent. */
const $ = id => document.getElementById(id);
const s = {token:"",offset:0,limit:50,query:"",stage:"all",status:"all",intent:"",picked:null,items:[],summary:null};
function node(tag,cls,value){const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value);return x;}
function append(parent,...children){for(const x of children)if(x)parent.append(x);return parent;}
function clear(el){el.replaceChildren();return el;}
function safeURL(link){try{const u=new URL(String(link));return ["https:","http:"].includes(u.protocol)?u.href:""}catch{return""}}
function link(url,label){const u=safeURL(url);if(!u)return node("span","detail-muted",label||"链接无效");
  const a=node("a","",label||u);a.href=u;a.target="_blank";a.rel="noopener noreferrer";return a;}
function alertMsg(message,kind="ok"){const x=$("toast");x.textContent=message;x.style.background=kind==="error"?"#efb6ad":"#76e6cd";x.hidden=false;
  clearTimeout(alertMsg.timeout);alertMsg.timeout=setTimeout(()=>{x.hidden=true},4100);}
function fmtNum(v){return typeof v==="number"&&Number.isFinite(v)?new Intl.NumberFormat("en-US").format(v):"未知";}
function stageLabel(stage){return {"manual-review":"可人工决策","needs-evidence":"需要补证据","hypothesis":"仅为假设"}[stage]||"未知";}
function statusLabel(status){return {"inbox":"待处理","watch":"持续观察","build":"计划开发","reject":"已放弃"}[status]||"待处理";}
function pill(text,klass=""){return node("span","pill "+klass,text)}
async function api(path,options={}){
  const res=await fetch(path,{method:options.method||"GET",headers:{"authorization":"Bearer "+s.token,...(options.body?{"content-type":"application/json"}:{})},body:options.body?JSON.stringify(options.body):undefined,cache:"no-store",credentials:"omit"});
  const data=await res.json().catch(()=>({error:"服务端没有返回有效 JSON"}));
  if(!res.ok){if(res.status===401){lock();}throw Error(data.error||"请求失败 ("+res.status+")")}
  return data;
}
function lock(){s.token="";s.picked=null;$("secret").value="";$("gate").hidden=false;$("workspace").hidden=true;$("logout").hidden=true;
  $("connection").textContent="● 未连接";$("connection").classList.remove("live");closeDetail();}
async function login(ev){ev.preventDefault();$("login-error").textContent="";const token=$("secret").value;
  if(token.length<24){$("login-error").textContent="请输入不少于 24 位的 ADMIN_TOKEN";return}
  s.token=token;
  try{await api("/api/summary");$("secret").value="";$("gate").hidden=true;$("workspace").hidden=false;$("logout").hidden=false;
    $("connection").textContent="● 已连接私有数据";$("connection").classList.add("live");await load();}
  catch(e){s.token="";$("login-error").textContent=e.message}
}
function totalBy(list,pred){return list.filter(pred).reduce((a,r)=>a+Number(r.n||0),0)}
async function load(){
  const query=new URLSearchParams({limit:String(s.limit),offset:String(s.offset),status:s.status,stage:s.stage});
  if(s.query)query.set("q",s.query);if(s.intent)query.set("intent",s.intent);
  try{const [summary,result]=await Promise.all([api("/api/summary"),api("/api/items?"+query)]);
    s.summary=summary;s.items=result.items||[];
    const last=(summary.recent_runs||[])[0];
    const when=last?.started_at?new Date(last.started_at).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"}):"";
    let counts={};try{counts=JSON.parse(last?.source_counts_json||"{}")}catch{}
    const breakdown=("HN "+(counts.hacker_news??"—")+" / Stack Exchange "+(counts.stackexchange??"—"));
    $("last-scan").textContent=last?("上次采集："+when+" · "+last.status+" · "+last.total_matches+" 条证据 / "+last.total_topics+" 个主题 · "+breakdown):"公开需求采集：等待首次运行";
    const stats=summary.stages||[];
    $("stat-total").textContent=fmtNum(totalBy(stats,()=>true));
    $("stat-ready").textContent=fmtNum(totalBy(stats,r=>r.stage==="manual-review"));
    $("stat-needs").textContent=fmtNum(totalBy(stats,r=>r.stage==="needs-evidence"));
    $("stat-build").textContent=fmtNum(totalBy(stats,r=>r.review_status==="build"));
    $("list-count").textContent="· "+fmtNum(result.count||0);
    $("pager-label").textContent=result.count?fmtNum(s.offset+1)+"–"+fmtNum(Math.min(s.offset+s.items.length,result.count))+" / "+fmtNum(result.count):"没有匹配的关键词";
    $("prev").disabled=s.offset===0;$("next").disabled=s.offset+s.items.length>=result.count;
    renderItems();renderOverlaps();
    $("active-intent").hidden=!s.intent;
    if(s.intent){const x=clear($("active-intent"));append(x,node("span","","筛选疑似重复意图："+s.intent.replaceAll("|"," · ")));
      const b=node("button","text-btn","清除");b.type="button";b.addEventListener("click",()=>{s.intent="";s.offset=0;load()});append(x,b);}
  }catch(e){alertMsg(e.message,"error")}
}
function renderItems(){
  const list=clear($("items"));
  if(!s.items.length){const box=node("div","empty");append(box,node("strong","","当前没有符合条件的机会"),
    node("div","","先从 research / journeys 生成 opportunities.json，再点击右上角「导入机会 JSON」。"));append(list,box);return;}
  for(const r of s.items){
    const button=node("button","item");button.type="button";button.addEventListener("click",()=>showDetail(r));
    const a=node("span");append(a,node("span","name",r.keyword),node("span","subline",[
      (r.origins||[]).slice(0,2).join(" · "),(r.personas||[]).slice(0,1).join("")].filter(Boolean).join(" / ")||"未注明来源"));
    const stage=node("span");append(stage,pill(stageLabel(r.stage),r.stage==="manual-review"?"ready":r.stage==="needs-evidence"?"needs":"hypo"));
    const volume=node("span","",fmtNum(r.monthly_searches));
    const score=node("span","score",String(r.rubric_score??0));append(score,node("small","", " / 100"));
    const choice=node("span");append(choice,pill(statusLabel(r.review_status),r.review_status==="build"?"build":r.review_status==="reject"?"reject":""));
    append(button,a,stage,volume,score,choice,node("span","arrow","→"));
    append(list,button);
  }
}
function renderOverlaps(){const box=clear($("overlaps"));const overlaps=s.summary?.possible_overlaps||[];
  if(!overlaps.length){append(box,node("span","detail-muted","目前没有检测到签名一致的重复意图候选。"));return;}
  for(const group of overlaps){const b=node("button","overlap",group.intent_signature.replaceAll("|"," · ")+"  · "+group.n+" 个");b.type="button";
    b.addEventListener("click",()=>{s.intent=group.intent_signature;s.offset=0;load();$("items").scrollIntoView({behavior:"smooth",block:"center"})});append(box,b);}
}
function detailSection(parent,heading){const div=node("section","detail-section");append(div,node("h3","",heading));append(parent,div);return div;}
function listTags(parent,arr){const wrap=node("div","mini-list");for(const v of (Array.isArray(arr)?arr:[]).slice(0,14))append(wrap,node("span","",v));
  append(parent,wrap);return wrap;}
function showDetail(r){
  s.picked=r;const main=clear($("detail-content"));
  append(main,node("h2","detail-title",r.keyword));
  const top=node("div","detail-topline");append(top,pill(stageLabel(r.stage),r.stage==="manual-review"?"ready":r.stage==="needs-evidence"?"needs":"hypo"),
    pill(statusLabel(r.review_status),r.review_status==="build"?"build":r.review_status==="reject"?"reject":""));
  append(main,top);
  const metrics=node("div","detail-metrics");
  for(const [label,value] of [["研究分数",r.rubric_score??"—"],["月搜索量",fmtNum(r.monthly_searches)],["独立来源",(r.independent_evidence_sites||[]).length]]){
    const col=node("div");append(col,node("small","",label),node("strong","",value));append(metrics,col);}
  append(main,metrics);
  if(r.monthly_searches_source)append(main,node("p","detail-muted","搜索量来源："+r.monthly_searches_source));
  const context=detailSection(main,"人群与场景");
  for(const [label,arr] of [["用户",r.personas],["场景",r.scenes],["动作",r.actions],["遇到的麻烦",r.pains]]){
    if(Array.isArray(arr)&&arr.length)append(context,node("p","context-line",label+"："+arr.join("；")));}
  if(Array.isArray(r.constraints)&&r.constraints.length){append(context,node("p","detail-muted","限制条件"));listTags(context,r.constraints)}
  const ev=detailSection(main,"真实讨论证据（不等于搜索需求）");
  if(!r.evidence?.length)append(ev,node("p","detail-muted","尚无用户评论或论坛证据。"));
  for(const source of (r.evidence||[]).slice(0,12)){
    const box=node("div","quote");append(box,node("p","",source.note||"该来源未提供摘录"),link(source.url,"查看原始讨论 ↗"));
    if(source.published_at)append(box,node("small","", "发表："+source.published_at));
    if(source.attribution)append(box,node("small","",source.attribution));
    append(ev,box);}
  const serp=detailSection(main,"Google 前十自然结果（原始快照）");
  const raw=r.serp_snapshot;
  if(!raw?.organic?.length)append(serp,node("p","detail-muted","还没有 SERP 快照。未验证竞争难度。"));
  else{
    append(serp,node("p","detail-muted","抓取地区："+(raw.location_code||"未知")+" / "+(raw.language_code||"未知")+
      "。需要人工判断这些结果是否真正满足用户意图。"));
    for(const hit of raw.organic.slice(0,10)){
      const item=node("div","serp-item");const body=node("div");
      append(body,link(hit.url,hit.title||hit.domain||"查看排名结果"),node("small","",hit.domain||""));
      append(item,node("b","",hit.rank_group||"—"),body);append(serp,item);}
  }
  const checklist=detailSection(main,"下一步研究清单");
  const screen=r.screening||{};
  if(screen.next_step)append(checklist,node("p","detail-muted","建议阶段："+screen.next_step));
  if(Array.isArray(screen.blockers)&&screen.blockers.length){
    for(const blocker of screen.blockers.slice(0,10))append(checklist,node("p","context-line","□ "+blocker));
  }else append(checklist,node("p","detail-muted","目前没有自动列出的阻碍项；仍需人工判断。"));
  const flags=detailSection(main,"研究备注");
  append(flags,node("p","detail-muted","该词目前："+stageLabel(r.stage)+"。可能相同意图签名："+(r.intent_signature?.replaceAll("|"," · ")||"无")+
    "。自动聚类不能代替 Google SERP 人工判断。"));
  const form=detailSection(main,"我的处理决定");
  const statusBox=node("div","field");append(statusBox,node("label","","处理状态"));
  const sel=node("select");for(const option of ["inbox","watch","build","reject"]){const opt=node("option","",statusLabel(option));opt.value=option;sel.append(opt)}
  sel.value=r.review_status||"inbox";append(statusBox,sel);
  const siteBox=node("div","field");append(siteBox,node("label","","优先放到哪个网站 / 项目"));
  const site=node("input");site.value=r.target_site||r.existing_site||"";site.placeholder="例如 imagekb.net";site.maxLength=200;append(siteBox,site);
  const noteBox=node("div","field");append(noteBox,node("label","","为什么观察、开发或放弃？"));
  const note=node("textarea");note.value=r.decision_note||"";note.maxLength=2000;note.placeholder="记录 SERP 判断、付费意愿、功能成本、下一步动作…";append(noteBox,note);
  const save=node("button","primary","保存决策");save.type="button";save.addEventListener("click",async()=>{
    save.disabled=true;try{await api("/api/items/"+r.id+"/decision",{method:"POST",body:{review_status:sel.value,target_site:site.value,decision_note:note.value}});
      alertMsg("已保存决定和审计记录");closeDetail();await load();}catch(e){alertMsg(e.message,"error")}finally{save.disabled=false}});
  append(form,statusBox,siteBox,noteBox,save);
  $("drawer").hidden=false;document.body.style.overflow="hidden";$("close-drawer").focus();
}
function closeDetail(){$("drawer").hidden=true;document.body.style.overflow="";s.picked=null}
async function importFile(e){
  const file=e.target.files?.[0];e.target.value="";if(!file)return;
  if(file.size>9000000){alertMsg("文件过大，请分批导入","error");return}
  try{const data=JSON.parse(await file.text());if(!Array.isArray(data.opportunities)||!data.opportunities.length)throw Error("请选择包含 opportunities[] 的 JSON 报告");
    let imported=0;
    for(let i=0;i<data.opportunities.length;i+=40){const chunk=data.opportunities.slice(i,i+40);
      const out=await api("/api/import",{method:"POST",body:{opportunities:chunk}});imported+=out.imported;}
    alertMsg("成功导入 "+imported+" 个关键词，原有人工决定已保留");s.offset=0;await load();}
  catch(err){alertMsg("导入失败："+err.message,"error")}
}
async function exportData(){
  try{const result=await api("/api/export");const blob=new Blob([JSON.stringify(result,null,2)],{type:"application/json"});
    const uri=URL.createObjectURL(blob),a=document.createElement("a");a.href=uri;a.download="seo-opportunities-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(uri),1000);alertMsg("已下载研究决策备份")}
  catch(err){alertMsg(err.message,"error")}
}
$("login-form").addEventListener("submit",login);$("logout").addEventListener("click",lock);
$("close-drawer").addEventListener("click",closeDetail);$("scrim").addEventListener("click",closeDetail);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("drawer").hidden)closeDetail()});
$("file-input").addEventListener("change",importFile);$("export-btn").addEventListener("click",exportData);
$("scan-now").addEventListener("click",async()=>{
  const button=$("scan-now");
  button.disabled=true;button.textContent="正在采集公开评论…";
  try{
    const data=await api("/api/collect",{method:"POST"});
    alertMsg("已检查 "+data.topics+" 个主题，匹配 "+data.matched+" 条证据（HN "+(data.sources?.hacker_news??0)+" / Stack Exchange "+(data.sources?.stackexchange??0)+"）");
    await load();
  }catch(error){alertMsg(error.message,"error")}
  finally{button.disabled=false;button.textContent="↻ 立即采集"}
});
$("reload").addEventListener("click",load);
let searchTimer;$("search").addEventListener("input",e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{s.query=e.target.value.trim();s.offset=0;load()},240)});
$("filter-status").addEventListener("change",e=>{s.status=e.target.value;s.offset=0;load()});
$("filter-stage").addEventListener("change",e=>{s.stage=e.target.value;s.offset=0;load()});
$("clear-filters").addEventListener("click",()=>{s.query="";s.status="all";s.stage="all";s.intent="";s.offset=0;
  $("search").value="";$("filter-stage").value="all";$("filter-status").value="all";load()});
$("prev").addEventListener("click",()=>{s.offset=Math.max(0,s.offset-s.limit);load()});
$("next").addEventListener("click",()=>{s.offset+=s.limit;load()});
