import * as wander from './wander.js';
import * as eat from './eat.js';
import * as sleep from './sleep.js';
import * as gather from './gather.js';
import * as gatherWood from './gatherWood.js';
import * as mine from './mine.js';
import * as build from './build.js';
import * as deliver from './deliver.js';
import * as fight from './fight.js';
import * as flee from './flee.js';
import * as raid from './raid.js';

// Cada módulo de ação exporta score(agent, world) e step(agent, world, dt).
// decision.js consulta este registro para gerar/pontuar/executar candidatas.
export const ACTION_TYPES = { wander, eat, sleep, gather, gatherWood, mine, build, deliver, fight, flee, raid };
