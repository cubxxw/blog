import {createRendererController} from './rain-room-state.mjs';

// The private night room and the six outdoor variants share one live workspace.
export function createCafeWorld(options) {
  const config=JSON.parse(document.querySelector('[data-space-world-module]').textContent);
  const controller=createRendererController({
    load:async id=>{
      const module=await import(id==='jiangnan'?config.jiangnan:config.spatial);
      options.onBootStage?.('module');return module.createCafeWorld;
    },
    create:(factory,theme)=>{
      const world=factory({...options,theme});options.onBootStage?.('room');return world;
    },onBusy:value=>options.onTravel?.(value)
  });
  const initial=controller.select(options.theme);
  const firstFrame=initial.then(result=>{if(result.status!=='ready')throw result.error||new Error('Scene unavailable');return true;});
  // Existing focus handoffs read mode immediately after invoking inspect/restore.
  const call=name=>(...args)=>controller.current?controller.current[name]?.(...args):initial.then(()=>controller.current?.[name]?.(...args));
  return {
    firstFrame,start:call('start'),focus:call('focus'),leave:call('leave'),outside:call('outside'),
    inspect:call('inspect'),restoreInspection:call('restoreInspection'),interactCat:call('interactCat'),
    toggleObject:call('toggleObject'),selectRecord:call('selectRecord'),toggleMusic:call('toggleMusic'),
    wake(){controller.current?.wake();},setQuiet(value){controller.setQuiet(value);},
    async setTheme(id){const result=await controller.select(id);if(result.status==='failed')options.onFailure?.();return result.status==='ready';},
    get mode(){return controller.current?.mode||'intro';},dispose(){controller.dispose();}
  };
}
