import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace} from '../helpers/space-entry';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';

test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});

type Product={id:string,name:string,headline:string,description:string,url:string,demo:string,github:string,image:string,alt:string};
type Book={title:string,author:string,description:string,url:string};
type SourceProduct={id:string,name:string,url:string,url_zh?:string,url_en?:string,demo?:string,github?:string,headline_zh:string,headline_en:string,desc_zh:string,desc_en:string};
const sourceProducts=parse(readFileSync('data/products.yml','utf8')).products as SourceProduct[];

async function openApp(page:Page,app:string) {
  const dock=page.locator(`[data-space-dock] [data-open="${app}"]`);
  if(await dock.isVisible())await dock.click();
  else {
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('.space-menu [data-space-launchpad-trigger]').click();
    await page.locator(`[data-launchpad-app="${app}"]`).click();
  }
  const win=page.locator(`[data-space-window="${app}"]`);await expect(win).toBeVisible();return win;
}
const projectedFontCSS=(node:Locator)=>node.evaluate((el:HTMLElement)=>parseFloat(getComputedStyle(el).fontSize)*el.getBoundingClientRect().width/el.offsetWidth);
const fitsHorizontally=(node:Locator)=>node.evaluate(el=>el.scrollWidth<=el.clientWidth+1);
const nextFrame=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));
async function hit(control:Locator) {
  await control.scrollIntoViewIfNeeded();
  const box=(await control.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await control.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
  return box;
}
async function isolatedLinkClick(page:Page,control:Locator,url:string) {
  await expect(control).toHaveAttribute('href',new URL(url,page.url()).href);
  await expect(control).toHaveAttribute('target','_blank');await expect(control).toHaveAttribute('rel',/noopener/);
  const box=await hit(control),previous=await page.evaluate(()=>(window as any).__spaceLinkClicks.length);
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  const clicks=await page.evaluate(()=>(window as any).__spaceLinkClicks as {href:string,target:string}[]);
  expect(clicks).toHaveLength(previous+1);expect(clicks[clicks.length-1]).toEqual({href:new URL(url,page.url()).href,target:'_blank'});
}

const cases=[
  {width:320,height:844,locale:'zh',theme:'light',coarse:true},
  {width:390,height:844,locale:'en',theme:'light',coarse:true},
  {width:620,height:844,locale:'zh',theme:'dark',coarse:true},
  {width:844,height:390,locale:'en',theme:'dark',coarse:true},
  {width:1440,height:900,locale:'zh',theme:'light',coarse:false},
  {width:1440,height:900,locale:'en',theme:'dark',coarse:false},
];
for(const view of cases)test.describe(`${view.width}×${view.height} ${view.locale} ${view.theme} products and books`,()=>{
  test.use({viewport:{width:view.width,height:view.height},hasTouch:view.coarse,isMobile:view.coarse});
  test('real choices retain focus, readable content and distinct reachable reading links',async({page})=>{
    await page.goto(view.locale==='zh'?'/zh/projects/':'/projects/');await enterWorkspace(page);
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-ready','true');
    expect(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)).toBe(view.coarse);
    // The public theme tool only establishes this fixture's appearance;
    // settings choice focus is deliberately outside this App contract.
    await page.evaluate(theme=>(window as any).BearSpace.execute('theme',{value:theme}),view.theme);
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-theme',view.theme);
    const catalog=await page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent||'{}')) as {products:Product[],books:Book[]};
    const locale=view.locale==='zh'?'zh':'en';
    const expectedProducts=sourceProducts.map(product=>({id:product.id,name:product.name,headline:product[`headline_${locale}`],description:product[`desc_${locale}`],url:product[`url_${locale}`]||product.url,demo:product.demo||'',github:product.github||''}));
    expect(catalog.products.length).toBeGreaterThan(0);expect(catalog.products).toHaveLength(sourceProducts.length);
    expect(new Set(catalog.products.map(product=>product.id)).size).toBe(sourceProducts.length);
    expect(catalog.products.map(({id,name,headline,description,url,demo,github})=>({id,name,headline,description,url,demo,github}))).toEqual(expectedProducts);
    expect(catalog.products.find(product=>product.id==='leafhour')).toMatchObject({name:'Leafhour',url:locale==='zh'?'https://leafhour.com':'https://leafhour.com/en',demo:'https://leafhour.com/read?book=gutenberg-alice',github:'https://github.com/getyak/leafhour'});
    expect(catalog.books).toHaveLength(4);
    const notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]');await editor.fill('同一个输入框，先读产品和书，再接着写。');
    const original=await editor.elementHandle(),products=await openApp(page,'products');
    // Capture real clicks at the document boundary so no external product,
    // bookstore or API is contacted during this offline verification.
    await page.evaluate(()=>{
      (window as any).__spaceLinkClicks=[];
      document.addEventListener('click',event=>{
        const anchor=(event.target as Element).closest<HTMLAnchorElement>('.space-product__links a,.space-book > a');
        if(anchor){event.preventDefault();(window as any).__spaceLinkClicks.push({href:anchor.href,target:anchor.target});}
      },true);
    });
    const compact=view.width<=640||view.coarse&&view.height<=420,picker=products.locator('[data-product-select]');
    const directory=products.locator('.space-product-directory');
    if(compact) {
      await expect(directory).toBeHidden();await expect(picker).toBeVisible();await expect(picker.locator('option')).toHaveCount(sourceProducts.length);
      expect(await picker.locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value))).toEqual(catalog.products.map(p=>p.id));
    } else {await expect(directory).toBeVisible();await expect(picker).toBeHidden();await expect(directory.locator('button')).toHaveCount(sourceProducts.length);
      expect(await directory.locator('[data-select-product]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-select-product')))).toEqual(sourceProducts.map(product=>product.id));}
    for(let i=0;i<catalog.products.length;i++) {
      const product=catalog.products[i];
      if(compact) {
        await hit(picker);await picker.focus();
        // Home/End and ArrowDown are native select keyboard operations.
        // They also exercise reconstruction while the choice owns focus.
        if(i===0){await picker.press('End');await picker.press('Home');}else await picker.press('ArrowDown');
        await expect(picker).toHaveValue(product.id);await nextFrame(page);await expect(picker).toBeFocused();
      } else {
        const choice=directory.locator(`[data-select-product="${product.id}"]`);await hit(choice);await choice.focus();await choice.press('Space');
        await expect(choice).toHaveAttribute('aria-pressed','true');await nextFrame(page);await expect(choice).toBeFocused();
        expect(await projectedFontCSS(choice)).toBeGreaterThanOrEqual(13);
      }
      await expect(products.locator('.space-product h2')).toHaveText(product.name);
      expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().windows.find((w:any)=>w.app==='products').payload)).toBe(product.id);
      const paragraphs=products.locator('.space-product > p:not(.space-product__stage):not(.space-product__boundary)');
      await expect(paragraphs.first()).toHaveText(product.headline);await expect(paragraphs.last()).toHaveText(product.description);
      expect(await projectedFontCSS(paragraphs.first())).toBeGreaterThanOrEqual(16);
      expect(await fitsHorizontally(products.locator('[data-window-body]'))).toBe(true);
      if(view.width===844&&view.height===390) {
        const body=products.locator('[data-window-body]');await body.evaluate(el=>{el.scrollTop=0;});await nextFrame(page);
        // Entry means the top of this real scroll container, before any
        // automatic image/link scrolling. Measure the projected first line.
        const entry=await body.evaluate((el:HTMLElement)=>{
          const rect=el.getBoundingClientRect(),title=el.querySelector('.space-product h2')!.getBoundingClientRect();
          const headline=el.querySelector('.space-product h2 + p')!,line=headline.getBoundingClientRect();
          return {scrollTop:el.scrollTop,bodyTop:rect.top,bodyBottom:rect.bottom,titleTop:title.top,titleBottom:title.bottom,lineTop:line.top,lineBottom:line.top+parseFloat(getComputedStyle(headline).lineHeight)*rect.height/el.offsetHeight};
        });
        expect(entry.scrollTop).toBe(0);expect(entry.titleTop).toBeGreaterThanOrEqual(entry.bodyTop);
        expect(entry.titleBottom).toBeLessThanOrEqual(entry.bodyBottom);expect(entry.lineTop).toBeGreaterThanOrEqual(entry.bodyTop);
        expect(entry.lineBottom).toBeLessThanOrEqual(entry.bodyBottom);
      }
      if(product.image) {
        const image=products.locator('.space-product__shot');await image.scrollIntoViewIfNeeded();
        await expect(image).toHaveAttribute('src',product.image);await expect(image).toHaveAttribute('alt',product.alt);
        await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
        const geometry=await image.evaluate((el:HTMLImageElement)=>({height:el.offsetHeight,width:el.offsetWidth,natural:el.naturalWidth/el.naturalHeight,fit:getComputedStyle(el).objectFit}));
        expect(geometry.height).toBeLessThanOrEqual(281);expect(geometry.fit).toBe('contain');
        expect(Math.abs((geometry.width-2)/(geometry.height-2)-geometry.natural)).toBeLessThan(.04);
      }
      const links=products.locator('.space-product__links a'),urls=[product.url,product.demo,product.github].filter(Boolean);
      await expect(links).toHaveCount(urls.length);
      if(!product.demo)await expect(products.getByRole('link',{name:view.locale==='zh'?'测试预览 ↗':'Try the demo ↗',exact:true})).toHaveCount(0);
      for(let n=0;n<urls.length;n++){expect(await projectedFontCSS(links.nth(n))).toBeGreaterThanOrEqual(13);await isolatedLinkClick(page,links.nth(n),urls[n]);}
      // The AI action is checked for reachability only; it is never invoked.
      await hit(products.locator('[data-product-ask]'));
    }
    for(const app of ['reader','books'])await hit(products.locator(`.space-product-explore [data-open="${app}"]`));
    await products.locator('.space-product-explore [data-open="reader"]').click();await expect(page.locator('[data-space-window="reader"] [data-library-query]')).toBeVisible();
    await openApp(page,'products');await products.locator('.space-product-explore [data-open="books"]').click();
    const books=page.locator('[data-space-window="books"]'),cards=books.locator('.space-book');await expect(books).toBeVisible();await expect(cards).toHaveCount(4);
    for(let i=0;i<catalog.books.length;i++) {
      const book=catalog.books[i],card=cards.nth(i),cover=card.locator('.space-book__cover');
      await expect(cover.locator('strong')).toHaveText(book.title);await expect(cover.locator('.space-book__author')).toHaveText(book.author);await expect(card.locator('p')).toHaveText(book.description);
      expect(await projectedFontCSS(card.locator('p'))).toBeGreaterThanOrEqual(16);
      const measured=await cover.evaluate(el=>{
        const rgb=(value:string)=>{const n=value.match(/[\d.]+/g)!.map(Number);return {c:n.slice(0,3),a:n[3]??1};};
        const luminance=(c:number[])=>c.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
        const background=rgb(getComputedStyle(el).backgroundColor),coverRect=el.getBoundingClientRect();
        return [...el.querySelectorAll('strong,small')].map(text=>{
          const foreground=rgb(getComputedStyle(text).color);let opacity=foreground.a;
          for(let node:Element|null=text;node;node=node.parentElement){opacity*=Number(getComputedStyle(node).opacity);if(node===el)break;}
          const composite=foreground.c.map((n,i)=>n*opacity+background.c[i]*(1-opacity));
          const a=luminance(composite),b=luminance(background.c),rect=text.getBoundingClientRect();
          return {text:text.textContent,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),opaque:background.a===1,fits:rect.left>=coverRect.left&&rect.right<=coverRect.right+1&&rect.top>=coverRect.top&&rect.bottom<=coverRect.bottom+1};
        });
      });
      for(const text of measured){expect(text.opaque).toBe(true);expect(text.ratio,`${book.title}: ${text.text}`).toBeGreaterThanOrEqual(4.5);expect(text.fits).toBe(true);}
      const read=card.getByRole('link',{name:view.locale==='zh'?`阅读《${book.title}》 ↗`:`Read ${book.title} ↗`,exact:true});
      expect(await projectedFontCSS(read)).toBeGreaterThanOrEqual(13);await isolatedLinkClick(page,read,book.url);
    }
    expect(await fitsHorizontally(books.locator('[data-window-body]'))).toBe(true);
    if(view.width<=640) {
      const first=(await cards.nth(0).boundingBox())!,second=(await cards.nth(1).boundingBox())!;
      expect(second.y).toBeGreaterThan(first.y+first.height);expect(Math.abs(second.x-first.x)).toBeLessThan(1);
    }
    await hit(books.locator('.space-books-toolbar [data-open="reader"]'));await books.locator('.space-books-toolbar [data-open="reader"]').click();
    await expect(page.locator('[data-space-window="reader"] [data-library-query]')).toBeVisible();
    await openApp(page,'notes');expect(await editor.evaluate((el,previous)=>el===previous,original)).toBe(true);
    await expect(editor).toHaveValue('同一个输入框，先读产品和书，再接着写。');await editor.press('End');await editor.pressSequentially('继续。');
    await expect(editor).toHaveValue('同一个输入框，先读产品和书，再接着写。继续。');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
  });
});
