const nativeBudget=Object.freeze({maxPixels:Infinity,maxPixelRatio:1.5,shadowSize:1536});
const softwareBudget=Object.freeze({maxPixels:384000,maxPixelRatio:1.5,shadowSize:512});

// Capability-based, including ordinary visitors using software WebGL. Unknown
// or privacy-restricted renderers keep the existing hardware rendering path.
export function worldRenderBudget(gl){
  try {
    const debug=gl?.getExtension('WEBGL_debug_renderer_info');
    const name=debug?String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)||''):'';
    if(/SwiftShader|llvmpipe|softpipe|swrast|software rasterizer/i.test(name))return softwareBudget;
  }catch{}
  return nativeBudget;
}

export function worldPixelRatio(width,height,dpr,budget){
  const native=Math.min(dpr,budget.maxPixelRatio);
  return width>0&&height>0?Math.min(native,Math.sqrt(budget.maxPixels/(width*height))):native;
}
