// Build both textbook-to-Concept and Concept-to-textbook lookup partitions.
// A source can be visible in several partitions without becoming several books.
export function indexSourceViews({nodes,textbooks,sourceBooks,sourceChapters,sourceTeaches,sourceLinks}) {
  const scopeOf=n=>`${n.subject}/${n.stage}`;
  const nodeIds=new Map(nodes.map((n,i)=>[n.key,i]));
  const books=new Map(textbooks.map(b=>[b.textbook_id,b]));
  const sourceIds=new Set(sourceBooks.map(b=>b.textbook_id));
  const links=new Map(sourceLinks.map(l=>[l.source_textbook_id,l]));
  const chapters=new Map(),teaches=new Map(),chapterBooks=new Map();
  if(sourceIds.size!==sourceBooks.length||links.size!==sourceLinks.length)throw new Error('Duplicate source identity');
  for(const c of sourceChapters){
    if(!sourceIds.has(c.textbook_id)||chapterBooks.has(c.chapter_id))throw new Error('Invalid source chapter identity');
    chapterBooks.set(c.chapter_id,c.textbook_id);
    if(!chapters.has(c.textbook_id))chapters.set(c.textbook_id,[]);
    chapters.get(c.textbook_id).push(c);
  }
  for(const t of sourceTeaches){
    if(!chapterBooks.has(t.from)||!nodeIds.has(t.to))throw new Error('Dangling source TEACHES');
    const id=chapterBooks.get(t.from);
    if(!teaches.has(id))teaches.set(id,[]);
    teaches.get(id).push(t);
  }
  const shards=new Map();
  const shardFor=scope=>{
    if(!shards.has(scope))shards.set(scope,{views:[],linkedTextbooks:[],conceptMappings:new Map()});
    return shards.get(scope);
  };
  for(const book of sourceBooks){
    const link=links.get(book.textbook_id);
    if(!link||books.has(book.textbook_id)||!link.existing_textbook_ids.every(id=>books.has(id)))throw new Error('Invalid source textbook link');
    const ts=teaches.get(book.textbook_id)??[],cc=Object.create(null),scopes=new Set([scopeOf(book)]);
    for(const t of ts){
      const id=nodeIds.get(t.to),scope=scopeOf(nodes[id]);scopes.add(scope);
      (cc[t.from]??=[]).push({id,role:t.role,review_status:t.review_status,uncertain:t.uncertain});
      const index=shardFor(scope).conceptMappings;
      if(!index.has(t.to))index.set(t.to,[]);
      index.get(t.to).push({source_id:link.source_id,from:t.from,role:t.role,review_status:t.review_status,uncertain:t.uncertain});
    }
    const view={source_id:link.source_id,textbook:book,chapters:chapters.get(book.textbook_id)??[],teaches:ts,chapterConcepts:cc,
      existing_textbook_ids:link.existing_textbook_ids,preferred_textbook_id:link.preferred_textbook_id,source_url:link.source_url,catalog_status:link.catalog_status};
    for(const scope of scopes){
      const shard=shardFor(scope);shard.views.push(view);
      for(const id of link.existing_textbook_ids){const b=books.get(id);
        if(scopeOf(b)!==scope&&!shard.linkedTextbooks.some(x=>x.textbook_id===id))shard.linkedTextbooks.push(b);
      }
    }
  }
  return shards;
}
