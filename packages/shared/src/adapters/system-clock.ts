import type { Clock } from '../ports/clock.js';

/** Adapter Clock nyata berbasis jam sistem. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  nowMs(): number {
    return Date.now();
  }
}
