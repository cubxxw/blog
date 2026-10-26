import base from './playwright.config';
import {defineConfig} from '@playwright/test';

const variant=process.env.ROOM_DIAG_VARIANT;
if(!['control-main-full','candidate-full','candidate-dom-trace'].includes(variant||''))throw new Error('Explicit room diagnostic variant required');
const titles=[
 'the resident wanders but pauses in quiet mode, dialogs, reduced motion and the workspace',
 'a visitor can leave a web draft, look out the window and resume the same page with continuous sound (native)',
 'a visitor can leave a web draft, look out the window and resume the same page with continuous sound (compatible)',
 'a failed distant environment falls back to geometry and remains explorable',
 'quiet freezes rain, fan and boat while intentional movement still works',
];
const escape=(value:string)=>value.replace(/[.*+?^{}$()|[\]\\]/g,'\\$&');
export default defineConfig({...base,
 testMatch:['00-space-onboarding.spec.ts','space-browser.spec.ts','space-jiangnan.spec.ts'],
 grep:new RegExp(titles.map(value=>escape(value)+'$').join('|')),
 workers:1,retries:0,
 use:{...base.use,trace:{mode:'retain-on-failure' as const,screenshots:variant!=='candidate-dom-trace',snapshots:true,sources:true},screenshot:'only-on-failure' as const},
 projects:base.projects!.filter(project=>project.name==='desktop'),
 outputDir:'tests/.artifacts/room-diagnostic/results',
 reporter:[['list'],['json',{outputFile:'tests/.artifacts/room-diagnostic/playwright-results.json'}],['html',{outputFolder:'tests/.artifacts/room-diagnostic/html',open:'never'}]],
});
