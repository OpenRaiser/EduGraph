import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const manifest=await read('dist/data/manifest.json');
const graph=await read('dist/data/graph.json');
const sourceTeaches=(await readFile(new URL(`../data/source-views-v${manifest.version}/teaches.jsonl`,import.meta.url),'utf8')).trim().split('\n').map(JSON.parse);
const edgeId=t=>JSON.stringify([t.from,t.to]);
const expectedTeaches=new Map(sourceTeaches.map(t=>[edgeId(t),t]));
test('Source catalogs are separate, bidirectionally linked, and retain uncertainty',async()=>{
  assert.equal(expectedTeaches.size,sourceTeaches.length,'Source chapter/Concept pairs must be unique');
  const ids=new Set(),counts={source_views:0,with_catalog:0,chapters:0,teaches:0};
  const shards=new Map(await Promise.all(manifest.scopes.map(async s=>[`${s.subject}/${s.stage}`,await read(`dist/data/resources/${s.subject}/${s.stage}.json`)])));
  for(const scope of manifest.scopes){
    const shard=shards.get(`${scope.subject}/${scope.stage}`),books=new Set([...shard.textbooks,...(shard.linkedTextbooks??[])].map(b=>b.textbook_id));
    for(const view of shard.sourceViews){
      if(!ids.has(view.source_id)){ids.add(view.source_id);counts.source_views++;counts.with_catalog+=Number(view.chapters.length>0);counts.chapters+=view.chapters.length;counts.teaches+=view.teaches.length;}
      assert(!books.has(view.textbook.textbook_id),'A source view must not duplicate a canonical book ID');assert(view.existing_textbook_ids.every(id=>books.has(id)));
      const chapters=new Set(view.chapters.map(c=>c.chapter_id));
      for(const c of view.chapters){assert(!('title'in c)&&!('number'in c));assert.equal(c.textbook_id,view.textbook.textbook_id);if(c.parent_id)assert(chapters.has(c.parent_id));}
      for(const t of view.teaches){assert(chapters.has(t.from));assert.deepEqual(t,expectedTeaches.get(edgeId(t)),'The browser must preserve the source edge and review metadata');assert.equal(t.uncertain,true);
        const indexed=view.chapterConcepts[t.from].find(m=>{const n=graph.nodes[m.id];return n.key===t.to&&shards.get(`${n.subject}/${n.stage}`).concepts[m.id]?.sourceTeaches.some(x=>x.source_id===view.source_id&&x.from===t.from&&x.review_status===t.review_status&&x.uncertain===t.uncertain);});assert(indexed);}
      assert.match(view.source_url,/^https:\/\/github\.com\/TapXWorld\/ChinaTextbook\/(blob|tree)\/[a-f0-9]{40}\//);
    }
  }
  assert.deepEqual(counts,manifest.sourceViews.counts);
  const publicLinks=(await readFile(new URL(`../data/source-views-v${manifest.version}/source-links.jsonl`,import.meta.url),'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual([...ids].sort(),publicLinks.map(l=>l.source_id).sort());
});
test('Public source files have intact checksums and contain only projected fields',async()=>{
  const folder=`data/source-views-v${manifest.version}`,index=await read(`${folder}/index.json`);
  const permitted={textbooks:new Set('type textbook_id publisher series variant edition subject stage grade volume volume_label source retrieved_at authored_by toc_completeness review_status graph_version'.split(' ')),
    chapters:new Set('type chapter_id textbook_id parent_id level order page_start uncertain note'.split(' ')),
    teaches:new Set('type from to role method authored_by review_status authored_at uncertain note graph_version review_meta standard_anchor'.split(' ')),
    'source-links':new Set('source_id source_textbook_id existing_textbook_ids preferred_textbook_id range_match_status catalog_status chapters teaches source_url source_revision'.split(' '))};
  for(const [name,checksum]of Object.entries(index.checksums)){
    const raw=await readFile(new URL(`../${folder}/${name}`,import.meta.url));assert.equal(createHash('sha256').update(raw).digest('hex'),checksum);
    for(const row of raw.toString('utf8').trim().split('\n').map(JSON.parse)){
      for(const field of Object.keys(row))assert(permitted[name.replace('.jsonl','')].has(field),`Unexpected public field ${field}`);
      if(name==='teaches.jsonl'){
        assert(['draft','machine_reviewed'].includes(row.review_status));
        if(Object.hasOwn(row,'standard_anchor'))assert.equal(row.standard_anchor,null,'A populated standard anchor requires an audited public projection');
        if(row.review_status==='machine_reviewed'){
          const meta=row.review_meta;assert(meta&&typeof meta==='object'&&!Array.isArray(meta));
          assert.deepEqual(Object.keys(meta).sort(),['reviewer','reviewed_at','method','model','prompt_version','run_id'].sort());
          assert(['llm-review','deterministic-code'].includes(meta.reviewer));assert.equal(meta.method,'per_item');
          assert.equal(meta.model,meta.reviewer==='deterministic-code'?'deterministic-code':'gpt-6.1-sol');
          if(meta.reviewer==='deterministic-code')assert.equal(row.method,'literal-name');
          assert.equal(new Date(meta.reviewed_at).toISOString(),meta.reviewed_at);assert.match(meta.prompt_version,/^ct-auto-review-v\d+$/);assert.match(meta.run_id,/^ct-auto-[0-9a-f]{20}$/);
        }else assert.equal(row.review_meta,undefined,'Draft edges must not acquire a machine review during publication');
      }
    }
  }
});
