// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDBService } from '../../../shared/local-db/local-db.service';
import { ConfigService } from '../../services/config/config.service';
import { PermissionService } from '../../services/permission/permission.service';
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
        provideRouter([]),
        provideTransloco({
          config: {
            availableLangs: ['en', 'es'],
            defaultLang: 'en',
          },
          loader: TranslocoHttpLoader,
        }),
        { provide: LocalDBService, useValue: { clearAllTables } },
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
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    TestBed.inject(ConfigService).setLocalSampleDataEnabled(true);
    TestBed.inject(PermissionService).setRole('admin');
    const fixture = TestBed.createComponent(SettingsPanelComponent);

    await fixture.componentInstance.clearLocalDatabase();

    expect(clearAllTables).toHaveBeenCalledOnce();
    expect(TestBed.inject(ConfigService).isLocalSampleDataEnabled()).toBe(false);
    expect(TestBed.inject(PermissionService).role()).toBe('guest');
    expect(navigateByUrl).toHaveBeenCalledWith('/catalog');
    expect(fixture.componentInstance.clearStatus()).toBe('NAV.SETTINGS.CLEAR_SUCCESS');
  });

  it('closes the settings drawer when clicking outside the component', () => {
    const fixture = TestBed.createComponent(SettingsPanelComponent);
    fixture.componentInstance.showSettings.set(true);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(fixture.componentInstance.showSettings()).toBe(false);
  });

  it('keeps the settings drawer open when clicking inside it', () => {
    const fixture = TestBed.createComponent(SettingsPanelComponent);
    fixture.componentInstance.showSettings.set(true);

    fixture.nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(fixture.componentInstance.showSettings()).toBe(true);
  });

  it('changes the application language from the settings panel', () => {
    const fixture = TestBed.createComponent(SettingsPanelComponent);
    const panel = fixture.componentInstance;

    panel.setLanguage('es');
    expect(panel.getActiveLang()).toBe('es');

    panel.setLanguage('en');
    expect(panel.getActiveLang()).toBe('en');
  });

  it('requires confirmation before enabling LocalSampleData', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockClear().mockReturnValue(false);
    const fixture = TestBed.createComponent(SettingsPanelComponent);

    fixture.componentInstance.setLocalSampleDataEnabled(true);

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(TestBed.inject(ConfigService).isLocalSampleDataEnabled()).toBe(false);
    expect(TestBed.inject(PermissionService).role()).toBe('guest');
  });

  it('enables LocalSampleData as an admin after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(SettingsPanelComponent);

    fixture.componentInstance.setLocalSampleDataEnabled(true);

    expect(TestBed.inject(ConfigService).isLocalSampleDataEnabled()).toBe(true);
    expect(TestBed.inject(PermissionService).role()).toBe('admin');
  });

  it('restores the admin role when LocalSampleData is already enabled', () => {
    TestBed.inject(ConfigService).setLocalSampleDataEnabled(true);

    TestBed.createComponent(SettingsPanelComponent);

    expect(TestBed.inject(PermissionService).role()).toBe('admin');
  });
});