import {test,expect} from '../helpers/frozen-site';
test.use({reducedMotion:'reduce'});

for(const width of [390,1440]) {
  test(`knowledge filters match their real collections at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.goto('/zh/projects/#product-lab');
    const data=JSON.parse((await page.locator('[data-space-knowledge]').textContent())!);
    await page.getByRole('button',{name:'进入知识空间'}).click();
    const host=page.locator('[data-bks-host]');
    const product=host.locator('[data-filter="product"].bks__filter');
    await expect(product).toHaveAttribute('aria-pressed','true');
    await expect(host.locator('.bks__chip')).toHaveCount(data.nodes.filter((n:{kind:string})=>n.kind==='product').length);
    for(const filter of ['all','writing','series']) {
      const choice=host.locator(`.bks__filter[data-filter="${filter}"]`);await choice.click();
      await expect(choice).toHaveAttribute('aria-pressed','true');
      const expected=filter==='all'?data.nodes.length:data.nodes.filter((n:{kind:string})=>n.kind===filter).length;
      await expect(host.locator('.bks__chip')).toHaveCount(expected);
      if(filter==='all')await expect(choice).toContainText(String(expected));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await product.click();await expect(product).toHaveAttribute('aria-pressed','true');
    await page.keyboard.press('Escape');await expect(host).toBeHidden();
  });
}
