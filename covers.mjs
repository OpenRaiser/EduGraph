// Covers are curated at build time. Never guess a cover from a publisher alone.
export function resolveCover(book,catalog){
  const id=catalog?.byTextbook?.[book?.textbook_id],cover=catalog?.covers?.[id];
  if(!cover||!/^assets\/covers\/[0-9a-f]{16}\.jpg$/.test(cover.asset)||!cover.source?.startsWith('https://github.com/TapXWorld/ChinaTextbook/blob/'))return null;
  const matched=cover.books?.find(b=>b.textbook_id===book.textbook_id);
  if(!matched||['publisher','subject','stage','grade','volume'].some(k=>matched[k]!==book[k]))return null;
  return cover;
}
