export const NETLIFY_API='https://api.netlify.com/api/v1';
export const GITHUB_API='https://api.github.com';

// Only the intended API receives its token; application URLs never do.
export function authenticatedFetch({githubToken,netlifyToken,fetchImpl=globalThis.fetch}) {
  return (url,options={})=>{
    const parsed=new URL(url),headers=new Headers(options.headers);
    if(parsed.origin===GITHUB_API && githubToken)headers.set('Authorization',`Bearer ${githubToken}`);
    if(parsed.origin==='https://api.netlify.com' && netlifyToken)headers.set('Authorization',`Bearer ${netlifyToken}`);
    headers.set('User-Agent','cubxxw-blog-release');
    return fetchImpl(url,{...options,headers,redirect:'error',signal:options.signal??AbortSignal.timeout(10000)});
  };
}
export async function requestJson(fetch,url,options={}) {
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000),...options});
  if(!response.ok)throw new Error(`Release API request failed (${response.status}) at ${new URL(url).origin}`);
  return response.json();
}
export function deploymentUrl(value,deployId) {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.pathname!=='/'||!url.hostname.endsWith('.netlify.app')||!url.hostname.startsWith(`${deployId}--`))throw new Error('Invalid Netlify deploy URL');
  return url.origin;
}
