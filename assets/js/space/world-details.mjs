// Metres, measured from the supporting surface rather than a mesh centre.
export const CUP = Object.freeze({epsilon:.0006,bodyBase:.005,height:.084,radius:.069,liquidY:.074,liquidRadius:.0615,saucerRadius:.09});
export const CUP_PROFILE = Object.freeze([[0,.003],[.026,.003],[.027,0],[.033,0],[.034,.004],[.036,.008],[.045,.016],[.057,.035],[.066,.060],[.069,.078],[.0685,.082],[.066,.084],[.063,.082],[.0625,.078],[.060,.060],[.052,.037],[.040,.020],[.028,.014],[0,.014]]);
export const SAUCER_PROFILE = Object.freeze([[0,.005],[.030,.005],[.035,.006],[.060,.010],[.084,.014],[.090,.013],[.090,.010],[.064,.005],[.034,.002],[.032,0],[.026,0],[.024,.002],[0,.002]]);
export const SHELVES = Object.freeze([.60,1.22,1.84]);
export const SHELF_THICKNESS=.028;
export const BOOK_STAND=Object.freeze({thickness:.0015,footDepth:.065,footWidth:.12,backHeight:.12,backWidth:.105});
export function bookLayout(books=[]){
  let own=0,other=0;
  return books.map((book,index)=>{
    const face=book.own===true,slot=face?own++:other++,height=[.268,.252,.28,.274,.263,.291,.257,.278,.286,.27][index%10],thickness=[.028,.032,.027,.035,.029,.033][index%6];
    const supportY=SHELVES[face?1+Math.floor(slot/2):0]+SHELF_THICKNESS/2,x=face?-6.49:-6.55,z=face?-1.15+(slot%2)*.56:-1.02+slot*.052;
    const baseY=supportY+CUP.epsilon+(face?BOOK_STAND.thickness:0),stand=face?[
      {position:[x-.004,supportY+CUP.epsilon+BOOK_STAND.thickness/2,z],size:[BOOK_STAND.footDepth,BOOK_STAND.thickness,BOOK_STAND.footWidth]},
      {position:[x-thickness/2-BOOK_STAND.thickness/2,baseY+BOOK_STAND.backHeight/2,z],size:[BOOK_STAND.thickness,BOOK_STAND.backHeight,BOOK_STAND.backWidth]}
    ]:null;
    return {book,index,face,height,thickness,width:.18,supportY,baseY,x,z,stand};
  });
}
// The same content target is used on resize. Portrait cameras step back just
// enough to retain the saucer or the four authored covers, not down at the floor.
export function inspectView(kind,aspect=1){
  if(kind==='coffee')return aspect<.8?{position:[.24,1.27,1.66],target:[-.05,.84,1.30],fov:42}:{position:[.19,1.15,1.59],target:[-.05,.84,1.30],fov:40};
  if(kind==='spines'){const distance=Math.max(aspect>=.8?.52:.36,.36/Math.max(.2,aspect))/(2*Math.tan(42*Math.PI/360))*1.12;return {position:[-6.43+distance,.76,-.89],target:[-6.43,.76,-.89],fov:42};}
  if(kind==='books')return {position:[aspect<.8?-3.8:-4.3,1.40,-.87],target:[-6.43,1.37,-.87],fov:aspect<.8?46:45};
  return null;
}
export function wrapBookText(text,measure,maxWidth){
  const words=String(text||'').match(/[\u3400-\u9fff]|[^\s\u3400-\u9fff]+\s*/gu)||[],lines=[];let line='';
  for(const word of words){if(line&&measure(line+word)>maxWidth){lines.push(line.trim());line='';}if(measure(word)>maxWidth){for(const char of word){if(line&&measure(line+char)>maxWidth){lines.push(line.trim());line='';}line+=char;}}else line+=word;}
  if(line)lines.push(line.trim());return lines;
}

// One shared tabletop profile: x/z scale supplies the .50/.55 m radii, while
// the 70 mm board and 3.5 mm vertical edge remain in world metres.
export function tabletopProfile(){
  const points=[[0,-.035],[1-.0065,-.035]];
  for(let i=1;i<=4;i++){const angle=-Math.PI/2+i*Math.PI/8;points.push([1-.0065+Math.cos(angle)*.0065,-.035+.0035+Math.sin(angle)*.0035]);}
  points.push([1,.035-.0035]);
  for(let i=1;i<=4;i++){const angle=i*Math.PI/8;points.push([1-.0065+Math.cos(angle)*.0065,.035-.0035+Math.sin(angle)*.0035]);}
  points.push([0,.035]);return points;
}
