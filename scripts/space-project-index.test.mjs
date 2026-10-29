import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {projectHomeHTML} from '../assets/js/space/project-home.js';

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const render=(products,zh=false)=>new JSDOM(projectHomeHTML({products,zh,escapeHTML,origin:'https://blog.test'})).window.document;
const first={id:'first',name:'First',url:'https://first.test',stage:'Live',headline:'A real product'};
const featured={id:'featured',name:'Featured',featured:true,url:'https://featured.test',image:'/featured.webp',stage:'Early access'};

test('the featured work leads without duplicating or losing other product destinations',()=>{
 const d=render([first,featured]);
 assert.deepEqual([...d.querySelectorAll('[data-project-card]')].map(n=>n.dataset.projectCard),['featured','first']);
 assert.equal(d.querySelectorAll('[data-project-featured="true"]').length,1);
 assert.equal(d.querySelectorAll('[data-select-product]').length,2);
 assert.equal(d.querySelector('img').src,'https://blog.test/featured.webp');
 assert.equal(d.querySelector('[data-product-view-button="lab"]').textContent,'Product Lab ↗');
 assert.equal(d.querySelector('[data-select-product="first"]').getAttribute('aria-label'),'First · Project details');
});
test('unflagged and empty catalogs stay honest in both languages',()=>{
 const d=render([first],true);assert.equal(d.querySelector('[data-project-card]').dataset.projectCard,'first');
 assert.equal(d.querySelector('[data-select-product]').getAttribute('aria-label'),'First · 查看介绍');
 const empty=render([],true);assert.equal(empty.querySelectorAll('[data-project-card]').length,0);assert.match(empty.body.textContent,/0 个项目/);
});
test('untrusted names, stage text and destinations cannot create active content',()=>{
 const d=render([{...first,id:'<bad>',name:'<img src=x onerror=alert(1)>',stage:'<script>bad</script>',url:'javascript:alert(1)',github:'//evil.test',image:'data:text/html,bad'}]);
 assert.equal(d.querySelectorAll('img,script,a,[onerror]').length,0);
 assert.equal(d.querySelector('[data-select-product]').dataset.selectProduct,'<bad>');
 assert.match(d.querySelector('strong').textContent,/<img/);
});
test('embedded visits retain a browser action while source-only work has one external source link',()=>{
 const embedded=render([{...first,embed:true}]);assert.equal(embedded.querySelector('[data-open="browser"]').dataset.payload,'https://first.test/');
 const source='https://github.com/example/repo',d=render([{...first,url:source,github:source}]);
 const links=d.querySelectorAll('a');assert.equal(links.length,1);assert.match(links[0].textContent,/View source/);assert.equal(links[0].getAttribute('rel'),'noopener noreferrer');
});
