// Alternate source catalogs belong to existing books; never merge their order.
export function editionLabel(book){return book?.edition?`目录版本 ${book.edition}`:'版次未确认';}
export function publisherLabel(book){return typeof book?.publisher==='string'&&book.publisher.trim()?book.publisher:'出版社待确认';}
export function volumeLabel(book){
  if(book?.volume_label)return book.volume_label;
  const grade=book?.grade?.match(/^grade(\d+)$/)?.[1];
  return [grade?`${grade} 年级`:null,book?.volume].filter(Boolean).join(' · ')||'册次待确认';
}
export function sourceUrl(view){
  try{const url=new URL(view?.source_url);return url.protocol==='https:'&&url.hostname==='github.com'&&url.pathname.startsWith('/TapXWorld/ChinaTextbook/')?url.href:null;}catch{return null;}
}
export function groupTextbooks(resources,entry){
  if(!resources)return[];
  const chapterMap=new Map(resources.chapters.map(c=>[c.chapter_id,c]));
  const bookMap=new Map([...resources.textbooks,...(resources.linkedTextbooks??[])].map(b=>[b.textbook_id,b]));
  const sources=new Map((resources.sourceViews??[]).map(v=>[v.source_id,v])),groups=new Map();
  const localBooks=new Set(resources.textbooks.map(b=>b.textbook_id));
  const ensure=id=>{if(!bookMap.has(id))return null;if(!groups.has(id))groups.set(id,{book:bookMap.get(id),canonicalAvailable:localBooks.has(id),mappings:[],sourceMappings:[],sources:[]});return groups.get(id);};
  for(const teach of entry.teaches??[]){const chapter=chapterMap.get(teach.from),group=chapter&&ensure(chapter.textbook_id);if(group)group.mappings.push({teach,chapter});}
  for(const teach of entry.sourceTeaches??[]){
    const source=sources.get(teach.source_id);if(!source)continue;
    const valid=(source.existing_textbook_ids??[]).filter(id=>bookMap.has(id));
    const id=valid.includes(source.preferred_textbook_id)?source.preferred_textbook_id:valid.find(id=>groups.has(id))??valid[0]??source.textbook.textbook_id;
    if(!bookMap.has(id))bookMap.set(id,source.textbook);
    const group=ensure(id),chapter=source.chapters.find(c=>c.chapter_id===teach.from);
    if(group&&chapter){group.sourceOnly=!valid.length;group.sourceMappings.push({teach,chapter,source});}
  }
  for(const group of groups.values())group.sources=[...sources.values()].filter(v=>v.existing_textbook_ids?.includes(group.book.textbook_id)||v.textbook.textbook_id===group.book.textbook_id);
  const priority=b=>publisherLabel(b).includes('人民教育')?0:publisherLabel(b).includes('北京师范')?1:2;
  return [...groups.values()].sort((a,b)=>priority(a.book)-priority(b.book)||publisherLabel(a.book).localeCompare(publisherLabel(b.book),'zh')||Number(a.book.grade?.replace(/\D/g,''))-Number(b.book.grade?.replace(/\D/g,''))||String(a.book.volume).localeCompare(String(b.book.volume)));
}
export function catalogForGroup(resources,group,selectedId){
  let source=group.sources.find(v=>v.source_id===selectedId);
  // If the current concept is evidenced only in a source catalog, open it first.
  if((!selectedId&&!group.mappings.length)||group.sourceOnly||group.canonicalAvailable===false)source??=group.sourceMappings[0]?.source;
  return source?{source,book:source.textbook,chapters:source.chapters,chapterConcepts:source.chapterConcepts??{}}:
    {source:null,book:group.book,chapters:resources.chapters,chapterConcepts:resources.chapterConcepts};
}
