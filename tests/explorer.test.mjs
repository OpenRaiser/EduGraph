import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createModel,findNodes,neighborhood,pathEvidence,orderChapters,SUBJECTS,statusLabel} from '../web/model.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../dist/'+p,import.meta.url),'utf8'));
const [graph,index,manifest]=await Promise.all([read('data/graph.json'),read('data/search.json'),read('data/manifest.json')]);
const model=createModel(graph,index);
const sourceRoot=new URL(`../data/open/v${manifest.version}/`,import.meta.url);
const release=JSON.parse(await readFile(new URL('../data/release.json',import.meta.url),'utf8'));
const sourceManifest=JSON.parse(await readFile(new URL('manifest.json',sourceRoot),'utf8'));
const sourceRows=async path=>(await readFile(new URL(path,sourceRoot),'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const sourceBooks=(await readFile(new URL(`../data/${release.sourceViews}/textbooks.jsonl`,import.meta.url),'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const nodeScopes=new Set(model.nodes.map(n=>`${n.subject}/${n.stage}`));
const expansionSubjects=['information-technology','music','fine-arts','arts','general-technology','physical-education','japanese','russian'];
const fraction=model.nodes.find(n=>n.name==='分数'&&n.stage==='primary');
const conversion=model.nodes.find(n=>n.name==='小数与分数的互化'&&n.stage==='primary');
const decimal=model.nodes.find(n=>n.name==='小数'&&n.stage==='primary');
test('The public graph matches the release manifest and has no prerequisite cycles',()=>{
  assert.equal(manifest.version,release.version);
  assert.deepEqual(manifest.counts,sourceManifest.counts);
  assert.equal(model.nodes.length,sourceManifest.counts.nodes_total);
  assert.equal(model.nodes.filter(n=>n.node_kind==='knowledge_point').length,sourceManifest.counts.knowledge_points);
  assert.equal(model.nodes.filter(n=>n.node_kind==='topic').length,sourceManifest.counts.topic_nodes);
  assert.equal(model.edges.filter(e=>e.type==='PREREQUISITE').length,sourceManifest.counts.prerequisite_edges);
  assert.equal(model.edges.filter(e=>e.type==='REFINES').length,sourceManifest.counts.refines_edges);
  assert.deepEqual(new Set(manifest.scopes.map(s=>`${s.subject}/${s.stage}`)),new Set([...nodeScopes,...sourceBooks.map(b=>`${b.subject}/${b.stage}`)]));
  assert.ok(manifest.scopes.every(s=>SUBJECTS[s.subject]));
  assert.equal(manifest.publication_status,release.publicationStatus??sourceManifest.publication_status);
  assert.equal(manifest.expansion_status,release.expansionStatus??sourceManifest.expansion_status);
  assert.equal(model.graph.findDanglingEdges().length,0);assert.equal(model.graph.findCycles().length,0);
});

test('Expanded subjects preserve source resources, curriculum links and distinct review statuses',async()=>{
  let checkedScopes=0;
  for(const scope of manifest.scopes.filter(s=>expansionSubjects.includes(s.subject))){
    const name=`${scope.subject}/${scope.stage}`;
    if(!nodeScopes.has(name)){
      const shard=await read(`data/resources/${name}.json`);
      assert.equal(scope.concepts,0);assert.equal(scope.keypoints,0);assert.equal(scope.exercises,0);
      assert.deepEqual(shard.concepts,{});assert.ok(shard.sourceViews.some(v=>`${v.textbook.subject}/${v.textbook.stage}`===name));
      continue;
    }
    const [nodes,keypoints,exercises,edges,shard]=await Promise.all([
      sourceRows(`knowledge-points/${name}/nodes.jsonl`),sourceRows(`keypoints/${name}/keypoints.jsonl`),
      sourceRows(`exercises/${name}/exercises.jsonl`),sourceRows(`knowledge-points/${name}/edges.jsonl`),read(`data/resources/${name}.json`)]);
    const sourcePoints=new Map(keypoints.map(k=>[k.key,k])),sourceExercises=new Map(exercises.map(e=>[e.key,e]));
    const concepts=nodes.filter(n=>n.node_kind==='knowledge_point');assert.equal(concepts.length,scope.concepts);
    assert.equal(shard.textbooks.length,scope.textbooks);
    if(!scope.textbooks){assert.deepEqual(shard.chapters,[]);assert.ok(Object.values(shard.concepts).every(e=>!e.teaches.length));}
    const nodeKeys=new Set(nodes.map(n=>n.key));
    const projectedEdges=model.edges.filter(e=>nodeKeys.has(model.nodes[e.from].key)||nodeKeys.has(model.nodes[e.to].key));
    for(const edge of edges){
      const projected=projectedEdges.find(e=>model.nodes[e.from].key===edge.from&&model.nodes[e.to].key===edge.to&&e.type===edge.type);
      assert.ok(projected,`${name}: edge preserved`);
      if(edge.type==='PREREQUISITE')assert.equal(projected.status,edge.review_status);
    }
    for(const sourceNode of concepts){
      const node=model.byKey.get(sourceNode.key),entry=shard.concepts[node.id];
      assert.equal(node.review_status,sourceNode.review_status);assert.ok(entry.standards.length>0);
      assert.ok(model.graph.parent.has(node.key));assert.ok(entry.keypoints.length>0);assert.ok(entry.exercises.length>0);
      for(const [rows,source]of [[entry.keypoints,sourcePoints],[entry.exercises,sourceExercises]])for(const row of rows){
        assert.equal(row.review_status,source.get(row.key).review_status);assert.equal(row.authored_by,source.get(row.key).authored_by);
      }
    }
    assert.ok(findNodes(model,concepts[0].name,{subject:scope.subject,stage:scope.stage}).some(n=>n.key===concepts[0].key));
    checkedScopes++;
  }
  assert.ok(checkedScopes>=expansionSubjects.length);
  for(const [subject,name]of [['general-technology','农业信息'],['physical-education','健身健美操基本动作原理'],['japanese','中外文化比较'],['russian','中国基本国情']]){
    assert.equal(findNodes(model,name,{subject,stage:'senior'})[0].name,name);
  }
  assert.equal(statusLabel('draft'),'待审核');assert.equal(statusLabel('machine_reviewed'),'机器审核');assert.equal(statusLabel('candidate'),'先修候选');
});

test('Information technology keeps module textbook labels and candidate path evidence',async()=>{
  const shard=await read('data/resources/information-technology/senior.json');
  const scope=manifest.scopes.find(s=>s.subject==='information-technology'&&s.stage==='senior');
  const concepts=model.nodes.filter(n=>n.subject==='information-technology'&&n.node_kind==='knowledge_point');
  assert.equal(concepts.length,scope.concepts);assert.equal(shard.textbooks.length,scope.textbooks);
  assert.ok(shard.textbooks.every(b=>b.grade===null&&b.volume_label));
  assert.ok(concepts.some(n=>pathEvidence(model,n.key).candidatePrerequisites>0));
  const coding=findNodes(model,'数据编码',{subject:'information-technology',stage:'senior'})[0];
  assert.equal(coding.name,'数据编码');assert.ok(shard.concepts[coding.id].teaches.length>0);
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
