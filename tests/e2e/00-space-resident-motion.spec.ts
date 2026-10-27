import {test,expect} from '../helpers/frozen-site';
import {reserveWorldJourney} from '../helpers/space-entry';
import {clickStaticRoomControl} from '../helpers/static-room-control';
import {readRoomObservation,observePausedResident,withRoomObservationSession,observeResidentStartup,expectRoomAttributes} from '../helpers/room-observation';
import {withRoomPointerBatch} from '../helpers/room-pointer';

test.use({channel:'chromium',launchOptions:{args:process.env.SPACE_SOFTWARE_QA==='1'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
test.beforeEach(({page})=>reserveWorldJourney(page));

// Automatic DOM/screencast capture correlated with software-GPU stalls.
// Keep it disabled here, retaining action/source traces and failure
// screenshots while preserving every startup, motion and journey deadline.
// Explicit A/B diagnostics retain the capture mode selected by their config.
if(!process.env.ROOM_DIAG_VARIANT)test.use({trace:{mode:'retain-on-failure',snapshots:false,screenshots:false,sources:true},screenshot:'only-on-failure'});
  test.afterEach(async({page},info)=>{
    if(info.status===info.expectedStatus)return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      const state=await Promise.race([page.evaluate(()=>{
        const el=document.querySelector('[data-bear-workspace]');
        const names=['data-boot-state','data-world-ready','data-world-rendered-mode','data-world-frames','data-cafe-mode','data-cat-loaded','data-cat-active','data-cat-pose'];
        return {motion:(window as unknown as {__catMotionObservation:unknown}).__catMotionObservation,
          rootCount:document.querySelectorAll('[data-bear-workspace]').length,
          attributes:el?Object.fromEntries(names.map(name=>[name,el.getAttribute(name)])):null};
      }),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Failure diagnostic unavailable after1000ms')),1000);})]);
      await info.attach('resident-failure-observation',{contentType:'application/json',body:JSON.stringify(state)});
    }catch(error){console.warn('Resident failure diagnostic unavailable',error);}
    finally{if(timer)clearTimeout(timer);}
  });

test('the resident wanders but pauses in quiet mode, dialogs, reduced motion and the workspace',async({page})=>withRoomObservationSession(page,async()=>{
  await reserveWorldJourney(page);
  await page.addInitScript(()=>{
    const observation={status:'startup',initialPose:null as string|null,initialTime:null as number|null,changedPose:null as string|null,changedTime:null as number|null,bootCompleteAt:null as number|null,renderedRoamAt:null as number|null,readinessError:null as string|null};
    (window as unknown as {__catMotionObservation:typeof observation}).__catMotionObservation=observation;
    // Passive timestamps retain the rendered-mode5s stage even when protocol
    // delivery is late. Each original startup phase has its own bounded read.
    let readinessRoot:Element|null=null;
    const stopReadiness=()=>{readinessObserver.disconnect();removeEventListener('pagehide',stopReadiness);};
    const sampleReadiness=()=>{
      const roots=document.querySelectorAll('[data-bear-workspace]');if(!roots.length)return;
      if(roots.length!==1){observation.readinessError='ambiguous root';stopReadiness();return;}
      const el=roots[0];if(readinessRoot&&el!==readinessRoot){observation.readinessError='root replaced';stopReadiness();return;}
      readinessRoot=el;(window as unknown as {__catReadinessRoot:Element}).__catReadinessRoot=el;
      const now=performance.now();
      if(el.getAttribute('data-boot-state')==='complete'&&observation.bootCompleteAt===null)observation.bootCompleteAt=now;
      if(observation.bootCompleteAt!==null&&el.getAttribute('data-world-rendered-mode')==='roam'&&observation.renderedRoamAt===null)observation.renderedRoamAt=now;
      if(observation.bootCompleteAt!==null&&observation.renderedRoamAt!==null)stopReadiness();
    };
    const readinessObserver=new MutationObserver(sampleReadiness);
    readinessObserver.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-boot-state','data-world-rendered-mode']});
    addEventListener('pagehide',stopReadiness,{once:true});sampleReadiness();
    const startupDeadline=performance.now()+60000;
    let target:Element|null=null,done=false,timer:ReturnType<typeof setTimeout>;
    const finish=(status:string)=>{
      if(done)return;done=true;observation.status=status;
      observer.disconnect();clearTimeout(timer);removeEventListener('pagehide',onPageHide);
    };
    const onPageHide=()=>finish('pagehide');
    const sample=()=>{
      if(done)return;
      const now=performance.now();if(observation.initialTime===null&&now>startupDeadline){finish('startup-timeout');return;}
      if(!target){
        target=document.querySelector('[data-bear-workspace]');if(!target)return;
        (window as unknown as {__catMotionRoot:Element}).__catMotionRoot=target;
        observer.disconnect();observer.observe(target,{attributes:true,attributeFilter:['data-cat-loaded','data-cat-active','data-cat-pose']});
      }
      const loaded=target.getAttribute('data-cat-loaded'),active=target.getAttribute('data-cat-active'),pose=target.getAttribute('data-cat-pose');
      if(observation.initialTime===null){
        if(loaded!=='true'||active!=='true'||!pose)return;
        observation.initialPose=pose;observation.initialTime=now;observation.status='watching';
        clearTimeout(timer);timer=setTimeout(()=>finish('motion-timeout'),12000);return;
      }
      if(now-observation.initialTime>12000){finish('motion-timeout');return;}
      if(loaded==='true'&&active==='true'&&pose&&pose!==observation.initialPose){
        observation.changedPose=pose;observation.changedTime=now;finish('changed');
      }
    };
    const observer=new MutationObserver(sample);
    // Only collect actual attributes: no layout reads, frame loops or product writes.
    observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-cat-loaded','data-cat-active','data-cat-pose']});
    addEventListener('pagehide',onPageHide,{once:true});timer=setTimeout(()=>finish('startup-timeout'),60000);sample();
  });
  await page.goto('/zh/projects/');
  const movement=await observeResidentStartup(page);
  await test.info().attach('resident-startup-observation',{contentType:'application/json',body:JSON.stringify(movement)});
  const movementMs=movement.changedTime-movement.initialTime;
  expect(Number.isFinite(movementMs)).toBe(true);expect(movementMs).toBeGreaterThan(0);expect(movementMs).toBeLessThanOrEqual(12000);
  expect(movement.changedPose).not.toBe(movement.initialPose);
  // The5s state budget is followed by the full400/200ms pause windows.
  const observePaused=(checkFrames=false)=>observePausedResident(page,checkFrames);
  const waitForActive=async(requireQuietOff=false)=>readRoomObservation(page,async(requireQuietOff)=>{
    const deadline=performance.now()+5000;
    for(;;){
      const roots=document.querySelectorAll<HTMLElement>('[data-bear-workspace]');if(roots.length!==1)throw new Error('Resident recovery root missing or ambiguous');
      if(roots[0].dataset.catActive==='true'&&(!requireQuietOff||document.querySelector('.space-cafe__utilities [data-cafe-quiet]')?.getAttribute('aria-pressed')==='false'))return true;
      const remaining=deadline-performance.now();if(remaining<=0)throw new Error('Resident recovery exceeded5000ms');
      await new Promise(resolve=>setTimeout(resolve,Math.min(50,remaining)));
    }
  },requireQuietOff,{timeout:5000,label:'Resident recovery observation',validate:(value):value is boolean=>value===true});
  await withRoomPointerBatch(page,async pointer=>{
    await clickStaticRoomControl(page,'.space-cafe__utilities [data-cafe-quiet]',pointer);await observePaused(true);
    await clickStaticRoomControl(page,'.space-cafe__utilities [data-cafe-quiet]',pointer);await waitForActive(true);
    await clickStaticRoomControl(page,'.space-cafe__utilities [data-cafe-picker]',pointer);await observePaused();
  });
  await page.locator('[data-cafe-picker-close]').click();
  await waitForActive();
  await page.emulateMedia({reducedMotion:'reduce'});await observePaused();
  await page.emulateMedia({reducedMotion:'no-preference'});await waitForActive();
  await clickStaticRoomControl(page,'[data-cafe-enter]');await expectRoomAttributes(page,{'data-cafe-mode':'desktop'});
  await observePaused();
}));
