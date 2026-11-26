import test from 'node:test';
import assert from 'node:assert/strict';
import {createModel,findNodes,neighborhood,STAGES,standardLabel} from '../web/model.mjs';
import {volumeLabel} from '../web/textbook-views.mjs';

test('University filter and prerequisite neighborhood preserve K12 context',()=>{
  const nodes=[
    {key:'mathematics.senior.vectors.vector',name:'向量',subject:'mathematics',stage:'senior',node_kind:'knowledge_point'},
    {key:'mathematics.university.linear-algebra.matrix-rank',name:'矩阵的秩',subject:'mathematics',stage:'university',node_kind:'knowledge_point'},
  ];
  const model=createModel({nodes,edges:[[0,1,'PREREQUISITE']]});
  assert.equal(STAGES.university,'大学');
  assert.deepEqual(findNodes(model,'',{stage:'university'}).map(n=>n.name),['矩阵的秩']);
  assert.deepEqual(findNodes(model,'',{stage:'senior'}).map(n=>n.name),['向量']);
  assert.equal(neighborhood(model,nodes[1].key).nodes.length,2);
  assert.equal(volumeLabel({stage:'university',grade:null,volume:'vol1',volume_label:'线性代数'}),'线性代数');
});

test('University sources are teaching syllabi; K12 labels retain their meaning',()=>{
  assert.equal(standardLabel({applicable_stage:'university'}),'教学大纲');
  assert.equal(standardLabel({school_stage:'大学'}),'教学大纲');
  assert.equal(standardLabel({},'university'),'教学大纲');
  assert.equal(standardLabel({applicable_stage:'senior'},'university'),'课程标准');
  assert.equal(standardLabel({standard_family:'gaokao-outline',applicable_stage:'senior'}),'考试大纲');
  assert.equal(standardLabel({applicable_stage:'primary'}),'课程标准');
});
