export const defaultSolarTime = 15 * 60 + 30;
export const solarNightBegins = 19 * 60 + 30;
export const solarTimeRange = Object.freeze({min:5 * 60,max:23 * 60});

// A representative day for the sand table. The light travels from east to
// west across the southern sky and reaches its highest point at noon.
// https://gml.noaa.gov/grad/solcalc/glossary.html
const keyframes = [
  {
    minute:solarTimeRange.min,
    position:[25.1,3.0,6.0],
    sun:{color:'#ffab81',intensity:.37,shadow:.27},
    sky:{color:'#c1b9d6',ground:'#928478',intensity:.84,reflection:.18},
    moon:.34,warmth:.30,gold:.13,twilight:-1,night:.44,
  },
  {
    minute:345,
    position:[24.2,5.5,8.2],
    sun:{color:'#ffc498',intensity:2.5,shadow:.52},
    sky:{color:'#d9d7ec',ground:'#a7988c',intensity:1.13,reflection:.36},
    moon:.11,warmth:.38,gold:.18,twilight:-.73,night:.12,
  },
  {
    minute:480,
    position:[20.5,14.9,8.6],
    sun:{color:'#ffe4c3',intensity:4.7,shadow:.72},
    sky:{color:'#e7f1ff',ground:'#afa89c',intensity:1.40,reflection:.62},
    moon:0,warmth:.32,gold:.16,twilight:0,night:0,
  },
  {
    minute:720,
    position:[0,25.1,9.4],
    sun:{color:'#fff7e9',intensity:5.26,shadow:.71},
    sky:{color:'#edf4ff',ground:'#ada99d',intensity:1.48,reflection:.72},
    moon:0,warmth:.24,gold:.13,twilight:0,night:0,
  },
  {
    minute:defaultSolarTime,
    position:[-17.8,14.8,12.5],
    sun:{color:'#ffe6c4',intensity:5.18,shadow:.77},
    sky:{color:'#edf3f8',ground:'#a9a194',intensity:1.37,reflection:.69},
    moon:0,warmth:.40,gold:.21,twilight:0,night:0,
  },
  {
    minute:1035,
    position:[-23.9,8.8,8.6],
    sun:{color:'#ffd2a2',intensity:4.05,shadow:.71},
    sky:{color:'#e0e4f5',ground:'#a49688',intensity:1.24,reflection:.50},
    moon:0,warmth:.44,gold:.22,twilight:.29,night:0,
  },
  {
    minute:1110,
    position:[-25.4,3.4,6.0],
    sun:{color:'#ffad81',intensity:1.7,shadow:.47},
    sky:{color:'#c7c0df',ground:'#968779',intensity:.96,reflection:.27},
    moon:.14,warmth:.39,gold:.17,twilight:1,night:.24,
  },
  {
    minute:solarNightBegins,
    position:[-25.7,2.8,5.5],
    sun:{color:'#ffbd9b',intensity:0,shadow:.31},
    sky:{color:'#aabbe7',ground:'#8f8478',intensity:.81,reflection:.09},
    moon:.46,warmth:.28,gold:.11,twilight:.44,night:.76,
  },
  {
    minute:1245,
    position:[-25.7,2.8,5.5],
    sun:{color:'#fff3e2',intensity:0,shadow:.51},
    sky:{color:'#9cb6e3',ground:'#8a8477',intensity:.72,reflection:0},
    moon:.65,warmth:.25,gold:.14,twilight:0,night:1,
  },
];

const mix = (a,b,t)=>a+(b-a)*t;

function mixColor(a,b,t) {
  if(t===0||a===b)return a;
  if(t===1)return b;
  let color='#';
  for(const offset of [1,3,5]) {
    const start=parseInt(a.slice(offset,offset+2),16);
    const end=parseInt(b.slice(offset,offset+2),16);
    color+=Math.round(mix(start,end,t)).toString(16).padStart(2,'0');
  }
  return color;
}

export function sampleSolarTime(minutes) {
  const end=keyframes.at(-1).minute;
  const time=Number.isFinite(minutes)
    ?Math.max(solarTimeRange.min,Math.min(end,minutes))
    :defaultSolarTime;
  const upper=keyframes.findIndex(frame=>frame.minute>=time);
  const after=keyframes[upper],before=keyframes[Math.max(0,upper-1)];
  const t=after===before?0:(time-before.minute)/(after.minute-before.minute);
  const blend=t*t*(3-2*t);
  return {
    position:before.position.map((value,i)=>mix(value,after.position[i],t)),
    sunlightColor:mixColor(before.sun.color,after.sun.color,blend),
    sunlightIntensity:mix(before.sun.intensity,after.sun.intensity,blend),
    shadowIntensity:mix(before.sun.shadow,after.sun.shadow,blend),
    skyColor:mixColor(before.sky.color,after.sky.color,blend),
    groundColor:mixColor(before.sky.ground,after.sky.ground,blend),
    skyIntensity:mix(before.sky.intensity,after.sky.intensity,blend),
    reflectedIntensity:mix(before.sky.reflection,after.sky.reflection,blend),
    moonIntensity:mix(before.moon,after.moon,blend),
    warmth:mix(before.warmth,after.warmth,blend),
    gold:mix(before.gold,after.gold,blend),
    twilight:mix(before.twilight,after.twilight,blend),
    nightMix:mix(before.night,after.night,blend),
  };
}
