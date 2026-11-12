import test from 'node:test';
import assert from 'node:assert/strict';
import {createModel,pathEvidence} from '../web/model.mjs';

test('path evidence counts upstream candidates without confusing taxonomy or unrelated edges',()=>{
  const nodes=['basic','middle','target','topic','unrelated'].map(key=>({key,node_kind:key==='topic'?'topic':'knowledge_point'}));
  const model=createModel({nodes,edges:[[0,1,'PREREQUISITE',1,'candidate'],[1,2,'PREREQUISITE',1,'reviewed'],[2,3,'REFINES',1,null],[4,0,'REFINES',1,null]]});
  assert.deepEqual(pathEvidence(model,'target'),{hasPrerequisites:true,candidatePrerequisites:1});
  assert.deepEqual(pathEvidence(model,'basic'),{hasPrerequisites:false,candidatePrerequisites:0});
});

test('a curriculum-only concept does not acquire a learning sequence from its Topic link',()=>{
  const model=createModel({nodes:[{key:'music.senior.theory.pitch',node_kind:'knowledge_point'},{key:'music.senior.theory',node_kind:'topic'}],edges:[[0,1,'REFINES',1,null]]});
  assert.deepEqual(pathEvidence(model,'music.senior.theory.pitch'),{hasPrerequisites:false,candidatePrerequisites:0});
});
