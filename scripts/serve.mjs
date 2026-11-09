import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const port = Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.gz':'application/gzip','.sha256':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try {
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/EduGraph') {res.writeHead(302,{Location:'/EduGraph/'});return res.end();}
    if(pathname.startsWith('/EduGraph/')) pathname=pathname.slice('/EduGraph'.length);
    const target=path.resolve(root,`.${pathname.endsWith('/')?pathname+'index.html':pathname}`);
    if(!target.startsWith(root+path.sep)&&target!==root) {res.writeHead(403);return res.end();}
    const info=await stat(target);
    if(!info.isFile()) throw new Error('Not file');
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'text/plain; charset=utf-8','Cache-Control':'no-cache'});
    res.end(await readFile(target));
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`EduGraph preview: http://127.0.0.1:${port}/EduGraph/`));
