// Track names, performers and licences follow the composer's individual pages.
// Photo sleeves reuse Xinwei Xiong's existing travel photographs.
const records=[
  {id:'night-on-the-docks-sax',title:'Night on the Docks - Sax',titleEn:'Night on the Docks - Sax',artist:'Kevin MacLeod',src:'/audio/space/night-on-the-docks-sax.mp3',cover:'/images/about/journey/07-sakura-bar-480.webp',isrc:'USUAN1100137',duration:174,note:'萨克斯与电钢琴',noteEn:'Tenor sax and electric piano'},
  {id:'long-stroll',title:'Long Stroll',titleEn:'Long Stroll',artist:'Kevin MacLeod',src:'/audio/space/long-stroll.mp3',cover:'/images/about/journey/06-kumano-480.webp',isrc:'USUAN1100174',duration:255,note:'刷鼓、小号与钢琴',noteEn:'Brushed drums, trumpet and piano'},
  {id:'almost-new',title:'Almost New',titleEn:'Almost New',artist:'Kevin MacLeod',src:'/audio/space/almost-new.mp3',cover:'/images/about/journey/05-fuji-480.webp',isrc:'USUAN1800008',duration:203,note:'钢琴与低音弦乐',noteEn:'Piano and basses'},
];
export function createRecordCatalog({covers=[],music}={}){
  return Object.freeze(records.map((record,index)=>Object.freeze({...record,
    src:index===0&&music?music:record.src,cover:covers[index]||record.cover,
    license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
    source:`https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=${record.isrc}`,
    attribution:`${record.titleEn} — Kevin MacLeod (incompetech.com) — CC BY 4.0`,
  })));
}
