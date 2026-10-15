import {defineConfig} from '/Users/cubxxw/data/blog/node_modules/@playwright/test/index.mjs';
import base from './local-qa.config.mjs';
export default defineConfig({...base,testMatch:['header-search.spec.ts'],outputDir:'/private/tmp/ai-test-blog-ux-20261016.d8VJru/playwright-header-regression',projects:[{name:'desktop',use:base.use}]});
