// Three r160 exposes synchronous reflection/diagnostics through getUniforms().
// Keep shader error checks enabled, but do this work before the first draw and
// yield between resources. Cancellation owns every timer and GPU queue.
export function prepareWorldGpuResources({renderer,scene,camera,getTextures=()=>[],canStart=()=>true,canWork=()=>true,isDisposed=()=>false,onReady,onError,schedule=setTimeout,cancel=clearTimeout}) {
  let ready=false,stopped=false,timer,programs,textures,index=0,textureIndex=0;
  const release=()=>{programs=undefined;textures=undefined;};
  const state={get ready(){return ready;},resume(){if(!alive())return;if(timer!==undefined)cancel(timer);timer=undefined;enqueue(0);},cancel(){ready=false;stopped=true;if(timer!==undefined)cancel(timer);timer=undefined;release();}};
  const alive=()=>!stopped&&!isDisposed();
  const enqueue=delay=>{if(alive())timer=schedule(step,delay);else state.cancel();};
  const fail=error=>{if(!alive()){state.cancel();return;}state.cancel();onError(error);};
  function step(){
    timer=undefined;if(!alive()){state.cancel();return;}
    try{
      if(!canWork()){enqueue(1000);return;}
      if(!programs&&!canStart()){enqueue(10);return;}
      if(!programs){
        if(typeof renderer.compile!=='function'||!Array.isArray(renderer.info?.programs))throw new Error('Renderer shader program interface unavailable');
        renderer.compile(scene,camera);if(!alive()){state.cancel();return;}
        programs=[...renderer.info.programs];
        textures=[...getTextures()].filter(texture=>{
          const image=texture?.image;
          return !texture?.isRenderTargetTexture&&image&&image.complete!==false&&image.naturalWidth!==0&&image.width>0&&image.height>0;
        });
        enqueue(0);return;
      }
      if(textureIndex<textures.length){
        if(typeof renderer.initTexture!=='function')throw new Error('Renderer texture interface unavailable');
        renderer.initTexture(textures[textureIndex++]);enqueue(0);return;
      }
      const program=programs[index];
      if(program){
        if(!program.program||typeof program.getUniforms!=='function')throw new Error('Renderer shader program interface unavailable');
        program.getUniforms();if(!alive()){state.cancel();return;}
        // r160 logs bad shaders without throwing; retain that diagnostic and
        // send the ordinary OS fallback the same failure.
        if(program.diagnostics?.runnable===false)throw new Error('Shader compilation failed');
        index++;
      }
      if(index<programs.length)enqueue(0);
      else{ready=true;stopped=true;release();onReady();}
    }catch(error){fail(error);}
  }
  enqueue(0);return state;
}
