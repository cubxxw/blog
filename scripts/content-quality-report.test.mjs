import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBaseline, githubAnnotation, runSourceQuality } from './lib/content-quality-report.mjs';
import { analyzeMarkdown } from './lib/content-markdown.mjs';

const issue = (prefix='') => analyzeMarkdown({file:'x.md',text:prefix+'| a | b |\n| --- | --- --- |\n| 1 | 2 |'}).diagnostics.find(d => d.ruleId === 'table-delimiter');
test('precise baseline survives moved lines but never changed evidence', () => {
  const d=issue(); const baseline=[{ruleId:d.ruleId,file:d.file,fingerprint:d.fingerprint,reason:'Reviewed historical malformed table'}];
  const moved=applyBaseline({scope:['x.md'],diagnostics:[issue('\n\n')],baseline});
  assert.equal(moved.ok,true); assert.equal(moved.waived.length,1);
  assert.equal(moved.mode,'enforce');
  const changed = analyzeMarkdown({file:'x.md',text:'| changed | b |\n| --- --- | --- |\n| 1 | 2 |'}).diagnostics.find(d=>d.ruleId==='table-delimiter');
  assert.equal(applyBaseline({scope:['x.md'],diagnostics:[changed],baseline}).ok,false);
});
test('report-only stays distinguishable and does not erase errors', () => {
  const result=applyBaseline({scope:['x.md'],diagnostics:[issue()],baseline:[],mode:'report-only'});
  assert.equal(result.mode,'report-only'); assert.equal(result.ok,false);
  assert.throws(()=>applyBaseline({scope:[],diagnostics:[],baseline:[],mode:'quiet'}),/mode/i);
});
test('unknown rules, missing explanations and hard gate waivers fail closed', () => {
  for (const entry of [{ruleId:'unknown',file:'x',fingerprint:'a'.repeat(64),reason:'Reason'}, {ruleId:'table-delimiter',file:'x',fingerprint:'a'.repeat(64),reason:''}, {ruleId:'frontmatter-draft',file:'x',fingerprint:'a'.repeat(64),reason:'Not allowed'}]) {
    assert.throws(()=>applyBaseline({scope:[],diagnostics:[],baseline:[entry]}), /baseline/i);
  }
});
test('annotations cannot inject commands and reports sort stably', () => {
  const d={...issue(),file:'x,y:z%\n.md',message:'Oops\r\n::error::escape%'};
  const output=githubAnnotation(d);
  assert.equal(output.split('\n').length,1);
  assert.match(output,/x%2Cy%3Az%25%0A.md/);
  assert.match(output,/Oops%0D%0A::error::escape%25/);
});
test('source runner rejects ambiguous or implicit scope', async () => {
  await assert.rejects(runSourceQuality({repoRoot:'.'}), /scope|all|changeSet/i);
  await assert.rejects(runSourceQuality({repoRoot:'.',all:true,changeSet:{}}), /scope|all|changeSet/i);
});
