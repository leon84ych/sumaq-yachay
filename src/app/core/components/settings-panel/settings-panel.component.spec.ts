// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDbService } from '../../services/storage/app-db.service';
import { TranslocoHttpLoader } from '../../i18n/transloco-loader';
import { SettingsPanelComponent } from './settings-panel.component';

describe('SettingsPanelComponent', () => {
  let clearAllTables: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    clearAllTables = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [SettingsPanelComponent],
      providers: [
        provideHttpClient(),
        provideTransloco({
          config: {
            availableLangs: ['en', 'es'],
            defaultLang: 'en',
          },
          loader: TranslocoHttpLoader,
        }),
        { provide: AppDbService, useValue: { clearAllTables } },
      ],
    }).compileComponents();
  });

  it('does not clear local tables when the warning is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fixture = TestBed.createComponent(SettingsPanelComponent);

    await fixture.componentInstance.clearLocalDatabase();

    expect(clearAllTables).not.toHaveBeenCalled();
  });

  it('clears every local table after the warning is accepted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(SettingsPanelComponent);

    await fixture.componentInstance.clearLocalDatabase();

    expect(clearAllTables).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.clearStatus()).toBe('NAV.SETTINGS.CLEAR_SUCCESS');
  });

  it('changes the application language from the settings panel', () => {
    const fixture = TestBed.createComponent(SettingsPanelComponent);
    const panel = fixture.componentInstance;

    panel.setLanguage('es');
    expect(panel.getActiveLang()).toBe('es');

    panel.setLanguage('en');
    expect(panel.getActiveLang()).toBe('en');
  });
});