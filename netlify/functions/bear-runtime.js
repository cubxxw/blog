'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const result = (statusCode,body) => ({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
exports.handler = async event => {
  // No configuration can turn this route into a public remote shell.
  if(process.env.NETLIFY_DEV !== 'true')return result(403,{available:false,error:'Local development only'});
  const headers=event.headers||{};
  let host;
  try{host=new URL(`http://${headers.host||''}`);}catch{return result(403,{available:false});}
  if(!['localhost','127.0.0.1'].includes(host.hostname))return result(403,{available:false});
  const origin=headers.origin;
  if((origin&&origin!==host.origin)||headers['sec-fetch-site']==='cross-site')return result(403,{available:false,error:'Origin refused'});
  if(!['GET','POST'].includes(event.httpMethod))return result(405,{error:'Method not allowed'});
  if(event.httpMethod==='POST'&&(!origin||!headers['content-type']?.startsWith('application/json')))return result(403,{error:'Origin and JSON required'});
  let config;
  try{config=JSON.parse(await fs.readFile(path.resolve('.netlify/bear-runtime.json'),'utf8'));}
  catch{return result(200,{available:false,reason:'Local runtime is not running'});}
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(config.url)||typeof config.token!=='string')return result(503,{available:false});
  try{
    const response=await fetch(config.url+(event.httpMethod==='POST'?'/run':'/status'),{method:event.httpMethod,headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},...(event.httpMethod==='POST'?{body:event.body||'{}'}:{}),signal:AbortSignal.timeout(18000)});
    return result(response.status,await response.json());
  }catch{return result(503,{available:false,error:'Local runtime unavailable'});}
};
