import base from './playwright.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...base,
  testMatch:['00-space-resident-motion.spec.ts'],workers:1,retries:0,
  projects:base.projects!.filter(project=>project.name==='desktop'),
});
