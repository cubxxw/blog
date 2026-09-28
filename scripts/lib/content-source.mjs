import { parseDocument } from 'yaml';
import { parse as parseToml } from 'smol-toml';
import { analyzeMarkdown, diagnostic, frontmatterRange } from './content-markdown.mjs';

export async function checkSource({file,text,tags={}}) {
  const {diagnostics}=analyzeMarkdown({file,text}); const range=frontmatterRange(text);
  const ordinary=/^content\/(?:en|zh)\/(?:ai-agent|engineering|growth)\/posts\/.+\.md$/.test(file) || /^content\/(?:en|zh)\/projects\/(?!_index\.md).+\.md$/.test(file);
  const section=/\/_index\.md$/.test(file); const archetype=file.startsWith('archetypes/');
  let data;
  const add=(ruleId,key,message,{severity='error',waivable=true}={})=>{
    const fmLines=range?.raw.split('\n') ?? [];
    const index=fmLines.findIndex(line=>new RegExp(`^${key}\\s*[:=]`,'i').test(line));
    diagnostics.push(diagnostic({ruleId,file,line:index<0?1:index+2,severity,message,evidence:index<0?`Missing ${key}`:`${fmLines[index]}\n${JSON.stringify(data?.[key] ?? null)}`,waivable}));
  };
  if(!range) {if(ordinary||section||archetype) add('frontmatter-required','frontmatter','Page requires front matter.'); return diagnostics;}
  try {
    if(!range.closed) throw new Error('Unclosed front matter');
    if(range.format==='+++') data=parseToml(range.raw);
    else {const doc=parseDocument(range.raw);if(doc.errors.length) throw doc.errors[0];data=doc.toJS();}
    if(!data || Array.isArray(data) || typeof data!=='object') throw new Error('Expected a front matter mapping');
  } catch(error) {add('frontmatter-parse','frontmatter',`Invalid front matter: ${error.message}`);return diagnostics;}
  for(const key of Object.keys(data)) if(key.toLowerCase()==='draft') add('frontmatter-draft',key,'draft is forbidden; unpublished work stays outside content/.',{waivable:false});
  if(!(ordinary||section||archetype)) return diagnostics;
  const required=ordinary?['title','date','description','type','author','tags','keywords']:['title'];
  for(const key of required) if(data[key]===undefined || data[key]===null || data[key]==='') add('frontmatter-required',key,`Missing required ${key}.`);
  for(const key of ['title','description','type']) if(data[key]!==undefined && typeof data[key]!=='string') add('frontmatter-type',key,`${key} must be a string.`);
  for(const key of ['tags','keywords']) if(data[key]!==undefined && (!Array.isArray(data[key]) || data[key].some(value=>typeof value!=='string' || !value.trim()))) add('frontmatter-type',key,`${key} must be an array of nonempty strings.`);
  if(data.author!==undefined && !(typeof data.author==='string' && data.author.trim()) && !(Array.isArray(data.author) && data.author.length && data.author.every(value=>typeof value==='string'&&value.trim()))) add('frontmatter-type','author','author must be a nonempty string or nonempty array of strings (both supported by Hugo templates).');
  if(ordinary && data.type!==undefined && data.type!=='posts' && !file.includes('/projects/')) add('frontmatter-type','type','Ordinary articles must use type: posts.');
  if(data.date!==undefined && !archetype) {
    const date=String(data.date);
    const stamp=Date.parse(date);
    if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+08:00$/.test(date) || !Number.isFinite(stamp) || new Date(stamp+8*60*60*1000).toISOString().slice(0,19)!==date.slice(0,19)) add('frontmatter-timezone','date','date must be a valid Shanghai timestamp YYYY-MM-DDTHH:mm:ss+08:00.');
  }
  if(typeof data.description==='string') {
    if(/\*\*|__|`|\[[^\]]*\]\(|(^|\s)#{1,6}\s|<\/?[a-z][^>]*>/i.test(data.description)) add('frontmatter-description','description','description must be plain text without Markdown or HTML.');
    const length=Array.from(data.description.trim()).length;
    if(ordinary && (length<150||length>160)) add('description-length','description',`description has ${length} characters; recommended range is 150–160.`,{severity:'warning'});
  }
  if(Array.isArray(data.tags)) {
    if(ordinary && (data.tags.length<5||data.tags.length>8)) add('tag-count','tags',`Article has ${data.tags.length} tags; recommended range is 5–8.`,{severity:'warning'});
    const aliases=new Map(Object.values(tags.canonical_tags ?? {}).flatMap(entry=>(entry.aliases ?? []).filter(a=>a!==entry.canonical).map(a=>[a,entry.canonical])));
    for(const tag of data.tags) if(aliases.has(tag)||tags.tags_to_remove?.includes(tag)) add('tag-canonical','tags',`Tag ${JSON.stringify(tag)} must ${aliases.has(tag)?`use ${JSON.stringify(aliases.get(tag))}`:'be removed under the existing tag policy'}.`,{waivable:false});
  }
  return diagnostics;
}
