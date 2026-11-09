// Runs in GitHub Actions only. Preserve gh-pages history and push fast-forward.
import {mkdtemp,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {verifyPublicSite} from './verify-public-site.mjs';
if(process.env.GITHUB_ACTIONS!=='true')throw new Error('This script is intended for the GitHub Actions publishing workflow.');
const repo=process.env.GITHUB_REPOSITORY,token=process.env.GH_TOKEN;
if(!/^[\w.-]+\/[\w.-]+$/.test(repo??'')||!token)throw new Error('Missing GitHub repository or workflow token');
await verifyPublicSite();
const folder=await mkdtemp(path.join(tmpdir(),'edugraph-pages-'));
await cp(fileURLToPath(new URL('../dist/',import.meta.url)),folder,{recursive:true});
const env={...process.env,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.https://github.com/.extraheader',GIT_CONFIG_VALUE_0:`AUTHORIZATION: basic ${Buffer.from('x-access-token:'+token).toString('base64')}`};
const git=(...args)=>execFileSync('git',args,{cwd:folder,env,encoding:'utf8',stdio:['ignore','pipe','pipe']});
try{
  git('init','-b','gh-pages');git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com');git('remote','add','origin',`https://github.com/${repo}.git`);
  if(git('ls-remote','--heads','origin','gh-pages').trim()){
    git('fetch','--depth=1','origin','gh-pages');git('reset','--mixed','FETCH_HEAD');
  }
  git('add','--all');
  if(!git('status','--porcelain').trim())console.log('gh-pages already matches this build.');
  else{git('commit','-m',`Publish EduGraph ${String(process.env.GITHUB_SHA??'manual').slice(0,12)}`);git('push','origin','HEAD:gh-pages');console.log('Updated gh-pages with the generated site.');}
}catch{throw new Error('Could not update gh-pages. Check repository Actions write permissions and branch protection. No forced push was attempted.');}
