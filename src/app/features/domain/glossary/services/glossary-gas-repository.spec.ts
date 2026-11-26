import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GlossaryRaw, GlossaryRecord } from '../model/glossary-model';
import { GlossaryGASRepository } from './glossary-gas-repository';

const record: GlossaryRecord = {
  id: 'term-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 19,
  term: 'Logos',
  language: 'Ancient Greek',
  definition: 'A principle of reason.',
  partOfSpeech: 'Noun',
  etymology: 'Greek',
  synonyms: 'reason',
  contextSentence: 'The logos guides the argument.',
  source: 'Metaphysics',
  page: '42',
  tags: ['#reason', '#language'],
  feed: 3,
  contributor: 'reader@example.com',
  syncStatus: 'pending',
};

describe('GlossaryGASRepository', () => {
  const api = {
    getDomainPaginated: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  let repository: GlossaryGASRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: GASDomainAPI, useValue: api }] });
    repository = TestBed.inject(GlossaryGASRepository);
  });

  it('reads GLOSARY using the owning book row', async () => {
    const raw: GlossaryRaw = {
      ...record,
      tags: '#reason',
    };
    api.getDomainPaginated.mockResolvedValue({ data: { rows: [raw] } });

    const result = await repository.getDomain(8, 1);

    expect(api.getDomainPaginated).toHaveBeenCalledWith(8, 'GLOSARY', 1, 50);
    expect(result[0]).toMatchObject({ bookRow: 8, itemRow: 19, tags: '#reason' });
  });

  it('creates from the full raw record and maps the generated ID', async () => {
    api.addDomainItem.mockResolvedValue('gas-term-id');

    const created = await repository.addDomainItem(record);

    expect(api.addDomainItem).toHaveBeenCalledWith(8, 'book-1', 'GLOSARY', {
      id: 'term-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 19,
      term: 'Logos',
      language: 'Ancient Greek',
      definition: 'A principle of reason.',
      partOfSpeech: 'Noun',
      etymology: 'Greek',
      synonyms: 'reason',
      contextSentence: 'The logos guides the argument.',
      source: 'Metaphysics',
      page: '42',
      tags: '#reason|#language',
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    });
    expect(created).toMatchObject({ id: 'gas-term-id', syncStatus: 'synced' });
  });

  it('updates with separate book and item row identity', async () => {
    api.updateDomainItem.mockResolvedValue(undefined);

    await repository.updateDomainItem(record);

    expect(api.updateDomainItem).toHaveBeenCalledWith(
      8,
      'book-1',
      'GLOSARY',
      'term-1',
      expect.objectContaining({ bookRow: 8, itemRow: 19, id: 'term-1', tags: '#reason|#language' }),
    );
  });

  it('deletes with bookRow and itemRow as distinct identifiers', async () => {
    api.deleteDomainItem.mockResolvedValue(undefined);

    await repository.deleteDomainItem(record);

    expect(api.deleteDomainItem).toHaveBeenCalledWith(8, 'book-1', 'GLOSARY', 'term-1', 19);
  });
});
