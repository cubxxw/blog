// Shared metre-scale anchors keep the physical workstation, live DOM screen,
// inspection camera, picking and floor collisions in the same coordinate space.
export const JIANGNAN_WINDOW=Object.freeze({centerX:.8,minX:-1.22,maxX:2.82,bottom:.855,top:2.485,glassZ:-2.606});
export const JIANGNAN_DESK=Object.freeze({centerX:.8,width:2.1,backZ:-2.34,frontZ:-1.42,topY:.76});
export const JIANGNAN_WORK_CHAIR=Object.freeze({x:.8,z:-.95,seatY:.455,minX:.48,maxX:1.12,minZ:-1.20,maxZ:-.65});
export const JIANGNAN_READING_CHAIR=Object.freeze({x:-.75,z:-.85,yaw:-.5,seatY:.39,minX:-1.30,maxX:-.20,minZ:-1.37,maxZ:-.32});
export const JIANGNAN_CAT_BED=Object.freeze({x:-1.45,z:-1.93,width:.88,depth:.58,cushionY:.122});
export const JIANGNAN_PHOTO_WALL=Object.freeze([
 {position:[-1.72,2.2,-2.565],width:.64,height:.46,yaw:0},
 {position:[-1.72,1.64,-2.565],width:.64,height:.46,yaw:0},
 {position:[-1.72,1.08,-2.565],width:.64,height:.46,yaw:0},
 {position:[3.15,2.22,-1.55],width:.64,height:.48,yaw:-Math.PI/2},
 {position:[3.15,2.22,-.78],width:.64,height:.48,yaw:-Math.PI/2},
 {position:[3.15,2.22,-.01],width:.64,height:.48,yaw:-Math.PI/2},
 {position:[3.15,1.57,-1.16],width:.68,height:.52,yaw:-Math.PI/2},
 {position:[3.15,1.57,-.31],width:.68,height:.52,yaw:-Math.PI/2}
].map(slot=>Object.freeze({...slot,position:Object.freeze(slot.position)})));
export const JIANGNAN_WORKSTATION=Object.freeze({
 computer:Object.freeze([.8,1.16,-2.05]),
 coffee:Object.freeze([-.02,.844,-1.64]),
 lamp:Object.freeze([-.11,.762,-2.12]),
 lampTarget:Object.freeze([-.11,1.093,-2.12]),
 vase:Object.freeze([.20,.762,-2.16]),
 vaseTarget:Object.freeze([.20,1.033,-2.16]),
 notebook:Object.freeze([.27,.772,-1.57]),
 keyboard:Object.freeze([.8,.777,-1.61]),
 mouse:Object.freeze([1.37,.777,-1.60]),
 pencilPot:Object.freeze([1.66,.762,-2.17]),
 postcards:Object.freeze([.22,.766,-1.93])
});
