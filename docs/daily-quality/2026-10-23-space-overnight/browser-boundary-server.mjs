import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const repo='/Users/cubxxw/data/blog';
const script=`import {mountBrowser} from '/assets/js/space/browser.js';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
mountBrowser({host:document.querySelector('#host'),catalog:{language:'zh',products:[]},escapeHTML});`;
const fixture=`<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Space 浏览器入口边界验收</title><link rel="stylesheet" href="/assets/css/space-browser.css"><style>body{font:16px system-ui;margin:24px;background:#f4f3ee;color:#23221f}#host{height:650px;border:1px solid #888;background:white;--space-text:#23221f;--space-muted:#605d58}h1{font-size:20px}button,input,a{font:inherit}iframe{width:100%;height:400px}</style></head><body><h1>Space 浏览器入口边界验收</h1><p>使用当前分支的真实 mountBrowser、URL 判断及浏览器样式；此页面只验证入口边界。</p><main id="host"></main><script type="module">${script}</script></body></html>`;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1'),name=url.pathname;
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
  if(name==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fixture);}
  if(/^\/(?:zh\/)?(?:about|start-here)\/?$/.test(name)){res.writeHead(302,{Location:'/projects/'});return res.end();}
  if(name==='/projects/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><title>外部房间目标占位</title><h1>外部房间目标占位</h1>');}
  if(name==='/zh/articles/'||name==='/articles/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><html lang="zh"><title>普通文章入口</title><h1>普通文章入口仍可在电脑中打开</h1></html>');}
  if(!name.startsWith('/assets/js/space/')&&name!=='/assets/css/space-browser.css'){res.writeHead(404);return res.end('Not found');}
  const file=path.resolve(repo,'.'+decodeURIComponent(name));
  if(!file.startsWith(repo+'/assets/')){res.writeHead(404);return res.end();}
  const bytes=await fs.readFile(file);res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'application/javascript');res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({pid:process.pid,port:server.address().port,startedAt:new Date().toISOString(),fixture:'browser-entry-real-modules'})));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
