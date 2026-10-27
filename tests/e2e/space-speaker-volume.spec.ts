import {test,expect,type Page} from '../helpers/frozen-site';
import {observeRoomAudio,rainSource,roomAudioSources} from '../helpers/room-audio';
import {hitRoomObject} from '../helpers/room-interaction';

test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
const root=(page:Page)=>page.locator('[data-bear-workspace]');
async function object(page:Page,name:string){const control=page.locator(`[data-room-object="${name}"]`);await control.focus();await control.press('Enter');}
async function ready(page:Page){await page.goto('/zh/projects/?vista=image&room-hour=23');await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30000});}
const musicSource=async(page:Page)=>(await roomAudioSources(page)).find(source=>!source.stopped&&Math.abs(source.duration-100)>.05);

test.beforeEach(async({page})=>{
 test.setTimeout(90000);await observeRoomAudio(page);
 await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');localStorage.setItem('space:cafe:music-enabled:v1','no');});
});

test('speaker volume can grow to full gain during playback without replacing music or rain',async({page})=>{
 await ready(page);await object(page,'speaker');await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});await expect(root(page)).toHaveAttribute('data-room-ambient','playing');
 await expect.poll(async()=>(await musicSource(page))?.gain).toBeCloseTo(.6,2);const music=(await musicSource(page))!,rain=(await rainSource(page))!;expect(music).toBeTruthy();
 const track=await root(page).getAttribute('data-room-track');expect(track).toBeTruthy();
 // Finish the keyboard menu interaction before aiming a pointer at the room;
 // its expanded accessible object list otherwise covers the physical player.
 await page.locator('.space-world__canvas').focus();await hitRoomObject(page,'vinyl');
 await expect(root(page)).toHaveAttribute('data-world-inspect','vinyl');await expect(root(page)).toHaveAttribute('data-room-track',track!);expect((await musicSource(page))!.id).toBe(music.id);
 const slider=page.getByRole('slider',{name:'音箱音量',exact:true});await expect(slider).toHaveValue('60');await expect(page.locator('[data-room-volume-value]')).toHaveText('60%');
 await slider.focus();await slider.press('End');await expect(slider).toHaveValue('100');await expect(slider).toBeFocused();await expect(page.locator('[data-room-volume-value]')).toHaveText('100%');
 await expect.poll(async()=>(await musicSource(page))?.gain).toBeCloseTo(1,2);
 const later=(await musicSource(page))!;expect(later.id).toBe(music.id);expect(later.time).toBeGreaterThan(music.time);expect((await rainSource(page))!.id).toBe(rain.id);expect((await rainSource(page))!.gain).toBeCloseTo(rain.gain,2);
 // Repeated input during a real drag must retain the same focused range node.
 await slider.evaluate(node=>{(window as any).__volumeSlider=node;});
 const box=(await slider.boundingBox())!;await page.mouse.move(box.x+box.width-8,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.72,box.y+box.height/2,{steps:12});await page.mouse.up();
 expect(await slider.evaluate(node=>node===(window as any).__volumeSlider)).toBe(true);await expect(slider).toBeFocused();expect(Number(await slider.inputValue())).toBeLessThan(100);expect(Number(await slider.inputValue())).toBeGreaterThan(50);
 expect((await musicSource(page))!.id).toBe(music.id);expect((await rainSource(page))!.id).toBe(rain.id);
});

test('zero volume survives record changes and reload while the speaker remains playable',async({page})=>{
 await ready(page);await object(page,'records');const slider=page.getByRole('slider',{name:'音箱音量',exact:true});await slider.focus();await slider.press('Home');await expect(slider).toHaveValue('0');await expect(page.locator('[data-room-volume-value]')).toHaveText('0%');
 await expect(root(page)).toHaveAttribute('data-room-ambient','playing',{timeout:30000});const rain=(await rainSource(page))!;
 for(const id of ['long-stroll','almost-new']){await page.locator(`[data-room-record="${id}"]`).click();await expect(root(page)).toHaveAttribute('data-room-track',id);await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});await expect(slider).toHaveValue('0');await expect.poll(async()=>(await musicSource(page))?.gain).toBeCloseTo(0,3);expect((await rainSource(page))!.id).toBe(rain.id);}
 await page.reload();await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30000});await object(page,'records');await expect(slider).toHaveValue('0');await expect(page.locator('[data-room-volume-value]')).toHaveText('0%');
 await page.locator('[data-room-playback]').click();await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});await slider.focus();await slider.press('End');await expect.poll(async()=>(await musicSource(page))?.gain).toBeCloseTo(1,2);
});
