import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';
import {movePreservingState} from '../assets/js/dom-transfer.mjs';
import {createWorkspaceScrollState} from '../assets/js/space/workspace-scroll-state.mjs';

function domFixture() {
  const dom=new JSDOM('<main><div id="css"></div><section id="workspace"><div data-window-body><article><p>Same article</p><pre>Wide code</pre></article></div><textarea>Same note</textarea><div data-library-list><p>Writing</p></div></section></main>');
  const document=dom.window.document,workspace=document.querySelector('#workspace'),reader=workspace.querySelector('[data-window-body]');
  return {dom,document,workspace,reader,code:workspace.querySelector('pre'),note:workspace.querySelector('textarea'),list:workspace.querySelector('[data-library-list]')};
}

test('a parked monitor never overwrites interactive vertical or nested horizontal offsets with clamped zero',()=>{
  const f=domFixture(),state=createWorkspaceScrollState();
  try {
    f.reader.scrollTop=700;f.code.scrollLeft=120;f.note.scrollTop=36;f.list.scrollTop=90;
    assert.equal(state.capture(f.workspace),true);
    for(const node of [f.reader,f.code,f.note,f.list]){node.scrollTop=0;node.scrollLeft=0;}
    assert.equal(state.capture(f.workspace),false,'read-only monitor values cannot replace this checkpoint');
    assert.equal(state.restore(f.workspace),true);
    assert.equal(f.reader.scrollTop,700);assert.equal(f.code.scrollLeft,120);assert.equal(f.note.scrollTop,36);assert.equal(f.list.scrollTop,90);
    f.reader.scrollTop=333;assert.equal(state.restore(f.workspace),false,'a restored checkpoint is consumed once');
    state.capture(f.workspace);f.reader.scrollTop=0;state.restore(f.workspace);assert.equal(f.reader.scrollTop,333,'a new visit captures the current reading position');
  } finally {f.dom.window.close();}
});

test('closed, replaced or navigated scroll owners never receive an old document position',()=>{
  for(const change of ['closed','owner-replaced','article-replaced']){
    const f=domFixture(),state=createWorkspaceScrollState();
    try {
      f.reader.scrollTop=700;state.capture(f.workspace);
      if(change==='closed')f.reader.remove();
      if(change==='owner-replaced'){const replacement=f.reader.cloneNode(true);f.reader.replaceWith(replacement);}
      if(change==='article-replaced')f.reader.replaceChildren(f.document.createElement('article'));
      f.reader.scrollTop=0;state.restore(f.workspace);
      assert.equal(f.reader.scrollTop,0,change);
      const current=f.workspace.querySelector('[data-window-body]');if(current)assert.equal(current.scrollTop,0);
    } finally {f.dom.window.close();}
  }
});

test('disposal releases a parked checkpoint without writing back into the workspace',()=>{
  const f=domFixture(),state=createWorkspaceScrollState();
  try {f.reader.scrollTop=700;state.capture(f.workspace);f.reader.scrollTop=0;state.dispose();assert.equal(state.restore(f.workspace),false);assert.equal(f.reader.scrollTop,0);}
  finally {f.dom.window.close();}
});

// Run the actual attachment functions. Real connected DOM and the transfer
// helper are retained; GPU placement and browser scroll clamping are boundaries.
const source=readFileSync(new URL('../assets/js/space/world-jiangnan.js',import.meta.url),'utf8');
const {parse}=createRequire(import.meta.url)('acorn');
const syntax=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const body=syntax.body.find(node=>node.type==='ExportNamedDeclaration'&&node.declaration?.id?.name==='createCafeWorld').declaration.body.body;
const fn=name=>{const node=body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name);assert.ok(node,name);return source.slice(node.start,node.end);};

function worldFixture() {
  const f=domFixture(),root=f.document.querySelector('main'),css=f.document.querySelector('#css'),canvas=f.document.createElement('canvas');
  canvas.tabIndex=0;root.append(canvas);f.workspace.dataset.surface='desktop';
  f.note.getClientRects=()=>[{width:300,height:120}];
  Object.defineProperties(root,{clientWidth:{value:1440},clientHeight:{value:900}});
  const transitions=[];
  class CSS3DObject {
    constructor(element){this.element=element;this.userData={};this.position={fromArray(){}};this.scale={setScalar(){}};}
    removeFromParent(){}
  }
  const world=runInNewContext(`
    let cssObject=null,standbyClock=null;
    const workspaceScroll=createWorkspaceScrollState();
    const room={screen:{position:[0,1,-2],width:1}},scene={add(){}},renderer={domElement:canvas},css={domElement:cssElement};
    ${['rememberFocus','attachScreen','attachMonitor','attachDesktop','attachComputer'].map(fn).join('\n')}
    ({monitor:attachMonitor,desktop:attachDesktop,computer:attachComputer});
  `,{root,workspace:f.workspace,document:f.document,window:f.dom.window,canvas,cssElement:css,CSS3DObject,createWorkspaceScrollState,movePreservingState,
    roomTime:{at:()=>({label:'22:00'})},clearScreenBounds(){},screenBounds(){},
    surfaceChanged(){transitions.push(f.workspace.dataset.surface);if(f.workspace.dataset.surface==='computer')f.reader.scrollTop=0;}});
  return {...f,world,transitions,hideMonitor(){f.workspace.style.display='none';f.reader.scrollTop=0;f.code.scrollLeft=0;}};
}

test('the production monitor/desktop lifecycle restores the same reader after its out-of-view plane was hidden',()=>{
  const f=worldFixture();
  try {
    const reader=f.reader,article=reader.firstChild;reader.scrollTop=700;f.code.scrollLeft=120;
    f.world.monitor();assert.equal(reader.scrollTop,700);
    f.hideMonitor();assert.equal(reader.scrollTop,0);
    f.world.monitor();f.hideMonitor(); // Repeated read-only presentation must not capture zero.
    f.world.desktop();assert.equal(f.workspace.dataset.surface,'desktop');assert.equal(reader.scrollTop,700);assert.equal(f.code.scrollLeft,120);
    assert.equal(f.workspace.querySelector('[data-window-body]'),reader);assert.equal(reader.firstChild,article);
    assert.deepEqual(f.transitions,['monitor','monitor','desktop']);
  } finally {f.dom.window.close();}
});

test('the production framed/expanded lifecycle restores after surface layout and preserves the current note selection',()=>{
  const f=worldFixture();
  try {
    f.reader.scrollTop=700;f.note.focus();f.note.setSelectionRange(2,7,'backward');
    f.world.computer();assert.equal(f.reader.scrollTop,700,'restoration runs after the surfacechange layout boundary');
    assert.deepEqual([f.note.selectionStart,f.note.selectionEnd,f.note.selectionDirection],[2,7,'backward']);
    f.reader.scrollTop=350;f.world.desktop();assert.equal(f.reader.scrollTop,350);
    assert.equal(f.document.activeElement,f.note);
  } finally {f.dom.window.close();}
});
