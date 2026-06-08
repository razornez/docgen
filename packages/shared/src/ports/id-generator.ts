import type { IdPrefix } from '../ids.js';

/**
 * Port pembuat ID berprefix (docs/21). Di-inject agar bisa dibuat
 * deterministik saat test.
 */
export interface IdGenerator {
  /** Menghasilkan ID baru seperti `ten_a1b2c3...` untuk prefix yang diberikan. */
  generate(prefix: IdPrefix): string;
}
