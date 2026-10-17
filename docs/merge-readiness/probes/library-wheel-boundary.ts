import type {Page,Locator} from '@playwright/test';

/* Boundary contract — one CI run, then stop and interpret the receipts.
 * Question: transient input timing versus list compositing/containment/CSS3D?
 * Failure: the original Engineering + Go native wheel850 stays <=100 for5s.
 * Run only after that unchanged failure, first case/retry0; always rethrow it.
 * Controls: A0 original, H compositing hint, A1 original, F 2D, A2 original.
 * Each uses query.fill('Go') for reset, one native wheel, <=5s, original nodes.
 * Out of scope: production changes, programmatic scrolling, new budgets/Gold.
 * One 25s observation deadline includes setup/reset/two-frame reads; each poll
 * gets at most5s of the remaining time, otherwise not-run/inconclusive. The
 * enclosing 90s test budget is unchanged. Reversible A-fail/B-pass/A-fail supports
 * a candidate only with retained geometry; all other patterns are inconclusive.
 * No LayerTree is sampled: will-change is a hint, not proof of a promoted layer.
 */
export async function runLibraryWheelBoundary({page,list,trial,persist}:{page:Page,list:Locator,trial:(name:string,deadline:number)=>Promise<any>,persist:(value:unknown)=>Promise<void>}){
  const deadline=Date.now()+25000,original=(await list.elementHandle())!,observations:any[]=[];
  const restore=async(release=false)=>original.evaluate((el,release)=>{
    const node=el as any;for(const [target,style] of node.__libraryBoundaryStyles||[])style===null?target.removeAttribute('style'):target.setAttribute('style',style);
    if(release){delete node.__libraryBoundaryStyles;delete node.__libraryBoundaryGeometry;}
  },release);
  await original.evaluate(el=>{
    const nodes:HTMLElement[]=[el as HTMLElement],screen=el.closest<HTMLElement>('.space-spatial-screen'),css=el.closest<HTMLElement>('.space-world__css');
    for(let node=screen;node;node=node.parentElement){nodes.push(node);if(node===css)break;}
    (el as any).__libraryBoundaryStyles=nodes.map(node=>[node,node.getAttribute('style')]);
    (el as any).__libraryBoundaryGeometry={screen:screen?.getBoundingClientRect().toJSON(),css:css?.getBoundingClientRect().toJSON(),width:screen?.offsetWidth,height:screen?.offsetHeight,list:el.getBoundingClientRect().toJSON()};
  });
  try{
    for(const name of ['A0-original-2raf','H-compositing-hint','A1-original-2raf','F-flatten-css3d','A2-original-2raf']){
      if(Date.now()>=deadline){observations.push({name,result:{outcome:'not-run',reason:'25s observation deadline exhausted'}});await persist({interpretation:'inconclusive; observation deadline exhausted',observations});console.log('LIBRARY_WHEEL_BOUNDARY',JSON.stringify({name,outcome:'not-run',reason:'25s observation deadline exhausted'}));continue;}
      try{
        await restore();
        await list.locator('xpath=ancestor::*[@data-window-body]').locator('[data-library-query]').fill('Go',{timeout:Math.max(1,deadline-Date.now())});
        await original.evaluate((el,name)=>{
          const node=el as HTMLElement;
          if(name==='H-compositing-hint')node.style.setProperty('will-change','transform');
          if(name==='F-flatten-css3d'){
            const saved=(el as any).__libraryBoundaryGeometry,targets=(el as any).__libraryBoundaryStyles.slice(1);
            for(const [target] of targets){target.style.setProperty('transform','none','important');target.style.setProperty('perspective','none','important');target.style.setProperty('transform-style','flat','important');}
            const screen=targets[0]?.[0];if(screen&&saved.screen&&saved.css){screen.style.setProperty('left','0px');screen.style.setProperty('top','0px');screen.style.setProperty('transform-origin','0 0');screen.style.setProperty('transform',`translate(${saved.screen.x-saved.css.x}px,${saved.screen.y-saved.css.y}px) scale(${saved.screen.width/saved.width},${saved.screen.height/saved.height})`,'important');}
          }
        },name);
        const painted=await page.evaluate(remaining=>new Promise<boolean>(done=>{
          let first=0,second=0;
          const timer=setTimeout(()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);done(false);},Math.max(0,remaining));
          first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{clearTimeout(timer);done(true);});});
        }),deadline-Date.now());
        if(!painted){observations.push({name,result:{outcome:'not-run',reason:'two-frame observation deadline exhausted'}});await persist({interpretation:'inconclusive; two-frame observation deadline exhausted',observations});continue;}
        const sameList=await list.evaluate((el,old)=>el===old,original);
        const before=await original.evaluate(el=>{
          const node=el as HTMLElement,rect=node.getBoundingClientRect(),point={x:rect.x+rect.width/2,y:rect.y+rect.height/2},hit=document.elementFromPoint(point.x,point.y),css=getComputedStyle(node),host=node.closest('[data-window-body]');
          const screen=node.closest<HTMLElement>('.space-spatial-screen')!,saved=(el as any).__libraryBoundaryGeometry,residual=(actual:DOMRect,expected:any)=>Object.fromEntries(['x','y','width','height'].map(key=>[key,Math.abs((actual as any)[key]-expected[key])])),screenResidual=residual(screen.getBoundingClientRect(),saved.screen),listResidual=residual(rect,saved.list);
          return {rect:rect.toJSON(),point,hit:hit?{tag:hit.tagName,class:hit.getAttribute('class'),inside:node.contains(hit)}:null,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,scrollTop:node.scrollTop,query:host?.querySelector<HTMLInputElement>('[data-library-query]')?.value,engineering:host?.querySelector('[data-library-filter="engineering"]')?.getAttribute('aria-pressed'),willChange:css.willChange,overscroll:css.overscrollBehavior,screenResidual,listResidual,geometryMixed:[...Object.values(screenResidual),...Object.values(listResidual)].some(value=>value>1),transforms:(el as any).__libraryBoundaryStyles.slice(1).map(([target]:[HTMLElement])=>{const css=getComputedStyle(target);return {class:target.className,rect:target.getBoundingClientRect().toJSON(),transform:css.transform,perspective:css.perspective,transformStyle:css.transformStyle};}),reachable:rect.width>0&&rect.height>0&&point.x>=0&&point.y>=0&&point.x<innerWidth&&point.y<innerHeight&&!!hit&&node.contains(hit)};
        });
        const reset=sameList&&before.query==='Go'&&before.engineering==='true'&&before.scrollTop===0&&before.scrollHeight>before.clientHeight;
        const result=Date.now()>=deadline?{outcome:'not-run',reason:'25s observation deadline exhausted'}:reset&&before.reachable?await trial(name,deadline):{outcome:'unreachable',reason:'same node/query/reset/capacity/center hit precondition failed'};
        const observation={name,sameList,before,result};observations.push(observation);await persist({interpretation:'pending; only reversible A-fail/B-pass/A-fail with matched geometry can support a candidate',observations});
        console.log('LIBRARY_WHEEL_BOUNDARY',JSON.stringify({name,outcome:result?.outcome,reset,reachable:before.reachable,geometryMixed:before.geometryMixed,screenResidual:before.screenResidual,listResidual:before.listResidual,beforeTop:before.scrollTop,afterTop:result?.diagnostics?.final?.scrollTop,clientHeight:before.clientHeight,scrollHeight:before.scrollHeight,point:before.point,rect:before.rect,hit:before.hit}));
      }finally{await restore();}
    }
    return observations;
  }finally{try{await restore(true);}finally{await original.dispose();}}
}
