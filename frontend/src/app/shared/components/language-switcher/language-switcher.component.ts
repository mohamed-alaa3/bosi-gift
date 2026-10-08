import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { AppLanguage, LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  private languageService = inject(LanguageService);

  readonly variant = input<'compact' | 'full'>('compact');

  protected readonly current = this.languageService.current;
  protected readonly isRtl = this.languageService.isRtl;

  /** The label to display on the toggle button (the "other" language). */
  protected readonly otherLabel = computed(() =>
    this.current() === 'en' ? 'AR' : 'EN'
  );

  protected toggle(): void {
    this.languageService.toggle();
  }

  protected use(lang: AppLanguage): void {
    this.languageService.use(lang);
  }
}