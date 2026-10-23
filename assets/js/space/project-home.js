import {safeURL} from './state.mjs';

export function projectHomeHTML({products,zh,escapeHTML:html,origin}){
 const t=(cn,en)=>zh?cn:en;
 return `<section class="space-project-gallery" data-product-home><header class="space-project-gallery__head"><div><h2>${t('一些正在做的事。','A few things I am building.')}</h2><p>${t('先看看作品，也可以直接去官网走走。','Explore a project, or go straight to its website.')}</p></div><button type="button" data-open="browser" data-payload="">${t('打开浏览器','Open Browser')} ↗</button></header>
 <div class="space-project-grid">${products.map(p=>{
  const url=safeURL(p.url||p.github,origin),source=safeURL(p.github,origin);
  const sourceOnly=url&&url===source;
  const visit=url?(p.embed?`<button type="button" data-open="browser" data-payload="${html(url)}">${t('访问官网','Visit website')} ↗</button>`:`<a href="${html(url)}" target="_blank" rel="noopener noreferrer">${sourceOnly?t('查看源码','View source'):t('访问官网','Visit website')} ↗</a>`):'';
  return `<article class="space-project-card" data-project-card="${html(p.id)}"><button type="button" class="space-project-card__main" data-select-product="${html(p.id)}" aria-label="${html(p.name)} · ${t('查看介绍','Project details')}"><span class="space-project-card__picture">${p.image?`<img src="${html(p.image)}" alt="${html(p.alt||p.name)}" loading="lazy">`:`<span aria-hidden="true">${html(p.mark||p.name?.slice(0,2)||'')}</span>`}</span><span class="space-project-card__title"><strong>${html(p.name)}</strong><small>${html(p.stage||'')}</small></span></button><p>${html(p.headline||p.description||'')}</p><div class="space-project-card__actions">${visit}${source&&!sourceOnly?`<a href="${html(source)}" target="_blank" rel="noopener noreferrer">GitHub</a>`:''}</div></article>`;
 }).join('')}</div><footer class="space-finder-status"><span>${t(`${products.length} 个项目`,`${products.length} projects`)}</span></footer></section>`;
}
