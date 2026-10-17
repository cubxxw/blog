import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parseFragment} from 'parse5';

function descendants(node) {return [node,...(node.childNodes||[]).flatMap(descendants)];}
for (const [file,marker] of [['travel-book-ai.js','  /* ── DOM handles'],['article-faq.js','  /* ── 1. Eased'],['blog-ai-inline.js','  // Context Management Functions']]) {
  const source=await readFile(new URL('../static/js/'+file,import.meta.url),'utf8');
  assert.ok(source.includes(marker));
  const sandbox={window:{matchMedia:()=>({matches:true}),location:{origin:'https://cubxxw.com'}},document:{getElementById:()=>({getAttribute:()=> 'zh'}),documentElement:{getAttribute:()=> 'zh'}},URL};
  vm.runInNewContext(source.replace(marker,'globalThis.renderMarkdown = parseMarkdown; return;\n'+marker),sandbox);
  test(file+': generated attributes cannot escape an AI Markdown URL',()=>{
    for(const value of ['[x](https://example.test/"onmouseover="window.name=1)','[x](https://example.test/\'onclick=\'alert)','[x](https://example.test/```js\npayload```)', '<img src=x onerror=alert(1)>']) {
      const nodes=descendants(parseFragment(sandbox.renderMarkdown(value)));
      assert.ok(nodes.every(n=>(n.attrs||[]).every(a=>!a.name.startsWith('on'))));
      assert.equal(nodes.some(n=>n.tagName==='img'),false);
    }
  });
  test(file+': protocol-relative and executable URLs are plain text; lookalike origins are external',()=>{
    for(const value of ['[x](//example.test/path)','[x](javascript:alert)','[x](data:text/html,hi)']) {
      assert.equal(descendants(parseFragment(sandbox.renderMarkdown(value))).some(n=>n.tagName==='a'),false);
    }
    const external=descendants(parseFragment(sandbox.renderMarkdown('[x](https://cubxxw.com.evil.test/path)'))).find(n=>n.tagName==='a');
    assert.equal(external.attrs.find(a=>a.name==='target').value,'_blank');
    assert.match(external.attrs.find(a=>a.name==='rel').value,/noreferrer/);
    const local=descendants(parseFragment(sandbox.renderMarkdown('[x](/zh/articles/?a=1&b=2)'))).find(n=>n.tagName==='a');
    assert.equal(local.attrs.find(a=>a.name==='href').value,'/zh/articles/?a=1&b=2');
  });
}
