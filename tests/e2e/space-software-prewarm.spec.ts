import {test,expect,type Page} from '../helpers/frozen-site';

test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});

async function usableFallback(page:Page){
  const root=page.locator('[data-bear-workspace]');
  await expect(root).toHaveAttribute('data-world-failed','true');
  if(await page.locator('[data-boot-skip]').isVisible())await page.locator('[data-boot-skip]').click();
  await expect(root).toHaveAttribute('data-cafe-mode','desktop');
  await expect(root).not.toHaveAttribute('data-world-ready','true');
  await expect(page.locator('.space-world__canvas')).toHaveCount(0);
  await page.locator('[data-mac-menu="file"]').click();
  await page.locator('[data-mac-panel="file"] [data-open="notes"]').click();
  await page.locator('[data-note-editor]').fill('The workspace survives GPU preparation failure.');
  await expect(page.locator('[data-note-editor]')).toHaveValue('The workspace survives GPU preparation failure.');
}

for(const fault of ['shader','context'] as const)test(`software GPU ${fault} failure during preparation retains a usable ordinary workspace`,async({page})=>{
  const errors:string[]=[],diagnostics:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')diagnostics.push(m.text());});
  await page.addInitScript(fault=>{
    localStorage.setItem('space:cafe:theme:v2','jiangnan');
    localStorage.setItem('space:cafe:onboarding:v1','seen');
    const probe={injected:0,ready:false,failures:0};
    (window as any).__gpuPreparationProbe=probe;
    new MutationObserver(records=>{for(const record of records){
      const el=record.target as HTMLElement;
      if(record.attributeName==='data-world-ready'&&el.dataset.worldReady==='true')probe.ready=true;
      if(record.attributeName==='data-world-failed'&&el.dataset.worldFailed==='true')probe.failures++;
    }}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-world-ready','data-world-failed']});
    if(fault==='shader'){
      const original=WebGL2RenderingContext.prototype.shaderSource;
      WebGL2RenderingContext.prototype.shaderSource=function(this:WebGL2RenderingContext,shader,source){
        if(!probe.injected&&source.includes('float timberContactAt(')){probe.injected++;source+='\n#error intentional_gpu_preparation_failure\n';}
        return original.call(this,shader,source);
      };
    }else{
      const original=WebGL2RenderingContext.prototype.texSubImage2D;
      WebGL2RenderingContext.prototype.texSubImage2D=function(this:WebGL2RenderingContext,...args:any[]){
        const result=Reflect.apply(original,this,args);
        if(!probe.injected&&this.canvas instanceof HTMLCanvasElement&&this.canvas.classList.contains('space-world__canvas')){
          probe.injected++;const extension=this.getExtension('WEBGL_lose_context');
          queueMicrotask(()=>extension?.loseContext());
        }
        return result;
      } as typeof original;
    }
  },fault);
  await page.goto('/projects/');
  await usableFallback(page);
  expect(await page.evaluate(()=>(window as any).__gpuPreparationProbe)).toEqual({injected:1,ready:false,failures:1});
  if(fault==='shader')expect(diagnostics.some(s=>/intentional_gpu_preparation_failure|Shader Error/.test(s))).toBe(true);
  expect(errors).toEqual([]);
});
