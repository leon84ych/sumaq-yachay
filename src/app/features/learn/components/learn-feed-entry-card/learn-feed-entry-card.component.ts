import { Component, computed, input } from '@angular/core';
import { DomainEntryCardComponent } from '../../../../shared/domain-entry-card/domain-entry-card.component';
import { LearnFeedEntry } from '../../services/learn-feed.service';

@Component({
  selector: 'app-learn-feed-entry-card',
  imports: [DomainEntryCardComponent],
  templateUrl: './learn-feed-entry-card.component.html',
  styleUrl: './learn-feed-entry-card.component.css',
})
export class LearnFeedEntryCardComponent {
  readonly entry = input.required<LearnFeedEntry>();
  readonly syncStatus = computed(() => {
    const status = this.entry().sourceRow['syncStatus'];
    return typeof status === 'string' ? status : null;
  });
}