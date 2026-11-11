import test from 'node:test';import assert from 'node:assert/strict';
import {groupTextbooks,catalogForGroup,editionLabel,sourceUrl} from '../web/textbook-views.mjs';
const book={textbook_id:'book-a',publisher:'人民教育出版社',grade:'grade3',volume:'vol1'};
const chapter={chapter_id:'main-1',textbook_id:'book-a',order:1};
const source={source_id:'source-a',textbook:{...book,textbook_id:'source-book'},existing_textbook_ids:['book-a'],preferred_textbook_id:'book-a',
  chapters:[{chapter_id:'source-2',textbook_id:'source-book',order:2},{chapter_id:'source-1',textbook_id:'source-book',order:1}],chapterConcepts:{'source-2':[{id:3}]}};
const resources={textbooks:[book],chapters:[chapter],chapterConcepts:{'main-1':[{id:1}]},sourceViews:[source]};
test('a concept with only source mappings reaches an existing book and opens that source',()=>{
  const groups=groupTextbooks(resources,{teaches:[],sourceTeaches:[{source_id:'source-a',from:'source-2'}]});
  assert.equal(groups.length,1);assert.equal(groups[0].book.textbook_id,'book-a');
  const selected=catalogForGroup(resources,groups[0]);assert.equal(selected.source.source_id,'source-a');
  assert.strictEqual(selected.chapters,source.chapters);assert.deepEqual(selected.chapterConcepts,source.chapterConcepts);
  assert.strictEqual(catalogForGroup(resources,groups[0],'canonical').chapters,resources.chapters);
});
test('a source is not counted as another book and its chapter order is not mixed into the main catalog',()=>{
  const before=JSON.stringify(resources),groups=groupTextbooks(resources,{teaches:[{from:'main-1'}],sourceTeaches:[{source_id:'source-a',from:'source-2'}]});
  assert.equal(groups.length,1);assert.equal(groups[0].sources.length,1);
  assert.strictEqual(catalogForGroup(resources,groups[0]).chapters,resources.chapters);
  assert.strictEqual(catalogForGroup(resources,groups[0],'source-a').chapters,source.chapters);
  assert.equal(JSON.stringify(resources),before);
});
test('a series linked to multiple edition records is represented once for a source-only concept',()=>{
  const second={...book,textbook_id:'book-b'},ambiguous={...source,existing_textbook_ids:['book-a','book-b'],preferred_textbook_id:null};
  const groups=groupTextbooks({...resources,textbooks:[book,second],sourceViews:[ambiguous]},{sourceTeaches:[{source_id:'source-a',from:'source-2'}]});
  assert.equal(groups.length,1);assert.deepEqual(groups[0].sources[0].existing_textbook_ids,['book-a','book-b']);
});
test('unknown editions and source URLs are displayed without invented metadata',()=>{
  assert.equal(editionLabel(book),'版次未确认');assert.equal(editionLabel({...book,edition:'2013'}),'目录版本 2013');
  assert.equal(sourceUrl({source_url:'javascript:alert(1)'}),null);
  assert.equal(sourceUrl({source_url:'https://example.com/ChinaTextbook/book'}),null);
  assert.equal(sourceUrl({source_url:'https://github.com/TapXWorld/ChinaTextbook/blob/hash/book.pdf'}),'https://github.com/TapXWorld/ChinaTextbook/blob/hash/book.pdf');
});
