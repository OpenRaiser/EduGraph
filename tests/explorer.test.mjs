import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createModel,findNodes,neighborhood,pathEvidence,orderChapters,SUBJECTS,statusLabel} from '../web/model.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../dist/'+p,import.meta.url),'utf8'));
const [graph,index,manifest]=await Promise.all([read('data/graph.json'),read('data/search.json'),read('data/manifest.json')]);
const model=createModel(graph,index);
const fraction=model.nodes.find(n=>n.name==='分数'&&n.stage==='primary');
const conversion=model.nodes.find(n=>n.name==='小数与分数的互化'&&n.stage==='primary');
const decimal=model.nodes.find(n=>n.name==='小数'&&n.stage==='primary');
test('The public graph matches the complete release and has no prerequisite cycles',()=>{
  assert.equal(model.nodes.length,7113);assert.equal(model.nodes.filter(n=>n.node_kind!=='topic').length,5749);
  assert.equal(model.edges.filter(e=>e.type==='PREREQUISITE').length,4994);
  assert.equal(model.edges.filter(e=>e.type==='REFINES').length,6897);
  assert.equal(model.graph.findDanglingEdges().length,0);assert.equal(model.graph.findCycles().length,0);
});

test('New subject drafts retain curriculum links, explicit empty arts resources and usable Chinese search',async()=>{
  assert.equal(new Set(manifest.scopes.map(s=>s.subject)).size,14);assert.equal(manifest.scopes.length,28);
  assert.equal(manifest.publication_status,'public-preview');
  for(const [subject,name,count] of [['music','音高',92],['fine-arts','中国画',157],['arts','艺术起源',62]]){
    assert.ok(SUBJECTS[subject]);
    const result=findNodes(model,name,{subject,stage:'senior'});assert.equal(result[0].name,name);
    const concepts=model.nodes.filter(n=>n.subject===subject&&n.node_kind==='knowledge_point');assert.equal(concepts.length,count);
    const shard=await read(`data/resources/${subject}/senior.json`);assert.deepEqual(shard.textbooks,[]);assert.deepEqual(shard.chapters,[]);
    for(const node of concepts){
      assert.equal(node.review_status,'draft');const entry=shard.concepts[node.id];assert.ok(entry.standards.length>0);
      assert.deepEqual(entry.keypoints,[]);assert.deepEqual(entry.exercises,[]);assert.deepEqual(entry.teaches,[]);
      assert.equal(pathEvidence(model,node.key).hasPrerequisites,false);
      assert.ok(neighborhood(model,node.key).edges.some(e=>e.type==='REFINES'));
    }
  }
});

