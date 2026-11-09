// Fixed presentation positions, with node identities and edges from the public graph.
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base='mathematics.primary.number-and-algebra.number-and-operations.';
const positions=[
 ['decimals-and-fractions.fractions',300,245,43,'focus'],
 ['decimals-and-fractions.decimals',125,145,24,'concept'],
 ['decimals-and-fractions.unit-fractions',65,272,14,'small'],
 ['decimals-and-fractions.decimal-fraction-conversion',260,415,26,'concept'],
 ['decimal-fraction-operations.four-operations-with-fractions',515,152,26,'concept'],
 ['decimals-and-fractions.fractions-and-decimals',500,400,17,'small'],
 ['decimals-and-fractions',83,417,15,'topic']
];
export function heroGraph(model){
 const nodes=positions.map(([suffix,x,y,r,kind])=>{const n=model.byKey.get(base+suffix);return n?{...n,x,y,r,kind}:null;}).filter(Boolean);
 const ids=new Set(nodes.map(n=>n.id));
 return{nodes,edges:model.edges.filter(e=>ids.has(e.from)&&ids.has(e.to))};
}
function lines(text,max=7){const chars=Array.from(text);if(text.startsWith('小数与分数')&&chars.length>max)return[chars.slice(0,5).join(''),chars.slice(5).join('')];return chars.length<=max?[text]:[chars.slice(0,max).join(''),chars.slice(max).join('')];}
export function renderHero(container,model,resource){
 const graph=heroGraph(model),byId=new Map(graph.nodes.map(n=>[n.id,n]));
 const focus=graph.nodes.find(n=>n.kind==='focus');if(!focus)return;
 const href=n=>'#/concept/'+encodeURIComponent(n.key),entry=resource?.concepts[focus.id];
 const edgeSvg=graph.edges.map(e=>{
  const a=byId.get(e.from),b=byId.get(e.to),dx=b.x-a.x,dy=b.y-a.y,d=Math.max(Math.hypot(dx,dy),1),topic=e.type==='REFINES';
  return`<path class="hero-edge ${topic?'topic':''}" data-hero-edge="${e.from}:${e.to}:${e.type}" d="M${a.x+dx/d*(a.r+3)} ${a.y+dy/d*(a.r+3)}L${b.x-dx/d*(b.r+7)} ${b.y-dy/d*(b.r+7)}" marker-end="url(#hero-${topic?'topic':'arrow'})"><title>${escape(a.name)} → ${escape(b.name)} · ${topic?'REFINES':'PREREQUISITE'}</title></path>`;
 }).join('');
 const nodeSvg=graph.nodes.map(n=>{
  const topic=n.kind==='topic',focus=n.kind==='focus',small=n.kind==='small'||topic;
  const label=lines(n.name),fill=focus?'#5d8aa8':topic?'#ded2e9':'#c4dbe9';
  return`<a href="${href(n)}" class="hero-node ${focus?'focus':small?'small':''}" aria-label="探索${escape(n.name)}" data-hero-node="${n.id}"><g transform="translate(${n.x} ${n.y})">${focus?'<circle r="50" class="hero-focus-ring"/>':''}<circle r="${n.r}" fill="${fill}" stroke="${topic?'#a792bb':'#7e9fb9'}" stroke-width="1.4"/><text text-anchor="middle" y="${focus?8:n.r+24}" class="${topic?'hero-node-topic-label':''}">${label.map((line,i)=>`<tspan x="0" dy="${i?18:0}">${escape(line)}</tspan>`).join('')}</text><title>${escape(n.name)} · ${topic?'Topic':'Concept'}</title></g></a>`;
 }).join('');
 const books=[];
 if(entry){
  for(const publisher of ['人民教育出版社','北京师范大学出版社']){
   const matches=entry.teaches.map(t=>({teach:t,chapter:resource.chapters.find(c=>c.chapter_id===t.from)})).filter(x=>x.chapter).map(x=>({...x,book:resource.textbooks.find(b=>b.textbook_id===x.chapter.textbook_id)})).filter(x=>x.book?.publisher===publisher&&x.teach.role==='primary').sort((a,b)=>a.book.grade.localeCompare(b.book.grade)||a.book.volume.localeCompare(b.book.volume)||a.chapter.order-b.chapter.order);
   if(matches[0])books.push(matches[0].book);
  }
 }
 const labels=books.map(b=>`${b.publisher==='人民教育出版社'?'人教版':'北师大版'} · ${b.volume_label}`);
 const key=escape(focus.key),resourceLink=(tab,cls,content)=>`<a href="${href(focus)}" data-key="${key}" data-hero-tab="${tab}" class="hero-resource ${cls}">${content}</a>`;
 const standards=resourceLink('standards','standard',`<rect x="350" y="29" width="230" height="67" rx="13"/><path d="M370 48h15l6 6v23h-21zM375 57h10M375 63h10M375 69h7"/><text class="resource-title" x="407" y="55">课程标准</text><text class="resource-subtitle" x="407" y="77">COVERS${entry?' · '+entry.standards.length+' 条课程要求':''}</text>`);
 const textbooks=resourceLink('textbooks','textbooks',`<rect x="438" y="265" width="225" height="98" rx="13"/><path d="M454 284q8-4 16 0v17q-8-4-16 0zM470 284q8-4 16 0v17q-8-4-16 0"/><text class="resource-title" x="496" y="289">教材视图</text><text class="resource-subtitle" x="496" y="306">TEACHES</text>${labels.map((s,i)=>`<text x="455" y="${327+i*19}" font-size="11">${escape(s)}</text>`).join('')}`);
 const explanations=resourceLink('keypoints','explanations',`<rect x="404" y="476" width="233" height="53" rx="12"/><path d="M421 492h17v19h-17zM426 497h7M426 503h7"/><text class="resource-title" x="449" y="499">讲解与例题</text><text class="resource-subtitle" x="449" y="517">${entry?entry.keypoints.length+' 条讲解 · '+entry.exercises.length+' 道例题':'KeyPoints &amp; Exercises'}</text>`);
 const markers=[['arrow','#88a8bc'],['topic','#ae9aba'],['resource','#c29b73']].map(([id,color])=>`<marker id="hero-${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9z" fill="${color}"/></marker>`).join('');
 container.innerHTML=`<svg viewBox="0 0 680 575" role="group" aria-label="分数的真实知识关系与关联教学资源"><defs>${markers}</defs>${edgeSvg}<path class="hero-resource-edge" d="M403 97L325 204" marker-end="url(#hero-resource)"/><path class="hero-resource-edge" d="M438 287L345 255" marker-end="url(#hero-resource)"/><path class="hero-edge" d="M329 277C350 335 351 458 405 493" stroke-dasharray="3 6" opacity=".6"/>${nodeSvg}${standards}${textbooks}${explanations}<g class="hero-legend"><path d="M184 554h20" stroke="#88a8bc"/><text x="210" y="558">先修关系</text><path d="M290 554h20" stroke="#ae9aba" stroke-dasharray="3 4"/><text x="316" y="558">主题从属</text><path d="M396 554h20" stroke="#c29b73"/><text x="422" y="558">资源关联</text></g></svg>`;
}
