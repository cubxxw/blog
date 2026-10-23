import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { test, expect, type Locator, type Page } from '../helpers/frozen-site';

type Product = {
  id: string;
  name: string;
  url: string;
  url_zh?: string;
  url_en?: string;
  github: string;
};
const products = parse(readFileSync('data/products.yml', 'utf8')).products as Product[];
const locales = [
  { lang: 'en' as const, path: '/', imstage: 'https://imstage.org/?lang=en', leafhour: 'https://leafhour.com/en' },
  { lang: 'zh' as const, path: '/zh/', imstage: 'https://imstage.org/?lang=zh', leafhour: 'https://leafhour.com' },
];

async function opensDirectly(page: Page, control: Locator, destination: string) {
  const popupPromise = page.waitForEvent('popup');
  await control.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(new URL(destination).href);
  await popup.close();
}

for (const locale of locales) {
  test(`${locale.path} project cards link directly to localized products and source-only projects`, async ({ page, context }) => {
    await page.goto(locale.path);
    const cards = page.locator('#hp-projects .hp-product');
    await expect(cards).toHaveCount(products.length);

    for (const product of products) {
      const card = cards.filter({ has: page.getByRole('heading', { name: product.name, exact: true }) });
      const destination = product[`url_${locale.lang}`] || product.url;
      const main = card.locator('.hp-product__main');
      await expect(main).toHaveAttribute('href', destination);
      await expect(main).toHaveAttribute('target', '_blank');
      await expect(main).toHaveAttribute('rel', /noopener/);
      await expect(card.getByRole('link', { name: `${product.name} GitHub`, exact: true })).toHaveAttribute('href', product.github);
      const open = card.locator('.hp-product__links a').filter({ hasText: /^(Open|打开)$/ });
      if (destination === product.github) await expect(open).toHaveCount(0);
      else await expect(open).toHaveAttribute('href', destination);
    }

    // These literal cases catch a locale hint being dropped even if the
    // catalog's default URL is otherwise a valid product destination.
    await expect(cards.filter({ has: page.getByRole('heading', { name: 'IMStage', exact: true }) }).locator('.hp-product__main')).toHaveAttribute('href', locale.imstage);
    await expect(cards.filter({ has: page.getByRole('heading', { name: 'Leafhour', exact: true }) }).locator('.hp-product__main')).toHaveAttribute('href', locale.leafhour);

    // Stub only the external documents. The site's own event handlers and
    // native anchor navigation still run, without depending on product uptime.
    await context.route(url => url.origin !== new URL(page.url()).origin, route =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Product</title>' }));
    const spaceRequests: string[] = [];
    context.on('request', request => {
      if (request.isNavigationRequest() && /^\/(?:zh\/)?projects\//.test(new URL(request.url()).pathname)) spaceRequests.push(request.url());
    });
    const originalURL = page.url();
    const imstage = cards.filter({ has: page.getByRole('heading', { name: 'IMStage', exact: true }) });
    await opensDirectly(page, imstage.locator('.hp-product__shot img'), locale.imstage);
    await opensDirectly(page, imstage.getByRole('heading', { name: 'IMStage', exact: true }), locale.imstage);
    await opensDirectly(page, imstage.locator('.hp-product__links a').filter({ hasText: /^(Open|打开)$/ }), locale.imstage);

    const sourceOnly = products.find(product => product.url === product.github)!;
    expect(sourceOnly).toBeDefined();
    const sourceCard = cards.filter({ has: page.getByRole('heading', { name: sourceOnly.name, exact: true }) });
    const sourceMain = sourceCard.locator('.hp-product__main');
    await sourceMain.focus();
    const popupPromise = page.waitForEvent('popup');
    await sourceMain.press('Enter');
    const popup = await popupPromise;
    await expect(popup).toHaveURL(new URL(sourceOnly.github).href);
    await popup.close();
    expect(spaceRequests).toEqual([]);
    await expect(page).toHaveURL(originalURL);
  });
}

test.describe('project entry without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  for (const locale of locales) {
    test(`${locale.path} product destinations are present in the rendered anchors`, async ({ page }) => {
      await page.goto(locale.path);
      for (const product of products) {
        const card = page.locator('#hp-projects .hp-product').filter({ has: page.getByRole('heading', { name: product.name, exact: true }) });
        await expect(card.locator('.hp-product__main')).toHaveAttribute('href', product[`url_${locale.lang}`] || product.url);
      }
    });
  }
});
