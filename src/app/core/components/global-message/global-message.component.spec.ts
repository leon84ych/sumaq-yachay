// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalMessageService } from '../../services/global-message.service';
import { GlobalMessageComponent } from './global-message.component';

describe('GlobalMessageComponent', () => {
  afterEach(() => vi.useRealTimers());

  async function createComponent(durationMs?: number) {
    await TestBed.configureTestingModule({
      imports: [
        GlobalMessageComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(GlobalMessageComponent);
    if (durationMs !== undefined) fixture.componentRef.setInput('durationMs', durationMs);
    fixture.detectChanges();
    return fixture;
  }

  it('auto-dismisses messages after the default ten seconds', async () => {
    vi.useFakeTimers();
    const fixture = await createComponent();
    TestBed.inject(GlobalMessageService).showSuccess('Saved');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.global-message-banner')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(9_999);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.global-message-banner')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.global-message-banner')).toBeNull();
  });

  it('uses the configured duration and allows manual dismissal', async () => {
    vi.useFakeTimers();
    const fixture = await createComponent(2_000);
    const service = TestBed.inject(GlobalMessageService);
    service.showInfo('Refreshing');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1_000);
    service.showError('Refresh failed');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1_500);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.global-message-banner--error')).not.toBeNull();

    fixture.nativeElement.querySelector('.global-message-close').click();
    fixture.detectChanges();
    expect(service.message()).toBeNull();
  });
});