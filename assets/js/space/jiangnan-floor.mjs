// Grain-only crops from the same CC0 photograph have different physical aspect
// ratios. Board edges own the joints; none of the three maps contains a joint.
const GRAIN_RATIOS=[880*.875/96,690*.875/90,610*.875/90,900*.875/90,
  670*.875/90,610*.875/90,850*.875/90,950*.875/90];
const variation=n=>{const value=Math.sin(n*127.1+311.7)*43758.5453123;return value-Math.floor(value);};

export function buildJiangnanFloor({THREE,group,keep,pbr}){
  const material=keep(new THREE.MeshStandardMaterial({color:'#c1b398',roughness:.72}));
  pbr.bind(material,'wood_floor_grain',{normal:.16,roughness:.72,tint:'#c1b398'});
  // The registry still owns loading and disposal. Replace its world projection
  // with native UV sampling for colour, tangent normals and roughness together.
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor=max(roughnessFactor,0.72);');
  };
  material.customProgramCacheKey=()=> 'jiangnan-board-uv-v1';
  const positions=[],normals=[],uvs=[],indices=[],pitch=6.4/26,width=pitch-.002;
  for(let row=0;row<26;row++){
    const patch=Math.floor(variation(row*11+2)*GRAIN_RATIOS.length);
    const period=width/.96*GRAIN_RATIOS[patch],offset=variation(row*17+3);
    const board=new THREE.BoxGeometry(width,.045,4.598),p=board.attributes.position,n=board.attributes.normal,start=positions.length/3;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
      // Store the support plane directly instead of rounding a box half-height
      // and translation twice; fitted chair soles use this same float height.
      positions.push(x-3.2+(row+.5)*pitch,y>0?.0055:-.0395,z-.3);normals.push(nx,ny,nz);
      // Side faces also have a non-degenerate basis for normal derivatives.
      const across=(Math.abs(nx)>.5?y:x)/width+.5;
      const along=(Math.abs(nz)>.5?y+z:z)/period+offset;
      uvs.push((patch+.02+.96*across)/8,along);
    }
    for(const index of board.index.array)indices.push(start+index);
    board.dispose();
  }
  const geometry=keep(new THREE.BufferGeometry());
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
  const floor=new THREE.Mesh(geometry,material);floor.name='jiangnan-long-board-floor';
  floor.castShadow=false;floor.receiveShadow=true;group.add(floor);return floor;
}
