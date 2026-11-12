import { DependencyGraph } from './core/graph.mjs';
import { InvertedIndex, search } from './core/bm25.mjs';
export const SUBJECTS={mathematics:'数学',chinese:'语文',english:'英语',physics:'物理',chemistry:'化学',biology:'生物',history:'历史',geography:'地理',politics:'道德与法治',science:'科学','information-technology':'信息技术',music:'音乐','fine-arts':'美术',arts:'艺术'};
export const STAGES={primary:'小学',junior:'初中',senior:'高中'};
export function createModel(data,indexData){
  const nodes=data.nodes.map((n,id)=>({...n,id}));
  const byKey=new Map(nodes.map(n=>[n.key,n]));
  const graph=new DependencyGraph();
  for(const n of nodes) graph.addNode(n);
  const edges=data.edges.map(([from,to,type,confidence,status,rationale])=>({from,to,type,confidence,status,rationale}));
  for(const e of edges){
    const from=nodes[e.from]?.key,to=nodes[e.to]?.key;
    if(!from||!to) throw new Error('图谱存在无效关联');
    if(e.type==='PREREQUISITE') graph.addPrerequisite({from,to,confidence:e.confidence,rationale:e.rationale});
    else if(e.type==='REFINES') graph.addRefines(from,to);
  }
  const index=indexData?InvertedIndex.deserialize({...indexData,docs:nodes.map(n=>({key:n.key,name:n.name,aliases:n.aliases,levelPath:n.level_path}))}):null;
  return {nodes,byKey,edges,graph,index};
}
export function findNodes(model,query,{subject='',stage='',kind='knowledge_point'}={}){
  const matches=query.trim()?search(model.index,query,{limit:100000}).items.map(i=>model.byKey.get(i.key)):model.nodes;
  const result=matches.filter(n=>n&&(!subject||n.subject===subject)&&(!stage||n.stage===stage)&&(!kind||n.node_kind===kind));
  if(!query.trim()) result.sort((a,b)=>degree(model,b.key)-degree(model,a.key)||a.name.localeCompare(b.name,'zh'));
  return result;
}
export function degree(model,key){return(model.graph.prerequisites.get(key)?.length??0)+(model.graph.successors.get(key)?.length??0);}
export function pathEvidence(model,key){
  const incoming=model.graph.prerequisites.get(key)??[];
  const ancestors=new Set([key]),pending=[key];
  while(pending.length){
    for(const edge of model.graph.prerequisites.get(pending.pop())??[]){
      if(!ancestors.has(edge.to)){ancestors.add(edge.to);pending.push(edge.to);}
    }
  }
  const candidatePrerequisites=model.edges.filter(e=>e.type==='PREREQUISITE'&&ancestors.has(model.nodes[e.from].key)&&ancestors.has(model.nodes[e.to].key)&&['candidate','draft'].includes(e.status)).length;
  return{hasPrerequisites:incoming.length>0,candidatePrerequisites};
}
export function neighborhood(model,key,{depth=2,direction='both',limit=52}={}){
  const root=model.byKey.get(key);
  if(!root) return{nodes:[],edges:[],total:0,truncated:false};
  const info=new Map([[key,{role:'focus',depth:0}]]);
  if(root.node_kind==='topic'){
    const subtree=model.graph.collectSubtree(key,{maxNodes:100000});
    for(const k of subtree.inside) if(k!==key) info.set(k,{role:model.byKey.get(k)?.node_kind==='topic'?'topic':'successor',depth:1});
  }else{
    for(const dir of ['prerequisites','successors']){
      if(direction!=='both'&&direction!==dir)continue;
      for(const layer of model.graph.traverse(key,dir,{k:depth,limit:200}))for(const n of layer.nodes){
        if(!info.has(n.key))info.set(n.key,{role:dir==='prerequisites'?'prerequisite':'successor',depth:layer.depth});
      }
    }
  }
  // Taxonomy is explicitly styled separately from prerequisite edges.
  let parent=model.graph.parent.get(key);
  for(let d=0;parent&&d<2;d++){
    if(!info.has(parent))info.set(parent,{role:'topic',depth:d+1});
    parent=model.graph.parent.get(parent);
  }
  const total=info.size;
  const selected=[...info].sort((a,b)=>a[1].depth-b[1].depth||degree(model,b[0])-degree(model,a[0])).slice(0,limit);
  const included=new Set(selected.map(([k])=>model.byKey.get(k).id));
  return{nodes:selected.map(([k,x])=>({...model.byKey.get(k),...x})),edges:model.edges.filter(e=>included.has(e.from)&&included.has(e.to)),total,truncated:total>limit};
}
export function orderChapters(chapters,textbookId){
  const scope=chapters.filter(c=>c.textbook_id===textbookId);
  const ids=new Set(scope.map(c=>c.chapter_id)),groups=new Map();
  for(const c of scope){const p=ids.has(c.parent_id)?c.parent_id:null;if(!groups.has(p))groups.set(p,[]);groups.get(p).push(c);}
  for(const list of groups.values())list.sort((a,b)=>a.order-b.order||a.chapter_id.localeCompare(b.chapter_id));
  const out=[],seen=new Set();
  const visit=(p,chain=[])=>{for(const c of groups.get(p)??[]){if(seen.has(c.chapter_id))continue;seen.add(c.chapter_id);const orderPath=[...chain,c.order];out.push({...c,orderPath});visit(c.chapter_id,orderPath);}};
  visit(null);
  for(const c of scope)if(!seen.has(c.chapter_id))out.push({...c,orderPath:[c.order]});
  return out;
}
export function statusLabel(status){return({reviewed:'已审核',human_reviewed:'人工审核',machine_reviewed:'机器审核',draft:'待审核',candidate:'先修候选',auto_matched:'自动匹配',verified:'已核验',accepted:'已接受'})[status]??status??'未标注';}
