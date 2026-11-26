import { Injectable, inject } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { LOCAL_SAMPLE_DOMAIN_TABLES } from '../../../../core/services/storage/local-sample-data';
import { ConfigService } from '../../../../core/services/config/config.service';
import { DomainName } from '../../../catalog/book-detail/models/domain-sheet-config';
import { normalizeFeedInterval } from '../model/feed-interval';

export type DomainEntryReviewDomain = Exclude<DomainName, 'INDEX' | 'QUESTIONS'>;
export type DomainEntryReviewOutcome = 'forgotten' | 'recalled';

export interface DomainEntryReviewData {
  domain: DomainEntryReviewDomain;
  record: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class DomainEntryReviewService {
  private readonly localDBService = inject(LocalDBService);
  private readonly configService = inject(ConfigService);

  async incrementReviewCount(
    entry: DomainEntryReviewData,
    outcome: DomainEntryReviewOutcome,
  ): Promise<number> {
    const bookId = entry.record['bookId'];
    const recordId = entry.record['id'];
    if (typeof bookId !== 'string' || typeof recordId !== 'string') {
      throw new Error(`Cannot update ${outcome} count: feed record keys are missing.`);
    }

    const tableName = LOCAL_SAMPLE_DOMAIN_TABLES[entry.domain];
    if (!tableName) {
      throw new Error(`Cannot update ${outcome} count for domain ${entry.domain}.`);
    }

    const storedCount = entry.record[outcome];
    const currentCount =
      typeof storedCount === 'number' && Number.isFinite(storedCount) ? storedCount : 0;
    const nextCount = currentCount + 1;
    const maximumInterval = this.configService.getFeedMaxIntervalDays();
    const currentInterval = normalizeFeedInterval(entry.record['interval'], maximumInterval);
    const nextInterval =
      outcome === 'forgotten'
        ? Math.max(1, currentInterval / 2)
        : Math.min(maximumInterval, currentInterval * 2);
    const lastReview = new Date();
    const changes = { [outcome]: nextCount, interval: nextInterval, lastReview };
    const updated = await this.localDBService.indexedDB
      .table(tableName)
      .update([bookId, recordId], changes);

    if (!updated) {
      throw new Error(`Could not update ${outcome} count for feed record ${recordId}.`);
    }

    entry.record[outcome] = nextCount;
    entry.record['interval'] = nextInterval;
    entry.record['lastReview'] = lastReview;
    return nextCount;
  }
}
