import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const manifest=await read('dist/data/manifest.json');
test('Source catalogs are separate, bidirectionally linked, and retain uncertainty',async()=>{
  const ids=new Set(),counts={source_views:0,with_catalog:0,chapters:0,teaches:0};
  for(const scope of manifest.scopes){
    const shard=await read(`dist/data/resources/${scope.subject}/${scope.stage}.json`),books=new Set(shard.textbooks.map(b=>b.textbook_id));
    for(const view of shard.sourceViews){
      assert(!ids.has(view.source_id));ids.add(view.source_id);counts.source_views++;counts.with_catalog+=Number(view.chapters.length>0);counts.chapters+=view.chapters.length;counts.teaches+=view.teaches.length;
      assert(!books.has(view.textbook.textbook_id),'A source view must not duplicate a canonical book ID');assert(view.existing_textbook_ids.every(id=>books.has(id)));
      const chapters=new Set(view.chapters.map(c=>c.chapter_id));
      for(const c of view.chapters){assert(!('title'in c)&&!('number'in c));assert.equal(c.textbook_id,view.textbook.textbook_id);if(c.parent_id)assert(chapters.has(c.parent_id));}
      for(const t of view.teaches){assert(chapters.has(t.from));assert.equal(t.review_status,'draft');assert.equal(t.uncertain,true);
        const indexed=view.chapterConcepts[t.from].find(m=>shard.concepts[m.id]?.sourceTeaches.some(x=>x.source_id===view.source_id&&x.from===t.from));assert(indexed);}
      assert.match(view.source_url,/^https:\/\/github\.com\/TapXWorld\/ChinaTextbook\/(blob|tree)\/[a-f0-9]{40}\//);
    }
  }
  assert.deepEqual(counts,manifest.sourceViews.counts);assert.equal(counts.source_views,619);
});
test('Public source files have intact checksums and contain only projected fields',async()=>{
  const folder=`data/source-views-v${manifest.version}`,index=await read(`${folder}/index.json`);
  const permitted={textbooks:new Set('type textbook_id publisher series variant edition subject stage grade volume volume_label source retrieved_at authored_by toc_completeness review_status graph_version'.split(' ')),
    chapters:new Set('type chapter_id textbook_id parent_id level order page_start uncertain note'.split(' ')),
    teaches:new Set('type from to role method authored_by review_status authored_at uncertain note graph_version'.split(' ')),
    'source-links':new Set('source_id source_textbook_id existing_textbook_ids preferred_textbook_id range_match_status catalog_status chapters teaches source_url source_revision'.split(' '))};
  for(const [name,checksum]of Object.entries(index.checksums)){
    const raw=await readFile(new URL(`../${folder}/${name}`,import.meta.url));assert.equal(createHash('sha256').update(raw).digest('hex'),checksum);
    for(const row of raw.toString('utf8').trim().split('\n').map(JSON.parse))for(const field of Object.keys(row))assert(permitted[name.replace('.jsonl','')].has(field),`Unexpected public field ${field}`);
  }
});
