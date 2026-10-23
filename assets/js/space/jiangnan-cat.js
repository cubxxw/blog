import {createCafeResident} from './world-cat.js';
import {JIANGNAN_CAT_ADAPTER} from './jiangnan-cat-state.mjs';

// The same attributed rig has room-specific navigation and a quiet material /
// motion treatment. Its supplied clip is idle; the walk is authored rig motion.
export function createJiangnanResident(options){
  const resident=createCafeResident({...options,routeAdapter:JIANGNAN_CAT_ADAPTER,appearance:{natural:true,length:.56,cozy:true,coat:'ivory'}});
  return {...resident,
    get pending(){return resident.pending;},
    get loaded(){return resident.loaded;},
    get breathing(){return resident.breathing;},
    snapshot(){const state=resident.snapshot();return {...state,target:[state.x,.23,state.z]};},
  };
}
