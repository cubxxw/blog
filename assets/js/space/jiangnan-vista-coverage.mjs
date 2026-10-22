// Measured registration from the approved 2032×774 photograph to the
// 1774×887 continuation study. Coordinates use the texture's bottom-left UVs.
const REGISTRATION=[
  [.7398230086540338,-.005409562930747441,.1432854817268656],
  [-.06285023325126388,.5881972767022035,.25796743765045316],
  [-.11253962993344745,-.01126535831353812,1]
];
const BOTTOM_JOIN=.02,IMAGE_EDGE=.012,PURE_WATER_TOP=.30,PURE_WATER_FADE=.02;
const smooth=(a,b,value)=>{const x=Math.max(0,Math.min(1,(value-a)/(b-a)));return x*x*(3-2*x);};

export function registeredJiangnanVistaUV(u,v){
  if(!Number.isFinite(u)||!Number.isFinite(v))return null;
  const q=REGISTRATION.map(row=>row[0]*u+row[1]*v+row[2]);
  if(q[2]<=1e-6)return null;
  const uv=[q[0]/q[2],q[1]/q[2]];
  return uv.every(Number.isFinite)?uv:null;
}

export function jiangnanVistaWaterSample(u,v){
  if(!Number.isFinite(v)||v>=0)return null;
  const uv=registeredJiangnanVistaUV(u,v);if(!uv)return null;
  const margin=Math.min(uv[0],1-uv[0],uv[1],1-uv[1]);
  const blend=smooth(0,BOTTOM_JOIN,-v)*smooth(0,IMAGE_EDGE,margin)*(1-smooth(PURE_WATER_TOP-PURE_WATER_FADE,PURE_WATER_TOP,uv[1]));
  return blend>0?{uv,blend}:null;
}

// Runtime shading and CPU coverage use the same fitted matrix and fade limits.
// The caller samples the optional image only when the returned z is positive.
const gl=value=>value.toPrecision(17);
const dot=row=>`dot(vec3(${row.map(gl).join(',')}),vec3(raw,1.0))`;
export const JIANGNAN_VISTA_WATER_GLSL=`
vec3 jiangnanVistaWaterContinuation(vec2 raw){
  if(raw.y>=0.0)return vec3(0.0);
  vec3 q=vec3(${REGISTRATION.map(dot).join(',')});
  if(q.z<=0.000001)return vec3(0.0);
  vec2 uv=q.xy/q.z;
  float margin=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));
  float blend=smoothstep(0.0,${gl(BOTTOM_JOIN)},-raw.y)*smoothstep(0.0,${gl(IMAGE_EDGE)},margin)*(1.0-smoothstep(${gl(PURE_WATER_TOP-PURE_WATER_FADE)},${gl(PURE_WATER_TOP)},uv.y));
  return vec3(uv,blend);
}`;
