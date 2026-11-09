import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveCover} from '../web/covers.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../dist/'+p,import.meta.url),'utf8'));
const catalog=await read('assets/covers/catalog.json'),manifest=await read('data/manifest.json');
const books=(await Promise.all(manifest.scopes.map(s=>read(`data/resources/${s.subject}/${s.stage}.json`)))).flatMap(s=>s.textbooks);
const byId=new Map(books.map(b=>[b.textbook_id,b]));
test('Cover associations resolve to real textbook volumes without crossing subject, publisher or volume',()=>{
 assert.ok(Object.keys(catalog.covers).length>0);
 for(const [bookId,coverId]of Object.entries(catalog.byTextbook)){
  assert.ok(byId.has(bookId));const resolved=resolveCover(byId.get(bookId),catalog);
  assert.equal(resolved,catalog.covers[coverId]);assert.equal(resolved.editionVerified,false);
 }
 const upper=books.find(b=>b.textbook_id==='renjiao-2022.mathematics.primary.g3-vol1');
 const lower=books.find(b=>b.textbook_id==='renjiao-2022.mathematics.primary.g3-vol2');
 assert.ok(resolveCover(upper,catalog));assert.ok(resolveCover(lower,catalog));
 assert.notEqual(resolveCover(upper,catalog).asset,resolveCover(lower,catalog).asset);
 assert.equal(resolveCover({...upper,volume:'vol2'},catalog),null);
 assert.equal(resolveCover({...upper,publisher:'Unknown publisher'},catalog),null);
 assert.equal(resolveCover({...upper,textbook_id:'unmatched-volume'},catalog),null);
});
test('README concept examples point to real graph nodes',async()=>{
 const graph=await read('data/graph.json'),keys=new Set(graph.nodes.map(n=>n.key));
 const readme=await readFile(new URL('../README.md',import.meta.url),'utf8');
 for(const [,key]of readme.matchAll(/#\/concept\/([^\s)"<>]+)/g))assert.ok(keys.has(decodeURIComponent(key)),'Unknown README concept: '+key);
});
