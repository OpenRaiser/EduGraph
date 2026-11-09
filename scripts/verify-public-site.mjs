import {readdir,readFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

export function verifyReleaseArchive(archive,version='0.21.0'){
  const listing=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  const types=execFileSync('tar',['-tvzf',archive],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  if(types.some(line=>!['-','d'].includes(line[0])))throw new Error('Release archive must contain only ordinary files and directories.');
  const root=`v${version}`;
  const families=new Set(['changes','exercises','index','keypoints','keys','knowledge-points','standards','standards-alignment','textbook-alignment']);
  for(const raw of listing){
    const name=raw.replace(/\/$/,'');
    if(name==='LICENSE-DATA'||name==='DATA_CARD.md')continue;
    if(name===root||name===`${root}/manifest.json`)continue;
    const parts=name.split('/');
    if(parts.some(p=>p==='..'||p===''||p==='.')||parts[0]!==root||!families.has(parts[1]))throw new Error(`Unexpected file in public data archive: ${raw}`);
    if(!raw.endsWith('/')&&!/\.jsonl?$/.test(name))throw new Error(`Unexpected file type in public archive: ${raw}`);
  }
  if(!listing.includes('LICENSE-DATA')||!listing.includes('DATA_CARD.md'))throw new Error('Public data archive is missing its license or data card.');
  return listing.length;
}
async function listFiles(root,folder=root){
  const found=[];
  for(const e of await readdir(folder,{withFileTypes:true})){
    const p=path.join(folder,e.name),info=await lstat(p);
    if(info.isSymbolicLink())throw new Error('Symbolic links are not allowed in the public artifact.');
    if(info.isDirectory())found.push(...await listFiles(root,p));
    else if(info.isFile())found.push(path.relative(root,p).split(path.sep).join('/'));
  }
  return found;
}
export function verifyArtifactPaths(files,allowed){
  const unexpected=files.filter(f=>!allowed.has(f));
  if(unexpected.length)throw new Error(`Files outside the public-site allowlist: ${unexpected.join(', ')}`);
  const missing=[...allowed].filter(f=>!files.includes(f));
  if(missing.length)throw new Error(`Missing public-site files: ${missing.join(', ')}`);
}
export async function verifyPublicSite(root=fileURLToPath(new URL('../dist/',import.meta.url))){
  const manifest=JSON.parse(await readFile(path.join(root,'data/manifest.json'),'utf8'));
  if(!/^\d+\.\d+\.\d+$/.test(manifest.version))throw new Error('Invalid release version');
  const allowed=new Set(['index.html','404.html','styles.css','app.mjs','model.mjs','network.mjs','.nojekyll','LICENSE','LICENSE-DATA','assets/favicon.svg','assets/figure-2.png','assets/figure-3.png','core/graph.mjs','core/bm25.mjs','core/tokenize.mjs','data/graph.json','data/search.json','data/standards.json','data/manifest.json','data/download.json',`downloads/edugraph-v${manifest.version}.tar.gz`,`downloads/edugraph-v${manifest.version}.tar.gz.sha256`]);
  for(const scope of manifest.scopes){
    if(!/^[a-z]+$/.test(scope.subject)||!['primary','junior','senior'].includes(scope.stage))throw new Error('Invalid public resource partition');
    allowed.add(`data/resources/${scope.subject}/${scope.stage}.json`);
  }
  const files=await listFiles(root);verifyArtifactPaths(files,allowed);
  const archiveEntries=verifyReleaseArchive(path.join(root,`downloads/edugraph-v${manifest.version}.tar.gz`),manifest.version);
  return{ok:true,files:files.length,archiveEntries,version:manifest.version,scope:'Public explorer runtime, approved figures, and public education data only'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await verifyPublicSite(),null,2));
