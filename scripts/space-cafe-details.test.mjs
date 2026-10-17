import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parse} from 'yaml';
import * as THREE from '../assets/js/vendor/three.module.min.js';
import {WORLD_COLLIDERS,stepWalk} from '../assets/js/space/world-state.mjs';
import {CUP,CUP_PROFILE,SAUCER_PROFILE,SHELVES,SHELF_THICKNESS,bookLayout,inspectView,wrapBookText,tabletopProfile} from '../assets/js/space/world-details.mjs';
const books=parse(fs.readFileSync(new URL('../data/travel.yml',import.meta.url),'utf8')).books;
test('ceramic foot contacts its supporting surface; the open bowl contains liquid below its rim',()=>{
  assert.equal(Math.min(...SAUCER_PROFILE.map(p=>p[1])),0);
  assert.equal(Math.min(...CUP_PROFILE.map(p=>p[1])),0);
  assert.equal(CUP.bodyBase,SAUCER_PROFILE[0][1]);
  assert.ok(CUP.radius*2>=.13&&CUP.radius*2<=.15);
  assert.ok(CUP.height>=.075&&CUP.height<=.09);
  assert.ok(CUP.liquidY<CUP.height-.006);
  assert.ok(CUP.liquidRadius<.063);
});
test('all ten source books have supported real-size volumes within the original shelf footprint',()=>{
  assert.equal(books.length,10);const layout=bookLayout(books);assert.equal(layout.filter(b=>b.face).length,4);
  for(const spec of layout){assert.ok(spec.height>=.23&&spec.height<=.30);assert.ok(spec.thickness>=.02&&spec.thickness<=.045);assert.ok(spec.width>=.16&&spec.width<=.2);assert.ok(SHELVES.some(y=>Math.abs(spec.supportY-y-SHELF_THICKNESS/2)<1e-9));assert.ok(spec.z-spec.width/2>=-2.35&&spec.z+spec.width/2<=1.15);assert.ok(spec.x>=-6.825&&spec.x<=-6.395);}
  const authored=layout.filter(b=>b.face);assert.equal(new Set(authored.map(b=>`${b.supportY}:${b.z}`)).size,4);
});
test('the shared atlas wraps every real English and Chinese title without truncating text',()=>{
  for(const book of books)for(const title of [book.title_zh,book.title_en]){const lines=wrapBookText(title,s=>Array.from(s).length*12,164);assert.equal(lines.join('').replace(/\s/g,''),title.replace(/\s/g,''));assert.ok(lines.every(line=>Array.from(line).length*12<=164));}
});
test('coffee and bookshelf views face their actual contents in portrait and landscape cameras',()=>{
  for(const aspect of [320/844,390/844,1440/900])for(const kind of ['coffee','books']){const view=inspectView(kind,aspect);assert.ok([...view.position,...view.target,view.fov].every(Number.isFinite));assert.ok(view.position[1]>=1.1);assert.ok(view.fov>=38&&view.fov<=50);if(kind==='coffee'){assert.equal(view.target[0],-.05);assert.equal(view.target[2],1.3);assert.ok(view.position[1]>view.target[1]);}else assert.ok(view.position[0]>view.target[0]);}
  assert.equal(inspectView('invented'),null);
});

test('every physical book fits the bookshelf close view in all three real viewport aspects',()=>{
  for(const aspect of [320/740,390/844,1440/900]){const view=inspectView('books',aspect),camera=new THREE.PerspectiveCamera(view.fov,aspect,.08,220);camera.position.set(...view.position);camera.lookAt(new THREE.Vector3(...view.target));camera.updateMatrixWorld();
    for(const spec of bookLayout(books))for(const x of [-1,1])for(const y of [0,1])for(const z of [-1,1]){const point=new THREE.Vector3(spec.x+x*(spec.face?spec.thickness:spec.width)/2,spec.baseY+y*spec.height,spec.z+z*(spec.face?spec.width:spec.thickness)/2).project(camera);assert.ok(Math.abs(point.x)<=.94&&Math.abs(point.y)<=.94,`${spec.book.title_zh}: aspect ${aspect} projects (${point.x},${point.y})`);assert.ok(point.z>-1&&point.z<1);}}
});

