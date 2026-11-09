import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPublicSite,verifyArtifactPaths} from '../scripts/verify-public-site.mjs';
test('The complete Pages artifact contains only the approved public site and data',async()=>{
  const result=await verifyPublicSite();assert.equal(result.ok,true);assert.equal(result.files,51+result.coverImages);
});
test('Publication rejects manuscript files, local credentials, and other unexpected additions',()=>{
  const allowed=new Set(['index.html','data/graph.json']);
  for(const unwanted of ['main.tex','main.pdf','sec/4_experiments.tex','.preview/github-access.json','.env','.git/config'])assert.throws(()=>verifyArtifactPaths(['index.html','data/graph.json',unwanted],allowed),/outside the public-site allowlist/);
});
