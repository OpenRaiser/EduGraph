// Check the actual public deployment without credentials or a local preview server.
import assert from 'node:assert/strict';
import {readFile,appendFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {createModel,findNodes,SUBJECTS} from '../web/model.mjs';

const base='https://openraiser.github.io/EduGraph/';
const checks=[];
async function get(resource){
  let last;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(new URL(resource,base),{signal:AbortSignal.timeout(30000)});
      assert.equal(response.status,200,`${resource||'index.html'}: HTTP ${response.status}`);
      const data=Buffer.from(await response.arrayBuffer());
      assert.ok(data.length>0,`${resource} must not be empty`);
      checks.push({path:resource||'index.html',status:response.status,bytes:data.length});
      return data;
    }catch(error){last=error;if(attempt<2)await delay(5000);}
  }
  throw new Error(`Public resource unavailable: ${resource}: ${last.message}`);
}
const json=async resource=>JSON.parse((await get(resource)).toString('utf8'));
const html=(await get('')).toString('utf8');assert.match(html,/EduGraph/);assert.match(html,/learning\.css/);assert.match(html,/id="hero-network"/);
const manifest=await json('data/manifest.json');
const configured=JSON.parse(await readFile(new URL('../data/release.json',import.meta.url),'utf8'));
assert.equal(manifest.version,configured.version,'The site is serving an older data release');
assert.match(configured.version,/^\d+\.\d+\.\d+$/);
const sourceManifest=JSON.parse(execFileSync('tar',['-xOf',fileURLToPath(new URL(`../data/edugraph-v${configured.version}.tar.gz`,import.meta.url)),`v${configured.version}/manifest.json`],{encoding:'utf8',maxBuffer:16*1024*1024}));
assert.deepEqual(manifest.counts,sourceManifest.counts);
assert.deepEqual(new Set(manifest.scopes.map(s=>`${s.subject}/${s.stage}`)),new Set(Object.keys(sourceManifest.counts.keypoint_partitions)));
assert.ok(manifest.scopes.every(s=>SUBJECTS[s.subject]));
assert.equal(manifest.publication_status,configured.publicationStatus??sourceManifest.publication_status);
assert.equal(manifest.expansion_status,configured.expansionStatus??sourceManifest.expansion_status);
const [graph,index,primary,standards]=await Promise.all(['data/graph.json','data/search.json','data/resources/mathematics/primary.json','data/standards.json'].map(json));
const model=createModel(graph,index);
assert.equal(model.nodes.length,manifest.counts.nodes_total);
assert.equal(standards.filter(s=>typeof s.text==='string').length,manifest.counts.standard_items);
const fraction=findNodes(model,'分数',{subject:'mathematics',stage:'primary'})[0];
assert.equal(fraction.name,'分数');
assert.ok(primary.concepts[fraction.id].exercises.length>0);
assert.ok(primary.concepts[fraction.id].teaches.length>0);
for(const scope of manifest.scopes){
  const shard=scope.subject==='mathematics'&&scope.stage==='primary'?primary:await json(`data/resources/${scope.subject}/${scope.stage}.json`);
  assert.ok(shard.concepts&&Array.isArray(shard.textbooks)&&Array.isArray(shard.chapters));
  const scopedConcepts=model.nodes.filter(n=>n.subject===scope.subject&&n.stage===scope.stage&&n.node_kind==='knowledge_point');
  assert.equal(scopedConcepts.length,scope.concepts);assert.equal(shard.textbooks.length,scope.textbooks);
  const records=Object.values(shard.concepts);
  assert.equal(new Set(records.flatMap(r=>r.keypoints.map(k=>k.key))).size,scope.keypoints);
  assert.equal(new Set(records.flatMap(r=>r.exercises.map(e=>e.key))).size,scope.exercises);
  assert.equal(records.reduce((n,r)=>n+r.teaches.length,0),scope.teaches);
  if(!scope.textbooks){assert.deepEqual(shard.chapters,[]);assert.ok(records.every(r=>!r.teaches.length));}
  const sample=scopedConcepts[0];
  assert.ok(findNodes(model,sample.name,{subject:scope.subject,stage:scope.stage}).some(n=>n.key===sample.key));
  assert.ok(shard.concepts[sample.id].standards.length>0);
  if(scope.subject==='information-technology'){
    const found=findNodes(model,'数据编码',{subject:scope.subject,stage:scope.stage})[0],entry=shard.concepts[found.id];
    assert.equal(found.name,'数据编码');assert.ok(entry.keypoints.length>0);assert.ok(entry.exercises.length>0);assert.ok(entry.teaches.length>0);
    assert.ok(shard.textbooks.every(b=>b.grade===null&&b.volume_label));
  }
}
for(const file of ['app.mjs','model.mjs','network.mjs','covers.mjs','hero.mjs','textbook-views.mjs','styles.css','learning.css','core/graph.mjs','core/bm25.mjs','core/tokenize.mjs','assets/figure-2.png','assets/figure-3.png','assets/covers/catalog.json','assets/covers/NOTICE.txt']){
  const deployed=await get(file),source=await readFile(new URL('../web/'+file,import.meta.url));
  assert.equal(createHash('sha256').update(deployed).digest('hex'),createHash('sha256').update(source).digest('hex'),`${file}: deployed content differs from source`);
}
const covers=JSON.parse(await readFile(new URL('../web/assets/covers/catalog.json',import.meta.url),'utf8'));
const coverList=Object.values(covers.covers);
for(let offset=0;offset<coverList.length;offset+=8){
 await Promise.all(coverList.slice(offset,offset+8).map(async cover=>{const image=await get(cover.asset);assert.equal(createHash('sha256').update(image).digest('hex'),cover.imageSha256);}));
}
const release=await json('data/download.json');
assert.match(release.file,/^downloads\/edugraph-v\d+\.\d+\.\d+\.tar\.gz$/);
const archive=await get(release.file);
assert.equal(archive.length,release.bytes);
assert.equal(createHash('sha256').update(archive).digest('hex'),release.sha256);
console.log(JSON.stringify({passed:true,url:base,authenticationRequired:false,resources:checks.length,subjectStageShards:manifest.scopes.length,subjects:new Set(manifest.scopes.map(s=>s.subject)).size,coverImages:coverList.length,chineseSearch:true,exerciseAndTextbookLinks:true,allSubjectResources:true,sourceAssetsMatch:true,downloadSha256Verified:true,checks},null,2));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## Public deployment verified\n\n[Open EduGraph](${base})\n\n- ${checks.length} public resources returned HTTP 200 without credentials.\n- All ${manifest.scopes.length} subject/stage resource partitions loaded.\n- Chinese search and exercise/textbook links passed.\n- Per-subject resource counts and unlinked textbook states passed.\n- Application files and both figures match the source.\n- Full dataset download passed SHA-256 verification.\n`);