test('the shared 64-segment tabletop has a fine physical bevel and retains each table support height and radius',()=>{
  const profile=tabletopProfile(),geo=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),64);
  assert.equal(geo.parameters.segments,64);assert.ok(profile.some(([r,y])=>r<1&&r>.99&&y>.0315&&y<.035));
  for(const radius of [.50,.55]){const geometry=geo.clone().scale(radius,1,radius).translate(0,.75,0);geometry.computeBoundingBox();assert.ok(Math.abs(geometry.boundingBox.max.y-.785)<1e-6);assert.ok(Math.abs(geometry.boundingBox.min.y-.715)<1e-6);assert.ok(Math.abs(geometry.boundingBox.max.x-radius)<1e-6);assert.ok(radius*.0065>=.003&&radius*.0065<=.004);geometry.dispose();}geo.dispose();
});

test('the four authored books rest on contained L stands and contact their rear supports',()=>{
  const authored=bookLayout(books).filter(b=>b.face);assert.equal(authored.length,4);
  for(const spec of authored){const[foot,back]=spec.stand;assert.ok(Math.abs(foot.position[1]+foot.size[1]/2-spec.baseY)<1e-12);assert.ok(Math.abs(foot.position[1]-foot.size[1]/2-spec.supportY-CUP.epsilon)<1e-12);assert.ok(Math.abs(back.position[0]+back.size[0]/2-(spec.x-spec.thickness/2))<1e-12);assert.ok(Math.abs(back.position[1]-back.size[1]/2-spec.baseY)<1e-12);for(const plate of spec.stand){assert.ok(plate.position[0]-plate.size[0]/2>=-6.825&&plate.position[0]+plate.size[0]/2<=-6.395);assert.ok(plate.position[2]-plate.size[2]/2>=-2.35&&plate.position[2]+plate.size[2]/2<=1.15);}}
});
test('the standing table-side camera begins outside the unchanged visitor collider and can roam freely',()=>{
  const start={x:.85,z:2.45},yaw=Math.atan2(1.05,1.05);assert.ok(!WORLD_COLLIDERS.some(b=>start.x>b.minX-.22&&start.x<b.maxX+.22&&start.z>b.minZ-.22&&start.z<b.maxZ+.22));
  for(const input of [{forward:1},{forward:-1},{right:1},{right:-1}]){const next=stepWalk(start,yaw,input,.04);assert.ok(Math.hypot(next.x-start.x,next.z-start.z)>.05);}
  for(const aspect of [320/740,390/844,1440/900]){const camera=new THREE.PerspectiveCamera(54,aspect,.08,220);camera.position.set(.85,1.52,2.45);camera.lookAt(new THREE.Vector3(-.2,1,1.4));camera.updateMatrixWorld();for(const point of [[-.05,.865,1.3],[-.37,.809,1.5]]){const projected=new THREE.Vector3(...point).project(camera);assert.ok(Math.abs(projected.x)<.95&&Math.abs(projected.y)<.95);}}
});

test('the six real spines fit their close view in portrait and landscape without changing the whole-shelf plan',()=>{
  const spines=bookLayout(books).filter(b=>!b.face);assert.equal(spines.length,6);
  for(const aspect of [320/740,390/844,540/360,1440/900]){const view=inspectView('spines',aspect),camera=new THREE.PerspectiveCamera(view.fov,aspect,.08,220);camera.position.set(...view.position);camera.lookAt(new THREE.Vector3(...view.target));camera.updateMatrixWorld();assert.equal(view.fov,42);
    for(const spec of spines)for(const x of [-1,1])for(const y of [0,1])for(const z of [-1,1]){const point=new THREE.Vector3(spec.x+x*spec.width/2,spec.baseY+y*spec.height,spec.z+z*spec.thickness/2).project(camera);assert.ok(Math.abs(point.x)<.94&&Math.abs(point.y)<.94,`${spec.book.title_zh} ${aspect} (${point.x},${point.y})`);}}
});
