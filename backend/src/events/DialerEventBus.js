import { EventEmitter } from 'events';

export const dialerEventBus = new EventEmitter();
dialerEventBus.setMaxListeners(50);
