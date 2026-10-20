import {createRainRoom} from './rain-room.js';
import {createRendererController} from './rain-room-state.mjs';

// The photographic room and six spatial rooms use the same workspace owner.
// Three.js is fetched only when a spatial room is selected.
export function createCafeWorld(options) {
  const config=JSON.parse(document.querySelector('[data-space-world-module]').textContent);
  const controller=createRendererController({
    load:async id=>id==='jiangnan'?createRainRoom:(await import(config.spatial)).createCafeWorld,
    create:(factory,theme)=>factory({...options,theme}),onBusy:value=>options.onTravel?.(value)
  });
  const initial=controller.select(options.theme);
  const firstFrame=initial.then(result=>{if(result.status!=='ready')throw result.error||new Error('Scene unavailable');return true;});
  // Existing focus handoffs read mode immediately after invoking inspect/restore.
  const call=name=>(...args)=>controller.current?controller.current[name]?.(...args):initial.then(()=>controller.current?.[name]?.(...args));
  return {
    firstFrame,start:call('start'),focus:call('focus'),leave:call('leave'),outside:call('outside'),
    inspect:call('inspect'),restoreInspection:call('restoreInspection'),interactCat:call('interactCat'),
    wake(){controller.current?.wake();},setQuiet(value){controller.setQuiet(value);},
    async setTheme(id){const result=await controller.select(id);if(result.status==='failed')options.onFailure?.();return result.status==='ready';},
    get mode(){return controller.current?.mode||'intro';},dispose(){controller.dispose();}
  };
}
