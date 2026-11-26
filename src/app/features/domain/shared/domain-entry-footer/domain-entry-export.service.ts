import { Injectable, signal } from '@angular/core';
import { downloadJpeg, JpegDownloadOptions } from '../../../../shared/utils/image-export';

@Injectable({ providedIn: 'root' })
export class DomainEntryExportService {
  readonly isExporting = signal(false);

  download(element: HTMLElement, filename: string, options: JpegDownloadOptions): Promise<void> {
    return downloadJpeg(element, filename, options);
  }
}
