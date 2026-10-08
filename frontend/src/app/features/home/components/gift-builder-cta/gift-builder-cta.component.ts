import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { GiftIconComponent } from '../../../../shared/components/gift-icon/gift-icon.component';

/** Homepage spotlight for the existing Gift Builder (route: /gifts). Presentation only. */
@Component({
  selector: 'app-gift-builder-cta',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, GiftIconComponent],
  templateUrl: './gift-builder-cta.component.html',
  styleUrl: './gift-builder-cta.component.scss',
})
export class GiftBuilderCtaComponent {}
