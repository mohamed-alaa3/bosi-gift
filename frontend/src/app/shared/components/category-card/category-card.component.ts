import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LocalizedPipe } from '../../pipes/localized.pipe';
import { SafeImagePipe } from '../../pipes/safe-image.pipe';
import { Category } from '../../../core/models';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [CommonModule, RouterLink, LocalizedPipe, SafeImagePipe],
  templateUrl: './category-card.component.html',
  styleUrl: './category-card.component.scss',
})
export class CategoryCardComponent {
  readonly category = input.required<Category>();

  protected readonly link = computed(() => [
    '/shop',
    { category: this.category()._id },
  ]);

  protected readonly image = computed(
    () => this.category().imageUrl || this.category().image || ''
  );
}