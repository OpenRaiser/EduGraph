import {createModel,findNodes,neighborhood,degree,orderChapters,statusLabel,SUBJECTS,STAGES} from './model.mjs';
import {NetworkView} from './network.mjs';
import {resolveCover} from './covers.mjs';
import {renderHero} from './hero.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');
const state={key:null,tab:'keypoints',view:'network',browse:'results',direction:'both',depth:2,resultLimit:60,request:0};
let model,manifest,download,currentResources=null,standardsPromise=null;
let coverCatalog=null,coverPromise=null;
let heroLoaded=false;
const resourceCache=new Map();
let known=new Set();
try{const saved=JSON.parse(localStorage.getItem('edugraph.known.v1')||'[]');if(Array.isArray(saved))known=new Set(saved.filter(x=>typeof x==='string'));}catch{}
const network=new NetworkView($('#network'),key=>navigate(key),$('#graph-tooltip'));
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,2600);}
async function fetchJson(url){const r=await fetch(new URL(url,import.meta.url));if(!r.ok)throw new Error(`无法读取 ${url} (${r.status})`);return r.json();}
function resourceScope(n){return`${n.subject}/${n.stage}`;}
async function resources(n){const scope=resourceScope(n);if(!resourceCache.has(scope))resourceCache.set(scope,fetchJson(`data/resources/${scope}.json`).catch(e=>{resourceCache.delete(scope);throw e;}));return resourceCache.get(scope);}
function entry(n=model.byKey.get(state.key)){return currentResources?.concepts[n?.id]??{keypoints:[],exercises:[],standards:[],teaches:[]};}
function nodeLink(key,name,cls=''){return`<button class="${cls}" data-key="${esc(key)}">${esc(name)}</button>`;}
function reviewTags(row){return`<div class="resource-provenance"><span>${esc(statusLabel(row.review_status))}</span>${row.authored_by==='llm-draft'?'<span>模型生成</span>':''}</div>`;}
function loadCovers(){
  if(!coverPromise)coverPromise=fetchJson('assets/covers/catalog.json').then(data=>{coverCatalog=data;if(state.tab==='textbooks')renderDetail();if(state.view==='textbooks')renderCenter();}).catch(()=>{});
}
function bookCover(book){
  const cover=resolveCover(book,coverCatalog),label=`${book.publisher} · ${SUBJECTS[book.subject]??book.subject} · ${book.volume_label??book.volume}`;
  const fallback=`<span class="cover-fallback" aria-hidden="true"><i>EDUGRAPH</i><strong>${esc(SUBJECTS[book.subject]??'教材')}</strong><span>${esc(book.volume_label??book.volume)}</span></span>`;
  if(!cover)return`<span class="cover-wrap"><span class="cover-link" role="img" aria-label="${esc(label)}，暂无已匹配封面">${fallback}</span><span class="cover-credit">${coverCatalog?'册次信息':'教材'}</span></span>`;
  const title=`${label}。同出版社、学科、系列与册次的参考封面；具体印次未核验。点击查看来源。`;
  return`<span class="cover-wrap"><a class="cover-link" href="${esc(cover.source)}" target="_blank" rel="noopener noreferrer" title="${esc(title)}">${fallback}<img class="textbook-cover" src="${esc(cover.asset)}" alt="${esc(label)}教材参考封面" width="58" height="80" loading="lazy" decoding="async"></a><a class="cover-credit" href="${esc(cover.source)}" target="_blank" rel="noopener noreferrer" title="${esc(title)}">同册参考 ↗</a></span>`;
}
function saveKnown(){try{localStorage.setItem('edugraph.known.v1',JSON.stringify([...known]));}catch{toast('浏览器未允许保存，标记仅在本次访问有效。');}}
function toggleKnown(key){if(known.has(key))known.delete(key);else known.add(key);saveKnown();renderHeading();if($('#path-dialog').open)renderPath();}
function navigate(key){if(!model.byKey.has(key)){toast('未找到这个知识点');return;}location.hash=`/concept/${encodeURIComponent(key)}`;if(state.key===key){$('#about').hidden=true;$('#explorer').hidden=false;requestAnimationFrame(renderCenter);}}
function pathFromHash(){const match=location.hash.match(/^#\/concept\/(.+)$/);if(!match)return null;try{return decodeURIComponent(match[1]);}catch{return null;}}
async function route(){
  const about=location.hash==='#/about';$('#about').hidden=!about;$('#explorer').hidden=about;$('#nav-about').classList.toggle('active',about);$('#nav-explore').classList.toggle('active',!about);
  if(about){document.title='EduGraph — 关于数据集';loadHeroResources();return;}
  const requested=pathFromHash();
  if(requested&&!model.byKey.has(requested))toast('这个链接中的知识点不存在，已返回默认知识点。');
  const key=model.byKey.has(requested)?requested:(state.key??manifest.defaultKey);
  if(state.key!==key||!currentResources)await select(key);else requestAnimationFrame(renderCenter);
}
async function select(key){
  state.key=key;currentResources=null;const token=++state.request;
  const node=model.byKey.get(key);document.title=`${node.name} · EduGraph Explorer`;
  $('#graph-title').textContent=node.name;renderHeading();renderResults();renderCenter();
  $('#detail-content').innerHTML='<div class="loading-inline">正在加载关联资源…</div>';
  try{const loaded=await resources(node);if(token!==state.request)return;currentResources=loaded;renderHeading();renderTabCounts();await renderDetail();if(state.view==='textbooks')renderTextbookView();}
  catch(e){if(token!==state.request)return;$('#detail-content').innerHTML=`<div class="empty-state"><strong>资源暂时无法加载</strong>${esc(e.message)}<br><button id="retry-resource" class="retry-button">重新加载</button></div>`;$('#retry-resource').onclick=()=>select(key);}
}
function renderHeading(){
  const n=model.byKey.get(state.key);if(!n)return;
  const pre=model.graph.prerequisites.get(n.key)?.length??0,post=model.graph.successors.get(n.key)?.length??0;
  const breadcrumbs=[];let k=model.graph.parent.get(n.key);while(k&&breadcrumbs.length<8){const p=model.byKey.get(k);if(!p)break;breadcrumbs.unshift(nodeLink(k,p.name));k=model.graph.parent.get(k);}
  const r=entry(n),books=currentResources?new Set(r.teaches.map(t=>currentResources.chapters.find(c=>c.chapter_id===t.from)?.textbook_id)).size:'—';
  $('#detail-heading').innerHTML=`<div class="meta-top"><span class="small-tag">${n.node_kind==='topic'?'TOPIC':'CONCEPT'} / ${esc(SUBJECTS[n.subject])}</span><span>${esc(STAGES[n.stage])}</span></div><h2>${esc(n.name)}</h2><div class="breadcrumb">${breadcrumbs.join(' <span>›</span> ')||esc(SUBJECTS[n.subject])}</div><div class="node-tags"><span class="tag">${esc(STAGES[n.stage])}</span>${n.grade_band?`<span class="tag">${esc(n.grade_band)} 年级</span>`:''}<span class="tag">${esc(statusLabel(n.review_status))}</span>${n.node_kind!=='topic'?`<button id="mark-known" class="known-button ${known.has(n.key)?'active':''}">${known.has(n.key)?'✓ 已掌握':'＋ 已掌握'}</button>`:''}</div><div class="node-counts"><div><strong>${num(pre)}</strong><span>直接前置</span></div><div><strong>${num(post)}</strong><span>直接后继</span></div><div><strong>${books==='—'?books:num(books)}</strong><span>关联教材册次</span></div></div>`;
  if($('#mark-known'))$('#mark-known').onclick=()=>toggleKnown(n.key);
  $('#open-path').disabled=n.node_kind==='topic';$('#open-path').title=n.node_kind==='topic'?'请先选择一个具体知识点':'生成先修学习路径';
}
function renderTabCounts(){
  const r=entry();const counts={keypoints:r.keypoints.length,exercises:r.exercises.length,textbooks:new Set(r.teaches.map(t=>currentResources.chapters.find(c=>c.chapter_id===t.from)?.textbook_id)).size,standards:r.standards.length};
  for(const b of $$('#detail-tabs button')){const names={keypoints:'讲解',exercises:'例题',textbooks:'教材',standards:'课标'};b.innerHTML=`${names[b.dataset.tab]}<span class="tab-count">${counts[b.dataset.tab]}</span>`;}
}
function renderResults(){
  if(!model)return;$('#result-list').classList.toggle('tree-mode',state.browse==='tree');
  if(state.browse==='tree'){renderTree();return;}
  const query=$('#search').value;const results=findNodes(model,query,{subject:$('#subject').value,stage:$('#stage').value,kind:query.trim()?'':'knowledge_point'});
  $('#result-count').textContent=num(results.length);
  let list=results;
  if(!query.trim()){
    const focus=model.byKey.get(state.key),near=new Set(neighborhood(model,state.key,{depth:2,limit:200}).nodes.map(n=>n.key));
    const rank=n=>n.key===state.key?0:near.has(n.key)?1:n.subject===focus.subject&&n.stage===focus.stage?2:n.subject===focus.subject?3:4;
    list=[...results].sort((a,b)=>rank(a)-rank(b)||degree(model,b.key)-degree(model,a.key));
  }
  $('#result-list').innerHTML=list.slice(0,state.resultLimit).map(n=>`<button class="result-item ${n.key===state.key?'active':''}" data-key="${esc(n.key)}"><span class="result-arrow">${n.key===state.key?'↗':''}</span><h3>${esc(n.name)}</h3><div class="result-path">${esc((n.level_path??[]).slice(0,-1).join(' › '))}</div><div class="result-meta"><span class="mini-pill">${esc(SUBJECTS[n.subject])}</span><span class="mini-pill">${esc(STAGES[n.stage])}</span>${n.node_kind==='topic'?'<span class="mini-pill">Topic</span>':''}<span class="connection-count">${degree(model,n.key)} 个关联</span></div></button>`).join('')+(results.length>state.resultLimit?`<button id="more-results" class="show-more">显示更多（已显示 ${state.resultLimit} / ${num(results.length)}）</button>`:'');
  if(!list.length)$('#result-list').innerHTML='<div class="empty-state"><strong>没有匹配结果</strong>试试更短的关键词，或切换学科和学段。</div>';
  if($('#more-results'))$('#more-results').onclick=()=>{state.resultLimit+=60;renderResults();};
}
function renderTree(){
  const subject=$('#subject').value||model.byKey.get(state.key).subject,stage=$('#stage').value||model.byKey.get(state.key).stage;
  const scope=model.nodes.filter(n=>n.subject===subject&&n.stage===stage);const ids=new Set(scope.map(n=>n.key));
  const roots=scope.filter(n=>!ids.has(model.graph.parent.get(n.key)));
  const ancestors=new Set([state.key]);let parent=model.graph.parent.get(state.key);while(parent){ancestors.add(parent);parent=model.graph.parent.get(parent);}
  const tree=(n,visited=new Set())=>{if(visited.has(n.key))return'';const seen=new Set([...visited,n.key]);const children=(model.graph.children.get(n.key)??[]).filter(k=>ids.has(k)).map(k=>model.byKey.get(k));if(!children.length)return nodeLink(n.key,n.name,`tree-leaf ${n.key===state.key?'active':''}`);return`<details class="tree-node" ${ancestors.has(n.key)?'open':''}><summary>${esc(n.name)} <small>(${children.length})</small></summary><div class="tree-children">${nodeLink(n.key,'查看主题关系 ↗','tree-explore')}${children.map(c=>tree(c,seen)).join('')}</div></details>`;};
  $('#result-count').textContent=num(scope.length);$('#result-list').innerHTML=`<p class="query-note">${esc(SUBJECTS[subject])} · ${esc(STAGES[stage])} · 按 REFINES 从属关系展开</p>${roots.map(n=>tree(n)).join('')}`;
}
function renderCenter(){
  if(!model||$('#explorer').hidden)return;
  const graph=state.view==='network';$('#network-stage').hidden=!graph;$('#textbook-stage').hidden=graph;$('#graph-controls').hidden=!graph;$('#graph-legend').hidden=!graph;
  if(!graph){renderTextbookView();return;}
  const data=neighborhood(model,state.key,{depth:state.depth,direction:state.direction,limit:$('#network-stage').clientWidth<500?16:36});
  requestAnimationFrame(()=>{if(state.view==='network'&&!$('#explorer').hidden){network.render(data);$('#graph-status').textContent=`${data.nodes.length} 个节点 · ${data.edges.length} 条关系${data.truncated?` · 当前范围共 ${data.total} 个节点，优先显示近邻`:''}`;}});
}
function setView(view){state.view=view;for(const b of $$('.view-switch button')){const active=b.id===`view-${view}`;b.classList.toggle('active',active);b.setAttribute('aria-selected',active);}renderCenter();}
async function renderDetail(){
  const n=model.byKey.get(state.key),r=entry(),token=state.request;
  for(const b of $$('#detail-tabs button')){const active=b.dataset.tab===state.tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',active);}
  if(!currentResources)return;
  let html='';
  if(n.node_kind==='topic'){
    const kids=(model.graph.children.get(n.key)??[]).map(k=>model.byKey.get(k));
    html=`<div class="textbook-note">这是用于组织知识的 Topic。选择下属 Concept，可以查看对应讲解、例题和教材。</div><div class="section-mini">下属知识与主题 · ${kids.length}</div>${kids.map(c=>nodeLink(c.key,c.name,'related-link')).join('')}`;
  }else if(state.tab==='keypoints'){
    const kind={definition:'定义',property:'性质',formula:'公式',method:'方法',pitfall:'易错点',example:'示例'};
    html=r.keypoints.map(k=>`<article class="resource-card"><div class="card-label"><i></i>${esc(kind[k.kind]??k.kind)}</div><h3>${esc(k.title)}</h3><p>${esc(k.body)}</p>${reviewTags(k)}</article>`).join('');
    if(!r.keypoints.length)html='<div class="empty-state">这个知识点尚无公开讲解记录。</div>';
    const direct=model.graph.successors.get(n.key)??[];
    if(direct.length)html+=`<div class="section-mini">以此为基础，可以继续学习</div>${direct.slice(0,8).map(e=>nodeLink(e.to,model.byKey.get(e.to)?.name??e.to,'related-link')).join('')}`;
  }else if(state.tab==='exercises'){
    const kinds={single_choice:'单选题',multi_choice:'多选题',fill_blank:'填空题',short_answer:'简答题',calculation:'计算题',proof:'证明题',open_ended:'开放题'};
    html=r.exercises.map((e,i)=>`<article class="resource-card"><div class="card-label"><i></i>例题 ${String(i+1).padStart(2,'0')} · ${esc(kinds[e.question_kind]??e.question_kind)}</div><h3>${esc(e.stem)}</h3>${(e.choices??[]).map(c=>`<div class="exercise-choice">${esc(typeof c==='string'?c:`${c.label}. ${c.text}`)}</div>`).join('')}<details class="exercise-solution"><summary>查看答案与解析</summary><p><strong>答案：</strong>${esc(typeof e.answer==='object'?JSON.stringify(e.answer):e.answer)}</p><p>${esc(e.explanation)}</p></details>${reviewTags(e)}<div class="source-id">${esc(e.key)}</div></article>`).join('')||'<div class="empty-state">这个知识点尚无公开例题。</div>';
  }else if(state.tab==='textbooks'){
    loadCovers();
    const books=booksForConcept();
    html='<div class="textbook-note">展示公开包中的册次、章节顺位与关联角色。顺位标签不等同于原书章节名称。</div>';
    html+=books.map(({book,mappings})=>`<article class="resource-card textbook-mini"><div class="book-overview">${bookCover(book)}<div class="book-meta"><h3 class="publisher-name">${esc(book.publisher)}</h3><p>${esc(book.volume_label||`${book.grade} ${book.volume}`)}</p><p class="book-edition">目录版本 ${esc(book.edition)} · ${esc(SUBJECTS[book.subject])}</p></div></div>${mappings.map(({teach,chapter})=>`<div class="book-position"><span>单元顺位 ${esc(chapter.order)}</span><small>${roleName(teach.role)} · ${esc(statusLabel(teach.review_status))}</small></div>`).join('')}<button class="button" data-book="${esc(book.textbook_id)}">查看这一册的编排 →</button></article>`).join('');
    if(!books.length)html+='<div class="empty-state">这个知识点尚无公开教材映射。</div>';
  }else if(state.tab==='standards'){
    $('#detail-content').innerHTML='<div class="loading-inline">正在读取课标条目…</div>';
    try{if(!standardsPromise)standardsPromise=fetchJson('data/standards.json').then(rows=>new Map(rows.map(s=>[s.id,s]))).catch(e=>{standardsPromise=null;throw e;});const all=await standardsPromise;if(token!==state.request||state.tab!=='standards')return;
      html=r.standards.map(link=>{const s=all.get(link.from);if(!s)return'';return`<article class="resource-card standard-card"><div class="card-label">${s.standard_family==='gaokao-outline'?'考试大纲':'课程标准'} · COVERS</div><div class="standard-meta">${esc(s.education_phase||'')} ${esc(s.school_stage||STAGES[s.applicable_stage]||'')} ${s.grade_band?'· '+esc(s.grade_band)+' 年级':''}</div><p>${esc(s.text)}</p>${reviewTags(link)}<div class="source-id">${esc(s.id)}</div></article>`;}).join('')||'<div class="empty-state">这个知识点尚无公开课标关联。</div>';
    }catch(e){html=`<div class="empty-state">${esc(e.message)}<br><button id="retry-standard" class="retry-button">重试</button></div>`;}
  }
  if(token!==state.request)return;$('#detail-content').innerHTML=html;$('#detail-content').scrollTop=0;
  if($('#retry-standard'))$('#retry-standard').onclick=renderDetail;
}
function roleName(role){return({primary:'主讲',review:'复习',mentioned:'提及'})[role]??role;}
function booksForConcept(){
  if(!currentResources)return[];const chapterMap=new Map(currentResources.chapters.map(c=>[c.chapter_id,c])),bookMap=new Map(currentResources.textbooks.map(b=>[b.textbook_id,b]));const groups=new Map();
  for(const t of entry().teaches){const chapter=chapterMap.get(t.from);if(!chapter)continue;const book=bookMap.get(chapter.textbook_id);if(!book)continue;if(!groups.has(book.textbook_id))groups.set(book.textbook_id,{book,mappings:[]});groups.get(book.textbook_id).mappings.push({teach:t,chapter});}
  const priority=b=>b.publisher.includes('人民教育')?0:b.publisher.includes('北京师范')?1:2;
  return[...groups.values()].sort((a,b)=>priority(a.book)-priority(b.book)||a.book.publisher.localeCompare(b.book.publisher,'zh')||Number(a.book.grade?.replace(/\D/g,''))-Number(b.book.grade?.replace(/\D/g,''))||String(a.book.volume).localeCompare(String(b.book.volume)));
}
function renderTextbookView(){
  if(!currentResources){$('#textbook-stage').innerHTML='<div class="loading-inline">正在加载教材视图…</div>';return;}
  loadCovers();
  const books=booksForConcept(),publishers=new Map();for(const b of books){if(!publishers.has(b.book.publisher))publishers.set(b.book.publisher,[]);publishers.get(b.book.publisher).push(b);}
  let html='<div class="textbook-note">同一个 Concept，在不同教材中有不同的教学位置。轨道按本册章节顺位排列，蓝色标记当前知识点。<strong>箭头表示教材编排顺序。</strong><br>参考封面来自 <a href="https://github.com/TapXWorld/ChinaTextbook" target="_blank" rel="noopener noreferrer">ChinaTextbook</a>，按出版社、系列与册次匹配；不同印次的封面可能不同。</div>';
  for(const [publisher,group]of publishers){html+=`<section class="publisher-group"><div class="publisher-header"><span class="book-symbol">书</span><div><h3>${esc(publisher)}</h3><small>${group.length} 册关联教材 · 教材视图</small></div></div>`;
    for(const{book}of group){const chapters=orderChapters(currentResources.chapters,book.textbook_id);html+=`<div class="volume-row" data-volume="${esc(book.textbook_id)}"><header>${bookCover(book)}<div class="volume-heading"><strong>${esc(book.volume_label||book.volume)}</strong><small>目录版本 ${esc(book.edition)} · ${esc(statusLabel(book.review_status))}</small></div></header><div class="catalog-track">`;
      html+=chapters.map((c,i)=>{const concepts=currentResources.chapterConcepts[c.chapter_id]??[];const isCurrent=concepts.some(x=>model.nodes[x.id]?.key===state.key);return`${i?'<span class="track-arrow" aria-hidden="true">→</span>':''}<div class="chapter-stop ${isCurrent?'current':''}"><div class="unit-label">${c.level===1?'单元':'章节'}顺位 ${esc(c.orderPath.join('.'))}</div>${concepts.length?concepts.map(x=>{const n=model.nodes[x.id];return`<button data-key="${esc(n.key)}" class="${n.key===state.key?'current':''}" title="${esc(n.name)} · ${roleName(x.role)}">${esc(n.name)}${x.role==='review'?' · 复习':''}</button>`;}).join(''):'<span class="no-mapping">未关联 Concept</span>'}</div>`;}).join('');html+='</div></div>';}
    html+='</section>';
  }
  if(!books.length)html+='<div class="empty-state"><strong>暂无教材映射</strong>可以从其他知识点探索教材编排。</div>';
  $('#textbook-stage').innerHTML=html;
  for(const track of $$('.catalog-track')){const current=track.querySelector('.current');if(current)track.scrollLeft=Math.max(0,current.offsetLeft-track.offsetLeft-80);}
}
function renderPath(){
  const n=model.byKey.get(state.key);if(!n||n.node_kind==='topic')return;
  $('#path-title').textContent=`学会「${n.name}」`;
  $('#path-description').textContent='收集目标的前置知识，按先修依赖排序。把已经掌握的知识标记出来，路径会随之更新。';
  $('#known-summary').textContent=`已标记 ${known.size} 个知识点为已掌握 · 仅保存在此浏览器`;
  try{const plan=model.graph.learningPath([n.key],[...known],{maxLength:500});
    $('#path-content').innerHTML=plan.sequence.map((step,i)=>{const node=model.byKey.get(step.key);const why=step.reason==='目标知识点'?'目标知识点':step.reason.replace(/(\S+) 的前置/,(_,key)=>`${model.byKey.get(key)?.name??key} 的前置`);return`<div class="path-step"><span class="step-number">${i+1}</span><div>${nodeLink(node.key,node.name,'step-name')}<small>${esc(STAGES[node.stage])} · ${esc(why)}</small></div><button class="known-step" data-known="${esc(node.key)}">标记已掌握</button></div>`;}).join('')||'<div class="empty-state"><strong>目标已标记为掌握</strong>可以选择下一个目标，或清空标记重新查看。</div>';
    if(plan.total_length>plan.sequence.length)$('#path-content').insertAdjacentHTML('beforeend',`<p class="query-note">已显示 ${plan.sequence.length} / ${plan.total_length} 项。</p>`);
  }catch(e){$('#path-content').innerHTML=`<div class="empty-state">${esc(e.message)}</div>`;}
}
function populateAbout(){
  const c=manifest.counts;$('#sidebar-stat').textContent=`${num(c.knowledge_points)} concepts · 10 subjects`;
  $('#hero-stats').innerHTML=[[c.knowledge_points,'CONCEPTS'],[new Set(manifest.scopes.map(s=>s.subject)).size,'SUBJECTS'],[new Set(manifest.scopes.map(s=>s.stage)).size,'LEARNING STAGES']].map(([value,label])=>`<div><strong>${num(value)}</strong><span>${label}</span></div>`).join('');
  renderHero($('#hero-network'),model);
  $('#about-stats').innerHTML=[[c.knowledge_points,'Concepts / 知识点'],[c.topic_nodes,'Topics / 主题'],[c.prerequisite_edges,'Prerequisites / 先修'],[c.keypoints,'KeyPoints / 讲解'],[c.exercises,'Exercises / 习题'],[c.textbooks,'Volumes / 教材册次']].map(([value,label])=>`<div><strong>${num(value)}</strong><span>${label}</span></div>`).join('');
  for(const id of ['#download-about','#download-card','#download-top']){$(id).href=download.file;$(id).setAttribute('download','');}
  $('#download-description').textContent=`v${manifest.version} · JSONL + manifest · ${(download.bytes/1048576).toFixed(1)} MiB · tar.gz`;
  $('#checksum-link').href=download.file+'.sha256';
}
async function loadHeroResources(){
  if(heroLoaded)return;
  try{const data=await resources(model.byKey.get(manifest.defaultKey));renderHero($('#hero-network'),model,data);heroLoaded=true;}catch{/* Keep the graph and links usable if resource loading needs a retry. */}
}
function bind(){
  document.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement&&event.target.classList.contains('textbook-cover')){event.target.hidden=true;event.target.closest('.cover-wrap')?.classList.add('cover-unavailable');}},true);
  let searchTimer;$('#search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.resultLimit=60;if(state.browse==='tree')setBrowse('results');else renderResults();},120);});
  for(const select of ['#subject','#stage'])$(select).onchange=()=>{state.resultLimit=60;renderResults();};
  $('#browse-results').onclick=()=>setBrowse('results');$('#browse-tree').onclick=()=>setBrowse('tree');
  function setBrowse(mode){state.browse=mode;for(const b of $$('.sidebar-tabs button')){const active=b.id===`browse-${mode}`;b.classList.toggle('active',active);b.setAttribute('aria-selected',active);}renderResults();}
  $('#depth').onchange=()=>{state.depth=Number($('#depth').value);renderCenter();};
  for(const b of $$('[data-direction]'))b.onclick=()=>{state.direction=b.dataset.direction;for(const x of $$('[data-direction]')){const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',active);}renderCenter();};
  $('#view-network').onclick=()=>setView('network');$('#view-textbooks').onclick=()=>setView('textbooks');
  for(const b of $$('#detail-tabs button'))b.onclick=()=>{state.tab=b.dataset.tab;renderDetail();};
  document.addEventListener('click',e=>{
    const heroLink=e.target.closest('[data-hero-tab]');if(heroLink){e.preventDefault();state.tab=heroLink.dataset.heroTab;const same=state.key===heroLink.dataset.key;navigate(heroLink.dataset.key);if(same)renderDetail();return;}
    const link=e.target.closest('[data-key]');if(link){if($('#path-dialog').open)$('#path-dialog').close();navigate(link.dataset.key);return;}
    const know=e.target.closest('[data-known]');if(know){toggleKnown(know.dataset.known);return;}
    const book=e.target.closest('[data-book]');if(book){setView('textbooks');const row=$$('[data-volume]').find(el=>el.dataset.volume===book.dataset.book);row?.scrollIntoView({behavior:'smooth',block:'nearest'});}
  });
  $('#zoom-in').onclick=()=>network.scale(1.2);$('#zoom-out').onclick=()=>network.scale(1/1.2);$('#zoom-fit').onclick=()=>network.fit();
  $('#open-path').onclick=()=>{renderPath();$('#path-dialog').showModal();};$('#close-path').onclick=()=>$('#path-dialog').close();
  $('#clear-known').onclick=()=>{known.clear();saveKnown();renderHeading();renderPath();};
  $('#path-dialog').addEventListener('click',e=>{if(e.target===$('#path-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  $('#copy-link').onclick=async()=>{const url=new URL(location.href);url.hash=`/concept/${encodeURIComponent(state.key)}`;try{await navigator.clipboard.writeText(url.href);toast('知识点链接已复制');}catch{toast('请复制地址栏中的知识点链接');location.hash=url.hash;}};
  $('#export-node').onclick=()=>{
    if(!currentResources){toast('关联资源仍在加载，请稍后重试');return;}
    const data={release:manifest.version,concept:model.byKey.get(state.key),resources:entry(),relations:model.edges.filter(e=>model.nodes[e.from].key===state.key||model.nodes[e.to].key===state.key).map(e=>({...e,from:model.nodes[e.from].key,to:model.nodes[e.to].key}))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`edugraph-${model.byKey.get(state.key).name}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('#path-dialog').open){e.preventDefault();$('#search').focus();}});
  window.addEventListener('hashchange',()=>route());
  let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(state.view==='network')renderCenter();},150);}).observe($('#network-stage'));
}
try{
  const[data,index,meta,dl]=await Promise.all([fetchJson('data/graph.json'),fetchJson('data/search.json'),fetchJson('data/manifest.json'),fetchJson('data/download.json')]);
  $('#loading-text').textContent='正在准备知识网络…';model=createModel(data,index);manifest=meta;download=dl;
  known=new Set([...known].filter(k=>model.byKey.has(k)&&model.byKey.get(k).node_kind!=='topic'));
  for(const [key,label]of Object.entries(SUBJECTS))$('#subject').insertAdjacentHTML('beforeend',`<option value="${key}">${label}</option>`);
  populateAbout();bind();$('#loading').hidden=true;await route();
}catch(error){$('#loading').innerHTML=`<h1>暂时无法打开 EduGraph</h1><p>${esc(error.message)}</p><p style="margin-top:12px">请通过本地预览服务或 GitHub Pages 访问，而非直接双击 HTML 文件。</p><button class="button secondary" style="margin-top:20px" onclick="location.reload()">重试</button>`;console.error(error);}
