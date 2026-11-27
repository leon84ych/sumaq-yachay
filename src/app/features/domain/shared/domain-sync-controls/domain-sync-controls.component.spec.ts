import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import { DomainSyncControlsComponent } from './domain-sync-controls.component';

describe('DomainSyncControlsComponent', () => {
  it('shows pending deletion and exposes its retry action', () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              DOMAINS: {
                INDEX: { DELETE_PENDING: 'Deletion pending', RETRY_DELETE: 'Retry deletion' },
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
    });
    const fixture = TestBed.createComponent(DomainSyncControlsComponent);
    fixture.componentRef.setInput('pendingDeletion', true);
    fixture.componentRef.setInput('canRetry', true);
    const retry = vi.fn();
    fixture.componentInstance.retryRequested.subscribe(retry);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Deletion pending');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Retry deletion');
    button.click();
    expect(retry).toHaveBeenCalledOnce();
  });
});