test('Information technology retains authored drafts, module textbooks and candidate path evidence',async()=>{
  const shard=await read('data/resources/information-technology/senior.json');assert.equal(shard.textbooks.length,48);
  const concepts=model.nodes.filter(n=>n.subject==='information-technology'&&n.node_kind==='knowledge_point');assert.equal(concepts.length,169);
  let points=0,exercises=0,teaches=0,withCandidate=0;
  for(const n of concepts){
    const r=shard.concepts[n.id];assert.equal(r.keypoints.length,2);assert.equal(r.exercises.length,1);
    assert.ok(r.keypoints.every(k=>k.review_status==='draft'));assert.ok(r.exercises.every(e=>e.review_status==='draft'));
    points+=r.keypoints.length;exercises+=r.exercises.length;teaches+=r.teaches.length;
    withCandidate+=Number(pathEvidence(model,n.key).candidatePrerequisites>0);
  }
  assert.equal(points,338);assert.equal(exercises,169);assert.equal(teaches,396);assert.ok(withCandidate>0);
  assert.equal(statusLabel('candidate'),'先修候选');assert.ok(shard.textbooks.every(b=>b.grade===null&&b.volume_label));
  assert.equal(findNodes(model,'数据编码',{subject:'information-technology',stage:'senior'})[0].name,'数据编码');
});
test('Chinese retrieval finds the exact concept and respects subject/stage filters',()=>{
  const found=findNodes(model,'分数',{subject:'mathematics',stage:'primary'});assert.equal(found[0].key,fraction.key);
  assert.ok(found.every(n=>n.subject==='mathematics'&&n.stage==='primary'));
  assert.equal(findNodes(model,'分数',{subject:'history'}).some(n=>n.key===fraction.key),false);
  assert.equal(findNodes(model,'zz_nonexistent_239850').length,0);
});
test('Neighborhood directions preserve actual prerequisites; truncation is explicit',()=>{
  const pre=neighborhood(model,conversion.key,{direction:'prerequisites',depth:1});
  assert.ok(pre.nodes.some(n=>n.key===fraction.key&&n.role==='prerequisite'));
  assert.ok(pre.nodes.some(n=>n.key===decimal.key&&n.role==='prerequisite'));
  assert.ok(pre.nodes.every(n=>n.role!=='successor'));
  const small=neighborhood(model,fraction.key,{depth:3,limit:5});assert.equal(small.nodes.length,5);assert.equal(small.truncated,true);assert.ok(small.total>5);
  const ids=new Set(small.nodes.map(n=>n.id));assert.ok(small.edges.every(e=>ids.has(e.from)&&ids.has(e.to)));
});
test('Learning path includes all required branches, excludes known concepts, respects ordering',()=>{
  const plan=model.graph.learningPath([conversion.key]);const sequence=plan.sequence.map(n=>n.key);
  assert.ok(sequence.includes(fraction.key));assert.ok(sequence.includes(decimal.key));
  assert.ok(sequence.indexOf(fraction.key)<sequence.indexOf(conversion.key));
  for(const e of model.edges.filter(e=>e.type==='PREREQUISITE')){const a=sequence.indexOf(model.nodes[e.from].key),b=sequence.indexOf(model.nodes[e.to].key);if(a>=0&&b>=0)assert.ok(a<b);}
  const known=model.graph.learningPath([conversion.key],[fraction.key]);assert.ok(!known.sequence.some(n=>n.key===fraction.key));assert.ok(known.sequence.some(n=>n.key===decimal.key));
});
test('Actual fraction example retains explanations, answers and both textbook views',async()=>{
  const r=await read('data/resources/mathematics/primary.json'),e=r.concepts[fraction.id];
  assert.equal(e.keypoints.length,2);assert.equal(e.exercises.length,1);assert.equal(e.exercises[0].answer,'C');assert.ok(e.exercises[0].explanation.includes('10/16'));
  const chapterMap=new Map(r.chapters.map(c=>[c.chapter_id,c]));const textbooks=new Map(r.textbooks.map(b=>[b.textbook_id,b]));
  const books=e.teaches.map(t=>textbooks.get(chapterMap.get(t.from).textbook_id));assert.ok(books.some(b=>b.publisher.includes('人民教育')));assert.ok(books.some(b=>b.publisher.includes('北京师范')));
  for(const b of books){const ordered=orderChapters(r.chapters,b.textbook_id);assert.equal(ordered.length,r.chapters.filter(c=>c.textbook_id===b.textbook_id).length);assert.equal(new Set(ordered.map(c=>c.chapter_id)).size,ordered.length);}
  assert.ok(r.chapters.every(c=>!('title'in c)&&!('number'in c)));
});
test('All browser resource shards preserve complete public counts and valid joins',async()=>{
  const unique={exercises:new Set(),keypoints:new Set(),textbooks:new Set(),chapters:new Set()};let teaches=0,covers=0;
  const standardIds=new Set((await read('data/standards.json')).map(s=>s.id));
  for(const scope of manifest.scopes){const shard=await read(`data/resources/${scope.subject}/${scope.stage}.json`);const chapterIds=new Set(shard.chapters.map(c=>c.chapter_id));
    for(const t of shard.textbooks)unique.textbooks.add(t.textbook_id);for(const c of shard.chapters)unique.chapters.add(c.chapter_id);
    for(const [id,record]of Object.entries(shard.concepts)){
      assert.equal(model.nodes[Number(id)].subject,scope.subject);assert.equal(model.nodes[Number(id)].stage,scope.stage);
      for(const e of record.exercises)unique.exercises.add(e.key);for(const k of record.keypoints)unique.keypoints.add(k.key);
      for(const t of record.teaches){assert.ok(chapterIds.has(t.from));teaches++;}
      for(const s of record.standards){assert.ok(standardIds.has(s.from));covers++;}
    }
  }
  assert.equal(unique.exercises.size,manifest.counts.exercises);assert.equal(unique.keypoints.size,manifest.counts.keypoints);assert.equal(unique.textbooks.size,manifest.counts.textbooks);assert.equal(unique.chapters.size,manifest.counts.textbook_chapters);assert.equal(teaches,manifest.counts.teaches_edges);assert.equal(covers,manifest.counts.covers_edges);
});
test('Complete downloadable release has a verified SHA-256 digest',async()=>{
  const download=await read('data/download.json');const buffer=await readFile(new URL('../dist/'+download.file,import.meta.url));assert.equal(buffer.length,download.bytes);assert.equal(createHash('sha256').update(buffer).digest('hex'),download.sha256);
});
