const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=(a,b,n)=>{const x=clamp((n-a)/(b-a));return x*x*(3-2*x);};
const bell=(h,center,width)=>Math.exp(-Math.pow((h-center)/width,2));

// An authored arc keeps both horizons in the café window. It is the little
// room's own day, independent of the visitor's geography and system timezone.
export function jiangnanSolarState(hour){
  hour=((Number.isFinite(hour)?hour:21)%24+24)%24;
  const progress=clamp((hour-6)/12),height=Math.sin(progress*Math.PI);
  const azimuth=-.30+progress*.75,elevation=.28+height*.66;
  const sunStrength=smooth(5.9,6.15,hour)*(1-smooth(17.85,18.1,hour));
  const golden=Math.min(1,bell(hour,6.7,.9)+bell(hour,17.35,.95));
  const sunset=bell(hour,18.05,1.05),dawn=bell(hour,5.9,1.05);
  return {sunDirection:[Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),-Math.cos(azimuth)*Math.cos(elevation)],
    sunStrength,sunRadius:.012+golden*.006,golden,sunset,dawn,
    reflectionStrength:sunStrength*(.12+Math.pow(1-height,2)*1.3)*(1+golden*.9),
    daylight:smooth(5,8,hour)*(1-smooth(17,19.3,hour)),
    phase:hour<5||hour>=19.3?'night':hour<8?'dawn':hour<16.5?'day':hour<18.2?'sunset':'twilight'};
}
