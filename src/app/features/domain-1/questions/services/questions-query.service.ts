import { inject, Injectable } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { QuestionRecord } from '../model/questions-model';

@Injectable({ providedIn: 'root' })
export class QuestionQueryService {
  private readonly localDBService = inject(LocalDBService);

  getQuestionsByBookId(bookId: string): Promise<QuestionRecord[]> {
    return this.localDBService.indexedDB.questions.where('bookId').equals(bookId).toArray();
  }

  async getAllowedTags(bookId: string): Promise<string[]> {
    const tags = await this.localDBService.indexedDB.tags.where('bookId').equals(bookId).toArray();
    return tags.map((tag) => tag.name);
  }
}
