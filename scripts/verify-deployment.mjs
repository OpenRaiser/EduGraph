// Check the actual public deployment without credentials or a local preview server.
import assert from 'node:assert/strict';
import {readFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {createModel,findNodes} from '../web/model.mjs';

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
assert.equal(manifest.counts.knowledge_points,5269);
assert.equal(manifest.counts.topic_nodes,1322);
assert.equal(manifest.scopes.length,24);
const [graph,index,primary,standards]=await Promise.all(['data/graph.json','data/search.json','data/resources/mathematics/primary.json','data/standards.json'].map(json));
const model=createModel(graph,index);
assert.equal(model.nodes.length,manifest.counts.nodes_total);
assert.equal(standards.length,manifest.counts.standard_items);
const fraction=findNodes(model,'分数',{subject:'mathematics',stage:'primary'})[0];
assert.equal(fraction.name,'分数');
assert.ok(primary.concepts[fraction.id].exercises.length>0);
assert.ok(primary.concepts[fraction.id].teaches.length>0);
for(const scope of manifest.scopes){
  if(scope.subject==='mathematics'&&scope.stage==='primary')continue;
  const shard=await json(`data/resources/${scope.subject}/${scope.stage}.json`);
  assert.ok(shard.concepts&&Array.isArray(shard.textbooks)&&Array.isArray(shard.chapters));
}
for(const file of ['app.mjs','model.mjs','network.mjs','covers.mjs','hero.mjs','styles.css','learning.css','core/graph.mjs','core/bm25.mjs','core/tokenize.mjs','assets/figure-2.png','assets/figure-3.png','assets/covers/catalog.json','assets/covers/NOTICE.txt']){
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
console.log(JSON.stringify({passed:true,url:base,authenticationRequired:false,resources:checks.length,subjectStageShards:24,coverImages:coverList.length,chineseSearch:true,exerciseAndTextbookLinks:true,sourceAssetsMatch:true,downloadSha256Verified:true,checks},null,2));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## Public deployment verified\n\n[Open EduGraph](${base})\n\n- ${checks.length} public resources returned HTTP 200 without credentials.\n- All 24 subject/stage resource partitions loaded.\n- Chinese search and exercise/textbook links passed.\n- Application files and both figures match the source.\n- Full dataset download passed SHA-256 verification.\n`);
