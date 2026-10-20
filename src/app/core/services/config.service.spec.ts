// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { ConfigService } from './config.service';

describe('ConfigService LocalSampleData mode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('disables LocalSampleData by default and persists explicit changes', () => {
    const service = new ConfigService();

    expect(service.isLocalSampleDataEnabled()).toBe(false);

    service.setLocalSampleDataEnabled(true);

    expect(service.isLocalSampleDataEnabled()).toBe(true);
    expect(localStorage.getItem('sumaq_yachay_local_sample_data_enabled')).toBe('true');
  });
});
