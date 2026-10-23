import {test,expect} from '../helpers/frozen-site';
import {enterWorkspace,reserveWorldJourney} from '../helpers/space-entry';

test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});

for(const entry of [
  {name:'Chinese home introduction',path:'/zh/',selector:'.hp-entry-actions a[href$="#studio-products"]',destination:'/zh/projects/#studio-products',label:'产品'},
  {name:'English home products section',path:'/',selector:'#hp-projects .hp-section-action',destination:'/projects/#studio-products',label:'Products'},
  {name:'Chinese shared footer',path:'/zh/engineering/posts/use-go-tools-dlv/',selector:'.sf-more[href$="#studio-products"]',destination:'/zh/projects/#studio-products',label:'产品'},
]) {
  test(`${entry.name} opens the actual products app in the current tab`,async({page,context})=>{
    await reserveWorldJourney(page);
    await page.setViewportSize({width:1440,height:900});await page.goto(entry.path);
    const link=page.locator(entry.selector);await expect(link).toHaveAttribute('href',entry.destination);
    expect(await link.getAttribute('target')).not.toBe('_blank');
    const pages=context.pages().length;await link.click();await expect(page).toHaveURL(entry.destination);
    await expect(page.locator('#studio-products')).toHaveCount(1);
    const space=page.locator('#studio-products[data-product-space]');await expect(space).toHaveCount(1);
    await expect(space).toHaveAttribute('data-product-view','bear');await expect(space.locator('[data-bear-workspace]')).toHaveCount(1);
    await enterWorkspace(page);
    const products=page.locator('[data-space-window="products"]');await expect(products).toBeVisible();
    await expect(products).toHaveAttribute('aria-label',entry.label);
    await expect(space.locator('[data-space-window="products"]')).toBeVisible();
    await expect.poll(()=>products.evaluate(el=>el.contains(document.activeElement))).toBe(true);
    await expect(products.locator('[data-product-home] [data-select-product]')).toHaveCount(8);
    await products.locator('[data-product-home] [data-select-product]').first().click();
    await expect(products.locator('.space-product h2')).not.toBeEmpty();
    await expect(page.locator('[data-space-dock] [data-open="products"]')).toHaveAttribute('aria-label',entry.label);
    expect(context.pages()).toHaveLength(pages);
  });
}

test('the unqualified Space entrance still begins in the café in both languages',async({page})=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width:390,height:844});
  for(const path of ['/zh/projects/','/projects/']) {
    await page.goto(path);const space=page.locator('[data-bear-workspace]');
    await expect(space).toHaveAttribute('data-ready','true');
    await expect(space).toHaveAttribute('data-cafe-mode','cafe');
    // The real workspace is visible inside the physical Mac. It is inert
    // until the visitor uses that computer, rather than hidden from the room.
    await expect(space).toHaveAttribute('data-world-ready','true',{timeout:30_000});
    expect(await page.locator('[data-space-dock]').evaluate(el=>Boolean(el.closest('[inert]')))).toBe(true);
    await expect(page.locator('[data-space-window="products"]')).toBeHidden();
  }
});
