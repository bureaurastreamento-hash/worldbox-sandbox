import * as wander from './wander.js';
import * as eat from './eat.js';
import * as sleep from './sleep.js';
import * as gather from './gather.js';
import * as deliver from './deliver.js';
import * as fight from './fight.js';
import * as flee from './flee.js';

// Cada módulo de ação exporta score(agent, world) e step(agent, world, dt).
// decision.js consulta este registro para gerar/pontuar/executar candidatas.
export const ACTION_TYPES = { wander, eat, sleep, gather, deliver, fight, flee };
