import test from 'node:test';import assert from 'node:assert/strict';
import {indexSourceViews} from '../scripts/source-view-shards.mjs';
const nodes=[{key:'geo',subject:'geography',stage:'junior'},{key:'history',subject:'history',stage:'junior'}];
const textbook={textbook_id:'main',subject:'geography',stage:'junior'};
const input={nodes,textbooks:[textbook],sourceBooks:[{...textbook,textbook_id:'source'}],
  sourceChapters:[{chapter_id:'chapter',textbook_id:'source'}],
  sourceTeaches:[{from:'chapter',to:'history',role:'primary',review_status:'draft',uncertain:true}],
  sourceLinks:[{source_id:'s',source_textbook_id:'source',existing_textbook_ids:['main'],preferred_textbook_id:'main'}]};
test('a cross-subject TEACHES edge is indexed in the target Concept partition',()=>{
  const shards=indexSourceViews(input),geo=shards.get('geography/junior'),history=shards.get('history/junior');
  assert.equal(geo.views.length,1);assert.equal(history.views.length,1);
  assert.equal(geo.conceptMappings.size,0);assert.equal(history.conceptMappings.get('history')[0].source_id,'s');
  assert.deepEqual(history.linkedTextbooks,[textbook]);assert.equal(geo.linkedTextbooks.length,0);
  assert.equal(history.views[0].chapterConcepts.chapter[0].id,1);
  assert.strictEqual(geo.views[0],history.views[0]);
});
test('a source-only scope is retained without fabricating a Concept or textbook counterpart',()=>{
  const scope={...input,sourceBooks:[{textbook_id:'source',subject:'arts',stage:'primary'}],sourceTeaches:[],
    sourceLinks:[{source_id:'s',source_textbook_id:'source',existing_textbook_ids:[],preferred_textbook_id:null}]};
  const result=indexSourceViews(scope).get('arts/primary');
  assert.equal(result.views.length,1);assert.equal(result.conceptMappings.size,0);assert.equal(result.linkedTextbooks.length,0);
});
test('orphan source chapters and Concept references stop the build',()=>{
  assert.throws(()=>indexSourceViews({...input,sourceTeaches:[{from:'missing',to:'history'}]}),/Dangling/);
  assert.throws(()=>indexSourceViews({...input,sourceTeaches:[{from:'chapter',to:'missing'}]}),/Dangling/);
});
