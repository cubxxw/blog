// Compatibility command: the photographic café has been replaced by a real room.
import path from 'node:path';
import {createOutputServer} from './serve-site-output.mjs';
const server=createOutputServer({publicDir:path.resolve(process.env.SITE_PUBLIC_DIR||'public')});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.env.WORLD_BASE_URL=process.env.CAFE_BASE_URL||`http://127.0.0.1:${server.address().port}`;
try {await import('./space-world.browser.mjs');}finally{await new Promise(resolve=>server.close(resolve));}
