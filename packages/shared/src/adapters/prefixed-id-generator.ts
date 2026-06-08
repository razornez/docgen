import type { IdGenerator } from '../ports/id-generator.js';
import type { IdPrefix } from '../ids.js';
import { randomBase62 } from '../random.js';

/**
 * Adapter IdGenerator nyata: `<prefix>_<22 char base62 acak>`.
 * ~131 bit entropi — cukup untuk menghindari tabrakan tanpa koordinasi.
 */
export class PrefixedIdGenerator implements IdGenerator {
  constructor(private readonly randomLength: number = 22) {}

  generate(prefix: IdPrefix): string {
    return `${prefix}_${randomBase62(this.randomLength)}`;
  }
}
