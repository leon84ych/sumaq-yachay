import { inject, Injectable } from '@angular/core';
import { liveQuery, Table } from 'dexie';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { LocalDBService, PendingDomainWrite } from '../../../../shared/local-db/local-db.service';
import { DomainName } from '../../../catalog/book-detail/models/domain-sheet-config';
import { AssociationGASRepository } from '../../associations/services/associations-gas-repository';
import { CharacterGASRepository } from '../../characters/services/characters-gas-repository';
import { ConceptGASRepository } from '../../concepts/services/concepts-gas-repository';
import { BookEventGASRepository } from '../../events/services/book-events-gas-repository';
import { GlossaryGASRepository } from '../../glossary/services/glossary-gas-repository';
import { PlaceGASRepository } from '../../places/services/places-gas-repository';
import { QuestionGASRepository } from '../../questions/services/questions-gas-repository';
import { QuoteGASRepository } from '../../quotes/services/quotes-gas-repository';
import { RelationGASRepository } from '../../relations/services/relations-gas-repository';
import { Domain } from '../model/domain-shared-model';
import { DomainWriteSyncWorker } from './domain-write-sync.service';

interface Gateway<T extends Domain> {
  addDomainItem(record: T, signal?: AbortSignal): Promise<T>;
  updateDomainItem(record: T, signal?: AbortSignal): Promise<T>;
  deleteDomainItem(record: T, signal?: AbortSignal): Promise<void>;
  getDomain(row: number): Promise<{ id: string; itemRow: number }[]>;
}

class OtherDomainWorker<T extends Domain> extends DomainWriteSyncWorker<T> {
  constructor(
    protected readonly domain: DomainName,
    protected readonly table: Table<T, [string, string]>,
    protected readonly gateway: Gateway<T>,
  ) {
    super();
  }
}

interface Worker {
  save(record: Domain, isEdit: boolean): Promise<Domain>;
  delete(record: Domain): Promise<'pending' | 'deleted'>;
  getWrite(record: Domain): Promise<PendingDomainWrite | undefined>;
  retry(record: Domain, confirmAccount: boolean, confirmUncertain: boolean): Promise<void>;
  confirmDeletion(record: Domain, confirmAccount: boolean): Promise<boolean>;
  resolveId(bookId: string, id: string): string;
  watchWrites(
    bookId: string,
    update: (writes: PendingDomainWrite[]) => void,
  ): { unsubscribe(): void };
  getActiveAccount(): string | undefined;
}

function workerAdapter<T extends Domain>(worker: OtherDomainWorker<T>): Worker {
  return {
    save: (record, isEdit) => worker.save(record as T, isEdit),
    delete: (record) => worker.delete(record as T),
    getWrite: (record) => worker.getWrite(record as T),
    retry: (record, account, uncertain) => worker.retry(record as T, account, uncertain),
    confirmDeletion: (record, account) => worker.confirmDeletion(record as T, account),
    resolveId: (bookId, id) => worker.resolveId(bookId, id),
    watchWrites: (bookId, update) => worker.watchWrites(bookId, update),
    getActiveAccount: () => worker.getActiveAccount(),
  };
}

@Injectable({ providedIn: 'root' })
export class AllDomainWriteSyncService {
  private readonly db = inject(LocalDBService).indexedDB;
  private readonly messages = inject(GlobalMessageService);
  private readonly workers: Partial<Record<DomainName, Worker>> = {
    CONCEPTS: workerAdapter(
      new OtherDomainWorker('CONCEPTS', this.db.concepts, inject(ConceptGASRepository)),
    ),
    QUOTES: workerAdapter(
      new OtherDomainWorker('QUOTES', this.db.quotes, inject(QuoteGASRepository)),
    ),
    CHARACTER: workerAdapter(
      new OtherDomainWorker('CHARACTER', this.db.characters, inject(CharacterGASRepository)),
    ),
    PLACES: workerAdapter(
      new OtherDomainWorker('PLACES', this.db.places, inject(PlaceGASRepository)),
    ),
    BOOK_EVENTS: workerAdapter(
      new OtherDomainWorker('BOOK_EVENTS', this.db.bookEvents, inject(BookEventGASRepository)),
    ),
    RELATIONS: workerAdapter(
      new OtherDomainWorker('RELATIONS', this.db.relations, inject(RelationGASRepository)),
    ),
    ASSOCIATIONS: workerAdapter(
      new OtherDomainWorker('ASSOCIATIONS', this.db.associations, inject(AssociationGASRepository)),
    ),
    GLOSARY: workerAdapter(
      new OtherDomainWorker('GLOSARY', this.db.glossary, inject(GlossaryGASRepository)),
    ),
    QUESTIONS: workerAdapter(
      new OtherDomainWorker('QUESTIONS', this.db.questions, inject(QuestionGASRepository)),
    ),
  };
  private readonly tables: Partial<Record<DomainName, string>> = {
    CONCEPTS: 'concepts',
    QUOTES: 'quotes',
    CHARACTER: 'characters',
    PLACES: 'places',
    BOOK_EVENTS: 'bookEvents',
    RELATIONS: 'relations',
    ASSOCIATIONS: 'associations',
    GLOSARY: 'glossary',
    QUESTIONS: 'questions',
  };

  private worker(domain: DomainName): Worker {
    const worker = this.workers[domain];
    if (!worker) throw new Error(`Unsupported synchronization domain: ${domain}`);
    return worker;
  }

  async save<T extends Domain>(domain: DomainName, record: T, isEdit: boolean): Promise<T> {
    return (await this.worker(domain).save(record, isEdit)) as T;
  }

  delete(domain: DomainName, record: Domain): Promise<'pending' | 'deleted'> {
    return this.worker(domain).delete(record);
  }

  getWrite(domain: DomainName, record: Domain): Promise<PendingDomainWrite | undefined> {
    return this.worker(domain).getWrite(record);
  }

  resolveId(domain: DomainName, bookId: string, id: string): string {
    return this.worker(domain).resolveId(bookId, id);
  }

  async resolveStoredId(domain: DomainName, bookId: string, id: string): Promise<string> {
    const alias = await this.db.metadata.get(
      `${domain.toLowerCase()}-id-alias:${JSON.stringify([bookId, id])}`,
    );
    return alias?.targetId ?? id;
  }

  watchRecords<T extends Domain>(
    domain: DomainName,
    bookId: string,
    update: (records: T[]) => void,
  ) {
    const table = this.tables[domain];
    if (!table) throw new Error(`Unsupported synchronization domain: ${domain}`);
    return liveQuery(() =>
      this.db.table<T, [string, string]>(table).where('bookId').equals(bookId).toArray(),
    ).subscribe({
      next: update,
      error: (error) =>
        this.messages.showError(
          error instanceof Error ? error.message : `Failed to watch ${domain} records.`,
        ),
    });
  }

  watchWrites(domain: DomainName, bookId: string, update: (writes: PendingDomainWrite[]) => void) {
    return this.worker(domain).watchWrites(bookId, update);
  }

  retry(
    domain: DomainName,
    record: Domain,
    confirmAccount = false,
    confirmUncertain = false,
  ): Promise<void> {
    return this.worker(domain).retry(record, confirmAccount, confirmUncertain);
  }

  confirmDeletion(domain: DomainName, record: Domain, confirmAccount = false): Promise<boolean> {
    return this.worker(domain).confirmDeletion(record, confirmAccount);
  }

  getActiveAccount(): string | undefined {
    return this.worker('CONCEPTS').getActiveAccount();
  }
}
