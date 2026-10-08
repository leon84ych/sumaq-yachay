import { describe, expect, it } from 'vitest';
import { GlobalLoadingService } from './global-loading.service';

describe('GlobalLoadingService', () => {
  it('keeps the global loading state active until every operation completes', () => {
    const service = new GlobalLoadingService();

    const firstOperation = service.begin();
    expect(service.isLoading()).toBe(true);

    const secondOperation = service.begin();
    service.end(firstOperation);
    expect(service.isLoading()).toBe(true);

    service.end(secondOperation);
    expect(service.isLoading()).toBe(false);
  });
});
