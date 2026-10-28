import {safeURL} from './state.mjs';

export function projectHomeHTML({products,zh,escapeHTML:html,origin}) {
 const t=(cn,en)=>zh?cn:en;
 const featured=products.find(p=>p.featured)||products[0];
 const ordered=featured?[featured,...products.filter(p=>p!==featured)]:[];
 return `<section class="space-project-gallery" data-product-home><header class="space-project-gallery__head"><div><h2>${t('一些正在做的事。','A few things I am building.')}</h2><p>${t('从一个真实的问题，做到可以用的作品。','Real questions, made into things you can use.')}</p></div><button type="button" data-product-view-button="lab">Product Lab ↗</button></header>
 <div class="space-project-index">${ordered.map((p,index)=>{
  const url=safeURL(p.url||p.github,origin),source=safeURL(p.github,origin),image=safeURL(p.image,origin);
  const sourceOnly=url&&url===source;
  const visit=url?(p.embed?`<button type="button" data-open="browser" data-payload="${html(url)}">${t('访问官网','Visit website')} ↗</button>`:`<a href="${html(url)}" target="_blank" rel="noopener noreferrer">${sourceOnly?t('查看源码','View source'):t('访问官网','Visit website')} ↗</a>`):'';
  return `<article class="space-project-card" data-project-card="${html(p.id)}" data-project-featured="${index===0}"><button type="button" class="space-project-card__main" data-select-product="${html(p.id)}" aria-label="${html(p.name)} · ${t('查看介绍','Project details')}" aria-description="${html([p.stage,p.headline||p.description].filter(Boolean).join(' · '))}">${index===0&&image?`<span class="space-project-card__picture"><img src="${html(image)}" alt="${html(p.alt||p.name)}" loading="lazy"></span>`:''}<span class="space-project-card__title"><small>${html(p.stage||'')}</small><strong>${html(p.name)}</strong><span>${html(p.headline||p.description||'')}</span><span class="space-project-card__more">${t('了解作品','Explore project')} →</span></span></button><div class="space-project-card__actions">${visit}${source&&!sourceOnly?`<a href="${html(source)}" target="_blank" rel="noopener noreferrer">GitHub</a>`:''}</div></article>`;
 }).join('')}</div><footer class="space-finder-status"><span>${t(`${products.length} 个项目`,`${products.length} projects`)}</span></footer></section>`;
}
