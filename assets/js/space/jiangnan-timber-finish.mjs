// Dry, handled timber on the existing desk and working chair. The photograph
// supplies fibre, not a claim about botanical species or measured surface height.
const FINISH={base:'#817866',roughness:.91,fibre:.64,relief:.00072,polish:.68,warmth:[1.045,1.028,1.005]};

// Positions are existing mesh-local metres; normals keep the overlapping seat
// UVs from putting hand polish on its underside. Supports never receive polish.
const CONTACT_GLSL={
  desk:`float reach=exp(-pow(abs((p.x+.12)/.68),4.0));
float edge=(top*smoothstep(.365,.447,p.z)+smoothstep(.45,.95,n.z)*.68)*reach;
float wrists=top*(exp(-(pow(abs(p.x+.24),2.0)/.030+pow(abs(p.z-.36),2.0)/.006))+exp(-(pow(abs(p.x-.25),2.0)/.025+pow(abs(p.z-.37),2.0)/.006)))*.25;
return clamp(edge*.66+wrists,0.0,1.0);`,
  crest:`float palm=exp(-(pow(abs(abs(p.x)-.298),2.0)/.003+pow(abs(p.z+.025),2.0)/.027))*top;
float carry=exp(-(p.x*p.x/.030+pow(abs(p.y-.925),2.0)/.002))*top*.68;
return clamp(palm+carry,0.0,1.0);`,
  seat:`float facing=smoothstep(.435,.450,p.y);
float basin=exp(-pow(abs(p.x/.19),4.0)-pow(abs((p.z+.025)/.175),4.0))*top*.73;
float lip=exp(-pow(abs(p.x/.195),4.0))*smoothstep(.13,.209,-p.z)*(top+smoothstep(.35,.9,-n.z)*.4)*.4;
return clamp((basin+lip)*facing,0.0,1.0);`,
  support:'return 0.0;'
};

export function createTimberFinish({THREE,textures,resources,wake,isDisposed}) {
  const width=1024,height=512,base=new THREE.Color(FINISH.base).convertLinearToSRGB(),materials=new Map();
  const channel=value=>Math.round(THREE.MathUtils.clamp(value,0,255));
  const makeTexture=(colorSpace,fill)=>{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');context.fillStyle=fill;context.fillRect(0,0,width,height);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=colorSpace;map.anisotropy=4;textures.add(map);return map;
  };
  const colorMap=makeTexture(THREE.SRGBColorSpace,FINISH.base),rough=Math.round(FINISH.roughness*255);
  const roughnessMap=makeTexture(THREE.NoColorSpace,`rgb(${rough},${rough},${rough})`);
  const bumpMap=makeTexture(THREE.NoColorSpace,'#808080');
  let ready=false;

  function make(role) {
    if(materials.has(role))return materials.get(role);
    if(!CONTACT_GLSL[role])throw new Error('Unknown timber role '+role);
    const material=new THREE.MeshStandardMaterial({color:role==='support'?'#e1ded6':role==='desk'?'#ffffff':'#efebe2',map:colorMap,roughness:1,roughnessMap,bumpMap,bumpScale:FINISH.relief,envMapIntensity:.48});
    material.name='dry-elm-'+role;resources.add(material);
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vTimberPosition; varying vec3 vTimberNormal;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTimberPosition=position;vTimberNormal=normal;');
      shader.fragmentShader=`varying vec3 vTimberPosition; varying vec3 vTimberNormal;
float timberContactAt(vec3 p,vec3 n){float top=smoothstep(.45,.92,n.y);${CONTACT_GLSL[role]}}\n`+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float timberContact=timberContactAt(vTimberPosition,normalize(vTimberNormal));
diffuseColor.rgb*=mix(vec3(1.0),vec3(${FINISH.warmth.join(',')}),timberContact);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,${FINISH.polish.toFixed(3)},timberContact);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',THREE.ShaderChunk.normal_fragment_maps.replace('dHdxy_fwd()','dHdxy_fwd()*mix(1.0,.42,timberContact)'));
    };
    material.customProgramCacheKey=()=>`jiangnan-dry-elm-contact-v1-${role}`;
    materials.set(role,material);return material;
  }

  function setPhotograph(source) {
    if(isDisposed?.()||ready)return;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');context.translate(0,height);context.rotate(-Math.PI/2);context.drawImage(source,0,0,height,width);context.setTransform(1,0,0,1,0,0);
    const pixels=context.getImageData(0,0,width,height),luma=new Float32Array(width*height),blur=new Float32Array(luma.length);
    let average=0;
    for(let i=0;i<luma.length;i++){const p=i*4,value=pixels.data[p]*.2126+pixels.data[p+1]*.7152+pixels.data[p+2]*.0722;luma[i]=value;average+=value;}
    average/=luma.length;
    // Fibres run along U after rotation. Separate their photographed detail
    // from the donor's broad red pigment and knot rather than adding new stains.
    for(let x=0;x<width;x++){
      const prefix=new Float32Array(height+1);for(let y=0;y<height;y++)prefix[y+1]=prefix[y]+luma[y*width+x];
      for(let y=0;y<height;y++){const a=Math.max(0,y-19),b=Math.min(height,y+20);blur[y*width+x]=(prefix[b]-prefix[a])/(b-a);}
    }
    const color=colorMap.image.getContext('2d').createImageData(width,height),roughness=roughnessMap.image.getContext('2d').createImageData(width,height),bump=bumpMap.image.getContext('2d').createImageData(width,height);
    for(let i=0;i<luma.length;i++){
      const p=i*4,detail=luma[i]-blur[i],body=THREE.MathUtils.clamp((blur[i]-average)*.075,-2.8,2.8),fibre=THREE.MathUtils.clamp(detail*FINISH.fibre,-18,22),pore=Math.max(0,-detail-5);
      color.data[p]=channel(base.r*255+body+fibre);color.data[p+1]=channel(base.g*255+body*.94+fibre*.94);color.data[p+2]=channel(base.b*255+body*.88+fibre*.87);color.data[p+3]=255;
      const value=channel((FINISH.roughness+Math.min(.05,pore*.0015))*255);
      roughness.data[p]=roughness.data[p+1]=roughness.data[p+2]=value;roughness.data[p+3]=255;
      // This is a restrained luma-derived relief, independent of pigment.
      const heightValue=channel(128+detail*1.9);bump.data[p]=bump.data[p+1]=bump.data[p+2]=heightValue;bump.data[p+3]=255;
    }
    for(const [map,data] of [[colorMap,color],[roughnessMap,roughness],[bumpMap,bump]]){map.image.getContext('2d').putImageData(data,0,0);map.needsUpdate=true;}
    ready=true;wake();
  }

  function endgrain() {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;const context=canvas.getContext('2d');
    context.fillStyle=FINISH.base;context.fillRect(0,0,512,64);
    for(let i=0;i<27;i++){
      context.strokeStyle=i%4?'#211c1518':'#c4baa018';context.lineWidth=.7;
      context.beginPath();context.ellipse(262,168,50+i*16,68+i*9,.025,0,Math.PI*2);context.stroke();
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;textures.add(map);return map;
  }

  return {make,setPhotograph,endgrain};
}
