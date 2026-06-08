import { withTransaction } from '@docgen/db';
import {
  PgTemplateRepository,
  type TemplateRepository,
} from '../templates/template.repository.js';
import {
  PgTemplateVersionRepository,
  type TemplateVersionRepository,
} from '../templates/template-version.repository.js';

/** Repository template terikat ke satu transaksi (buat template/versi atomik). */
export interface TemplateRepositories {
  readonly templates: TemplateRepository;
  readonly versions: TemplateVersionRepository;
}

export interface TemplateUnitOfWork {
  transaction<T>(fn: (repos: TemplateRepositories) => Promise<T>): Promise<T>;
}

export class PgTemplateUnitOfWork implements TemplateUnitOfWork {
  transaction<T>(fn: (repos: TemplateRepositories) => Promise<T>): Promise<T> {
    return withTransaction((client) =>
      fn({
        templates: new PgTemplateRepository(client),
        versions: new PgTemplateVersionRepository(client),
      }),
    );
  }
}
