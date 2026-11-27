import { inject, Injectable } from '@angular/core';
import { LocalDomainRepositoryAbstract } from '../../shared/domain-repository/local-domain-repository-abstract';
import { QuestionGASMapper } from '../model/questions-gas.mapper';
import { QuestionRaw, QuestionRecord } from '../model/questions-model';
import { QuestionGASRepository } from './questions-gas-repository';

@Injectable({ providedIn: 'root' })
export class QuestionRepository extends LocalDomainRepositoryAbstract<QuestionRecord> {
  private readonly mapper = inject(QuestionGASMapper);
  private readonly gasRepository = inject(QuestionGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.questions;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

  async getDomain(bookRow: number, total: number | null = null): Promise<QuestionRecord[]> {
    const snapshot = await this.snapshotForRefresh(bookRow);
    const raws: QuestionRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const ownerBook = snapshot.book;

    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    return this.mergeRemoteRecords(persistable, snapshot);
  }


}
