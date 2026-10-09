// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { ConfigService } from './config.service';

describe('ConfigService local-first mode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('enables local-first mode by default and persists explicit changes', () => {
    const service = new ConfigService();

    expect(service.isLocalFirstEnabled()).toBe(true);

    service.setLocalFirstEnabled(false);

    expect(service.isLocalFirstEnabled()).toBe(false);
    expect(localStorage.getItem('sumaq_yachay_local_first_enabled')).toBe('false');
  });
});
