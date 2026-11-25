import { beforeEach, describe, expect, it } from 'vitest';
import { GlobalMessageService } from './global-message.service';

describe('GlobalMessageService', () => {
  let service: GlobalMessageService;

  beforeEach(() => {
    service = new GlobalMessageService();
  });

  it('stores typed error, success, and informational messages', () => {
    service.showError('Request failed');
    expect(service.message()).toEqual({ type: 'error', text: 'Request failed' });

    service.showSuccess('Changes saved');
    expect(service.message()).toEqual({ type: 'success', text: 'Changes saved' });

    service.showInfo('Sync is running');
    expect(service.message()).toEqual({ type: 'info', text: 'Sync is running' });
  });

  it('trims messages, supplies a default for empty errors, and clears the current message', () => {
    service.showSuccess('  Updated  ');
    expect(service.message()?.text).toBe('Updated');

    service.showError('  ');
    expect(service.message()).toEqual({ type: 'error', text: 'An unexpected error occurred.' });

    service.clear();
    expect(service.message()).toBeNull();
  });
});