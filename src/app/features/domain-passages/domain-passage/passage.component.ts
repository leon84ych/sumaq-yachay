import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet, PassagesRow } from '../../catalog-detail/models/domain-sheet.model';

@Component({
    selector: 'app-passages',
    standalone: true,
    imports: [CommonModule, TranslocoPipe],
    templateUrl: './passage.component.html',
    styleUrls: ['./passage.component.css'],
})
export class PassageComponent {
    readonly rows = input.required<PassagesRow[]>();
    readonly currentSheet = input.required<DomainSheet>();
    readonly bookName = input<string>('');
    readonly bookAuthor = input<string>('');
    readonly isAddingEntry = input<boolean>(false);
    readonly closeEntry = output<void>();

    readonly newTitle = signal<string>('');
    readonly newPassageText = signal<string>('');
    readonly newBook = signal<string>('');
    readonly newAuthor = signal<string>('');
    readonly newPage = signal<string>('');
    readonly newTags = signal<string>('');
    readonly passageTextMaxLength = 2000;
    readonly passageTextCharactersRemaining = computed(
        () => this.passageTextMaxLength - this.newPassageText().length
    );

    private domainDataService = inject(DomainDataService);
    private globalErrorService = inject(GlobalErrorService);

    constructor() {
        effect(() => {
            if (this.bookName()) {
                this.newBook.set(this.bookName());
            }
            if (this.bookAuthor()) {
                this.newAuthor.set(this.bookAuthor());
            }
        });
    }

    resetForm(): void {
        this.newTitle.set('');
        this.newPassageText.set('');
        this.newBook.set('');
        this.newAuthor.set('');
        this.newPage.set('');
        this.newTags.set('');
        this.closeEntry.emit();
    }

    onPassageTextInput(event: Event): void {
        const target = event.target as HTMLElement;
        const value = target.textContent?.trim() ?? '';
        this.newPassageText.set(value.slice(0, this.passageTextMaxLength));
    }

    async addPassage(): Promise<void> {
        const title = this.newTitle().trim();
        const passageText = this.newPassageText().trim();
        const book = this.newBook().trim();
        const author = this.newAuthor().trim();
        const page = this.newPage().trim();
        const tags = this.newTags().trim();

        if (!title || !passageText || !book || !author) {
            return;
        }

        const newRow: PassagesRow = {
            id: `passage_${Date.now()}`,
            title,
            passageText,
            book,
            author,
            ...(page ? { page } : {}),
            ...(tags ? { tags } : {}),
            feed: 5,
            contributor: 'currentUser',
            syncStatus: 'pending',
        };

        try {
            await this.domainDataService.updateDomainSheetRows(
                this.currentSheet().name,
                [...this.rows(), newRow]
            );
            this.resetForm();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add passage.';
            this.globalErrorService.show(message);
        }
    }
}
