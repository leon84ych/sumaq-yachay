import { beforeEach, describe, expect, it } from 'vitest';
import { GlobalErrorService } from './global-error.service';

describe('GlobalErrorService', () => {
  let service: GlobalErrorService;

  beforeEach(() => {
    service = new GlobalErrorService();
  });

  it('shows the latest application error and allows it to be dismissed', () => {
    service.show('Request failed with status 500');
    expect(service.message()).toBe('Request failed with status 500');

    service.clear();
    expect(service.message()).toBeNull();
  });
});
