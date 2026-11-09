import { readdir, readFile, writeFile, mkdir, cp, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { InvertedIndex } from '../web/core/bm25.mjs';
import {verifyPublicSite,verifyReleaseArchive} from './verify-public-site.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'data/open/v0.21.0');
const out = path.join(root, 'dist');
try{await stat(path.join(source,'manifest.json'));}catch(error){
  if(error.code!=='ENOENT')throw error;
  const archive=path.join(root,'data/edugraph-v0.21.0.tar.gz');
  const expected=(await readFile(archive+'.sha256','utf8')).trim().split(/\s+/)[0];
  if(!/^[0-9a-f]{64}$/.test(expected)||createHash('sha256').update(await readFile(archive)).digest('hex')!==expected)throw new Error('Source release archive checksum mismatch');
  verifyReleaseArchive(archive);
  await mkdir(path.dirname(source),{recursive:true});
  execFileSync('tar',['-xzf',archive,'-C',path.dirname(source),'v0.21.0'],{stdio:'pipe'});
}
const readJson = async p => JSON.parse(await readFile(p, 'utf8'));
const readLines = async p => (await readFile(p, 'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);
async function files(dir, name) {
  const result = [];
  for (const e of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) result.push(...await files(p, name));
    else if (!name || e.name === name) result.push(p);
  }
  return result;
}
async function json(rel, data) {
  const p = path.join(out, rel);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(data));
}
function pick(row, names) { return Object.fromEntries(names.filter(k => row[k] !== undefined).map(k => [k, row[k]])); }
const manifest = await readJson(path.join(source, 'manifest.json'));
const nodes = (await Promise.all((await files(path.join(source, 'knowledge-points'), 'nodes.jsonl')).map(readLines))).flat();
const edges = (await Promise.all((await files(path.join(source, 'knowledge-points'), 'edges.jsonl')).map(readLines))).flat();
const byKey = new Map(nodes.map((n,i) => [n.key,i]));
if (byKey.size !== nodes.length) throw new Error('Duplicate concept keys');
for (const e of edges) if (!byKey.has(e.from) || !byKey.has(e.to)) throw new Error(`Dangling edge ${e.from} -> ${e.to}`);
if (nodes.length !== manifest.counts.nodes_total || edges.filter(e=>e.type==='PREREQUISITE').length !== manifest.counts.prerequisite_edges) throw new Error('Graph does not match release manifest');
const standards = await readLines(path.join(source, 'standards/nodes.jsonl'));
const standardIds = new Set(standards.map(s=>s.id));
const covers = await readLines(path.join(source, 'standards-alignment/covers.jsonl'));
const standardMap = new Map();
for (const c of covers) {
  if (!byKey.has(c.to) || !standardIds.has(c.from)) throw new Error('Dangling COVERS edge');
  if (!standardMap.has(c.to)) standardMap.set(c.to, []);
  standardMap.get(c.to).push(pick(c,['from','score','method','review_status']));
}
await mkdir(out, { recursive: true });
const coverCatalog=await readJson(path.join(root,'web/assets/covers/catalog.json'));
const publishedCovers=new Set(Object.values(coverCatalog.covers).map(c=>c.asset));
await cp(path.join(root,'web'), out, {recursive:true,filter:sourcePath=>{
  const relative=path.relative(path.join(root,'web'),sourcePath).split(path.sep).join('/');
  return !/^assets\/covers\/[^/]+\.jpg$/.test(relative)||publishedCovers.has(relative);
}});
await cp(path.join(root,'LICENSE'),path.join(out,'LICENSE'));
await cp(path.join(root,'LICENSE-DATA'),path.join(out,'LICENSE-DATA'));
await writeFile(path.join(out,'.nojekyll'), '');
const scopes = [...new Set(nodes.map(n=>`${n.subject}/${n.stage}`))].sort();
const summary = [];
let exercisesTotal=0, keypointsTotal=0, chaptersTotal=0, textbooksTotal=0, teachesTotal=0;
for (const scope of scopes) {
  const [keypoints,exercises,textbooks,chapters,teaches] = await Promise.all([
    readLines(path.join(source,'keypoints',scope,'keypoints.jsonl')),
    readLines(path.join(source,'exercises',scope,'exercises.jsonl')),
    readLines(path.join(source,'textbook-alignment',scope,'textbooks.jsonl')),
    readLines(path.join(source,'textbook-alignment',scope,'chapters.jsonl')),
    readLines(path.join(source,'textbook-alignment',scope,'teaches.jsonl')),
  ]);
  exercisesTotal+=exercises.length; keypointsTotal+=keypoints.length;
  chaptersTotal+=chapters.length; textbooksTotal+=textbooks.length; teachesTotal+=teaches.length;
  const conceptData = Object.create(null);
  const entry = k => {
    if(!byKey.has(k)) throw new Error(`Unknown resource key ${k}`);
    return conceptData[byKey.get(k)] ??= { keypoints:[], exercises:[], standards:standardMap.get(k)??[], teaches:[] };
  };
  for (const n of nodes.filter(n=>`${n.subject}/${n.stage}`===scope)) entry(n.key);
  for (const k of keypoints) entry(k.kp_key).keypoints.push(pick(k,['key','kind','title','body','derived_from','authored_by','review_status']));
  for (const e of exercises) for (const k of e.kp_keys??[]) entry(k).exercises.push(pick(e,['key','kp_keys','question_kind','stem','choices','answer','explanation','difficulty','cognitive_level','license','authored_by','review_status']));
  const chapterIds = new Set(chapters.map(c=>c.chapter_id));
  for (const t of teaches) {
    if(!chapterIds.has(t.from)) throw new Error(`Unknown chapter ${t.from}`);
    entry(t.to).teaches.push(pick(t,['from','role','confidence','method','review_status','standard_anchor']));
  }
  // Store every chapter's concept mappings so the entire catalog view can be explored.
  const chapterConcepts = Object.create(null);
  for (const t of teaches) (chapterConcepts[t.from]??=[]).push({id:byKey.get(t.to),role:t.role});
  await json(`data/resources/${scope}.json`,{concepts:conceptData,textbooks:textbooks.map(t=>pick(t,['textbook_id','publisher','series','edition','grade','volume','volume_label','subject','stage','review_status','toc_completeness'])),chapters:chapters.map(c=>pick(c,['chapter_id','textbook_id','parent_id','level','order','uncertain'])),chapterConcepts});
  summary.push({subject:scope.split('/')[0],stage:scope.split('/')[1],concepts:nodes.filter(n=>`${n.subject}/${n.stage}`===scope&&n.node_kind!=='topic').length,keypoints:keypoints.length,exercises:exercises.length,textbooks:textbooks.length});
}
for (const [actual,k] of [[exercisesTotal,'exercises'],[keypointsTotal,'keypoints'],[chaptersTotal,'textbook_chapters'],[textbooksTotal,'textbooks'],[teachesTotal,'teaches_edges']]) if(actual!==manifest.counts[k]) throw new Error(`${k} count mismatch`);
const lightNodes=nodes.map(n=>pick(n,['key','name','subject','stage','node_kind','level_path','aliases','grade_band','review_status']));
await json('data/graph.json',{nodes:lightNodes,edges:edges.map(e=>[byKey.get(e.from),byKey.get(e.to),e.type,e.confidence??1,e.review_status??null,e.rationale??null])});
await json('data/standards.json',standards.map(s=>pick(s,['id','text','subject','standard_family','education_phase','school_stage','grade_band','applicable_stage','cognitive_level','alignable'])));
const index = new InvertedIndex();
for(const n of nodes) index.addDoc({key:n.key,name:n.name,aliases:n.aliases,levelPath:n.level_path});
await json('data/search.json', index.serialize());
await json('data/manifest.json',{version:manifest.graph_version,counts:manifest.counts,coverage:manifest.coverage,scopes:summary,defaultKey:nodes.find(n=>n.name==='分数'&&n.stage==='primary')?.key,generatedAt:new Date().toISOString()});
await mkdir(path.join(out,'downloads'),{recursive:true});
const archive = path.join(out,'downloads',`edugraph-v${manifest.graph_version}.tar.gz`);
execFileSync('tar',['-czf',archive,'-C',path.dirname(source),path.basename(source),'-C',root,'LICENSE-DATA','DATA_CARD.md'],{stdio:'pipe'});
const digest = createHash('sha256').update(await readFile(archive)).digest('hex');
await writeFile(`${archive}.sha256`,`${digest}  ${path.basename(archive)}\n`);
await json('data/download.json',{file:`downloads/${path.basename(archive)}`,sha256:digest,bytes:(await stat(archive)).size});
await writeFile(path.join(out,'404.html'),await readFile(path.join(out,'index.html'),'utf8'));
console.log(JSON.stringify(await verifyPublicSite(out)));
console.log(JSON.stringify({version:manifest.graph_version,nodes:nodes.length,prerequisites:manifest.counts.prerequisite_edges,resourceShards:scopes.length,exercises:exercisesTotal,downloadBytes:(await stat(archive)).size,output:out},null,2));
